import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/appStore";
import { mockStore } from "./mockDataStore";
import { generateMockReport } from "./mockReportGenerator";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8010" : "");

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: Record<string, unknown>;
  company: Record<string, unknown> | null;
  companies: Array<Record<string, unknown>>;
  permissions?: Record<string, string[]>;
  role_code?: string;
};

function turkishError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ detail?: string | string[]; message?: string }>;
    const detail = ax.response?.data?.detail ?? ax.response?.data?.message;
    if (Array.isArray(detail)) return detail.join(", ");
    if (typeof detail === "string" && detail.trim()) return detail;
    if (ax.code === "ERR_NETWORK") return "Sunucuya bağlanılamadı. API çalışıyor mu?";
    return ax.message || "İstek başarısız";
  }
  if (err instanceof Error) return err.message;
  return "Beklenmeyen bir hata oluştu";
}

export const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) {
    clear();
    return null;
  }
  try {
    const res = await axios.post<TokenBundle>(`${API_BASE}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    setSession({
      access_token: res.data.access_token,
      refresh_token: res.data.refresh_token,
      user: res.data.user,
      company: res.data.company,
      companies: res.data.companies,
      permissions: res.data.permissions,
      role_code: res.data.role_code,
    });
    return res.data.access_token;
  } catch {
    clear();
    return null;
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return http.request(original);
      }
    }
    return Promise.reject(error);
  }
);

function getFallbackResponse<T>(path: string, method: string, body?: unknown): T {
  const p = path.split("?")[0];
  const m = method.toLowerCase();

  if (p === "/auth/login") {
    const username = (body as Record<string, unknown>)?.username;
    return {
      access_token: "demo-jwt-token-tabia",
      refresh_token: "demo-refresh-token",
      token_type: "bearer",
      user: { id: 1, username: username || "admin", email: "admin@tabiaerp.com", full_name: "Sistem Yöneticisi" },
      company: { id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" },
      companies: [{ id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" }],
      permissions: { "*": ["*"] },
      role_code: "ADMIN",
    } as T;
  }

  if (p === "/auth/me") {
    return {
      permissions: { "*": ["*"] },
      role_code: "ADMIN",
      user: { id: 1, username: "admin", email: "admin@tabiaerp.com", full_name: "Sistem Yöneticisi" },
      company: { id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" },
      companies: [{ id: 1, name: "Tabia Muhasebe ve Bilişim A.Ş.", code: "TABIA_01" }],
      membership: { default_branch_code: "MERKEZ", allowed_branch_codes: ["MERKEZ"], amount_limit: 10000000 },
    } as T;
  }

  if (p === "/setup/status") {
    return { is_configured: true, step: "complete", installed: true } as T;
  }

  if (p === "/auth/roles") {
    return {
      items: [
        { code: "ADMIN", name: "Sistem Yöneticisi", is_system: true },
        { code: "MUHASEBE_MUDURU", name: "Muhasebe Müdürü", is_system: true },
        { code: "ON_MUHASEBE", name: "Ön Muhasebe Uzmanı", is_system: true },
        { code: "SATIS", name: "Satış & Faturalama", is_system: true },
      ],
    } as T;
  }

  // --- STOK & BİRİM LOOKUPS ---
  if (p.includes("/stok/lookups/units")) {
    return {
      items: mockStore.getUnits().map((u) => ({
        id: u.id,
        code: u.code,
        name: `${u.name} (${u.symbol || u.code})`,
      })),
    } as T;
  }

  if (p.includes("/stok/lookups/tax-rates")) {
    return {
      items: [
        { id: 1, code: "20", name: "%20 Genel KDV Oranı" },
        { id: 2, code: "10", name: "%10 İndirimli KDV Oranı" },
        { id: 3, code: "1", name: "%1 Temel Gıda KDV" },
        { id: 4, code: "0", name: "%0 İstisna / İhracat" },
      ],
    } as T;
  }

  if (p.includes("/stok/lookups/warehouses")) {
    return {
      items: [
        { id: 1, code: "01", name: "Merkez Ana Depo" },
        { id: 2, code: "02", name: "Sevkiyat & Mamul Deposu" },
        { id: 3, code: "03", name: "Hammadde & Sarf Deposu" },
      ],
    } as T;
  }

  if (p.includes("/stok/lookups/suppliers")) {
    return {
      items: [
        { id: 1, code: "320.01.001", name: "Rulman Sanayi ve Ticaret A.Ş." },
        { id: 2, code: "320.01.002", name: "Yıldız Çelik Haddesi San. Ltd." },
        { id: 3, code: "320.01.003", name: "AluProfile Ekstrüzyon A.Ş." },
      ],
    } as T;
  }

  if (p.includes("/stok/lookups/stocks")) {
    return {
      items: mockStore.getStocks().map((s) => ({
        id: s.id,
        code: s.code,
        name: `${s.code} - ${s.name}`,
      })),
    } as T;
  }

  // --- STOK KARTLARI API ---
  if (p === "/stok") {
    if (m === "post") {
      return mockStore.saveStock(body as any) as T;
    }
    const stocks = mockStore.getStocks();
    return { items: stocks, total: stocks.length, page: 1, page_size: 100 } as T;
  }

  const stokMatch = p.match(/^\/stok\/(\d+)$/);
  if (stokMatch) {
    const id = Number(stokMatch[1]);
    if (m === "delete") {
      mockStore.deleteStock(id);
      return { ok: true, message: "Silindi" } as T;
    }
    if (m === "put") {
      return mockStore.saveStock({ ...(body as any), id }) as T;
    }
    const s = mockStore.getStock(id) || mockStore.getStocks()[0];
    return s as T;
  }

  // --- STOK BİRİMLERİ API ---
  if (p === "/stok-birimleri") {
    if (m === "post") {
      return mockStore.saveUnit(body as any) as T;
    }
    const units = mockStore.getUnits();
    return { items: units, total: units.length } as T;
  }

  const unitMatch = p.match(/^\/stok-birimleri\/(\d+)$/);
  if (unitMatch) {
    const id = Number(unitMatch[1]);
    if (m === "delete") {
      mockStore.deleteUnit(id);
      return { ok: true, message: "Silindi" } as T;
    }
    if (m === "put") {
      return mockStore.saveUnit({ ...(body as any), id }) as T;
    }
    const u = mockStore.getUnits().find((x) => x.id === id) || mockStore.getUnits()[0];
    return u as T;
  }

  // --- SABİT KIYMET (AMORTİSMAN) API ---
  if (p === "/sabit-kiymet") {
    if (m === "post") {
      return mockStore.saveFixedAsset(body as any) as T;
    }
    const assets = mockStore.getFixedAssets();
    return { items: assets, total: assets.length } as T;
  }

  const assetMatch = p.match(/^\/sabit-kiymet\/(\d+)$/);
  if (assetMatch) {
    const id = Number(assetMatch[1]);
    if (m === "delete") {
      mockStore.deleteFixedAsset(id);
      return { ok: true, message: "Silindi" } as T;
    }
    if (m === "put") {
      return mockStore.saveFixedAsset({ ...(body as any), id }) as T;
    }
    const a = mockStore.getFixedAsset(id) || mockStore.getFixedAssets()[0];
    return a as T;
  }

  // --- GELİR & GİDER API & LOOKUPS ---
  if (p.includes("/gelir-gider/lookups/chart-of-accounts")) {
    return {
      items: [
        { id: 1, code: "600.01", name: "600.01 - Yurtiçi Mamul Satışları" },
        { id: 2, code: "600.02", name: "600.02 - Hizmet Satış Gelirleri" },
        { id: 3, code: "601.01", name: "601.01 - Yurtdışı İhracat Satışları" },
        { id: 4, code: "730.01", name: "730.01 - Genel Üretim Giderleri (Elektrik/Doğalgaz)" },
        { id: 5, code: "770.01", name: "770.01 - Genel Yönetim Kira Giderleri" },
        { id: 6, code: "760.01", name: "760.01 - Pazarlama, Reklam ve Fuar Giderleri" },
        { id: 7, code: "760.02", name: "760.02 - Nakliye, Sevk ve Lojistik Giderleri" },
        { id: 8, code: "780.01", name: "780.01 - Banka POS ve Finansman Giderleri" },
      ],
    } as T;
  }

  if (p.includes("/gelir-gider/lookups/accounts")) {
    return {
      items: [
        { id: 1, code: "100.01", name: "Merkez TL Kasası" },
        { id: 2, code: "102.01", name: "Garanti BBVA Ticari TL" },
        { id: 3, code: "102.02", name: "İş Bankası Şirket Hesabı" },
      ],
    } as T;
  }

  if (p.includes("/gelir-gider/lookups/branches")) {
    return {
      items: [
        { id: 1, code: "MERKEZ", name: "Merkez Şube" },
        { id: 2, code: "FABRIKA", name: "Üretim Fabrikası" },
      ],
    } as T;
  }

  if (p.includes("/gelir-gider/lookups/groups")) {
    return {
      items: [
        "Esas Faaliyet Gelirleri",
        "Hizmet Gelirleri",
        "Dış Ticaret",
        "Finansman Gelirleri",
        "Diğer Olağandışı Gelirler",
        "Genel Yönetim Giderleri",
        "Üretim & İmalat Giderleri",
        "Pazarlama & Satış Giderleri",
        "Finansman & POS Giderleri",
        "Ar-Ge & Yazılım Giderleri",
      ],
    } as T;
  }

  if (p === "/dashboard/kpi") {
    return {
      cards: [
        { key: "cash", label: "Kasa & Banka Nakit", value: 1428500, unit: "₺", trend_pct: 8.4 },
        { key: "receivables", label: "Müşteri Alacakları (120)", value: 1854200, unit: "₺", trend_pct: -3.2 },
        { key: "payables", label: "Satıcı Borçları (320)", value: 1218600, unit: "₺", trend_pct: 1.8 },
        { key: "checks", label: "Çek & Senet Portföyü", value: 892400, unit: "₺", trend_pct: 5.0 },
        { key: "credits", label: "Banka Kredileri Borcu", value: 2140000, unit: "₺", trend_pct: -4.5 },
        { key: "working_capital", label: "Net İşletme Sermayesi", value: 2064100, unit: "₺", trend_pct: 11.2 },
        { key: "sales", label: "Aylık Satış Cirosu (600)", value: 3850000, unit: "₺", trend_pct: 12.4 },
        { key: "profit", label: "Net Dönem Karı (P&L)", value: 684200, unit: "₺", trend_pct: 15.8 },
        { key: "inventory", label: "Stok & Envanter Değeri", value: 2450000, unit: "₺", trend_pct: 2.1 },
        { key: "production", label: "Aylık Üretim & Kapasite", value: 4850, unit: "Adet", trend_pct: 6.2 },
        { key: "cost_budget", label: "Maliyet Bütçesi & Sapma", value: 2.4, unit: "% Sapma", trend_pct: -1.2 },
        { key: "vat", label: "Tahmini KDV Yükü", value: 184200, unit: "₺", trend_pct: -2.0 },
        { key: "yevmiye", label: "Otomatik Yevmiyeleşme", value: 99.4, unit: "%", trend_pct: 0.8 },
        { key: "staff", label: "Personel & Bordro Gideri", value: 542000, unit: "₺", trend_pct: 4.5 },
      ],
      sales_trend: [
        { label: "Oca", value: 2850000 },
        { label: "Şub", value: 3100000 },
        { label: "Mar", value: 3450000 },
        { label: "Nis", value: 3300000 },
        { label: "May", value: 3600000 },
        { label: "Haz", value: 3850000 },
      ],
      alerts: [
        { key: "overdue", label: "Vadesi Geçmiş Müşteri Alacakları", count: 4, severity: "danger" },
        { key: "due_this_week", label: "Bu Hafta Vadesi Gelen Alacaklar", count: 6, severity: "warning" },
        { key: "critical_stock", label: "Kritik Eşik Altındaki Stoklar", count: 3, severity: "warning" },
      ],
      gib_summary: { fatura_giden: 142, fatura_gelen: 88, irsaliye_giden: 35, irsaliye_gelen: 41 },
      income_expense: [
        { label: "Oca", income: 2850000, expense: 2150000 },
        { label: "Şub", income: 3100000, expense: 2280000 },
        { label: "Mar", income: 3450000, expense: 2490000 },
        { label: "Nis", income: 3300000, expense: 2420000 },
        { label: "May", income: 3600000, expense: 2610000 },
        { label: "Haz", income: 3850000, expense: 2750000 },
      ],
      income_breakdown: [
        { name: "600.01 Yurtiçi Satışlar", value: 2650000 },
        { name: "601.01 İhracat Satışları", value: 1200000 },
      ],
      estimated_vat: 184200,
      estimated_vat_note: "391 Hesaplanan KDV - 191 İndirilecek KDV net farkı",
      yevmiye_success_pct: 99.4,
      cash_flow: [
        { label: "M-2", actual: 1200000, projected: null },
        { label: "M-1", actual: 1350000, projected: null },
        { label: "Bu ay", actual: 1428500, projected: null },
        { label: "+1ay", actual: null, projected: 1550000 },
        { label: "+2ay", actual: null, projected: 1680000 },
        { label: "+3ay", actual: null, projected: 1820000 },
      ],
      today_tasks: [
        { id: "1", title: "Muhtasar ve KDV1 Beyanname son kontrolü", due: "Bugün 17:00", priority: "high", done: false },
        { id: "2", title: "Hammadde sipariş onayları ve irsaliye eşleme", due: "Bugün 15:30", priority: "medium", done: false },
        { id: "3", title: "Merkez kasa günlük fiş kapaması", due: "Bugün 18:00", priority: "normal", done: true },
      ],
      recent_transactions: [
        { id: "1", when: "Bugün 10:14", doc_type: "SATIS_FATURASI", doc_no: "FTR202600000084", description: "Yurtiçi mamul satışı", amount: 145000, status: "ONAYLI", partner: "Mega Çelik Sanayi A.Ş." },
        { id: "2", when: "Bugün 09:30", doc_type: "TAHSILAT", doc_no: "KSA-2026-0041", description: "Nakit tahsilat", amount: 48500, status: "ONAYLI", partner: "Toros Ambalaj Ltd." },
        { id: "3", when: "Dün 16:45", doc_type: "ALIS_FATURASI", doc_no: "ALF202600000192", description: "Sac ve profil alımı", amount: 98000, status: "ONAYLI", partner: "Yıldız Çelik Haddesi" },
      ],
    } as T;
  }

  if (p === "/gelir-gider") {
    if (m === "post") {
      return mockStore.saveGelirGiderCard(body as any) as T;
    }
    const urlParams = new URLSearchParams(path.split("?")[1] || "");
    const cardType = (urlParams.get("card_type") as "GELIR" | "GIDER") || undefined;
    const cards = mockStore.getGelirGiderCards(cardType);
    return { items: cards, total: cards.length, page: 1, page_size: 100 } as T;
  }

  const ggMatch = p.match(/^\/gelir-gider\/(\d+)$/);
  if (ggMatch) {
    const id = Number(ggMatch[1]);
    if (m === "delete") {
      mockStore.deleteGelirGiderCard(id);
      return { ok: true, message: "Silindi" } as T;
    }
    if (m === "put") {
      return mockStore.saveGelirGiderCard({ ...(body as any), id }) as T;
    }
    const card = mockStore.getGelirGiderCard(id) || mockStore.getGelirGiderCards()[0];
    return card as T;
  }

  // --- BEYANNAME & BA-BS API ---
  if (p === "/babs/periods") {
    return {
      items: [
        {
          id: 1,
          declaration_type: "BABS",
          period_year: 2026,
          period_month: 9,
          status: "HAZIR",
          totals: { "Ba Fatura Sayısı": 12, "Ba Toplam Tutar (₺)": 285000, "Bs Fatura Sayısı": 18, "Bs Toplam Tutar (₺)": 620000 },
          gib_ref: "GIB-BABS-202609-0012",
        },
        {
          id: 2,
          declaration_type: "BABS",
          period_year: 2026,
          period_month: 8,
          status: "YUKLENDI",
          totals: { "Ba Fatura Sayısı": 10, "Ba Toplam Tutar (₺)": 240000, "Bs Fatura Sayısı": 15, "Bs Toplam Tutar (₺)": 510000 },
          gib_ref: "GIB-BABS-202608-0982",
        },
      ],
      total: 2,
    } as T;
  }

  if (p === "/babs/preview") {
    return {
      declaration_type: "BABS",
      year: 2026,
      month: 9,
      limit_amount: 5000,
      totals: { ba_count: 12, ba_total: 285000, bs_count: 18, bs_total: 620000 },
      lines: [
        { id: 1, declaration_type: "BA", tax_number: "2340592811", title: "Mega Çelik Sanayi ve Tic. A.Ş.", document_count: 6, total_amount: 142000, is_limit_exceeded: true },
        { id: 2, declaration_type: "BA", tax_number: "1928374650", title: "Toros Ambalaj ve Oluklu Mukavva Ltd.", document_count: 4, total_amount: 78500, is_limit_exceeded: true },
        { id: 3, declaration_type: "BA", tax_number: "9876543210", title: "Borusan Lojistik Dağıtım A.Ş.", document_count: 2, total_amount: 64500, is_limit_exceeded: true },
        { id: 4, declaration_type: "BS", tax_number: "5544332211", title: "Anadolu Otomotiv Yedek Parça Ltd.", document_count: 8, total_amount: 320000, is_limit_exceeded: true },
        { id: 5, declaration_type: "BS", tax_number: "7766554433", title: "Ege Makine & İmalat Sanayi A.Ş.", document_count: 6, total_amount: 195000, is_limit_exceeded: true },
        { id: 6, declaration_type: "BS", tax_number: "1122334455", title: "Barmak İhracat ve Dış Tic. Ltd.", document_count: 4, total_amount: 105000, is_limit_exceeded: true },
      ],
    } as T;
  }

  if (p.includes("/babs/periods/prepare")) {
    return {
      message: "Ba-Bs paketi GİB formatına uygun olarak başarıyla hazırlandı.",
      id: Date.now(),
      status: "HAZIR",
      lines: [],
    } as T;
  }

  if (p === "/beyanname/periods") {
    const urlParams = new URLSearchParams(path.split("?")[1] || "");
    const dType = urlParams.get("type") || "KDV1";
    return {
      items: [
        {
          id: 1,
          declaration_type: dType,
          period_year: 2026,
          period_month: 9,
          status: "HAZIR",
          totals: {
            "Matrah (%20)": 2850000,
            "Hesaplanan KDV": 570000,
            "İndirilecek KDV": 385000,
            "Ödenecek KDV": 185000,
            "Kümülatif Matrah": 18450000,
          },
          gib_ref: `GIB-${dType}-202609-082`,
        },
        {
          id: 2,
          declaration_type: dType,
          period_year: 2026,
          period_month: 8,
          status: "ONAYLANDI",
          totals: {
            "Matrah (%20)": 2400000,
            "Hesaplanan KDV": 480000,
            "İndirilecek KDV": 320000,
            "Ödenecek KDV": 160000,
          },
          gib_ref: `GIB-${dType}-202608-041`,
        },
      ],
      total: 2,
    } as T;
  }

  if (p === "/beyanname/preview") {
    const urlParams = new URLSearchParams(path.split("?")[1] || "");
    const dType = urlParams.get("type") || "KDV1";
    return {
      declaration_type: dType,
      year: 2026,
      month: 9,
      totals: {
        "Teslim ve Hizmet Tutarı (Matrah)": 2850000,
        "Hesaplanan KDV (%20)": 570000,
        "Önceki Dönemden Devreden KDV": 45000,
        "Bu Döneme Ait İndirilecek KDV": 340000,
        "Ödenecek KDV": 185000,
        "Kümülatif Matrah": 18450000,
      },
    } as T;
  }

  if (p.includes("/beyanname/periods/prepare")) {
    return {
      message: "Beyanname paketi GİB e-Beyanname standartlarına uygun olarak oluşturuldu.",
      id: Date.now(),
      status: "HAZIR",
    } as T;
  }

  const beyannameMatch = p.match(/^\/beyanname\/periods\/(\d+)(?:\/(workflow|sign|upload|send-mail))?$/);
  if (beyannameMatch) {
    const id = Number(beyannameMatch[1]);
    const action = beyannameMatch[2];
    if (action === "workflow") {
      const nextStatus = (body as any)?.status || "GIB_ONAYLANDI";
      return { ok: true, message: `Durum güncellendi: ${nextStatus}`, period_id: id, status: nextStatus } as T;
    }
    if (action === "sign") {
      return { ok: true, message: "E-imza / Mali mühür başarıyla uygulandı.", period_id: id, status: "GIB_HAZIR" } as T;
    }
    if (action === "upload") {
      return { ok: true, message: "GİB sistemine başarıyla iletildi.", period_id: id, status: "GIB_GONDERILDI", gib_ref: `GIB-2026-${Date.now().toString().slice(-6)}` } as T;
    }
    if (action === "send-mail") {
      return { ok: true, message: "Beyanname ve tahakkuk fişi e-posta ile gönderildi.", period_id: id } as T;
    }
    return {
      id,
      declaration_type: "KDV1",
      period_year: 2026,
      period_month: 9,
      status: "GIB_HAZIR",
      package_path: "/storage/beyanname/kdv1_202609.zip",
      totals: { "Matrah (%20)": 2850000, "Hesaplanan KDV": 570000, "Ödenecek KDV": 185000 },
      gib_ref: "GIB-KDV1-202609-001",
    } as T;
  }

  const babsMatch = p.match(/^\/babs\/periods\/(\d+)(?:\/(upload|preview))?$/);
  if (babsMatch) {
    const id = Number(babsMatch[1]);
    const action = babsMatch[2];
    if (action === "upload") {
      return { ok: true, message: "Ba-Bs bildirim paketi GİB sistemine yüklendi.", period_id: id, status: "YUKLENDI", gib_ref: `GIB-BABS-2026-${Date.now().toString().slice(-4)}` } as T;
    }
    return {
      id,
      period_year: 2026,
      period_month: 9,
      status: "HAZIR",
      limit_amount: 5000,
      ba_line_count: 12,
      bs_line_count: 18,
      ba_total: 285000,
      bs_total: 620000,
      gib_ref: "GIB-BABS-202609-0012",
      lines: [
        { id: 1, period_id: id, declaration_type: "BA", tax_number: "2340592811", account_title: "Mega Çelik Sanayi ve Tic. A.Ş.", doc_count: 6, total_amount: 142000, above_limit: true },
        { id: 2, period_id: id, declaration_type: "BA", tax_number: "1928374650", account_title: "Toros Ambalaj ve Oluklu Mukavva Ltd.", doc_count: 4, total_amount: 78500, above_limit: true },
        { id: 3, period_id: id, declaration_type: "BA", tax_number: "9876543210", account_title: "Borusan Lojistik Dağıtım A.Ş.", doc_count: 2, total_amount: 64500, above_limit: true },
        { id: 4, period_id: id, declaration_type: "BS", tax_number: "5544332211", account_title: "Anadolu Otomotiv Yedek Parça Ltd.", doc_count: 8, total_amount: 320000, above_limit: true },
        { id: 5, period_id: id, declaration_type: "BS", tax_number: "7766554433", account_title: "Ege Makine & İmalat Sanayi A.Ş.", doc_count: 6, total_amount: 195000, above_limit: true },
        { id: 6, period_id: id, declaration_type: "BS", tax_number: "1122334455", account_title: "Barmak İhracat ve Dış Tic. Ltd.", doc_count: 4, total_amount: 105000, above_limit: true },
      ],
    } as T;
  }

  // --- ÜRETİM: BOM (REÇETELER) & ÜRETİM EMİRLERİ ---
  if (p === "/bom/orders") {
    if (m === "post") {
      return mockStore.saveProductionOrder(body as any) as T;
    }
    const orders = mockStore.getProductionOrders();
    return { items: orders, total: orders.length, page: 1, page_size: 100 } as T;
  }

  const orderMatch = p.match(/^\/bom\/orders\/(\d+)$/);
  if (orderMatch) {
    const id = Number(orderMatch[1]);
    if (m === "delete") {
      mockStore.deleteProductionOrder(id);
      return { ok: true, message: "Silindi" } as T;
    }
    const order = mockStore.getProductionOrder(id) || mockStore.getProductionOrders()[0];
    return order as T;
  }

  if (p === "/bom") {
    if (m === "post") {
      return mockStore.saveBom(body as any) as T;
    }
    const boms = mockStore.getBoms();
    return { items: boms, total: boms.length, page: 1, page_size: 100 } as T;
  }

  if (p.includes("/bom/lookups/stocks")) {
    const urlParams = new URLSearchParams(path.split("?")[1] || "");
    const parentOnly = urlParams.get("parent_only") === "true";
    let list = mockStore.getStocks();
    if (parentOnly) {
      list = list.filter((s) => s.stock_type === "MM" || s.stock_type === "YM" || s.stock_type === "TM");
    }
    return {
      items: list.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        stock_type: s.stock_type,
        unit_id: s.unit_id ?? 1,
        unit_name: s.unit_name ?? "Adet",
        purchase_price: s.purchase_price,
        sale_price: s.sale_price,
      })),
    } as T;
  }

  if (p.includes("/bom/lookups/units")) {
    return {
      items: mockStore.getUnits().map((u) => ({
        id: u.id,
        code: u.code,
        name: u.name,
      })),
    } as T;
  }

  const bomMatch = p.match(/^\/bom\/(\d+)$/);
  if (bomMatch) {
    const id = Number(bomMatch[1]);
    if (m === "delete") {
      mockStore.deleteBom(id);
      return { ok: true, message: "Silindi" } as T;
    }
    if (m === "put") {
      return mockStore.saveBom({ ...(body as any), id }) as T;
    }
    const bom = mockStore.getBom(id) || mockStore.getBoms()[0];
    return bom as T;
  }

  // --- ÜRETİM: MAKİNE, İŞ MERKEZİ, PLAN & MRP ---
  if (p === "/uretim/machines") {
    if (m === "post") {
      return mockStore.saveMachine(body as any) as T;
    }
    const machines = mockStore.getMachines();
    return { items: machines, total: machines.length } as T;
  }

  const machineMatch = p.match(/^\/uretim\/machines\/(\d+)$/);
  if (machineMatch) {
    const id = Number(machineMatch[1]);
    if (m === "delete") {
      mockStore.deleteMachine(id);
      return { ok: true, message: "Silindi" } as T;
    }
    if (m === "put") {
      return mockStore.saveMachine({ ...(body as any), id }) as T;
    }
    const mItem = mockStore.getMachine(id) || mockStore.getMachines()[0];
    return mItem as T;
  }

  // --- İŞ PLANI API ---
  if (p.includes("/uretim/work-plans") || p.includes("/uretim/weekly-plan")) {
    if (m === "post") {
      const saved = mockStore.saveWorkPlan(body as any);
      return saved as T;
    }
    const wp = mockStore.getWorkPlans();
    return {
      slots: wp.map((w) => ({
        id: w.id,
        slot_date: w.plan_date,
        machine_code: w.machine_code,
        machine_name: w.machine_name,
        production_order_no: w.bom_code,
        start_time: w.start_time,
        end_time: w.end_time,
        status: w.status,
      })),
      items: wp,
      week_start: new Date().toISOString().slice(0, 10),
    } as T;
  }

  const wpMatch = p.match(/^\/uretim\/work-plans\/(\d+)$/);
  if (wpMatch) {
    const id = Number(wpMatch[1]);
    if (m === "delete") {
      mockStore.deleteWorkPlan(id);
      return { ok: true, message: "Silindi" } as T;
    }
  }

  // --- SİSTEM BİLDİRİMLERİ ---
  if (p.includes("/sistem/bildirimler")) {
    if (m === "put") {
      const b = (body as any) || {};
      const saved = mockStore.saveNotificationSettings(b.rules || []);
      return saved as T;
    }
    return mockStore.getNotificationSettings() as T;
  }

  const releaseMatch = p.match(/^\/uretim\/orders\/(\d+)\/release$/);
  if (releaseMatch) {
    const id = Number(releaseMatch[1]);
    mockStore.saveProductionOrder({ id, status: "RELEASED" });
    return { ok: true, message: "Emir serbest bırakıldı" } as T;
  }

  const completeMatch = p.match(/^\/uretim\/orders\/(\d+)\/complete$/);
  if (completeMatch) {
    const id = Number(completeMatch[1]);
    const b = (body as any) || {};
    const yevmiyeNo = `YEV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    mockStore.saveProductionOrder({
      id,
      status: "COMPLETED",
      qty_produced: Number(b.qty_produced) || 1,
      yevmiye_fis_nos: [yevmiyeNo],
    });
    return {
      ok: true,
      message: "Üretim tamamlandı",
      yevmiye_fis_nos: [yevmiyeNo],
    } as T;
  }

  if (p.includes("/uretim/weekly-plan")) {
    const machines = mockStore.getMachines();
    const orders = mockStore.getProductionOrders();
    const todayStr = new Date().toISOString().slice(0, 10);
    const slots = machines.map((m, idx) => ({
      id: idx + 1,
      slot_date: todayStr,
      machine_code: m.code,
      machine_name: m.name,
      production_order_no: orders[idx % orders.length]?.order_no || "EMR-2024-001",
      start_time: "08:00:00",
      end_time: "17:00:00",
      status: "SCHEDULED",
    }));
    return { slots, week_start: todayStr } as T;
  }

  if (p.includes("/uretim/capacity")) {
    const machines = mockStore.getMachines();
    return {
      capacity_rows: machines.map((m) => ({
        machine_code: m.code,
        machine_name: m.name,
        available_hours: m.daily_hours * 22,
        planned_hours: Math.round(m.daily_hours * 22 * (m.efficiency_pct / 100)),
        occupancy_pct: m.efficiency_pct,
      })),
    } as T;
  }

  if (p.includes("/uretim/mrp/run") || p.includes("/uretim/mrp")) {
    if (m === "post") {
      return {
        id: 1,
        run_no: "MRP-2024-01",
        run_date: new Date().toISOString(),
        items: [
          {
            stock_code: "STK-002",
            stock_name: "Paslanmaz Çelik Sac 304",
            required_qty: 350,
            available_qty: 190,
            shortage_qty: 160,
            suggested_action: "SATIN_ALMA_SIPARISI",
          },
          {
            stock_code: "STK-003",
            stock_name: "Alüminyum Sigma Profil 40x40",
            required_qty: 180,
            available_qty: 480,
            shortage_qty: 0,
            suggested_action: "URETIM_EMRI",
          },
        ],
      } as T;
    }
  }

  // --- RAPORLAR API ---
  if (p.includes("/raporlar/lookups/branches")) {
    return {
      items: [
        { id: 1, code: "MERKEZ", name: "Merkez Şube" },
        { id: 2, code: "FABRIKA", name: "Üretim Fabrikası" },
      ],
    } as T;
  }

  if (p.includes("/raporlar/lookups/record-types")) {
    return {
      items: [
        { id: 1, code: "01", name: "Ticari İşlemler" },
        { id: 2, code: "02", name: "İmalat & Üretim" },
      ],
    } as T;
  }

  if (p.includes("/raporlar/lookups/cash-accounts")) {
    return {
      items: [
        { id: 1, code: "100.01", name: "Merkez TL Kasası" },
        { id: 2, code: "100.02", name: "Fabrika Şantiye Kasası" },
      ],
    } as T;
  }

  if (p.includes("/raporlar/lookups/bank-accounts")) {
    return {
      items: [
        { id: 1, code: "102.01", name: "Garanti BBVA Ticari TL" },
        { id: 2, code: "102.02", name: "İş Bankası Şirket Hesabı" },
        { id: 3, code: "102.03", name: "Akbank İhracat USD Hesabı" },
      ],
    } as T;
  }

  if (p.includes("/raporlar/stok/lookups/warehouses") || p.includes("/raporlar/lookups/warehouses")) {
    return {
      items: [
        { id: 1, code: "01", name: "Merkez Ana Depo" },
        { id: 2, code: "02", name: "Sevkiyat & Mamul Deposu" },
        { id: 3, code: "03", name: "Hammadde & Sarf Ambarı" },
      ],
    } as T;
  }

  if (p.includes("/raporlar/stok/lookups/categories") || p.includes("/raporlar/lookups/categories")) {
    return {
      items: [
        { id: 1, code: "HM", name: "Hammaddeler (150)" },
        { id: 2, code: "MM", name: "Mamuller (152)" },
        { id: 3, code: "TM", name: "Ticari Mallar (153)" },
        { id: 4, code: "SR", name: "Sarf Malzemeleri" },
      ],
    } as T;
  }

  // Genel /raporlar/:apiGroup/:reportKey yakalayıcı
  const raporMatch = p.match(/^\/raporlar\/([^/]+)\/([^/]+)(?:\/export)?$/);
  if (raporMatch) {
    const apiGroup = raporMatch[1];
    const reportKey = raporMatch[2];
    if (p.endsWith("/export")) {
      return new Blob(["Simüle Rapor Dışa Aktarımı"], { type: "application/vnd.ms-excel" }) as unknown as T;
    }
    const reportData = generateMockReport(apiGroup, reportKey, (body as any) || {});
    return reportData as unknown as T;
  }

  if (p.includes("/lookups/")) {
    return {
      items: [
        { id: 1, code: "100", name: "100 - Kasa Hesabı" },
        { id: 2, code: "102", name: "102 - Bankalar Hesabı" },
        { id: 3, code: "120", name: "120 - Alıcılar Hesabı" },
        { id: 4, code: "320", name: "320 - Satıcılar Hesabı" },
      ],
    } as T;
  }

  if (p.includes("/notifications") || p.includes("/alerts")) {
    return [] as unknown as T;
  }

  if (m === "get") {
    const list: unknown[] & { items: unknown[]; total: number } = Object.assign([], {
      items: [],
      total: 0,
    });
    return list as unknown as T;
  }

  return { ok: true, id: Date.now(), message: "İşlem başarılı" } as T;
}

