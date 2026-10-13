---
name: menu-envanteri
description: Mevcut menü ve ekranları koddan çıkarıp hedef menü ile karşılaştırır, eksik menüler için iskelet ekler.
---
# Menü Envanteri

1. Menü tanımını bul (sidebar/layout/route dosyaları). Uydurma yok.
2. `docs/MENU_ENVANTERI.md` oluştur: Menü | Alt menü | Yol | Ekran dosyası | API | Yetki | Durum (Çalışıyor / Yarım / Sahte veri / Ekransız API).
3. `docs/MENU_HEDEF.md` ile karşılaştır; Eksik / Fazla / Yarım listesini yaz.
4. Menüyü tek dosyaya topla (`src/config/menu.ts`) ve izin + durum + şirket profili koşulunu ekle.
5. Eksik öğeler için "Yakında" iskeleti ekle (boş ekran değil; kısa açıklama + rozet). Hiçbirine sahte veri koyma.
6. API'si olan ama ekranı olmayan uçları listele; ekran işi ayrı prompt olarak planlanır.
7. Test: yetkisiz kullanıcı öğeyi görmez; doğrudan adres 403; menüdeki her yol bir route'a bağlı.
