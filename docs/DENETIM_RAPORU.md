# TabiaERP mevzuat denetim raporu

Tarih: 2026-10-13  
Kapsam: `AGENTS.md`, `.cursor/rules`, `prisma/schema.prisma`, `server.ts`, `src/`, `src/tests`  
Yöntem: `mevzuat-denetimi` skill ve uzman taraması. Uygulama kodu değiştirilmedi.  
Uyarı: Bu rapor yazılım incelemesidir. Mevzuat yorumu yetkili bir SMMM/YMM tarafından onaylanmalıdır. “doğrulanmalı” işaretli satırlar resmi tarife ile teyit edilmeden koda gömülmemelidir.

## 1) Muhasebe eksikleri

| Konu | Durum | Dosya | Yapılacak |
| --- | --- | --- | --- |
| Borç = alacak kontrolü ve kesin fişte kilit | Var | `src/server/routes/erp.routes.ts`, `src/server/controllers/yevmiye.controller.ts` | Dengeli kesin fiş yolu korunacak. |
| Kapalı mali yıl engeli | Var | `src/server/services/period.service.ts` | Yevmiye, fatura, bordro ve maliyet taslağında çağrılıyor. |
| Dönem kilidi yalnız yıl; dönem kaydı yoksa yıl açık sayılıyor | Eksik | `prisma/schema.prisma` (`FiscalPeriod`), `src/server/services/period.service.ts` | Ay kapanışı eklenecek. Kayıtsız yılın açık sayılması bilinçli politika olarak yazılacak. |
| Dengesiz fiş `allow_unbalanced` ile taslak yazılabiliyor | Hatalı | `src/server/routes/erp.routes.ts` | Bu bayrak kaldırılacak. Taslak da borç=alacak olmadan yazılmayacak. |
| Fiş numarası şirket genelindeki adet + 1 | Hatalı | `src/server/routes/erp.routes.ts` | Yıl ve şirket bazında boşluksuz sıra, tek transaction. Eşzamanlı kayıt çakışması engellenecek. |
| Para hesabı `number` / `Math.round` | Hatalı | `src/server/routes/erp.routes.ts`, `src/server/services/kobi.logic.ts`, `src/server/services/bordroHesap.logic.ts` | Ara hesap `Decimal`. Veritabanı yazımı `Decimal(18,2)`. |
| `MevzuatParametre` tablosu yok | Eksik | `prisma/schema.prisma` | KDV, tevkifat, stopaj, GV dilimi geçerlilik tarihine göre bu tablodan okunacak. |
| KDV oranı varsayılan %20 koda gömülü | Hatalı | `prisma/schema.prisma` (`FaturaSatir.kdvOran`), `src/server/routes/erp.routes.ts`, `src/server/routes/uyarlama.routes.ts` | Oran kartı / parametre tablosu. Satır oranı belgeden gelecek, kod varsayılanı olmayacak. |
| Onaylı fatura yevmiye kesmiyor; 191 / 391 satırı yok | Eksik | `src/server/routes/erp.routes.ts` (`POST /fatura`) | Onaylı alışta 191, satışta 391 fişi. İptal silme değil, ters fiş. 190 / 360 ayrı. |
| Ters kayıt kaynak fişin tarihine değil bugüne bakıyor | Hatalı | `src/server/routes/erp.routes.ts` (`/yevmiye/fisler/:id/duzelt`) | Dönem kilidi ve fiş tarihi kaynak fişin tarihi olacak. Kapalı aya ters fiş yazılmayacak. |
| Kapanış bakiyesi taslakları ve önceki yılları da alıyor | Hatalı | `src/server/services/yearEnd.service.ts` (`loadBalances`) | Yalnız ilgili yılın `KESIN` fişleri. 6/7 hesapları yıl süzgeciyle kapanacak. |
| Mizan, bilanço ve gelir tablosu örnek fiş deposundan okunuyor | Hatalı | `src/modules/yevmiye/services/maliTabloEngine.ts` | Canlı `yevmiye_satirlari`. Örnek tutarlar beyanname sayılmayacak. |
| 7/B maliyet fişi reddediliyor, 790–798 yansıtması yok | Eksik | `src/server/services/uretimMaliyet.logic.ts` | 7/B seçili şirkette 790–798 ve 799 fişi. Tutarlar girilen maliyetten gelecek. |
| Stok değerleme (ağırlıklı ortalama veya FIFO) yok | Eksik | `prisma/schema.prisma` (`CompanyAyar` yalnız `maliyetYontemi`) | Şirket ayarı ve çıkış maliyeti bu ayardan hesaplanacak. |
| Satış faturası stok miktarını negatife indirebiliyor | Hatalı | `src/server/routes/erp.routes.ts` (`recomputeStokQty`, fatura stok hareketi) | Çıkış öncesi eldeki miktar kontrol edilecek. Negatif stok yazılmayacak. |
| Amortisman fişi üretilmiyor | Eksik | `src/server/services/yearEnd.logic.ts` | Sabit kıymet defteri ve VUK 313–321 amortisman fişi. Oranlar doğrulanmalı. |
| Kur değerleme fişi üretilmiyor | Eksik | `src/server/services/yearEnd.logic.ts` | Dönem sonu döviz değerleme tablosu ve fiş. Kur kaynağı doğrulanmalı. |
| Ortaklık stopajı %10 sabit; dağıtım yevmiye açmıyor | Hatalı | `src/server/services/kobi.logic.ts`, `src/server/routes/erp.routes.ts` | Stopaj parametre olacak. Onay resmi beyanname veya fiş sanılmayacak; fiş ayrı adım. |
| e-Defter paketi resmi XBRL / berat değil | Eksik | `src/server/services/edefter.logic.ts` | Paket iç kontrol olarak kalacak. GİB berat iddiası eklenmeyecek. Resmi şema doğrulanmalı. |

