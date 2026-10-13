import type { RightMenuItem } from "@/components/ui";

/** Kurumlar Geçici Vergi — sağ dikey iç menü */
export const GECICI_MENU_ITEMS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },

  { id: "g_genel", label: "1. Genel Bilgiler", isGroup: true },
  { id: "s1_1", label: "1.1 İdari Bilgiler", level: 1 },
  { id: "s1_2", label: "1.2 Mükellef Bilgileri", level: 1 },

  { id: "g_matrah", label: "2. Matrah", isGroup: true },
  { id: "s2_1", label: "2.1 Ticari Kazanç Matrahı", level: 1 },
  { id: "s2_2", label: "2.2 İlaveler / İndirimler", level: 1 },
  { id: "s2_3", label: "2.3 Geçici Vergi Matrahı", level: 1 },

  { id: "g_vergi", label: "3. Vergi Bildirimi", isGroup: true },
  { id: "s3_1", label: "3.1 Hesaplanan Geçici Vergi", level: 1 },
  { id: "s3_2", label: "3.2 Mahsuplar", level: 1 },
  { id: "s3_3", label: "3.3 Ödenecek / İade", level: 1 },

  { id: "g_duzeltme", label: "4. Düzeltme", isGroup: true },
  { id: "s4_1", label: "4.1 Düzeltme Açıklamaları", level: 1 },
  { id: "s4_2", label: "4.2 Önceki Dönem Mahsupları", level: 1 },

  { id: "g_bilanco", label: "5. Bilanço / Gelir Tablosu", isGroup: true },
  { id: "g_tdhp", label: "5.1 Tek Düzen Hesap Planı", isGroup: true, level: 1 },
  { id: "bil_td_aktif", label: "Aktif", level: 2 },
  { id: "bil_td_pasif", label: "Pasif", level: 2 },
  { id: "bil_td_gt", label: "Gelir Tablosu", level: 2 },
  { id: "g_banka", label: "5.2 Banka", isGroup: true, level: 1 },
  { id: "bil_bk_aktif", label: "Aktif", level: 2 },
  { id: "bil_bk_pasif", label: "Pasif", level: 2 },
  { id: "bil_bk_nazim", label: "Nazım Hesaplar", level: 2 },
  { id: "bil_bk_gt", label: "Gelir Tablosu", level: 2 },
  { id: "g_sigorta", label: "5.3 Sigorta", isGroup: true, level: 1 },
  { id: "bil_sg_aktif", label: "Aktif", level: 2 },
  { id: "bil_sg_pasif", label: "Pasif", level: 2 },
  { id: "bil_sg_gt", label: "Gelir Tablosu", level: 2 },
  { id: "g_katilim", label: "5.4 Katılım Bankası", isGroup: true, level: 1 },
  { id: "bil_kt_aktif", label: "Aktif", level: 2 },
  { id: "bil_kt_pasif", label: "Pasif", level: 2 },
  { id: "bil_kt_bdh", label: "Bilanço Dışı Hesaplar", level: 2 },
  { id: "bil_kt_gt", label: "Gelir Tablosu", level: 2 },
  { id: "g_fk", label: "5.5 Finansal Kiralama", isGroup: true, level: 1 },
  { id: "bil_fk_aktif", label: "Aktif", level: 2 },
  { id: "bil_fk_pasif", label: "Pasif", level: 2 },
  { id: "bil_fk_gt", label: "Gelir Tablosu", level: 2 },
  { id: "g_yf", label: "5.6 Yatırım Fonları", isGroup: true, level: 1 },
  { id: "bil_yf_aktif", label: "Aktif", level: 2 },
  { id: "bil_yf_pasif", label: "Pasif", level: 2 },
  { id: "bil_yf_gt", label: "Gelir Tablosu", level: 2 },

  { id: "g_ekler", label: "6. Ekler", isGroup: true },
  { id: "s6_1", label: "6.1 Kanunen Kabul Edilmeyen Giderler", level: 1 },
  { id: "s6_2", label: "6.2 İstisna / İndirim Listesi", level: 1 },
  { id: "s6_3", label: "6.3 Geçmiş Yıl Zararları", level: 1 },

  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];
