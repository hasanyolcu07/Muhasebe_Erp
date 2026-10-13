---
name: bordro-hesaplama
description: Aylık bordro hesabı (brütten nete), işveren maliyeti, bordro durumu ve muhasebe fişi. Personel maaş işlerinde kullan.
---
# Bordro Hesaplama (v2)

1. Bordro ayı seç; ayın ilk günü için parametreleri `MevzuatParametre`'den oku. Eksikse dur (422).
2. Ocak dışındaysa önceki ay bordrosunu bul (kümülatif matrah için); yoksa dur (422).
3. Kazancı hesapla (gün/30, en çok 30), ek kalemleri ekle.
4. SGK matrahını taban/tavana göre prime günüyle orantılı sınırla; işçi + işsizlik payını hesapla.
5. GV matrahı, kümülatif dilimli gelir vergisi, damga, asgari ücret istisnası (ayara göre).
6. Net ve işveren maliyetini hesapla; 5510 teşviki yalnız uygunluk + parametre varsa.
7. Kullanılan parametre değerlerini bordro satırına kopyala; kümülatif matrahı sakla.
8. Taslak muhasebe fişi: 770 / 720 / 791 (bayrak + profil) borç; 335, 361, 360 alacak.
9. Onayda KESİN: bordro ve fiş kilitlenir.
10. Test: dilim geçişi, tavan/taban, eksik gün, istisna, ay/yıl değişimi, parametre yok → 422, Türkçe karakter (departman metnine bağlı karar yok).

Tüm hesap Decimal; sunucuda tek motor.