## 2) SGK / bordro eksikleri

| Konu | Durum | Dosya | Yapılacak |
| --- | --- | --- | --- |
| Brütten nete sıra ve kümülatif GV | Var | `src/modules/personel/services/payrollCalculator.ts`, `src/server/routes/erp.routes.ts` | Önceki ay `gvMatrah` toplanıyor. Bu yol korunacak. |
| Bilinmeyen bordro yılı API’de 422 | Var | `src/server/services/bordroHesap.logic.ts` | `payrollDraftFromEngine` kayıt yoksa hesaplamıyor. |
| `getPayrollParameters` kayıtsız yılı 2026 tarifesine düşürüyor | Hatalı | `src/modules/personel/services/payrollParameters.ts` | Düşme kaldırılacak. Doğrudan çağrı da 422 verecek. |
| SGK, GV dilimi, asgari ücret ve damga kod sabiti | Hatalı | `src/modules/personel/services/payrollParameters.ts` | `MevzuatParametre` tablosu, dönem geçerliliği ile. |
| 2025 brüt asgari ücret kodda 20.002,50; 2026 değeri 26.005,50 | Hatalı, doğrulanmalı | `src/modules/personel/services/payrollParameters.ts` | 2024 ve 2025 tarifeleri aynı yazılmış. Resmi kurul kararı ile düzeltilecek, tahmin yazılmayacak. |
| Bordro fişi her zaman 770 | Eksik | `src/server/services/bordroFis.logic.ts` | Üretim personelinde 720, genel yönetimde 770. Seçim personel biriminden gelecek. |
| Eksik günde SGK matrahı tam ay taban/tavanına çekiliyor | Hatalı | `src/modules/personel/services/payrollCalculator.ts` | Prim günü ile orantılı taban/tavan. `missing_day_code` hesaba girecek. |
| 5510 teşviki sunucuda varsayılan açık | Hatalı, doğrulanmalı | `src/modules/personel/services/payrollCalculator.ts` | Teşvik yalnız kanun no `05510` ise. İşveren kısa vade tehlike sınıfından okunacak. |
| Asgari ücret istisnası eksik günde tam ay kalıyor | Hatalı, doğrulanmalı | `src/modules/personel/services/payrollCalculator.ts` | İstisna gün oranının resmi kuralı doğrulanacak, sonra uygulanacak. `asgari_ucret_istisnasi_var` okunacak. |
| Aylık prim ve hizmet bildirgesi üretilmiyor | Eksik | `src/modules/personel/services/sgkService.ts` | Ekran 4A giriş/çıkış XML’i üretiyor. APHB/MUHSGK veri raporu ayrı; resmi kabul iddia edilmeyecek. |
| İş kazası bildirimi yok | Eksik | `src/modules/personel/services/sgkService.ts` | Süre parametre olacak. İş kazası kaydı ve yasal süre uyarısı eklenecek. |
| 335 / 361 / 360 taslak satırları var, fiş kesinleşmiyor | Var | `src/server/services/bordroFis.logic.ts` | Kesinleştirme ayrı onay adımı olarak kalacak. |
| Bordro kaydında damga vergisi kolonu yok | Eksik | `prisma/schema.prisma` (`Bordro`) | Damga tutarı ayrı `Decimal` alan. Fiş satırı ile aynı kaynak. |
| Personel kartı tarayıcı deposu ve Postgres birlikte | Hatalı | `src/modules/personel/services/personelStore.ts`, `src/server/routes/erp.routes.ts` | Özlük tek kaynak: veritabanı. |
| TCKN düz metin ve listede açık | Hatalı | `prisma/schema.prisma` (`Personel.tckn`), `src/server/routes/erp.routes.ts` | Saklama şifreli, ekranda maskeli. Loga TCKN yazılmayacak. |
| Kıdem tavanı 46.637,42 koda gömülü | Hatalı, doğrulanmalı | `src/modules/personel/components/PersonelRaporlarView.tsx` | Tavan parametre. Rapor tarayıcıdaki örnek listeden değil, kayıtlı bordrodan üretilecek. |
| MUHSGK / APHB resmi gönderim yok | Eksik | `src/modules/personel/components/SgkBildirimView.tsx` | Veri raporu ve yasal süre uyarısı kalacak. SGK kabulü iddia edilmeyecek. Süreler parametre olacak. |
| Bordro sorumlusu rolü yok | Eksik | `prisma/schema.prisma` (`Role`) | Ücret verisini yalnız yönetici ve bordro sorumlusu görecek. |

