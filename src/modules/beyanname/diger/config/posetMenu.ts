import type { RightMenuItem } from "@/components/ui";

/** Poşet Beyannamesi (GEKAP) — sağ dikey iç menü */
export const POSET_MENU_ITEMS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },

  { id: "g_genel", label: "1. Genel Bilgiler", isGroup: true },
  { id: "s1_1", label: "1.1 İdari Bilgiler", level: 1 },
  { id: "s1_2", label: "1.2 Mükellef Bilgileri", level: 1 },

  { id: "g_poset", label: "2. Plastik Poşete Ait Bilgiler", isGroup: true },
  { id: "s2_1", label: "2.1 Poşet Satış / Dağıtım", level: 1 },
  { id: "s2_2", label: "2.2 Poşet Özeti", level: 1 },

  { id: "g_diger", label: "3. Diğer Ürünlere İlişkin GEKAP", isGroup: true },
  { id: "s3_1", label: "3.1 Diğer Ürün Bildirimleri", level: 1 },

  { id: "g_mahsup", label: "4. İstisnalar ve Mahsup İşlemleri", isGroup: true },
  { id: "s4_1", label: "4.1 İstisnalar", level: 1 },
  { id: "s4_2", label: "4.2 Mahsup İşlemleri", level: 1 },
  { id: "s4_3", label: "4.3 Ödenecek / İade", level: 1 },

  { id: "g_duzenleme", label: "5. Düzenleme Bilgileri", isGroup: true },
  { id: "s5_1", label: "5.1 Düzenleyen", level: 1 },

  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];
