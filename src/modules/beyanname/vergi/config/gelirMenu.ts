import type { RightMenuItem } from "@/components/ui";

/** Yıllık Gelir Vergisi — sağ dikey iç menü */
export const GELIR_MENU_ITEMS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },

  { id: "g_genel", label: "1. Genel Bilgiler", isGroup: true },
  { id: "s1_1", label: "1.1 İdari Bilgiler", level: 1 },
  { id: "s1_2", label: "1.2 Mükellef / Aile Bilgileri", level: 1 },

  { id: "g_kazanc", label: "2. Kazanç Bildirim Detayı", isGroup: true },
  { id: "s2_1", label: "2.1 Ticari Kazanç", level: 1 },
  { id: "s2_2", label: "2.2 Zirai Kazanç", level: 1 },
  { id: "s2_3", label: "2.3 Serbest Meslek Kazancı", level: 1 },
  { id: "s2_4", label: "2.4 Ücretler", level: 1 },
  { id: "s2_5", label: "2.5 Gayrimenkul Sermaye İradı", level: 1 },
  { id: "s2_6", label: "2.6 Menkul Sermaye İradı", level: 1 },
  { id: "s2_7", label: "2.7 Diğer Kazanç ve İratlar", level: 1 },
  { id: "s2_8", label: "2.8 Kazançlar Toplamı", level: 1 },

  { id: "g_indirim", label: "3. İndirimler", isGroup: true },
  { id: "s3_1", label: "3.1 Şahıs Sigorta / BES", level: 1 },
  { id: "s3_2", label: "3.2 Eğitim / Sağlık", level: 1 },
  { id: "s3_3", label: "3.3 Bağış ve Yardımlar", level: 1 },
  { id: "s3_4", label: "3.4 Diğer İndirimler", level: 1 },

  { id: "g_istisna", label: "4. İstisnalar", isGroup: true },
  { id: "s4_1", label: "4.1 Kazanç İstisnaları", level: 1 },
  { id: "s4_2", label: "4.2 Ücret İstisnaları", level: 1 },

  { id: "g_vergi", label: "5. Vergi Bildirimi", isGroup: true },
  { id: "s5_1", label: "5.1 Gelir Vergisi Matrahı", level: 1 },
  { id: "s5_2", label: "5.2 Hesaplanan Vergi", level: 1 },
  { id: "s5_3", label: "5.3 Mahsuplar", level: 1 },
  { id: "s5_4", label: "5.4 Ödenecek / İade", level: 1 },

  { id: "g_bilanco", label: "6. Ayrıntılı Bilanço / Gelir Tablosu", isGroup: true },
  { id: "bil_aktif", label: "6.1 Aktif", level: 1 },
  { id: "bil_pasif", label: "6.2 Pasif", level: 1 },
  { id: "bil_dipnot", label: "6.3 Dipnot", level: 1 },
  { id: "bil_gt", label: "6.4 Gelir Tablosu", level: 1 },
  { id: "bil_basit", label: "6.5 Basit Usul Özeti", level: 1 },
  { id: "bil_isletme", label: "6.6 İşletme Hesabı Özeti", level: 1 },

  { id: "g_duzenleyen", label: "7. Düzenleyen", isGroup: true },
  { id: "s7_1", label: "7.1 SM / SMMM Bilgileri", level: 1 },

  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];
