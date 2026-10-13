# Cursor'a Verilecek Promptlar

## Hazırlık (1 kez)
1. Bu klasördeki `AGENTS.md` ve `.cursor/` klasörünü projenin ana dizinine kopyala.
2. Cursor'da projeyi aç. Her promptu YENİ bir sohbette, sırayla ver.
3. Bir prompt bitmeden diğerine geçme. Her adım sonunda `npm run lint` ve `npm test` geçmeli.

---

## Prompt 1 – Kod denetimi (kod yazmaz)
```
AGENTS.md ve .cursor/rules altındaki tüm dosyaları oku.
mevzuat-denetimi skill'ini uygula.
prisma/schema.prisma, server.ts, src/ ve src/tests klasörlerini incele.
Kod DEĞİŞTİRME. Sadece rapor ver:
1) Muhasebe eksikleri 2) SGK/bordro eksikleri 3) Güvenlik sorunları 4) Test eksikleri
Her bulgu: Konu | Durum | Dosya | Yapılacak. Sonda en önemli 5 işi sırala.
Raporu docs/DENETIM_RAPORU.md olarak kaydet.
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```

## Prompt 2 – Temel düzeltmeler
```
AGENTS.md ve .cursor/rules/30-guvenlik-veri.mdc dosyalarını oku. docs/DENETIM_RAPORU.md'yi oku.
Sadece şunları yap:
- .env Git takibinden çıkar (.gitignore'a ekle, .env.example'ı güncelle). Gerçek sır dosyaya yazma.
- Şema yönetimini Prisma migration'a çevir; package.json'a db:migrate scripti ekle. Paket adını tabiaerp yap.
- Tüm para alanlarını Decimal(18,2) yap (migration ile). Koddaki float para hesaplarını Decimal'e çevir.
- Her sorguda companyId ve rol kontrolünü doğrula, eksik olanları düzelt.
Bitince kod-denetcisi ajanını çalıştır, lint+test çalıştır, kısa rapor ver.
Bir prompt bitmeden diğerine geçme. Her adım sonunda `npm run lint` ve `npm test` geçmeli.
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```

## Prompt 3 – Mevzuat parametre tablosu
```
AGENTS.md ve .cursor/rules/10-muhasebe.mdc, 20-sgk-bordro.mdc dosyalarını oku.
MevzuatParametre tablosunu oluştur: anahtar, değer (Decimal), geçerlilik başlangıç, geçerlilik bitiş, kaynak/açıklama.
src/server/mevzuat altında parametreyi tarihe göre okuyan servis yaz (parametre yoksa hata).
Anahtarlar: KDV oranları, SGK işçi/işveren/işsizlik payları, SGK taban/tavan, gelir vergisi dilimleri, damga vergisi oranı, asgari ücret, asgari ücret istisna tutarları, kıdem tavanı.
DEĞERLERİ KENDİN UYDURMA: seed dosyasında her değeri TODO(MEVZUAT-DOGRULA) ile bırak ve bana doğrulatacağın liste ver.
Test yaz: tarihe göre doğru değer, parametre yoksa hata.
Bir prompt bitmeden diğerine geçme. Her adım sonunda `npm run lint` ve `npm test` geçmeli.
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```

## Prompt 4 – Muhasebe çekirdeği
```
AGENTS.md, .cursor/rules/10-muhasebe.mdc ve yevmiye-fisi skill'ini oku. muhasebe-uzmani ajanını kullan.
Yap:
- THP ana hesaplarını seed et; ana hesapları kilitle, alt hesap eklemeye izin ver.
- Yevmiye fişi servisi: borç=alacak, sıralı fiş no, kapalı dönem kilidi, ters kayıt, denetim satırı.
- Raporlar: yevmiye defteri, defter-i kebir, mizan, bilanço, gelir tablosu (API + basit ekran).
- Dönem kapanış/açılış fişi.
Her adım için test yaz. Bitince kod-denetcisi ajanını çalıştır.
Bir prompt bitmeden diğerine geçme. Her adım sonunda `npm run lint` ve `npm test` geçmeli.
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```

## Prompt 5 – KDV, fatura, stok
```
AGENTS.md ve .cursor/rules/10-muhasebe.mdc oku. muhasebe-uzmani ajanını kullan.
Yap:
- Satış/alış/iade faturasından otomatik yevmiye fişi (191, 391, 120, 320, 153/152, 600).
- KDV beyan dönem raporu (191/391/190/360), tevkifat desteği (oranlar parametre tablosundan).
- EBelgeAdapter arayüzü + mock uygulama (UBL-TR alanları hazır; gerçek entegratör sonra).
- Stok: ağırlıklı ortalama ve FIFO (şirket ayarı), negatif stok engeli, kg/ton/adet/bobin birim dönüşümü.
Test yaz, kod-denetcisi ajanını çalıştır.
Bir prompt bitmeden diğerine geçme. Her adım sonunda `npm run lint` ve `npm test` geçmeli.
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```

## Prompt 6 – Bordro ve SGK
```
AGENTS.md, .cursor/rules/20-sgk-bordro.mdc ve bordro-hesaplama skill'ini oku. sgk-uzmani ajanını kullan.
Yap:
- Bordro hesabını kuraldaki sırayla yaz (kümülatif gelir vergisi, SGK taban/tavan, asgari ücret istisnası, eksik gün).
- Personel için kümülatif GV matrahı sakla.
- Bordrodan muhasebe fişi (770/720, 335, 361, 360).
- APHB veri raporu, MUHSGK veri raporu, eksik gün nedeni kodu.
- İşe giriş/çıkış süre uyarıları.
- Yıllık izin, kıdem ve ihbar tazminatı hesapları.
- TCKN/IBAN/maaş maskeleme ve bordro erişim yetkisi.
Parametreleri sadece MevzuatParametre'den oku. Test yaz, kod-denetcisi ajanını çalıştır.
Bir prompt bitmeden diğerine geçme. Her adım sonunda `npm run lint` ve `npm test` geçmeli.
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```

## Prompt 7 – Kasa, banka, çek-senet, demirbaş, maliyet
```
AGENTS.md ve .cursor/rules/10-muhasebe.mdc oku. muhasebe-uzmani ajanını kullan.
Yap:
- Kasa ve banka hareketleri + otomatik fiş (100, 102).
- Çek/senet takibi (101, 121, 321).
- Demirbaş kartı ve amortisman (VUK 313–321, normal/azalan bakiyeler), dönem sonu amortisman fişi.
- Döviz kur farkı ve dönem sonu değerleme.
- Üretim maliyeti (710–750, 7/A veya 7/B ayarı) çivi-tel ürün reçetesiyle.
Test yaz, kod-denetcisi ajanını çalıştır.
Bir prompt bitmeden diğerine geçme. Her adım sonunda `npm run lint` ve `npm test` geçmeli.
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```

## Her prompttan sonra
```
mevzuat-denetimi skill'ini çalıştır ve sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ver.
```