## 3) Güvenlik sorunları

| Konu | Durum | Dosya | Yapılacak |
| --- | --- | --- | --- |
| JWT, kask, giriş hız sınırı, şirket filtresi | Var | `server.ts`, `src/server/security/moduleAccess.ts` | Korunacak. |
| Denetim satırı uygulama katmanında silinemiyor | Var | `src/server/audit/prismaAuditMiddleware.ts` | Veritabanında silme/güncelleme kısıtı da konacak. Denetim yazılamazsa asıl işlem geri alınacak. |
| Otomatik denetim yalnız yevmiye, cari, stok kartı ve kullanıcı | Eksik | `src/server/audit/prismaAuditMiddleware.ts` | Fatura, bordro, personel, kasa/banka ve ortaklık yazmaları eklenecek. |
| KOBİ yazmalarında dönem kilidi ve denetim yok | Eksik | `src/server/routes/erp.routes.ts` (`/kobi/*`) | Ortak, gider ve kâr dağıtımı da aynı yazma kuralına girecek. |
| Ücret verisi muhasebe rolüne açık | Hatalı | `src/server/controllers/auth.controller.ts`, `prisma/schema.prisma` | Bordro modülü ayrı izin. Depo ve genel muhasebe bu veriyi görmeyecek. |
| TCKN ve ücret KVKK | Hatalı | `Personel`, `personelStore.ts` | Şifreleme, maske, rol. |
| Dengesiz yevmiye taslağı istemciden açılabiliyor | Hatalı | `src/server/routes/erp.routes.ts` | `allow_unbalanced` kaldırılacak. |
| Entegratör parolası AES-256-GCM | Var | `src/server/routes/uyarlama.routes.ts` | Korunacak. Anahtar repoda olmayacak. |
| Hata metninde TCKN ve bağlantı dizgesi maskeleniyor | Var | `src/server/security/publicError.ts` | Korunacak. |
| Yedek hatası ham `error.message` döndürüyor | Hatalı | `src/server/routes/uyarlama.routes.ts` (`POST /sistem/backup/run`) | Cevap ve yedek günlüğü sabit cümle olacak. |
| Personel ve bordro yazmasında Zod yok | Eksik | `src/server/routes/erp.routes.ts` | `POST /personel` ve `POST /bordro/calculate` şema ile doğrulanacak. `profil` gövdenin tamamını saklamayacak. |
| `.gitignore` içinde `.env` yok | Hatalı | `.gitignore` | `.env` yok sayılacak. Bu oturumda git deposu görünmedi; dosyanın indekste olup olmadığı ayrıca bakılacak. Sır sızdıysa yenilenecek. |

