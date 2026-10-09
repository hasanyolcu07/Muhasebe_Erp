import { api } from "@/services/api";
import tdhpSeed from "@/data/tdhp_seed.json";

export type CoaLookup = { id: number; code: string; name: string };

const FALLBACK_ACCOUNTS: CoaLookup[] = (tdhpSeed as Array<{ code: string; name: string }>).map((item, idx) => ({
  id: idx + 1,
  code: item.code,
  name: item.name,
}));

/** Birleşik hesap planı araması — önce cari endpoint, gerekirse fis-dekont fallback, ardından yerel TDHP */
export async function lookupChartOfAccounts(q?: string, limit = 50): Promise<CoaLookup[]> {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (limit) qs.set("limit", String(limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  try {
    const res = await api<{ items: CoaLookup[] }>(`/cari/lookups/chart-of-accounts${suffix}`);
    if (res.items && res.items.length > 0) return res.items;
  } catch {
    /* fallback to local */
  }

  try {
    const res = await api<{ items: CoaLookup[] }>(`/fis-dekont/lookups/coa${suffix}`);
    if (res.items && res.items.length > 0) return res.items;
  } catch {
    /* fallback to local */
  }

  // Yerel TDHP Planı filtresi
  const query = (q || "").trim().toLowerCase();
  let filtered = FALLBACK_ACCOUNTS;
  if (query) {
    filtered = FALLBACK_ACCOUNTS.filter(
      (a) => a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query)
    );
  }
  return filtered.slice(0, limit);
}

export function formatCoaDisplay(item: CoaLookup | null | undefined): string {
  if (!item) return "";
  return `${item.code} — ${item.name}`;
}
