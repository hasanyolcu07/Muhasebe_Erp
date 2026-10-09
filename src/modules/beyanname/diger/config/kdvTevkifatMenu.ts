import type { RightMenuItem } from "@/components/ui";

/** KDV Tevkifat Beyannamesi — sağ dikey iç menü */
export const KDV_TEVKIFAT_MENU_ITEMS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },

  { id: "g_genel", label: "1. Genel Bilgiler", isGroup: true },
  { id: "s1_1", label: "1.1 İdari Bilgiler", level: 1 },

  { id: "g_satici", label: "2. Kesinti Yapılan Satıcılar", isGroup: true },
  { id: "s2_1", label: "2.1 Satıcı Listesi", level: 1 },

  { id: "g_vergi", label: "3. Vergi Bildirimi", isGroup: true },
  { id: "s3_1", label: "3.1 Tam Tevkifat", level: 1 },
  { id: "s3_2", label: "3.2 Kısmi Tevkifat", level: 1 },
  { id: "s3_3", label: "3.3 İsteğe Bağlı Tevkifat", level: 1 },
  { id: "s3_4", label: "3.4 Vergi Özeti", level: 1 },

  { id: "g_duzenleme", label: "4. Düzenleme Bilgileri", isGroup: true },
  { id: "s4_1", label: "4.1 Düzenleyen", level: 1 },

  { id: "g_ekler", label: "5. Ekler", isGroup: true },
  { id: "s5_1", label: "5.1 Ek Bildirimler", level: 1 },

  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];