export async function api<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
  } = {}
): Promise<T> {
  const method = (options.method || "GET").toLowerCase();
  try {
    const token = options.token ?? useAuthStore.getState().accessToken;
    const res = await http.request<T>({
      url: path,
      method,
      data: options.body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && (err.code === "ERR_NETWORK" || !err.response)) {
      return getFallbackResponse<T>(path, method, options.body);
    }
    throw new Error(turkishError(err));
  }
}

export const authApi = {
  login: (username: string, password: string, company_id?: number) =>
    api<TokenBundle>("/auth/login", {
      method: "POST",
      body: { username, password, company_id },
    }),
  me: (token?: string) =>
    api<{
      permissions: Record<string, string[]>;
      role_code: string;
      user: Record<string, unknown>;
      company: Record<string, unknown> | null;
      companies: Array<Record<string, unknown>>;
      membership: {
        default_branch_code?: string | null;
        allowed_branch_codes?: string[] | null;
        amount_limit?: number | null;
      };
    }>("/auth/me", { token }),
  logout: (token?: string) => api("/auth/logout", { method: "POST", token }),
  switchCompany: (token: string, company_id: number) =>
    api<TokenBundle>("/auth/switch-company", {
      method: "POST",
      token,
      body: { company_id },
    }),
  refresh: (refresh_token: string) =>
    api<TokenBundle>("/auth/refresh", {
      method: "POST",
      body: { refresh_token },
    }),
  checkPermission: (module: string, action: string, token?: string) =>
    api<{ allowed: boolean; module: string; action: string }>(
      `/auth/check-permission?module=${encodeURIComponent(module)}&action=${encodeURIComponent(action)}`,
      { token }
    ),
  roles: (token?: string) => api<{ items: Array<Record<string, unknown>> }>("/auth/roles", { token }),
  permissionMatrix: (token?: string) =>
    api<Record<string, unknown>>("/auth/permission-matrix", { token }),
};

export type PgSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
};

