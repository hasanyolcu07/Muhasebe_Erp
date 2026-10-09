/** Dashboard Hızlı Erişim — localStorage, max 8 */

export type QuickAccessItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  to: string;
  activeClass?: "active-green" | "active-blue" | "active-purple" | "active-amber" | "active-rose";
};

export const QUICK_ACCESS_MAX = 8;
const STORAGE_KEY = "tabia.dashboard.quickAccess.v1";

export const DEFAULT_QUICK_ACCESS: QuickAccessItem[] = [
  {
    id: "pos",
    title: "Hızlı Satış (POS)",
    description: "Barkod & gruplu satış ekranı",
    icon: "🧾",
    to: "/app/pos",
    activeClass: "active-green",
  },
  {
    id: "excel",
    title: "Excel Akıllı Rapor & Mizan",
    description: "AI kolon eşleme ile içe aktar",
    icon: "📊",
    to: "/app/excel-import",
    activeClass: "active-blue",
  },
  {
    id: "sablon",
    title: "Şablon & Rapor Tasarımcısı",
    description: "GİB e-belge şablonları",
    icon: "🎨",
    to: "/app/sablon-tasarimci",
    activeClass: "active-purple",
  },
];

/** Hub kartlarından üretilebilecek favori kataloğu */
export function buildQuickCatalog(): QuickAccessItem[] {
  // lazy import avoided — filled from moduleHubConfig in consumers
  return [];
}

export function loadQuickAccess(): QuickAccessItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_QUICK_ACCESS];
    const parsed = JSON.parse(raw) as QuickAccessItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_QUICK_ACCESS];
    return parsed.slice(0, QUICK_ACCESS_MAX);
  } catch {
    return [...DEFAULT_QUICK_ACCESS];
  }
}

export function saveQuickAccess(items: QuickAccessItem[]) {
  const next = items.slice(0, QUICK_ACCESS_MAX);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("tabia-quick-access-changed"));
  return next;
}

export function isQuickFavorite(id: string, items?: QuickAccessItem[]): boolean {
  const list = items ?? loadQuickAccess();
  return list.some((x) => x.id === id);
}

export function toggleQuickFavorite(item: QuickAccessItem): { items: QuickAccessItem[]; ok: boolean; message?: string } {
  const current = loadQuickAccess();
  const exists = current.find((x) => x.id === item.id);
  if (exists) {
    const items = saveQuickAccess(current.filter((x) => x.id !== item.id));
    return { items, ok: true };
  }
  if (current.length >= QUICK_ACCESS_MAX) {
    return { items: current, ok: false, message: `Hızlı erişime en fazla ${QUICK_ACCESS_MAX} öğe eklenebilir.` };
  }
  const items = saveQuickAccess([...current, item]);
  return { items, ok: true };
}
