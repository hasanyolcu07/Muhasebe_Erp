# Muhasebe ERP – Ajan Kuralları (v2)

Tüm işletmelerin kullanacağı, Türkiye mevzuatına uygun genel Muhasebe + Bordro ERP'si.
Çok şirketli, çok kullanıcılı. Çivi-tel gibi sektörlere özel işler çekirdeğe gömülmez; "sektör şablonu" olarak eklenir.
Stack: TypeScript, Express, Prisma (PostgreSQL), React, Vite, Zod.

## Altın Kurallar
1. Para her yerde `Decimal`. Motor çıktısı dahil float yok; `toNumber()` yalnız API cevabında, yuvarlamadan sonra.
2. Mevzuat değerleri (KDV, SGK, vergi dilimi, damga, asgari ücret, tavan/taban, kıdem tavanı) koda gömülmez. Yürürlük tarihli parametre tablosundan okunur (bordro ayı / belge tarihine göre). Eski tarife veya "2026'ya düş" gibi yedek YOK; parametre yoksa 422 ve Türkçe açıklama.
3. Mevzuattan emin değilsen tahmin etme: ayar seçeneği sun, koda `TODO(MEVZUAT-DOGRULA)` yaz, `docs/SMMM_SORULARI.md` dosyasına ekle.
4. Kesin kayıt değişmez/silinmez. Düzeltme = ters kayıt (kaynak fişe bağlı, yalnız bir kez). Kapalı dönem kontrolü fiş tarihine göre ve transaction içinde.
5. Tek veri kaynağı PostgreSQL. İş verisi tarayıcı localStorage'a yazılmaz.
6. Her yazma: Zod → tek transaction (dönem kontrolü, numara, kayıt, denetim satırı) → sonuç. Denetim yazılamazsa işlem geri alınır.
7. Her sorguda `companyId`; her yeni uç `moduleAccess` + rol kontrolü + test ile gelir. Tanımsız yol 403.
8. Hata yutulmaz, ham hata mesajı kullanıcıya dönmez. Arayüz sunucunun reddini başarı göstermez.
9. Varsayılan parola yok. TCKN/IBAN/maaş şifreli saklanır, maskeli gösterilir, loglanmaz.
10. Menüdeki her öğe ya çalışır ya "Yakında" rozetlidir. Örnek/sahte veri beyan veya rapor verisi olarak gösterilmez.
11. Her görev: test + `npm run lint` + `npm test` + `kod-denetcisi` + küçük commit.

## Çalışma Şekli
- Önce `.cursor/rules` oku. Bir adımda tek konu.
- Mevzuata dokunan işte `muhasebe-uzmani` veya `sgk-uzmani`; menü/ekran işinde `menu-denetcisi`; bitişte `kod-denetcisi`.
- Bitince kısa rapor: ne yapıldı, hangi test geçti, hangi `TODO(MEVZUAT-DOGRULA)` kaldı, kullanıcının yapacakları.

> Bu yazılım muhasebe/bordro aracıdır. Mevzuat yorumları yetkili SMMM/YMM tarafından onaylanmalıdır.
