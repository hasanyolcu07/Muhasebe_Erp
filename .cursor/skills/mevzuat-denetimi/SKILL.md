---
name: mevzuat-denetimi
description: Projeyi muhasebe/SGK mevzuatı, güvenlik ve menü uyumu açısından tarar; eksikleri tablo halinde raporlar. Denetim istendiğinde kullan.
---
# Mevzuat Denetimi (v2)

1. `prisma/schema.prisma`, `server.ts`, `src/server`, `src/modules`, `src/tests`, menü dosyalarını oku.
2. Kontrol et:
   - Decimal, parametre okuma (tarihli), yedek değer, kesir/yüzde karışması
   - Fiş servisi tekliği, fiş no, dönem kilidi, ters kayıt bağı, hesap planı kilidi
   - KDV (satır oranı, iskonto, tevkifat, tahakkuk), stok (yöntem, negatif, iade maliyeti)
   - Bordro sırası, kümülatif GV, eksik gün, teşvik, fiş hesapları
   - Yetki (rol matrisi, moduleAccess, companyId), denetim izi, KVKK, localStorage
   - Sektör varsayımı sızıntısı, menü uyumu
3. Her bulgu: Konu | Durum (Var/Eksik/Hatalı) | Dosya | Yapılacak.
4. En önemli 5 işi sırala.
5. Emin olmadığın mevzuat maddesini "doğrulanmalı" yaz ve `docs/SMMM_SORULARI.md` dosyasına ekle.
