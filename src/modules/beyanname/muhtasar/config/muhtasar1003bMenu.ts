import type { RightMenuItem } from "@/components/ui";

/**
 * GIB Muhtasar 1003B (ücret + prim/hizmet odaklı) —
 * aynı iç içe sağ menü; ücret/SGK ağırlıklı etiketler.
 */
export const MUHTASAR_1003B_MENU_ITEMS: RightMenuItem[] = [
  { id: "prepare", label: "Hazırlama" },

  { id: "g_genel", label: "1. Genel Bilgiler", isGroup: true },
  { id: "s1_1", label: "1.1 İdari Bilgiler", level: 1 },
  { id: "s1_2", label: "1.2 Vergi Sorumlusu", level: 1 },

  { id: "g_vergiye_tabi", label: "2. Vergiye Tabi İşlemler (Ücret)", isGroup: true },
  { id: "s2_1", label: "2.1 Ücret Matrah / Vergi Bildirimi", level: 1 },
  { id: "s2_2", label: "2.2 Mahsup Edilen Vergiler", level: 1 },

  { id: "g_vergi_bildirim", label: "3. Vergi Bildirimi", isGroup: true },
  { id: "s3_1", label: "3.1 Ücret Ödeme Türü Özeti", level: 1 },
  { id: "s3_2", label: "3.2 Tahakkuk Özeti", level: 1 },

  { id: "g_sgk", label: "4. SGK Bildirimleri", isGroup: true },
  { id: "s4_1", label: "4.1 İşyeri Sicil Numarası", level: 1 },
  { id: "s4_2", label: "4.2 Sigortalı Çalışan Bilgileri", level: 1 },
  { id: "s4_3", label: "4.3 Tahakkuk Nedenleri", level: 1 },

  { id: "g_duzenleme", label: "5. Düzenleme Bilgileri", isGroup: true },
  { id: "s5_1", label: "5.1 Düzenleyen", level: 1 },

  { id: "g_ekler", label: "6. Ekler", isGroup: true },
  { id: "s6_1", label: "6.1 Sporcu Teşviki (GVK Geç. 72)", level: 1 },
  { id: "s6_2", label: "6.2 Yurt Dışı Hizmet İndirimi", level: 1 },
  { id: "s6_3", label: "6.3 Yeraltı Maden İşletmeleri", level: 1 },
  { id: "s6_4", label: "6.4 İstihdam Teşviki", level: 1 },
  { id: "s6_5", label: "6.5 GVK Geç. 80 Stopaj Teşviki", level: 1 },
  { id: "s6_6", label: "6.6 Gelir Vergisi Stopaj Teşviki", level: 1 },
  { id: "g_6_7", label: "6.7 Kanun Kapsamı Bildirimler", isGroup: true, level: 1 },
  { id: "s6_7_1", label: "6.7.1 4691 Sayılı Kanun", level: 2 },
  { id: "s6_7_2", label: "6.7.2 6550 Sayılı Kanun", level: 2 },
  { id: "s6_8", label: "6.8 Serbest Bölgeler GV İstisnası", level: 1 },
  { id: "s6_9", label: "6.9 Kültür Yatırımları", level: 1 },
  { id: "s6_10", label: "6.10 Ar-Ge Stopaj Teşviki", level: 1 },

  { id: "accounts", label: "Hesap Bağlantıları" },
  { id: "list", label: "Oluşturulan Beyannameler" },
  { id: "outputs", label: "Çıktılar" },
];
