# TabiaERP – Tespit Edilen Eksikler

> ÖNEMLİ: GitHub, `src/` ve `prisma/` klasörlerinin içine otomatik erişime izin vermedi. Aşağıdaki liste README, dosya listesi ve package.json'a dayanır. Kodu görmeden doğrulayamadığım maddeler "Kontrol et" olarak işaretlidir. Tam kod denetimi için Prompt 1'i Cursor'da çalıştır.

## A. Repoda gördüğüm sorunlar
| # | Bulgu | Neden önemli |
|---|-------|--------------|
| 1 | `.env` dosyası repoda görünüyor | Şifre/anahtar sızıntısı. Git'ten çıkar, anahtarları yenile |
| 2 | README `prisma migrate deploy` diyor, package.json'da yalnız `db:push` var | Tutarsız şema yönetimi; üretimde migration şart |
| 3 | Paket adı `react-example` | Düzelt (`tabiaerp`) |
| 4 | Uygulama başlıkları: kasa/banka, çek/senet, demirbaş, KDV beyan, e-belge, maliyet "canlı tablolar" listesinde yok | Muhasebe kapsamı eksik |

## B. Muhasebe mevzuatı – olması gerekenler
| Konu | Durum |
|------|-------|
| Tek Düzen Hesap Planı tam ve kilitli ana hesaplar | Kontrol et |
| Para alanlarında Decimal | Kontrol et |
| Mizan, defter-i kebir, bilanço, gelir tablosu | Kontrol et / muhtemelen eksik |
| KDV (191/391/190/360), tevkifat, KDV beyan raporu | Eksik görünüyor |
| e-Fatura / e-Arşiv / e-İrsaliye / e-Defter altyapısı (UBL-TR, entegratör arayüzü) | Eksik görünüyor |
| Kasa, banka, çek-senet | Eksik görünüyor |
| Demirbaş ve amortisman (VUK 313–321) | Eksik görünüyor |
| Stok değerleme (ağırlıklı ort./FIFO), negatif stok engeli | Kontrol et |
| İmalat maliyeti (710–750, 7/A–7/B) | Eksik görünüyor |
| Döviz, kur farkı, dönem sonu değerleme, reeskont, karşılıklar | Eksik görünüyor |
| Dönem kapanış/açılış fişleri | Kontrol et |
| Ba/Bs, geçici vergi için veri raporları | Eksik görünüyor |
| Belge saklama (en az 10 yıl, TTK 82) ve arşiv | Eksik görünüyor |
| Mevzuat parametre tablosu (oranlar yıla göre) | Eksik görünüyor |

## C. SGK / bordro – olması gerekenler
| Konu | Durum |
|------|-------|
| Brütten nete doğru sıra, KÜMÜLATİF gelir vergisi | Kontrol et |
| SGK taban/tavan, işçi/işveren/işsizlik payı, teşvik indirimi (parametrik) | Kontrol et |
| Asgari ücret gelir/damga vergisi istisnası | Kontrol et |
| Eksik gün ve eksik gün nedeni kodu, APHB verisi | Eksik görünüyor |
| İşe giriş/çıkış bildirge süre takibi | Eksik görünüyor |
| Fazla mesai, hafta tatili, UBGT | Kontrol et |
| Yıllık izin, kıdem ve ihbar tazminatı | Eksik görünüyor |
| Bordrodan muhasebe fişi (770/720, 335, 361, 360) | Kontrol et |
| MUHSGK için veri raporu | Eksik görünüyor |
| KVKK: TCKN/IBAN/maaş şifreleme-maskeleme, rol bazlı erişim | Kontrol et |

## D. Öncelik sırası
1. `.env` ve migration düzeni (güvenlik)
2. Mevzuat parametre tablosu + Decimal denetimi
3. Muhasebe çekirdeği (mizan, kebir, bilanço, kapanış)
4. KDV + fatura
5. Bordro + SGK
6. Kasa/banka/çek-senet/demirbaş/amortisman/maliyet

Not: Mevzuat yorumları yetkili bir SMMM/YMM tarafından onaylanmalıdır.
