# TabiaERP

Çivi ve tel imalatı için muhasebe ERP'si. Kayıtlar PostgreSQL'de durur. Tarayıcı, sunucunun reddettiği işlemi başarılı saymaz.

## Çalıştırma

1. PostgreSQL ayakta olsun. `.env.example` dosyasını `.env` olarak kopyalayın.
2. `JWT_SECRET` ve `JWT_REFRESH_SECRET` değerlerini en az 32 karakterlik rastgele dizilerle değiştirin.
3. `DATABASE_URL` içine kendi veritabanı kullanıcınızı yazın.
4. `SEED_ADMIN_PASSWORD` en az 10 karakter, büyük harf, küçük harf, rakam ve özel karakter içersin.
5. Bağımlılıklar: `npm install`
6. Şema: `npx prisma migrate deploy`
7. İlk şirket ve yönetici: `npm run db:seed` (`SEED_ADMIN_PASSWORD` ortamda dolu olmalı)
8. Uygulama: `npm run dev` — adres `http://127.0.0.1:3000/login`

Bu bilgisayardaki test veritabanı Docker konteyneri `tabiaerp-pg` içindedir ve yalnız `127.0.0.1:5434` adresini dinler. Docker Desktop kapalıysa konteyner de durur. Bağlantı dizesi `.env` dosyasındaki `DATABASE_URL` alanındadır.

Sunucu `HOST` tanımlı değilse yalnız bu bilgisayarı dinler. Varsayılan yönetici şifresi kaynak kodda yoktur.

## Güvenlik

- Erişim jetonu 15 dakika. Yenileme jetonu sunucuda tutulur, çıkışta iptal edilir.
- Beş hatalı giriş hesabı 15 dakika kilitler.
- Şifre değiştirme ve iki adımlı doğrulama: girişten sonra sağ üst menü, Hesap güvenliği.
- Kesin yevmiye fişi silinmez. Ters kayıt açılır.
- Kapalı mali dönemde fiş yazılmaz.
- Denetim satırı güncellenmez ve silinmez.

## Kapsam

Canlı tablolar: şirket, şube, dönem, kullanıcı, cari ve cari hareket, stok ve stok hareket, yevmiye, hesap planı, fatura, personel, bordro. Henüz ayrı tabloya taşınmamış ekranlar hata verir; tarayıcıya sessiz kayıt yazılmaz.
