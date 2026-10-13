# Cursor'a Verilecek Promptlar (v2)

## Hazırlık (1 kez)
1. Bu paketteki `AGENTS.md`, `.cursor/` ve `docs/` klasörlerini projeye kopyala. Aynı adlı eski dosyaların üzerine yaz (ANALIZ.md'deki tabloya bak).
2. Her promptu YENİ sohbette, sırayla ver. Bir prompt bitmeden diğerine geçme.
3. Her adımdan sonra: lint + test geçmeli ve `git commit` yapılmalı.
4. Mevzuat soruları `docs/SMMM_SORULARI.md` dosyasında toplanır; Cursor tahmin etmez, siz mali müşavirinize sorarsınız.

---

## Prompt 1 – Acil güvenlik
```
AGENTS.md ve .cursor/rules/30-guvenlik-veri.mdc, 40-kod-test.mdc dosyalarını oku. kod-denetcisi ajanını kullan.
Sadece şunları yap:
1) Varsayılan/sabit parolaları kaldır (seed, README, test, belge). SEED_ADMIN_PASSWORD zorunlu ve güçlü olsun; ilk girişte parola değiştirme zorunlu olsun.
2) .env Git'te izleniyorsa `git rm --cached .env` komutunu çalıştır; git deposu yoksa bana tam komutları yaz. .env.example yer tutucu içersin.
3) Roller: ADMIN, MUHASEBE_UZMANI, BORDRO_SORUMLUSU, DEPO_SORUMLUSU, SALT_OKUR. docs/ROL_MATRISI.md yaz. Maaş, TCKN, IBAN yalnız ADMIN ve BORDRO_SORUMLUSU.
4) Yol kapısını "varsayılan reddet" yap (tanımsız yol 403). Her route için moduleAccess kaydı zorunlu olsun; eksikse çöken bir test yaz.
5) AuditLog'a companyId ekle; UPDATE/DELETE'i veritabanı tetikleyicisiyle engelle; testle doğrula. Denetim yazılamazsa işlem geri alınsın. Personel, bordro, fatura, hesap planı, mevzuat yazmaları da denetlensin (TCKN/IBAN/maaş denetim izine yazılmasın).
6) Zod ekle: personel, bordro, hesap planı CRUD, finans uçları. Yedek hatası ham mesaj dönmesin.
7) TCKN ve IBAN'ı şifreli sakla (AES-256-GCM, anahtar .env'den) + arama için ayrı hash; mevcut veriyi migration ile dönüştür. Yetkisiz rolde maskeli dön.
Test yaz. kod-denetcisi çalıştır. Kısa rapor ver.
```

## Prompt 2 – Veriyi tek kaynağa topla
```
AGENTS.md ve .cursor/rules/20-sgk-bordro.mdc, 30-guvenlik-veri.mdc oku. sgk-uzmani ajanını kullan.
1) Kodda localStorage/sessionStorage kullanan tüm iş verisini bul (tabia_personel_* dahil) ve docs/VERI_KAYNAGI.md'ye listele.
2) Personel kartı (ad, TCKN, IBAN, ücret, birim, "üretim personeli" bayrağı, SGK kanun kodu, işyeri), puantaj, izin, avans/kesinti ve bordro listesini PostgreSQL'e taşı: Prisma modeli + migration + API (Zod, companyId, rol, denetim).
3) Ekranları API'ye bağla. Bordro hesaplama ekranı sunucudaki POST /bordro/calculate uç noktasını kullansın.
4) İstemcideki ikinci hesap motorunu ve eski fiş üreticiyi (generatePayrollJournalVoucher, 360.01 kullananı) sil. Tek motor sunucuda ve Decimal olsun. Karşılaştırmayı metin yerine boolean/enum ile yap (Türkçe büyük-küçük harf hatası olmasın).
5) Mevcut localStorage verisini kullanıcı onayıyla tek seferlik DB'ye aktaran bir "içe aktar" düğmesi ekle.
6) Sunucu hatası ekranda gösterilsin, başarı gibi gösterilmesin. Test yaz. kod-denetcisi çalıştır.
```

## Prompt 3 – Parametreleri yürürlük dönemine bağla
```
AGENTS.md, .cursor/rules/60-mevzuat-parametre.mdc ve mevzuat-parametre skill'ini oku. muhasebe-uzmani ve sgk-uzmani ajanlarını kullan.
Mevcut MevzuatParametre ve "Mevzuat Parametreleri" ekranını şuna dönüştür:
- Ekran yıl bazlı kalsın (üst çubuktaki çalışma yılı), ama bir anahtar için yıl içinde birden fazla yürürlük dönemi eklenebilsin ("Dönem ekle"). Çakışma engellensin.
- Okuma her zaman tarihe göre: bordro → ayın ilk günü; fatura → belge tarihi. Çalışma yılı belge tarihinin yerine geçmesin.
- Oran kesir saklansın, ekranda yüzde girilsin; fatura satırındaki KDV oranı da aynı kesir standardına geçsin. Şemadaki kdvOran @default(20) ve tüm sabit 20'leri kaldır; satırda oran zorunlu, parametreden öneri gelsin.
- payrollParameters.ts içindeki gömülü tarifeyi ve "tanımsız yılda 2026'ya düş" yedeğini tamamen sil. Parametre yoksa 422 + Türkçe mesaj + parametre ekranına bağlantı.
- Bordro/fatura satırına kullanılan parametre değerlerini kopyala (snapshot).
- Mevzuat parametresi yazma yetkisi ADMIN ve MUHASEBE_UZMANI; değişiklik denetim satırı bırakır.
- Seed resmi değer yazmasın. Eksik anahtarlar ekranda uyarı olarak görünsün.
Test: yıl içi iki dönemde doğru değer, çakışma reddi, yok → 422, yüzde/kesir dönüşümü, Aralık-Ocak geçişi. kod-denetcisi çalıştır.
```

## Prompt 4 – Genel ERP'ye dönüştür (sektör bağımsız)
```
AGENTS.md ve .cursor/rules/00-proje.mdc, 10-muhasebe.mdc oku. muhasebe-uzmani ajanını kullan.
Proje artık tüm işletmeler için. Yap:
1) Şirket profili ekle: tür (şahıs/limited/anonim/diğer), faaliyet (ticaret/hizmet/imalat), stok yöntemi, maliyet yöntemi (yalnız imalat), e-belge mükellefiyeti. Ayarlar'da ekran olsun.
2) Koddaki ve ekranlardaki "çivi", "tel", "bobin", sabit 7/B varsayımlarını bul (docs/SEKTOR_ENVANTERI.md). Varsayılan şirket "ticaret" olsun. Reçete, üretim emri, üretim maliyeti ve 790/791/796 fişleri yalnız faaliyet=imalat iken açılsın.
3) Çivi-tel'e özel veriyi "sektör şablonu" (seed/ayar dosyası) olarak ayır; çekirdek onsuz çalışsın.
4) Birim dönüşümü kullanıcı tanımlı olsun (kg-ton, adet-koli vb.); bobin gibi sabit katsayı koda gömülü kalmasın.
5) Hesap planı genel THP olsun; şirket türüne göre ortaklar/sermaye menüsü açılsın.
Test: ticaret şirketinde üretim menüsü/fişi yok; imalat şirketinde var. kod-denetcisi çalıştır.
```

## Prompt 5 – Menü envanteri ve eksik menüler
```
AGENTS.md, .cursor/rules/50-menu-moduller.mdc ve menu-envanteri skill'ini oku. menu-denetcisi ajanını kullan.
1) Mevcut menü ve ekranları koddan çıkar; docs/MENU_ENVANTERI.md yaz (Menü | Yol | Ekran | API | Yetki | Durum).
2) docs/MENU_HEDEF.md ile karşılaştır; Eksik/Yarım/Fazla listesi ver.
3) Menüyü tek dosyada topla (izin, durum, şirket profili koşulu). Yetkisiz kullanıcı menüyü görmesin.
4) Eksik menüleri "Yakında" iskeleti olarak ekle; sahte veri koyma.
5) API'si olup ekranı olmayanları (demirbaş, döviz kuru, reçete/sarf, amortisman, kur değerleme) listele ve bu prompt içinde ekranlarını yap: form + liste + hata durumu, rol kontrollü.
6) Raporu docs/MENU_RAPORU.md olarak kaydet; kalan işleri öncelik sırasıyla yaz.
Test: yetkisiz öğe görünmez, doğrudan adres 403, her menü yolu bir route'a bağlı. kod-denetcisi çalıştır.
```

## Prompt 6 – Muhasebe ve KDV/Fatura tamamlama
```
AGENTS.md, .cursor/rules/10-muhasebe.mdc ve yevmiye-fisi skill'ini oku. muhasebe-uzmani ajanını kullan.
Yap:
1) Fiş yazan TÜM yolları (fatura, finans, bordro, yıl sonu, demirbaş, kur) tek servise bağla; doğrudan Prisma ile yevmiye yazan yer kalmasın. Servis: borç=alacak, planda olan fişe açık hesap, dönem kontrolü fiş tarihine göre ve transaction içinde.
2) Fiş no: unique(companyId, yıl, fisNo) + çakışmada yeniden deneme; eşzamanlılık testi.
3) Ters kaydı kaynak fişe bağla (reversalOfId), bir kez; tarih ve dönem kuralları.
4) Kebir hesap bazında kırılsın. Mizan toplamı borç=alacak testi. Hesap planı CRUD'a Zod.
5) Fatura: iskonto, KDV dahil fiyat, istisna, ihraç kayıtlı, indirilemeyecek KDV; kapsamı belli olmayan kalem reddedilsin. Satış iadesi orijinal çıkış maliyetiyle girsin. 150/151 satışı ve alış iadesinde ödenmiş tevkifat için ayar seçeneği koy; karar SMMM'den gelene kadar işlem reddedilsin.
6) KDV tahakkuk fişi (391→191→190→360) ayrı, onaylı bir işlem olsun; beyan raporu "gönderildi" demesin.
7) Stok maliyetini (yearEnd dahil) Decimal'e çevir.
Soruları docs/SMMM_SORULARI.md'ye ekle. Test yaz. kod-denetcisi çalıştır.
```

## Prompt 7 – Bordro ve SGK tamamlama
```
AGENTS.md, .cursor/rules/20-sgk-bordro.mdc ve bordro-hesaplama skill'ini oku. sgk-uzmani ajanını kullan.
Yap:
1) Motor çıktısını Decimal yap (toNumber yalnız API sınırında).
2) Bordro durumu TASLAK → KESİN (onay ayrı yetki); KESİN bordro ve fişi değişmez.
3) İşyeri kartı: SGK sicil, tehlike sınıfı, işveren kısa vadeli sigorta oranı (parametre). 5510 teşviki yalnız personel kanun kodu + işyeri uygunluğu + parametre varsa uygulansın.
4) Ay içi işe giriş/çıkış, ücretsiz izin, rapor/doğum gibi eksik gün nedenleri; neden kodu kataloğu kullanıcı tarafından yüklenebilsin (kod uydurma).
5) Eksik günde asgari ücret istisnası davranışı ayar olsun (tam ay / orantılı); SMMM karar verene kadar varsayılan "uyarı + hesap durur".
6) Fazla mesai katsayıları, 30 gün / 225 saat bölenleri, hafta tatili ve UBGT parametreye taşınsın.
7) Ücret pusulası (PDF) ve banka ödeme listesi (IBAN yalnız yetkili ekranda).
8) Avans/icra/diğer kesintiler ve izin bakiyesi (yıllık izin) ekranları.
9) APHB/MUHSGK veri raporlarında TCKN yalnız yetkili rolde açık.
Test: dilim geçişi, tavan/taban, eksik gün, KESİN bordro kilidi, rol reddi, Türkçe karakter. kod-denetcisi çalıştır.
```

## Prompt 8 – Vergi/beyan hazırlık ve dönem sonu
```
AGENTS.md ve .cursor/rules/10-muhasebe.mdc oku. muhasebe-uzmani ajanını kullan.
"Vergi ve Beyan" menüsünü kur (hepsi veri hazırlık raporu; "gönderildi/kabul" yok):
- KDV dönem raporu ve tahakkuk (Prompt 6 ile uyumlu)
- Muhtasar (bordro ve serbest meslek stopajı verisi) ve kâr payı stopajı
- Geçici vergi ve kurumlar/gelir vergisi hazırlık: ticari kâr, KKEG, istisna, geçmiş yıl zararı, oranlar parametreden
- Ba/Bs veri raporu
- Vergi takvimi (tarih/uyarı; günler parametre)
Dönem sonu: amortisman (kıst ayar), kur değerleme, reeskont (ayar, varsayılan kapalı), karşılıklar, kapanış/açılış (yalnız KESİN fiş, ikinci kapanış yok).
e-Defter: resmî GİB XBRL beratı üretilene kadar "e-Defter" yerine "defter dışa aktarım (resmî değil)" olarak etiketle; XBRL için adapter arayüzü bırak.
Oranları uydurma; parametre yoksa 422. Belirsizleri docs/SMMM_SORULARI.md'ye yaz. Test yaz. kod-denetcisi çalıştır.
```

## Prompt 9 – Test, CI ve yayın hazırlığı
```
AGENTS.md ve .cursor/rules/40-kod-test.mdc oku. kod-denetcisi ve mevzuat-denetimi skill'ini kullan.
1) Gerçek veritabanıyla entegrasyon testleri (test DB): companyId izolasyonu (başka şirket 404), rol reddi, kapalı dönem, ters kayıt tekilliği, fiş no çakışması, AuditLog silme engeli.
2) Kendi içinde tanımlı fonksiyonu test eden testleri gerçek servise çevir.
3) `any` kullanımlarını temizle (catch unknown, Prisma tipleri).
4) GitHub Actions: lint + test.
5) README'yi güncelle (kurulum, migration, ilk yönetici, port, yedekleme/geri yükleme). Gerçek parola yazma.
6) Tam mevzuat-denetimi çalıştır; docs/DENETIM_RAPORU.md'yi güncelle.
Kalan tüm TODO(MEVZUAT-DOGRULA) maddelerini docs/SMMM_SORULARI.md ile eşleştir. Kısa rapor ver.
```

## Her prompttan sonra
```
mevzuat-denetimi skill'ini çalıştır, sadece bu adımda değişen dosyaları denetle. Kalan TODO(MEVZUAT-DOGRULA) listesini ve benim yapacaklarımı ver. Değişiklikleri commit et.
```