## 4) Test eksikleri

| Konu | Durum | Dosya | Yapılacak |
| --- | --- | --- | --- |
| Borç = alacak ve ters kayıt | Var | `src/tests/financial.test.ts` | Korunacak. |
| Kümülatif GV dilim geçişi ve bilinmeyen yıl 422 | Var | `src/tests/faz5_personel_bordro_sgk.test.ts`, `src/tests/faz14_duzeltme.test.ts` | Korunacak. |
| Şirket dışı şube 403 ve log maskesi | Var | `src/tests/faz11_kabul.test.ts` | Korunacak. |
| Kapalı dönem yardımcısı `isPeriodLocked` var; `assertPeriodOpen` yolu test edilmiyor | Eksik | `src/tests/financial.test.ts`, `src/server/services/period.service.ts` | Kilitli mali yılda fatura, yevmiye ve bordro yazısının 409 döndüğü test. |
| Fiş numarasının yıl içinde boşluksuz ve tekil olması | Eksik | `src/tests` | İki eşzamanlı kayıt ve silinen fişten sonra sıra testi. |
| Negatif stok reddi | Eksik | `src/tests` | Eldeki miktarın üstünde satış faturası 409. |
| Parametre yıl değişimi (2024, 2025, 2026 resmi tarife) | Eksik | `src/tests/faz5_personel_bordro_sgk.test.ts` | Sabit rakamı değil, tablodan okunan dönemi doğrulayan test. 2025 değeri doğrulanmalı. |
| `getPayrollParameters` 2026’ya sessiz düşüş | Eksik | `src/tests` | Kayıtsız yıl hata vermeli; 2026 tarifesi kullanılmamalı. |
| Bordro fişinde 720 / 770 seçimi | Eksik | `src/tests/faz10_menu_yetki.test.ts` | Üretim personeli 720, yönetim 770. |
| KDV oranı parametreden; %20 varsayılan yok | Eksik | `src/tests` | Farklı oranlı satır ve varsayılan oran yasağı. |
| Ortaklık testi yalnız pay matematiği | Eksik | `src/tests/kobi_ortaklik.test.ts` | Stopajın parametreden geldiği ve fiş açılmadığı doğrulanacak. |
| Denetim kapsamı fatura ve bordro | Eksik | `src/tests/accounting_audit_service.test.ts` | Bu modellerde insert sonrası denetim satırı. Silme reddi de test edilecek. |
| SGK tavan/taban kısılması ve 5510 varsayılanı | Eksik | `src/tests/faz5_personel_bordro_sgk.test.ts` | Tavan üstü ve taban altı brütte `sgkBase`. Teşviksiz personelde %5 uygulanmamalı. |
| Şirket izolasyonu sahte fonksiyonla | Eksik | `src/tests/api_tenant_security.test.ts` | Başka şirketin cari, fiş ve bordro kaydının boş/404 döndüğü sorgu testi. |

## En önemli 5 iş

1. `MevzuatParametre` tablosu: KDV, SGK, GV dilimi, damga, kıdem tavanı, 5510 teşviki ve kâr payı stopajı koddan çıkacak. 2025/2026 rakamları, eksik günde istisna ve tehlike sınıfı oranı resmi karar ile doğrulanacak.
2. Onaylı fatura 191/391 yevmiye fişi kesecek. Tutarlar `Decimal` olacak. Cari, stok ve ortaklık toplamı da `number` ile yuvarlanmayacak.
3. Stok çıkışı negatife düşmeyecek. Değerleme yöntemi şirket ayarı olacak. Mizan ve bilanço canlı yevmiyeden üretilecek.
4. Bordro fişi 720 veya 770 kullanacak. 5510 varsayılanı kapanacak. Damga saklanacak. TCKN şifrelenecek. Ücreti yalnız yönetici ve bordro sorumlusu görecek.
5. Fiş numarası yıl içinde boşluksuz olacak. Ters kayıt kaynak tarihe bakacak. Kapanış yalnız o yılın kesin fişlerini alacak. Denetim fatura, bordro ve personeli de kapsayacak; yazılamazsa işlem geri alınacak.

Uygulama kodu bu adımda değiştirilmedi.
