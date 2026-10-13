import { test, describe } from "node:test";
import assert from "node:assert";
import {
  validateVKN,
  validateTCKN,
  vknZodSchema,
  tcknZodSchema,
  vergiNoZodSchema,
} from "../lib/validation/taxIdValidation";
import {
  UretimBomZodSchema,
  calculateGrossQuantity,
} from "../lib/validation/manufacturingValidation";
import {
  YevmiyeFisiZodSchema,
  buildProductionCostJournalVoucher,
} from "../lib/validation/accountingValidation";
import { auditLogger } from "../server/audit/auditLogger";

describe("Üretim Odaklı ERP (Çivi, Palet Çivisi, Tel Ağ) — Aşama 1 Bütünlük Testleri", () => {
  // ---------------------------------------------------------------------------
  // 1. VKN VE TCKN ALGORİTMİK DOĞRULAMA TESTLERİ (TMS & VUK UYUMU)
  // ---------------------------------------------------------------------------
  describe("1. VKN ve TCKN Algoritmik Doğrulama (Modül 10 ve Hane Kontrolleri)", () => {
    test("1.1. Geçerli 10 haneli VKN doğru kabul edilmeli", () => {
      // Bilinen geçerli VKN algoritmik kombinasyonları
      // Örnek: 123456789X için hesaplama
      // Basit bir geçerli VKN üretelim:
      // i=0..8 için vkn[i] verildiğinde checkDigit hesaplanır
      const vknPrefix = "800051283"; // Örnek geçerli kök
      // Hesaplanmış son hane ile test
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        const digit = Number(vknPrefix[i]);
        const v = (digit + (9 - i)) % 10;
        if (v !== 0) {
          const c = (v * Math.pow(2, 9 - i)) % 9;
          sum += c === 0 ? 9 : c;
        }
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      const validVkn = `${vknPrefix}${checkDigit}`;

      assert.strictEqual(validateVKN(validVkn), true);
      assert.strictEqual(vknZodSchema.safeParse(validVkn).success, true);
    });

    test("1.2. Hatalı veya rastgele 10 haneli VKN kesinlikle reddedilmeli", () => {
      // Kontrol basamağı tutarsız rastgele VKN
      assert.strictEqual(validateVKN("1234567891"), false);
      assert.strictEqual(validateVKN("1111111111"), false);
      assert.strictEqual(validateVKN("9999999999"), false);
      assert.strictEqual(validateVKN("12345"), false); // 10 haneden kısa
      assert.strictEqual(validateVKN("12345678901"), false); // 10 haneden uzun
      assert.strictEqual(validateVKN("ABC4567890"), false); // Harf içeren

      const parseResult = vknZodSchema.safeParse("1234567891");
      assert.strictEqual(parseResult.success, false);
    });

    test("1.3. Geçerli 11 haneli TCKN doğru kabul edilmeli", () => {
      // Algoritmaya tam uyan geçerli TCKN kökü
      // Rastgele 9 hane: 100000001
      const d = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const tekToplam = d[0] + d[2] + d[4] + d[6] + d[8];
      const ciftToplam = d[1] + d[3] + d[5] + d[7];
      let hane10 = ((tekToplam * 7) - ciftToplam) % 10;
      if (hane10 < 0) hane10 += 10;
      const ilk10Toplam = d.reduce((a, b) => a + b, 0) + hane10;
      const hane11 = ilk10Toplam % 10;
      const validTckn = `${d.join("")}${hane10}${hane11}`;

      assert.strictEqual(validateTCKN(validTckn), true);
      assert.strictEqual(tcknZodSchema.safeParse(validTckn).success, true);
    });

    test("1.4. Sıfırla başlayan veya 10/11. hanesi tutarsız TCKN reddedilmeli", () => {
      assert.strictEqual(validateTCKN("01234567890"), false); // İlk hane 0 olamaz
      assert.strictEqual(validateTCKN("11111111111"), false); // Kontrol hanesi tutarsız
      assert.strictEqual(validateTCKN("12345678901"), false);
      assert.strictEqual(validateTCKN("12345"), false); // Kısa

      const result = tcknZodSchema.safeParse("01234567890");
      assert.strictEqual(result.success, false);
    });

    test("1.5. Esnek vergiNoZodSchema hem VKN hem TCKN'yi ayırt edebilmeli", () => {
      assert.strictEqual(vergiNoZodSchema.safeParse("123").success, false);
      assert.strictEqual(vergiNoZodSchema.safeParse("abcdefghij").success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. ÇİVİ VE TEL AĞ İMALATI VE BOM (ÜRÜN AĞACI) DOĞRULAMA TESTLERİ
  // ---------------------------------------------------------------------------
  describe("2. Çivi, Palet Çivisi ve Tel Ağ İmalatı Ürün Ağacı (BOM) & Fire Denetimi", () => {
    test("2.1. calculateGrossQuantity net miktar ve fire oranını doğru çarpmalı", () => {
      // 1000 kg palet çivisi üretimi için %4 tel çekme ve çapak alma firesi
      const net = 1000; // kg
      const fireOrani = 4; // %4
      const brut = calculateGrossQuantity(net, fireOrani);
      assert.strictEqual(brut, 1040); // 1000 * 1.04 = 1040 kg
    });

    test("2.2. Palet Çivisi (Coil Nails 2.5x60mm) reçetesi başarıyla doğrulanmalı", () => {
      const paletCivisiBom = {
        mamul_stok_id: 101,
        recete_kodu: "BOM-PALET-60MM-RING",
        recete_adi: "2.5x60 mm Ring Palet Çivisi (16 Derece Rulo)",
        versiyon: "1.0",
        parti_buyuklugu: 1000, // 1000 kg
        parti_birimi: "kg",
        bilesenler: [
          {
            bilesen_stok_id: 1,
            bilesen_kodu: "HM-FILMASIN-SAE1008",
            bilesen_adi: "Filmaşin Demir Tel (5.5 mm SAE 1008)",
            malzeme_turu: "HAMMADDE" as const,
            net_miktar: 1000,
            birim: "kg",
            fire_orani: 3.5, // %3.5 tel çekme + pres ucu firesi
            brut_miktar: 1035, // 1000 * 1.035
            satir_no: 1,
          },
          {
            bilesen_stok_id: 2,
            bilesen_kodu: "YM-KAYNAK-TELI",
            bilesen_adi: "Bakır Kaplama Rulo Kaynak Teli (0.6 mm)",
            malzeme_turu: "YARDIMCI_MALZEME" as const,
            net_miktar: 1.2,
            birim: "kg",
            fire_orani: 0,
            brut_miktar: 1.2,
            satir_no: 2,
          },
        ],
        standart_maliyet: 34500,
        notlar: "16 derece tel dizgili rulo çivi imalat reçetesi",
      };

      const result = UretimBomZodSchema.safeParse(paletCivisiBom);
      assert.strictEqual(result.success, true);
    });

    test("2.3. Brüt miktar formülü (Net * (1 + Fire/100)) tutarsız ise BOM reddedilmeli", () => {
      const hataliBom = {
        mamul_stok_id: 102,
        recete_kodu: "BOM-INSAAT-100MM",
        recete_adi: "İnşaat Çivisi 4.2x100 mm",
        versiyon: "1.0",
        parti_buyuklugu: 500,
        parti_birimi: "kg",
        bilesenler: [
          {
            bilesen_stok_id: 1,
            bilesen_kodu: "HM-FILMASIN",
            bilesen_adi: "Filmaşin Demir Tel",
            malzeme_turu: "HAMMADDE" as const,
            net_miktar: 500,
            birim: "kg",
            fire_orani: 5, // Beklenen brüt: 525 kg
            brut_miktar: 480, // Hatalı: Netten daha küçük brüt olamaz!
            satir_no: 1,
          },
        ],
      };

      const result = UretimBomZodSchema.safeParse(hataliBom);
      assert.strictEqual(result.success, false);
    });

    test("2.4. Aşırı yüksek fire oranı (%50 üzeri) engellenmeli", () => {
      const asiriFireBom = {
        mamul_stok_id: 103,
        recete_kodu: "BOM-TEL-AG-50MM",
        recete_adi: "Galvanizli Tel Ağ (50x50 mm Göz Aralığı)",
        versiyon: "1.0",
        parti_buyuklugu: 100,
        parti_birimi: "rulo",
        bilesenler: [
          {
            bilesen_stok_id: 3,
            bilesen_kodu: "HM-GALVANIZ-TEL",
            bilesen_adi: "2.5 mm Galvanizli Tel",
            malzeme_turu: "HAMMADDE" as const,
            net_miktar: 2500,
            birim: "kg",
            fire_orani: 65, // %65 fire kabul edilemez
            brut_miktar: 4125,
            satir_no: 1,
          },
        ],
      };

      const result = UretimBomZodSchema.safeParse(asiriFireBom);
      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. VUK VE TMS UYUMLU ÇİFT KAYIT VE İMALAT MALİYET MUHASEBESİ TESTLERİ
  // ---------------------------------------------------------------------------
  describe("3. Muhasebe Standartları: Çift Kayıt (Borç = Alacak) ve İmalat Yansıtma", () => {
    test("3.1. Dengeli üretim maliyet mahsup fişi (710/720/730 -> 152) başarıyla oluşturulmalı", () => {
      const fis = buildProductionCostJournalVoucher({
        fisNo: "YEV-2026-00045",
        tarih: "2026-10-09",
        mamulKodu: "MM-PALET-CIVI-60MM",
        mamulAdi: "2.5x60mm Ring Palet Çivisi (1000 kg)",
        hammaddeTutari: 28500.0, // 710 Filmaşin ve Tel Sarfı
        iscilikTutari: 4200.0,   // 720 Hat Operatör İşçiliği
        genelUretimTutari: 2150.0, // 730 Amortisman, Elektrik, Yağ/Talaş Sarfı
      });

      assert.strictEqual(fis.fis_no, "YEV-2026-00045");
      assert.strictEqual(fis.satirlar.length, 4);

      // Toplam Borç = 152 Mamuller (34.850,00 TL)
      assert.strictEqual(fis.satirlar[0].hesap_kodu, "152.01");
      assert.strictEqual(fis.satirlar[0].borc, 34850.0);

      // Alacaklar Toplamı = 711 (28.500) + 721 (4.200) + 731 (2.150) = 34.850,00 TL
      const toplamAlacak = fis.satirlar
        .slice(1)
        .reduce((sum, r) => sum + r.alacak, 0);
      assert.strictEqual(toplamAlacak, 34850.0);

      // Fiş Zod doğrulaması tam başarılı olmalı
      assert.strictEqual(YevmiyeFisiZodSchema.safeParse(fis).success, true);
    });

    test("3.2. Borç ve Alacak eşit olmayan dengesiz yevmiye fişi kesinlikle reddedilmeli", () => {
      const dengesizFis = {
        fis_no: "YEV-HATA-01",
        fis_tarihi: "2026-10-09",
        fis_turu: "MAHSUP" as const,
        sube_kodu: "MERKEZ",
        donem_yili: 2026,
        aciklama: "Dengesiz imalat fişi testi",
        satirlar: [
          {
            satir_no: 1,
            hesap_kodu: "152.01",
            hesap_adi: "152 Mamuller",
            borc: 10000.0,
            alacak: 0,
            aciklama: "Mamul girişi",
            belge_turu: "URETIM_FISI" as const,
          },
          {
            satir_no: 2,
            hesap_kodu: "711.01",
            hesap_adi: "711 İlk Madde Yansıtma",
            borc: 0,
            alacak: 9950.0, // 50 TL fark! Dengesiz!
            aciklama: "Hammadde yansıtma",
            belge_turu: "URETIM_FISI" as const,
          },
        ],
      };

      const result = YevmiyeFisiZodSchema.safeParse(dengesizFis);
      assert.strictEqual(result.success, false);
      assert.match(
        result.error!.issues[0].message,
        /VUK\/TMS Çift Kayıt Kuralı İhlali/
      );
    });

    test("3.3. Aynı satırda hem borç hem alacak girilmesi engellenmeli", () => {
      const hataliSatirFis = {
        fis_no: "YEV-HATA-02",
        fis_tarihi: "2026-10-09",
        fis_turu: "MAHSUP" as const,
        sube_kodu: "MERKEZ",
        donem_yili: 2026,
        aciklama: "Tek satırda çift yönlü tutar hatası",
        satirlar: [
          {
            satir_no: 1,
            hesap_kodu: "150.01",
            hesap_adi: "150 İlk Madde",
            borc: 1000,
            alacak: 1000, // Geçersiz!
            aciklama: "Hatalı satır",
            belge_turu: "URETIM_FISI" as const,
          },
        ],
      };

      const result = YevmiyeFisiZodSchema.safeParse(hataliSatirFis);
      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. DENETİM İZİ (AUDIT TRAIL) TESTLERİ
  // ---------------------------------------------------------------------------
  describe("4. Denetim İzi (Audit Trail) ve Değişiklik Tarihçesi", () => {
    test("4.1. Finansal işlemde kullanıcı_id, ip_adresi, eski ve yeni değer tam loglanmalı", () => {
      auditLogger.clear();

      const log = auditLogger.log({
        kullanici_id: 1,
        kullanici_adi: "muhasebe_muduru",
        tablo_adi: "production_orders",
        kayit_id: "ISEMRI-2026-098",
        islem_turu: "UPDATE",
        eski_deger: { status: "PLANLANDI", planned_qty: 5000 },
        yeni_deger: { status: "TEL_CEKME_ASAMASINDA", planned_qty: 5000 },
        ip_adresi: "192.168.1.120",
        aciklama: "Çivi pres hattı iş emri üretime alındı",
      });

      assert.strictEqual(log.kullanici_id, 1);
      assert.strictEqual(log.ip_adresi, "192.168.1.120");
      assert.strictEqual(log.islem_turu, "UPDATE");
      assert.strictEqual(Boolean(log.tarih), true);

      // Geçmiş sorgulama
      const history = auditLogger.getHistory("production_orders", "ISEMRI-2026-098");
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].tablo_adi, "production_orders");
    });

    test("4.2. IP adresi veya kullanıcı_id eksik log girişi reddedilmeli", () => {
      assert.throws(() => {
        auditLogger.log({
          kullanici_id: 0, // Geçersiz kullanıcı ID
          kullanici_adi: "",
          tablo_adi: "journal_vouchers",
          kayit_id: 12,
          islem_turu: "CREATE",
          eski_deger: null,
          yeni_deger: { fis_no: "YEV-1" },
          ip_adresi: "", // Boş IP engellenmeli
        });
      });
    });
  });
});
