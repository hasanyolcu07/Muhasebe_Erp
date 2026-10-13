# Durum Raporu Promptu

GitHub'daki depo şu an ilk haliyle duruyor (2 commit). Cursor'un yaptığı değişiklikler GitHub'a gitmemiş. Ben de `src/` ve `prisma/` klasörlerini GitHub üzerinden göremiyorum. Bu yüzden aşağıdaki promptu Cursor'da çalıştırın, çıkan `docs/DURUM_RAPORU.md` dosyasını bana yükleyin (veya projeyi zip'leyip yükleyin).

Zip hazırlarken `node_modules`, `dist` ve `.env` dosyalarını dahil ETMEYİN.

```
AGENTS.md ve .cursor/rules altındaki tüm dosyaları oku. mevzuat-denetimi ve menu-envanteri skill'lerini kullan. kod-denetcisi ve menu-denetcisi ajanlarını çalıştır.
Kod DEĞİŞTİRME. Sadece docs/DURUM_RAPORU.md yaz. Uydurma yok; her madde dosya yolu ile gelsin.

Bölümler:
1) Git: son 10 commit, commit edilmemiş dosyalar, `git ls-files .env`, remote adresi, repo özel mi (bilmiyorsan "bilinmiyor" yaz).
2) Kural dosyaları: .cursor/rules içindeki her dosya hangi gerçek dosyalarda devreye giriyor (globs eşleşmesi). Hiç eşleşmeyen kural var mı?
3) PROMPTLAR_V2 Prompt 1–9: her maddenin durumu (Yapıldı / Kısmen / Yapılmadı) + kanıt dosyası.
4) Menü: tüm menü ve alt menüler, ekran dosyası, API, yetki, durum (docs/MENU_ENVANTERI.md ile aynı biçim) ve docs/MENU_HEDEF.md'den farkı.
5) Veri: Prisma modelleri listesi; hâlâ localStorage/sessionStorage kullanan yerler; sabit gömülü oran/tutar/parola arayışı (grep sonuçları: "20", "0.14", "26005", "admin", "Tabia#", "çivi", "tel", "bobin", "7B").
6) Güvenlik: roller, moduleAccess kapsamı (kayıtsız route listesi), AuditLog durumu, TCKN/IBAN saklama biçimi.
7) Test: toplam test sayısı, lint sonucu, gerçek DB ile çalışan test var mı, kendi içinde tanımlı fonksiyonu test eden dosyalar.
8) Çalıştırma: hangi port, README güncel mi, migration listesi.
9) En önemli 10 eksik, öncelik sırasıyla.
```
