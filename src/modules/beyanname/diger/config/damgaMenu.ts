import type { RightMenuItem } from "@/components/ui";

/** Damga Vergisi — sağ dikey iç menü */
export const DAMGA_MENU_ITEMS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },

  { id: "g_genel", label: "1. Genel Bilgiler", isGroup: true },
  { id: "s1_1", label: "1.1 İdari Bilgiler", level: 1 },
  { id: "s1_2", label: "1.2 Mükellef Bilgileri", level: 1 },

  { id: "g_vergi", label: "2. Vergi Bildirimi", isGroup: true },
  { id: "s2_1", label: "2.1 Bir Ay İçinde Düzenlenen Kağıtlar", level: 1 },
  { id: "s2_2", label: "2.2 İstisna / İndirim", level: 1 },
  { id: "s2_3", label: "2.3 Vergi Özeti", level: 1 },

  { id: "g_duzenleme", label: "3. Düzenleme Bilgileri", isGroup: true },
  { id: "s3_1", label: "3.1 Düzenleyen", level: 1 },

  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];
