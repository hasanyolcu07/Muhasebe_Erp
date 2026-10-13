import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateGrossToNet,
  calculateNetToGross,
  generatePayrollJournalVoucher,
  generateBordroRecord,
} from "../modules/personel/services/payrollCalculator";
import { getPayrollParameters } from "../modules/personel/services/payrollParameters";
import { personelStore } from "../modules/personel/services/personelStore";
import { checkSgkLegalDeadline, attemptSgkSubmission, buildSgkXmlPayload } from "../modules/personel/services/sgkService";
import { maskTcKimlikNo, maskIban, maskWage } from "../modules/personel/types/personelTypes";
import { checkPerm } from "../store/appStore";

describe("FAZ 5 — Personel, Puantaj, Bordro ve SGK İşlemleri Kabul Testleri", () => {
  // ---------------------------------------------------------------------------
  // 1. DÖNEMSEL PARAMETRELER VE BRÜT-NET HESAPLAMALARI
  // ---------------------------------------------------------------------------
  describe("1. Dönemsel Parametreler ve Brüt-Net Hesaplama Motoru", () => {
    test("1.1. 2026 dönemi parametreleri yasal kaynak ve limitleriyle doğru yüklenmeli", () => {
      const p2026 = getPayrollParameters("2026-03");
      assert.strictEqual(p2026.period_year, 2026);
      assert.strictEqual(p2026.asgari_ucret_brut, 26005.5);
      assert.strictEqual(p2026.sgk_taban, 26005.5);
      assert.strictEqual(p2026.sgk_tavan, 195041.25);
      assert.strictEqual(p2026.sgk_isci_orani, 0.14);
      assert.strictEqual(p2026.issizlik_isci_orani, 0.01);
      assert.strictEqual(p2026.damga_vergisi_orani, 0.00759);
      assert.ok(p2026.source.includes("Asgari Ücret"));
    });

    test("1.2. 2026 Asgari Ücretli çalışan için vergi istisnası sonrası sıfır gelir ve damga vergisi çıkmalı", () => {
      const res = calculateGrossToNet({
        grossWage: 26005.5,
        period: "2026-01",
        workedDays: 30,
        cumulativeTaxBasePrevious: 0,
      });

      assert.strictEqual(res.grossTotal, 26005.5);
      assert.strictEqual(res.sgkEmployeeShare, 3640.77); // 26005.5 * 0.14
      assert.strictEqual(res.unemploymentEmployeeShare, 260.06); // 26005.5 * 0.01
      // 7349 sayılı Kanun uyarınca asgari ücretliye ödenecek GV ve DV 0 TL olmalı
      assert.strictEqual(res.payableIncomeTax, 0);
      assert.strictEqual(res.payableStampTax, 0);
      // Net Ücret = 26005.5 - 3640.77 - 260.06 = 22104.67 TL
      assert.strictEqual(res.netPayable, 22104.67);
    });

    test("1.3. Asgari ücreti aşan brüt maaşta gelir vergisi ve damga vergisi kuruş kuruşuna doğru hesaplanmalı", () => {
      const res = calculateGrossToNet({
        grossWage: 50000,
        period: "2026-01",
        workedDays: 30,
        cumulativeTaxBasePrevious: 0,
      });

      assert.strictEqual(res.grossTotal, 50000);
      assert.strictEqual(res.sgkEmployeeShare, 7000); // 50000 * 0.14
      assert.strictEqual(res.unemploymentEmployeeShare, 500); // 50000 * 0.01
      assert.strictEqual(res.incomeTaxBase, 42500); // 50000 - 7500

      // %15 Diliminde hesaplanan vergi = 42500 * 0.15 = 6375 TL
      assert.strictEqual(res.calculatedIncomeTax, 6375);
      // Asgari ücret GV istisnası = (26005.50 * 0.85) * 0.15 = 3315.70 TL
      assert.strictEqual(res.asgariUcretGvIstisnasi, 3315.7);
      // Ödenecek Gelir Vergisi = 6375 - 3315.70 = 3059.30 TL
      assert.strictEqual(res.payableIncomeTax, 3059.3);

      // Damga Vergisi = 50000 * 0.00759 = 379.50 TL, İstisna = 26005.5 * 0.00759 = 197.38 TL
      // Ödenecek DV = 379.50 - 197.38 = 182.12 TL
      assert.strictEqual(res.payableStampTax, 182.12);

      // Net Ücret = 50000 - 7000 - 500 - 3059.30 - 182.12 = 39258.58 TL
      assert.strictEqual(res.netPayable, 39258.58);
    });

    test("1.4. Netten Brüte ters hesaplama hedef net tutarı kuruş sapması olmaksızın bulmalı", () => {
      const targetNet = 39258.58;
      const foundGross = calculateNetToGross(targetNet, {
        period: "2026-01",
        workedDays: 30,
        cumulativeTaxBasePrevious: 0,
      });

      // İkili arama sonucu bulunan brüt ücret ~50000 TL olmalı
      assert.ok(Math.abs(foundGross - 50000) <= 0.1, `Bulunan brüt: ${foundGross}`);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. KÜMÜLATİF VERGİ MATRAHI VE DİLİM GEÇİŞİ
  // ---------------------------------------------------------------------------
  describe("2. Kümülatif Vergi Matrahı ve Dönemler Arası Taşıma", () => {
    test("2.1. Yıl içinde kümülatif matrah 158.000 TL sınırını aştığında %20 dilimine geçmeli", () => {
      // 150.000 TL önceki kümülatif matrahı olan çalışanın bu ayki matrahı 42.500 TL olsun (Toplam: 192.500 TL)
      // 158.000 - 150.000 = 8.000 TL %15'ten (1200 TL)
      // 192.500 - 158.000 = 34.500 TL %20'den (6900 TL)
      // Toplam Hesaplanan Vergi = 8100 TL
      const res = calculateGrossToNet({
        grossWage: 50000,
        period: "2026-05",
        workedDays: 30,
        cumulativeTaxBasePrevious: 150000,
      });

      assert.strictEqual(res.cumulativeIncomeTaxBase, 192500);
      assert.strictEqual(res.topTaxRate, 0.2); // Üst dilim %20 oldu
      assert.strictEqual(res.calculatedIncomeTax, 8100);
      assert.ok(res.payableIncomeTax > 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PUANTAJIN BORDRO GÜN/SAAT VE KAZANÇLARA ETKİSİ
  // ---------------------------------------------------------------------------
  describe("3. Puantaj ve Mesai Kazancı Etkisi", () => {
    test("3.1. 10 gün eksik çalışan personelin brüt hak edişi gün sayısıyla orantılı düşmeli", () => {
      const full = calculateGrossToNet({ grossWage: 30000, period: "2026-03", workedDays: 30 });
      const partial = calculateGrossToNet({ grossWage: 30000, period: "2026-03", workedDays: 20 });

      assert.strictEqual(full.grossTotal, 30000);
      assert.strictEqual(partial.grossTotal, 20000); // (30000 / 30) * 20
      assert.ok(partial.netPayable < full.netPayable);
    });

    test("3.2. Fazla mesai (%50 zamlı) brüt kazanca ve saatlik ücrete göre doğru yansımalı", () => {
      // Saatlik ücret = 45000 / 225 = 200 TL
      // 10 saat fazla mesai (%50 zamlı) = 10 * (200 * 1.5) = 3000 TL ek kazanç
      const withOt = calculateGrossToNet({
        grossWage: 45000,
        period: "2026-03",
        workedDays: 30,
        overtimeHours150: 10,
      });

      assert.strictEqual(withOt.grossTotal, 48000); // 45000 + 3000
    });
  });

  // ---------------------------------------------------------------------------
  // 4. İŞTEN AYRILIŞ SONRASI DÖNEM BORDRO ENGELİ
  // ---------------------------------------------------------------------------
  describe("4. İşten Ayrılan Personele Sonraki Dönem Bordrosu Engeli", () => {
    test("4.1. Çıkış tarihi geçmiş personele çıkış sonrası dönemde bordro hesaplanması engellenmeli", () => {
      const formerPersonel = personelStore.getPersonelById(4); // Ali Öztürk, 2025-12-31 çıkışlı
      assert.ok(formerPersonel);
      assert.strictEqual(formerPersonel.end_date, "2025-12-31");

      const invalidPuantaj = {
        id: 999,
        period: "2026-01", // Çıkıştan sonraki dönem
        personel_id: 4,
        personel_name: "Ali Öztürk",
        department: "Üretim",
        total_days: 30,
        worked_days: 26,
        weekly_rest_days: 4,
        holiday_days: 0,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        sick_leave_days: 0,
        absent_days: 0,
        overtime_hours_150: 0,
        overtime_hours_200: 0,
        night_hours: 0,
        source: "MANUEL" as const,
        created_by: "Test",
        updated_by: "Test",
        is_approved: true,
      };

      assert.throws(
        () => {
          generateBordroRecord(formerPersonel, invalidPuantaj);
        },
        /işten ayrılmıştır.*bordro hesaplanamaz/i
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. ROL BAZLI ERİŞİM VE VERİ MASKELEME (KVKK)
  // ---------------------------------------------------------------------------
  describe("5. Rol Bazlı Yetkilendirme ve KVKK Maskeleme Güvenliği", () => {
    test("5.1. Yetkisiz rolde TCKN, IBAN ve ücret kesinlikle maskelenmeli", () => {
      const tc = "12345678901";
      const iban = "TR330006200000012345678901";
      const wage = 45000;

      // Yetkisiz kullanıcı (hasFullAccess = false)
      assert.strictEqual(maskTcKimlikNo(tc, false), "123*****901");
      assert.strictEqual(maskIban(iban, false), "TR33 **** **** **** **** 8901");
      assert.strictEqual(maskWage(wage, false), "***.***,** ₺");

      // Yetkili kullanıcı (hasFullAccess = true)
      assert.strictEqual(maskTcKimlikNo(tc, true), "12345678901");
      assert.strictEqual(maskIban(iban, true), iban);
      assert.ok(maskWage(wage, true).includes("45.000"));
    });

    test("5.2. RBAC checkPerm: Personel modülü yetkisi olmayan kullanıcı reddedilmeli", () => {
      const salesUser = { fatura: ["view", "create"] };
      assert.strictEqual(checkPerm(salesUser, "personel", "view"), false);
      assert.strictEqual(checkPerm(salesUser, "bordro-hesaplama", "view"), false);

      const hrUser = { personel: ["view", "create"] };
      assert.strictEqual(checkPerm(hrUser, "personel", "view"), true);
      assert.strictEqual(checkPerm(hrUser, "bordro-hesaplama", "view"), true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. SGK CANLI SERVİS GÜVENLİĞİ VE YASAL BİLDİRİM SÜRESİ
  // ---------------------------------------------------------------------------
  describe("6. SGK İşlemleri ve Sahte Başarı Engeli", () => {
    test("6.1. Canlı SGK servisi yokken 'gönderildi' denmemeli, durum GONDERIM_BEKLIYOR kalmalı", () => {
      const res = attemptSgkSubmission(1);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.status, "GONDERIM_BEKLIYOR");
      assert.ok(res.message.includes("yapılandırılmamış"));
      assert.ok(res.recommendedAction.includes("XML"));
    });

    test("6.2. İşe giriş bildirgesi yasal süresi (en geç 1 gün önce) doğru kontrol edilmeli", () => {
      // 2026-04-10 tarihinde başlayacak personelin bildirimi 2026-04-05'te yapılıyor -> Geçerli
      const valid = checkSgkLegalDeadline("ISE_GIRIS", "2026-04-10", "2026-04-05");
      assert.strictEqual(valid.isWithinLegalPeriod, true);
      assert.strictEqual(valid.deadlineDate, "2026-04-09");

      // 2026-04-10 tarihinde başlayacak personelin bildirimi 2026-04-10 günü yapılıyor -> Süre aşımı
      const late = checkSgkLegalDeadline("ISE_GIRIS", "2026-04-10", "2026-04-10");
      assert.strictEqual(late.isWithinLegalPeriod, false);
      assert.ok(late.description.includes("AŞIMI"));
    });

    test("6.3. İşten ayrılış bildirgesi 10 günlük yasal süre kuralını doğru denetlemeli", () => {
      // 2026-04-01'de ayrılan personel için 2026-04-08'de bildirim -> 10 gün içinde
      const valid = checkSgkLegalDeadline("ISTEN_AYRILIS", "2026-04-01", "2026-04-08");
      assert.strictEqual(valid.isWithinLegalPeriod, true);
      assert.strictEqual(valid.deadlineDate, "2026-04-11");

      // 2026-04-01'de ayrılan personel için 2026-04-15'te bildirim -> 14 gün geçmiş (Süre aşımı)
      const late = checkSgkLegalDeadline("ISTEN_AYRILIS", "2026-04-01", "2026-04-15");
      assert.strictEqual(late.isWithinLegalPeriod, false);
    });

    test("6.4. SGK 4A XML şablonu resmî başlıkları ve TCKN'yi içermeli", () => {
      const p = personelStore.getPersonelById(1)!;
      const xml = buildSgkXmlPayload("ISE_GIRIS", p, "2026-04-15");
      assert.ok(xml.includes("<SGK_Bildirge_Paketi"));
      assert.ok(xml.includes(`<TCKN>${p.tc_kimlik_no}</TCKN>`));
      assert.ok(xml.includes("<IseGirisBildirgesi>"));
    });
  });

  // ---------------------------------------------------------------------------
  // 7. BORDRO MUHASEBE FİŞİ ÇİFT KAYIT DENGESİ (VUK / TDHP)
  // ---------------------------------------------------------------------------
  describe("7. Bordro Muhasebe Fişi Çift Kayıt İlkesi", () => {
    test("7.1. Bordrolardan türetilen yevmiye fişinde Borç = Alacak kuruş kuruşuna eşit olmalı", () => {
      const bordrolar = personelStore.calculatePeriodBordrolar("2026-03");
      const voucher = generatePayrollJournalVoucher(bordrolar);

      assert.ok(voucher.lines.length >= 4);
      assert.strictEqual(voucher.isBalanced, true);
      assert.strictEqual(voucher.totalDebit, voucher.totalCredit);
      assert.ok(voucher.totalDebit > 0);

      // Borç hesapları: 720 ve/veya 770
      const debitAccounts = voucher.lines.filter((l) => l.debit > 0).map((l) => l.account_code);
      assert.ok(debitAccounts.some((a) => a.startsWith("720") || a.startsWith("770")));

      // Alacak hesapları: 335 (Net), 360 (Vergi), 361 (SGK)
      const creditAccounts = voucher.lines.filter((l) => l.credit > 0).map((l) => l.account_code);
      assert.ok(creditAccounts.some((a) => a.startsWith("335")));
      assert.ok(creditAccounts.some((a) => a.startsWith("360")));
      assert.ok(creditAccounts.some((a) => a.startsWith("361")));
    });
  });
});