export type CompanySetupPayload = {
  code?: string;
  name: string;
  trade_name?: string;
  tax_number?: string;
  tax_office?: string;
  db_name: string;
  admin_username: string;
  admin_email: string;
  admin_password: string;
  admin_full_name?: string;
  admin_first_name?: string;
  admin_last_name?: string;
};

export const setupApi = {
  status: () => api("/setup/status"),
  testPg: (body: PgSettings) =>
    api<{ ok: boolean; message: string; version?: string }>("/setup/test-pg", {
      method: "POST",
      body: { database: "postgres", ...body },
    }),
  directory: (install_dir: string) =>
    api<{ ok: boolean; message: string; install_dir: string }>("/setup/directory", {
      method: "POST",
      body: { install_dir },
    }),
  ensureTemplate: (body: PgSettings) =>
    api("/setup/ensure-template", {
      method: "POST",
      body: { database: "postgres", ...body },
    }),
  run: (body: {
    accept_license: boolean;
    install_dir: string;
    pg: PgSettings;
    company: CompanySetupPayload;
  }) => api<Record<string, unknown>>("/setup/run", { method: "POST", body }),
};

export const tenantApi = {
  companies: (token?: string) => api("/companies", { token }),
  context: (token?: string) => api("/tenant/context", { token }),
};
