---
name: mevzuat-parametre
description: Yürürlük tarihli mevzuat parametresi ekleme, okuma ve ekran işleri. Oran/tutar/tavan/taban/KDV/tevkifat parametrelerine dokunurken kullan.
---
# Mevzuat Parametresi

Yeni parametre eklerken:
1. Anahtar adı: `alan.konu.alt` (örn. `sgk.taban`). Birimi belirle: oran (kesir) veya TL veya gün.
2. Zorunlu anahtar listesine ekle (tek yer). Seed'e DEĞER YAZMA.
3. Okuma: `getMevzuatParametre(anahtar, tarih)`. Tarih bordro ayı başı veya belge tarihidir.
4. Ekranda ilgili yıl bölümüne ekle; yıl içinde ek "yürürlük dönemi" eklenebilsin; çakışma engellensin.
5. Hesap kullandıysa değeri kayda kopyala (snapshot).
6. Testler: tarihe göre doğru değer, yok → 422, çakışan aralık reddi, kesir/yüzde dönüşümü, yıl içi iki dönemde doğru değer.
