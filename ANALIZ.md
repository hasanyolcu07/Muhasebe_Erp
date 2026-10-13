# Cursor Sonuçlarının Analizi (Prompt 1–7)

> Not: Proje zip dosyası bana ulaşmadı; yalnız sonuç dosyası (docx) geldi. Bu yüzden menü eksikleri iki yolla ele alındı: (1) docx'te adı geçen menüler, (2) Cursor'un kodu tarayıp raporlaması için Prompt 5. Hedef menü `docs/MENU_HEDEF.md` içindedir.

## Genel durum
Cursor 7 adımı uygulamış; lint ve 187 test geçiyor. Muhasebe çekirdeği, fatura-fiş bağlantısı, stok yöntemleri, kasa/banka/çek, bordro motoru ve parametre tablosu eklenmiş. Ancak mimaride ciddi açıklar ve "tüm işletmeler" hedefine uymayan kısımlar var.

## Kritik bulgular
| # | Bulgu | Neden önemli |
|---|-------|--------------|
| 1 | Giriş bilgileri `admin / admin` ve bir sabit parola sonuç dosyasında yazılı; varsayılan admin hesabı var | Güvenlik açığı. Parolaları değiştirin, seed'de sabit parola olmasın |
| 2 | Personel kartı, puantaj ve bordro listesi tarayıcı localStorage'da; DB'deki personel tablosu dar. Bordro ekranı sunucu yerine tarayıcı motorunu kullanıyor | İki ayrı hesap motoru, iki veri kaynağı. Veri kaybı ve yanlış bordro riski |
| 3 | TCKN DB'de düz metin, bordro ve bildirge uçlarında açık dönüyor; "Bordro Sorumlusu" ve "Salt Okur" rolü yok | KVKK ve yetki ihlali |
| 4 | Parametreler "yıl" bazlı tek aralıkta (1 Ocak–31 Aralık) | Asgari ücret/SGK tavanı/kıdem tavanı yıl içinde değişebilir; KDV oranı belge tarihine bağlıdır. Yıl içi ikinci dönem girilemiyor |
| 5 | Şema ve ekranlarda hâlâ KDV varsayılanı 20; oran kesir/yüzde karışıyor | Hatalı KDV riski |
| 6 | Çekirdek "çivi-tel + 7/B" varsayımıyla kurulmuş (şirket 7/B, reçete, bobin, üretim fişleri) | Genel ERP hedefine aykırı. Sektör şablonuna ayrılmalı |
| 7 | Finans uçları (kasa, çek, demirbaş, döviz, maliyet) bir "yol listesi" yüzünden devre dışı kalmış; düzeltilmiş ama izin listesi yaklaşımı kırılgan | Yeni uçlar sessizce korumasız veya çalışmaz kalabilir |
| 8 | Demirbaş, döviz kuru, reçete/sarf yalnız API; ekranı yok | Kullanıcı kullanamaz |
| 9 | AuditLog'da şirket alanı yok; veritabanı seviyesinde silme engeli yok; personel/bordro/fatura izlenmiyor | Denetim izi güvenilir değil |
| 10 | Bordro: motor float kullanıyor, eski fiş üretici (360.01/720) hâlâ var, 2026'ya düşen yedek tarife var, Zod yok | Hatalı hesap ve fiş |
| 11 | Fatura: iskonto ve KDV dahil fiyat yok, satış iadesi maliyeti bugünkü ortalama, istisna/ihraç kayıtlı/indirilemeyecek KDV yok | Fatura-fiş eksik |
| 12 | Fiş numarası yarışı (eşzamanlı iki fiş), dönem kontrolü transaction dışında, kebir hesap kırılımı yok, hesap planı CRUD'da Zod yok, ters fiş kaynağa bağlı değil | Muhasebe bütünlüğü |
| 13 | e-Defter yalnız JSON paket (resmî berat değil); beyan raporları kısmi; gelir tablosu 60–69 eşlemesi yok | Resmî çıktı yok; "hazırlık" olarak etiketlenmeli |
| 14 | Testler kısmen kendi içinde tanımlı fonksiyonu test ediyor; gerçek DB/tenant testi yok | Yanlış güven |
| 15 | Çalışma klasöründe git deposu görünmemiş; `.env` indeksten çıkarılamamış; kayıtlar commit edilmemiş | İz ve sızıntı riski |

## Bilinen ekran/menü durumu
Çalışan: Defterler, Yıl sonu, Hesap planı, Fatura, Personel kartları/puantaj/bordro/SGK bildirim/Mevzuat parametreleri, Kasa/Banka/Çek-Senet.
Yarım/eksik: Sabit kıymet (eski taslak), Demirbaş, Döviz, Reçete/Sarf (ekransız API); teklif/sipariş/irsaliye akışı, ücret pusulası, banka ödeme listesi, izinler, avans/kesintiler, vergi/beyan menüsü, ortaklar/sermaye, raporlar (cari yaşlandırma vb.), şirket profili ayarları, kullanıcı/rol yönetimi ekranı. Kesin liste Prompt 5 ile çıkarılacak.

## Önceki dosyalar: kullanılacak mı?
| Dosya | Karar |
|---|---|
| AGENTS.md | DEĞİŞTİR (v2: genel ERP, yeni altın kurallar) |
| .cursor/rules/00-proje.mdc | DEĞİŞTİR |
| .cursor/rules/10-muhasebe.mdc | DEĞİŞTİR (çivi-tel çıkarıldı, şirket profili, öğrenilen dersler) |
| .cursor/rules/20-sgk-bordro.mdc | DEĞİŞTİR (tek motor, ay bazlı parametre, durum, teşvik) |
| .cursor/rules/30-guvenlik-veri.mdc | DEĞİŞTİR (parola, roller, varsayılan reddet) |
| .cursor/rules/40-kod-test.mdc | DEĞİŞTİR (gerçek test, regresyon, CI) |
| .cursor/agents/muhasebe-uzmani.md | AYNEN KULLAN |
| .cursor/agents/sgk-uzmani.md | AYNEN KULLAN |
| .cursor/agents/kod-denetcisi.md | DEĞİŞTİR (yeni kontrol listesi) |
| .cursor/skills/yevmiye-fisi | AYNEN KULLAN |
| .cursor/skills/bordro-hesaplama | DEĞİŞTİR |
| .cursor/skills/mevzuat-denetimi | DEĞİŞTİR |
| YENİ | rules/50-menu-moduller.mdc, rules/60-mevzuat-parametre.mdc, agents/menu-denetcisi.md, skills/menu-envanteri, skills/mevzuat-parametre, docs/MENU_HEDEF.md, docs/SMMM_SORULARI.md |

## Öncelik
1. Güvenlik (1, 3, 9, 15)  2. Veri tek kaynak (2)  3. Parametre dönemi (4, 5)  4. Genel ERP + menü (6, 7, 8)  5. Muhasebe/KDV/Bordro tamamlama (10–13)  6. Test ve yayın (14)
