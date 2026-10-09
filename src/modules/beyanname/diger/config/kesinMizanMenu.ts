import type { RightMenuItem } from "@/components/ui";

/** Kesin Mizan — sağ dikey iç menü */
export const KESIN_MIZAN_MENU_ITEMS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },

  { id: "g_genel", label: "1. Genel Bilgiler", isGroup: true },
  { id: "s1_1", label: "1.1 İdari Bilgiler", level: 1 },
  { id: "s1_2", label: "1.2 Dönem / Defter Bilgileri", level: 1 },

  { id: "g_mizan", label: "2. Kesin Mizan", isGroup: true },
  { id: "s2_1", label: "2.1 Kesin Mizan Tablosu", level: 1 },

  { id: "g_duzenleme", label: "3. Düzenleme Bilgileri", isGroup: true },
  { id: "s3_1", label: "3.1 Düzenleyen", level: 1 },

  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];
