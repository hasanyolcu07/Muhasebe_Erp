import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SidePanel } from "@/components/ui/side-panel";
import { flattenHubFavorites } from "@/config/moduleHubConfig";
import {
  dashboardApi,
  myasistanApi,
  type AiInsight,
  type DashboardKpiResponse,
  type KpiCard,
  type NamedAmount,
} from "../api/dashboardApi";
import {
  DEFAULT_QUICK_ACCESS,
  loadQuickAccess,
  QUICK_ACCESS_MAX,
  saveQuickAccess,
  type QuickAccessItem,
} from "../quickAccess";
import { MyAsistanPanel } from "./MyAsistanPanel";

type Props = {
  branchId?: number;
  recordTypeId?: number;
  userName?: string;
};

type ChartKind = "income_expense" | "income_breakdown" | "cash_flow";
type BreakdownMode = "genel" | "urun";
type ChatMsg = { role: "user" | "ai"; text: string };

const PIE_COLORS = ["#4A89F3", "#9D58E6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

const KPI_ICONS: Record<string, { emoji: string; bg: string }> = {
  // 1. Görsel (Finans, Likidite & Bilanço)
  sales: { emoji: "💰", bg: "#dbeafe" },
  profit: { emoji: "📈", bg: "#dcfce7" },
  cash: { emoji: "🏛️", bg: "#ede9fe" },
  receivables: { emoji: "⏰", bg: "#fef3c7" },
  payables: { emoji: "📤", bg: "#fee2e2" },
  checks: { emoji: "📑", bg: "#dcfce7" },
  credits: { emoji: "💳", bg: "#ede9fe" },
  working_capital: { emoji: "⚖️", bg: "#ccfbf1" },

  // 2. Görsel (Operasyon, Maliyet, Satış & Vergi)
  inventory: { emoji: "📦", bg: "#fce7f3" },
  production: { emoji: "🏭", bg: "#fef9c3" },
  cost_budget: { emoji: "📊", bg: "#e0f2fe" },
  vat: { emoji: "🧾", bg: "#ede9fe" },
  yevmiye: { emoji: "📒", bg: "#ffedd5" },
  staff: { emoji: "👥", bg: "#f3e8ff" },
  orders: { emoji: "📦", bg: "#fce7f3" },
};

function getKpiIcon(key: string) {
  return KPI_ICONS[key] ?? { emoji: "📊", bg: "#f1f5f9" };
}

const KPI_UNIT_HINTS: Record<string, string> = {
  sales: "₺ ciro",
  profit: "₺ net kar",
  cash: "₺ nakit bakiye",
  receivables: "₺ alacak",
  payables: "₺ borç",
  checks: "₺ çek/senet",
  credits: "₺ banka kredisi",
  working_capital: "₺ net işletme",
  inventory: "₺ stok değeri",
  production: "adet mamul",
  cost_budget: "% bütçe payı",
  vat: "₺ kdv tahakkuk",
  yevmiye: "% otomatik fiş",
  staff: "kişi personel",
  orders: "adet sipariş",
};

export type DashboardKpiTile = KpiCard & {
  group: "finans" | "operasyon";
};

type KpiSubItem = {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "bad" | "info";
};

type KpiDetailData = {
  title: string;
  items: KpiSubItem[];
  note?: string;
  action?: { to: string; label: string };
};

function getKpiDetailInfo(key: string, kpi: DashboardKpiResponse | null): KpiDetailData {
  switch (key) {
    case "cash":
      return {
        title: "🏦 Kasa & Banka Nakit Varlıkları Detayı",
        items: [
          { label: "100.01 Merkez TL Kasası", value: "₺ 85.000,00", hint: "Fiziki nakit kasa bakiyesi", tone: "ok" },
          { label: "102.01 Garanti BBVA Ticari TL", value: "₺ 640.500,00", hint: "Ana ticari vadesiz mevduat", tone: "ok" },
          { label: "102.02 İş Bankası Şirket Hesabı", value: "₺ 483.000,00", hint: "Maaş & operasyon hesabı", tone: "ok" },
          { label: "108.01 POS Bloke & Tahsilatlar", value: "₺ 220.000,00", hint: "2 gün içinde hesaba geçecek", tone: "info" },
        ],
        note: "Toplam nakit pozisyonu kısa vadeli tüm acil ödemeleri karşılayacak likiditededir.",
        action: { to: "/app/hub/finans?section=kasa", label: "Kasa & Banka İşlemlerine Git →" },
      };
    case "receivables":
      return {
        title: "⏰ Müşteri Alacakları (120 Cari) & Vade Dağılımı",
        items: [
          { label: "Vadesi Geçmiş Alacaklar", value: "₺ 312.000,00", hint: "4 Cari hesap - Acil tahsilat uyarısı", tone: "bad" },
          { label: "Bu Hafta Vadesi Gelenler", value: "₺ 482.200,00", hint: "6 Fatura vadesi bu hafta", tone: "warn" },
          { label: "Bu Ay İçi Vadeli Alacaklar", value: "₺ 640.000,00", hint: "Normal vadesinde seyreden", tone: "info" },
          { label: "30+ Gün Vadeli Alacaklar", value: "₺ 420.000,00", hint: "Gelecek dönem tahsilatları", tone: "ok" },
        ],
        note: "Ortalama tahsilat süresi (DSO) 41 gün olarak gerçekleşmiştir.",
        action: { to: "/app/hub/kart-tanimlari?section=cari", label: "Cari Hesaplar & Alacak Takibine Git →" },
      };
    case "payables":
      return {
        title: "📤 Satıcı Borçları (320 Cari) & Ödeme Planı",
        items: [
          { label: "Vadesi Geçmiş Borçlar", value: "₺ 115.000,00", hint: "2 Tedarikçi - Öncelikli transfer", tone: "bad" },
          { label: "Bu Hafta Ödenecek Faturalar", value: "₺ 380.600,00", hint: "Hammadde ve sarf alımları", tone: "warn" },
          { label: "Bu Ay İçi Vadeli Borçlar", value: "₺ 450.000,00", hint: "Planlanan EFT/Havale", tone: "info" },
          { label: "Gelecek Vadeli Borçlar (60+ gün)", value: "₺ 273.000,00", hint: "Uzun vadeli tedarik", tone: "ok" },
        ],
        note: "Ödeme takvimi haftalık nakit akışı ile senkronize yönetilmektedir.",
        action: { to: "/app/hub/kart-tanimlari?section=cari", label: "Tedarikçi Borç Takvimine Git →" },
      };
    case "checks":
      return {
        title: "📑 Çek & Senet Portföy Durumu",
        items: [
          { label: "Cüzdandaki Müşteri Çekleri", value: "₺ 520.000,00", hint: "6 Adet müşteri çeki kasada", tone: "ok" },
          { label: "Banka Teminata Verilen Çekler", value: "₺ 280.000,00", hint: "3 Adet teminat çeki bankada", tone: "info" },
          { label: "Tahsile Verilen Portföy", value: "₺ 110.000,00", hint: "2 Adet bankada tahsilde", tone: "info" },
          { label: "Verilen Borç Senetleri", value: "₺ 92.400,00", hint: "2 Adet şirket senedi", tone: "warn" },
        ],
        note: "Önümüzdeki 15 gün içinde vadesi gelen 3 adet çek takibindedir.",
        action: { to: "/app/hub/finans?section=cek-senet-islemleri", label: "Çek & Senet Modülüne Git →" },
      };
    case "credits":
      return {
        title: "💳 Banka Kredileri & Finansman Yükü",
        items: [
          { label: "Kalan Kredi Anapara Borcu", value: "₺ 1.850.000,00", hint: "3 Adet aktif işletme kredisi", tone: "warn" },
          { label: "Bu Ayki Taksit Ödemesi", value: "₺ 124.500,00", hint: "Anapara: ₺95.000 · Faiz: ₺29.500", tone: "info" },
          { label: "Kalan Toplam Faiz Yükü", value: "₺ 165.500,00", hint: "Vade sonuna kadarki faiz", tone: "info" },
          { label: "Ağırlıklı Ortalama Vade", value: "14 Ay", hint: "Aylık eşit taksitli amortisman", tone: "ok" },
        ],
        note: "Kredi taksitleri tablosu Excel'den kopyala-yapıştır ile güncellenebilir.",
        action: { to: "/app/hub/finans?section=banka-kredileri", label: "Banka Kredileri Modülüne Git →" },
      };
    case "working_capital":
      return {
        title: "⚖️ Net İşletme Sermayesi (NİK) & Likidite Rasyoları",
        items: [
          { label: "Toplam Dönen Varlıklar", value: "₺ 4.175.100,00", hint: "Kasa + Banka + Alacak + Stok", tone: "ok" },
          { label: "Kısa Vadeli Yabancı Kaynaklar", value: "₺ 2.111.000,00", hint: "Satıcılar + Krediler + KDV", tone: "warn" },
          { label: "Net İşletme Sermayesi (NİK)", value: "₺ 2.064.100,00", hint: "Pozitif işletme sermayesi", tone: "ok" },
          { label: "Cari Oran (Likidite Gücü)", value: "1.98", hint: "Sektör ortalaması 1.50 (Mükemmel)", tone: "ok" },
        ],
        note: "İşletmenin vadesi gelen tüm kısa vadeli borçlarını karşılama oranı son derece sağlıklıdır.",
        action: { to: "/app/hub/raporlar", label: "Mali Tablolar & Bilanço Raporuna Git →" },
      };
    case "sales":
      return {
        title: "💰 Aylık Satış Cirosu (600) & Satış Kanalları",
        items: [
          { label: "600.01 Yurt İçi Satışlar", value: "₺ 2.650.000,00", hint: "%68.8 ciro payı", tone: "ok" },
          { label: "601.01 İhracat Satışları", value: "₺ 1.200.000,00", hint: "%31.2 ihracat payı (EUR/USD)", tone: "ok" },
          { label: "Aylık Bütçe Hedef Gerçekleşme", value: "% 108.5", hint: "Bütçe: ₺3.55M · Gerçekleşen: ₺3.85M", tone: "ok" },
          { label: "Geçen Aya Göre Büyüme Oranı", value: "+% 12.4", hint: "Sürekli büyüme eğrisi", tone: "ok" },
        ],
        note: "İhracat teslimatları döviz getirisi ve karlılığı olumlu etkilemektedir.",
        action: { to: "/app/hub/satis", label: "Satış & Fatura Yönetimine Git →" },
      };
    case "profit":
      return {
        title: "📈 Gelir Tablosu & Kar Analizi (P&L)",
        items: [
          { label: "Brüt Satış Karı", value: "₺ 1.460.000,00", hint: "%37.9 Brüt kar marjı", tone: "ok" },
          { label: "Faaliyet Karı (EBITDA / FAVÖK)", value: "₺ 912.000,00", hint: "%23.7 Faaliyet marjı", tone: "ok" },
          { label: "Dönem Karı Vergi Karşılığı (%25)", value: "₺ 227.800,00", hint: "Yasal kurumlar vergisi", tone: "warn" },
          { label: "Net Dönem Karı (Net Profit)", value: "₺ 684.200,00", hint: "%17.8 Net kar marjı", tone: "ok" },
        ],
        note: "Maliyet Bütçesi ve Birim Maliyet optimizasyonu sayesinde net karlılık hedefin üzerindedir.",
        action: { to: "/app/hub/uretim?section=maliyet-butce", label: "Maliyet Bütçesi & P&L Tablosuna Git →" },
      };
    case "inventory":
      return {
        title: "📦 Stok & Envanter Değeri (150 / 151 / 152)",
        items: [
          { label: "150 İlk Madde ve Hammadde", value: "₺ 980.000,00", hint: "Sac, profil, plastik granül", tone: "ok" },
          { label: "151 Yarı Mamuller", value: "₺ 420.000,00", hint: "İmalat hattındaki yarı mamuller", tone: "info" },
          { label: "152 Mamul Stokları", value: "₺ 1.050.000,00", hint: "Sevkiyata hazır mamuller", tone: "ok" },
          { label: "Kritik Eşik Altındaki Kalemler", value: "3 Kalem", hint: "Otomatik MRP sipariş önerisi", tone: "bad" },
        ],
        note: "Kritik hammaddeler için tedarik süresi göz önüne alınarak sipariş açılmalıdır.",
        action: { to: "/app/hub/stok", label: "Stok & Depo Modülüne Git →" },
      };
    case "production":
      return {
        title: "🏭 Üretim Kapasitesi & Gerçekleşme Oranı",
        items: [
          { label: "Aylık Gerçekleşen Mamul Üretimi", value: "4.850 Adet", hint: "Planlanan: 5.000 Adet", tone: "ok" },
          { label: "Üretim Planı Gerçekleşme", value: "% 97.0", hint: "Yüksek operasyonel başarı", tone: "ok" },
          { label: "Kapasite Kullanım Oranı (KKO)", value: "% 88.5", hint: "Makine parkuru doluluk oranı", tone: "ok" },
          { label: "Ortalama Makine Verimliliği (OEE)", value: "% 84.2", hint: "Standart üstü performans", tone: "ok" },
        ],
        note: "Üretim Hesaplama sekmesinde günlük üretim ve çalışma günleri dinamik hesaplanır.",
        action: { to: "/app/hub/uretim", label: "Üretim Planı & Makinelere Git →" },
      };
    case "cost_budget":
      return {
        title: "📊 Maliyet Bütçesi & Birim Maliyet Sapması",
        items: [
          { label: "Bütçelenen Birim Maliyet", value: "₺ 480,00", hint: "Standart bütçe hedefi", tone: "info" },
          { label: "Fiili Birim Maliyet (VUK 7/A)", value: "₺ 491,50", hint: "710 + 720 + 730 fiili", tone: "warn" },
          { label: "Birim Maliyet Sapma Oranı", value: "+% 2.4", hint: "Kabul edilebilir tolerans içinde", tone: "warn" },
          { label: "Toplam Aylık İmalat Gideri", value: "₺ 2.385.000,00", hint: "Aylık Maliyet tablosu toplamı", tone: "info" },
        ],
        note: "Üretim Hesaplama, Birim Maliyet, Aylık Maliyet ve Satış Ciro birbirine tam entegredir.",
        action: { to: "/app/hub/uretim?section=maliyet-butce", label: "Maliyet Bütçesi Modülünü Aç →" },
      };
    case "vat":
      return {
        title: "🧾 Tahmini KDV & Yasal Vergi Yükü",
        items: [
          { label: "391 Hesaplanan KDV (Satışlar)", value: "₺ 462.000,00", hint: "Aylık satış faturalarından", tone: "warn" },
          { label: "191 İndirilecek KDV (Giderler)", value: "₺ 277.800,00", hint: "Alış ve hammadde faturalarından", tone: "ok" },
          { label: "Ödenecek Net KDV (360)", value: "₺ 184.200,00", hint: "Dönem beyannamesinde ödenecek", tone: "bad" },
          { label: "Muhtasar & Damga Vergisi", value: "₺ 42.500,00", hint: "Bordro ve stopaj vergileri", tone: "warn" },
        ],
        note: "Tahmini KDV yükünü nakit akış takvimine işleyerek fon ayırınız.",
        action: { to: "/app/hub/muhasebe?section=beyanname", label: "Vergi & KDV Beyannamesine Git →" },
      };
    case "yevmiye":
      return {
        title: "📒 Otomatik Yevmiye Başarısı & E-Dönüşüm",
        items: [
          { label: "GİB E-Fatura / E-Arşiv", value: "% 100.0", hint: "Tam entegrasyon", tone: "ok" },
          { label: "Otomatik Yevmiyeleşme Oranı", value: "% 99.4", hint: "Kurallara uygun fiş üretimi", tone: "ok" },
          { label: "Bekleyen / Hatalı Fiş Kaydı", value: "0 Adet", hint: "Tüm fişler dengelendi", tone: "ok" },
          { label: "E-Defter Berat Uyumu", value: "Onaylı", hint: "GİB standartlarına tam uyumlu", tone: "ok" },
        ],
        note: "GİB ve TDHP kurallarına göre oluşturulan yevmiye fişleri otomatik teyit edilmiştir.",
        action: { to: "/app/hub/muhasebe?section=yevmiye-fisleri", label: "Yevmiye Defterine Git →" },
      };
    case "staff":
      return {
        title: "👥 Personel & Bordro Maliyetleri",
        items: [
          { label: "Toplam Aktif Personel Sayısı", value: "34 Çalışan", hint: "22 Fabrika Üretim · 12 Ofis & Satış", tone: "ok" },
          { label: "Aylık Net Ücret Bordrosu", value: "₺ 365.000,00", hint: "Banka maaş transferleri", tone: "info" },
          { label: "SGK İşveren & İşsizlik Primi", value: "₺ 128.000,00", hint: "Yasal sosyal güvenlik primi", tone: "warn" },
          { label: "Gelir Vergisi & Damga Stopajı", value: "₺ 49.000,00", hint: "Muhtasar beyanname ile", tone: "warn" },
        ],
        note: "Üretim personeli giderleri 720 Direkt İşçilik, ofis personeli 770 Genel Yönetim hesabına yazılır.",
        action: { to: "/app/hub/muhasebe?section=yevmiye-fisleri", label: "Personel Bordro & Yevmiye Fişlerine Git →" },
      };
    default:
      return {
        title: "Detay Bilgisi",
        items: [{ label: "Bilgi", value: "Detay mevcut", tone: "info" }],
      };
  }
}

function kpiPillMeta(
  card: KpiCard,
  kpi: DashboardKpiResponse | null,
): { cls: "up" | "down" | "neutral"; text: string } {
  if (card.trend_pct != null) {
    const lowerIsBetter = card.key === "receivables" || card.key === "vat";
    const positive = lowerIsBetter ? card.trend_pct <= 0 : card.trend_pct >= 0;
    return {
      cls: positive ? "up" : "down",
      text: `${positive ? "↑" : "↓"} %${Math.abs(card.trend_pct).toFixed(1)} geçen aya göre`,
    };
  }
  if (card.key === "receivables") {
    const overdue = (kpi?.alerts || []).find(
      (a) => a.key === "overdue" || (a.label ? /vade|gecik/i.test(a.label) : false),
    );
    if (overdue && overdue.count > 0) {
      return { cls: "down", text: `${overdue.count} gecikmiş vade` };
    }
  }
  return {
    cls: "neutral",
    text: KPI_UNIT_HINTS[card.key] || card.unit || "—",
  };
}

const PRODUCT_FALLBACK: NamedAmount[] = [
  { name: "Ofis Koltukları", value: 286000 },
  { name: "Laptop Aksesuarları", value: 194000 },
  { name: "Yazıcı Tonerleri", value: 128000 },
  { name: "Mobilya Takımları", value: 98000 },
  { name: "Yazılım Lisansları", value: 72000 },
];

const AI_FALLBACK: AiInsight[] = [
  {
    title: "Nakit akışı fırsatı",
    body: "Alacak vadesi yaklaşan cari hesaplarda erken ödeme indirimi ile tahsilat hızlandırılabilir.",
    severity: "firsat",
    emoji: "💡",
  },
  {
    title: "Gider artışı uyarısı",
    body: "Son 3 ayda gider kalemleri gelirden hızlı büyüyor; operasyonel giderleri gözden geçirin.",
    severity: "uyari",
    emoji: "⚠️",
  },
  {
    title: "KDV ödeme planı",
    body: "Tahmini KDV yükü nakit rezervinin üzerinde; dönem ödeme takvimini şimdi oluşturun.",
    severity: "kritik",
    emoji: "🔴",
  },
];

const CHART_META: Record<
  ChartKind,
  { title: string; context: string; starter: string }
> = {
  income_expense: {
    title: "Gelir – Gider Analizi",
    context: "Gelir-gider çubuk grafiği",
    starter:
      "Gelir ile gider farkını dönem bazında özetle; nakit baskısı riskini belirt. 'Bunu yapayım mı' diye sorma; yalnızca bilgi ve öneri ver.",
  },
  income_breakdown: {
    title: "Gelir Dağılımı",
    context: "Gelir dağılımı pasta grafiği",
    starter:
      "Gelir kalemlerinin dağılımını yorumla; baskın kalemi ve çeşitlendirme notunu ver. 'Bunu yapayım mı' diye sorma.",
  },
  cash_flow: {
    title: "Nakit Akışı & AI Gelecek Projeksiyonu",
    context: "Nakit akışı ve AI projeksiyon grafiği",
    starter:
      "Gerçekleşen nakit ile AI projeksiyonunu karşılaştır; kısa dönem nakit notu ver. 'Bunu yapayım mı' diye sorma.",
  },
};

function money(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function moneyAxis(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}B`;
  return n.toLocaleString("tr-TR");
}

function todayTr() {
  return new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildKpiTiles(kpi: DashboardKpiResponse | null): DashboardKpiTile[] {
  const map = new Map((kpi?.cards || []).map((c) => [c.key, c]));

  const getVal = (key: string, def: number | string): number | string => {
    const found = map.get(key);
    if (found && found.value !== undefined && found.value !== null && found.value !== "") return found.value;
    return def;
  };

  const getTrend = (key: string, def?: number | null): number | null => {
    const found = map.get(key);
    if (found && found.trend_pct !== undefined && found.trend_pct !== null) return found.trend_pct;
    return def ?? null;
  };

  return [
    // --- 1. GÖRSEL: FİNANS, LİKİDİTE & BİLANÇO GÖSTERGELERİ ---
    {
      key: "cash",
      label: "Kasa & Banka Nakit",
      value: Number(getVal("cash", 1428500)),
      unit: "₺",
      trend_pct: getTrend("cash", 8.4),
      group: "finans",
    },
    {
      key: "receivables",
      label: "Müşteri Alacakları (120)",
      value: Number(getVal("receivables", 1854200)),
      unit: "₺",
      trend_pct: getTrend("receivables", -3.2),
      group: "finans",
    },
    {
      key: "payables",
      label: "Satıcı Borçları (320)",
      value: Number(getVal("payables", 1218600)),
      unit: "₺",
      trend_pct: getTrend("payables", 1.8),
      group: "finans",
    },
    {
      key: "checks",
      label: "Çek & Senet Portföyü",
      value: Number(getVal("checks", 892400)),
      unit: "₺",
      trend_pct: getTrend("checks", 5.0),
      group: "finans",
    },
    {
      key: "credits",
      label: "Banka Kredileri Borcu",
      value: Number(getVal("credits", 2140000)),
      unit: "₺",
      trend_pct: getTrend("credits", -4.5),
      group: "finans",
    },
    {
      key: "working_capital",
      label: "Net İşletme Sermayesi",
      value: Number(getVal("working_capital", 2064100)),
      unit: "₺",
      trend_pct: getTrend("working_capital", 11.2),
      group: "finans",
    },

    // --- 2. GÖRSEL: OPERASYON, MALİYET, SATIŞ & VERGİ GÖSTERGELERİ ---
    {
      key: "sales",
      label: "Aylık Satış Cirosu (600)",
      value: Number(getVal("sales", 3850000)),
      unit: "₺",
      trend_pct: getTrend("sales", 12.4),
      group: "operasyon",
    },
    {
      key: "profit",
      label: "Net Dönem Karı (P&L)",
      value: Number(getVal("profit", 684200)),
      unit: "₺",
      trend_pct: getTrend("profit", 15.8),
      group: "operasyon",
    },
    {
      key: "inventory",
      label: "Stok & Envanter Değeri",
      value: Number(getVal("inventory", 2450000)),
      unit: "₺",
      trend_pct: getTrend("inventory", 2.1),
      group: "operasyon",
    },
    {
      key: "production",
      label: "Aylık Üretim & Kapasite",
      value: Number(getVal("production", 4850)),
      unit: "Adet",
      trend_pct: getTrend("production", 6.2),
      group: "operasyon",
    },
    {
      key: "cost_budget",
      label: "Maliyet Bütçesi & Sapma",
      value: 2.4,
      unit: "% Sapma",
      trend_pct: -1.2,
      group: "operasyon",
    },
    {
      key: "vat",
      label: "Tahmini KDV Yükü",
      value: Number(kpi?.estimated_vat || getVal("vat", 184200)),
      unit: "₺",
      trend_pct: getTrend("vat", -2.0),
      group: "operasyon",
    },
    {
      key: "yevmiye",
      label: "Otomatik Yevmiyeleşme",
      value: Number(kpi?.yevmiye_success_pct || getVal("yevmiye", 99.4)),
      unit: "%",
      trend_pct: 0.8,
      group: "operasyon",
    },
    {
      key: "staff",
      label: "Personel & Bordro Gideri",
      value: Number(getVal("staff", 542000)),
      unit: "₺",
      trend_pct: 4.5,
      group: "operasyon",
    },
  ];
}

function deriveProductBreakdown(
  kpi: DashboardKpiResponse | null,
  genel: NamedAmount[],
): NamedAmount[] {
  if (kpi?.product_income_breakdown?.length) return kpi.product_income_breakdown;
  const total = genel.reduce((s, x) => s + Number(x.value || 0), 0);
  if (total <= 0) return PRODUCT_FALLBACK;
  const weights = [0.36, 0.24, 0.18, 0.13, 0.09];
  return PRODUCT_FALLBACK.map((p, i) => ({
    name: p.name,
    value: Math.round(total * (weights[i] ?? 0.1)),
  }));
}

function insightTone(severity?: string): "firsat" | "uyari" | "kritik" {
  const s = (severity || "").toLowerCase();
  if (/(kritik|critical|danger|error|high)/.test(s)) return "kritik";
  if (/(uyar|warn|orange|medium)/.test(s)) return "uyari";
  if (/(firsat|fırsat|success|info|opportunity|low)/.test(s)) return "firsat";
  return "firsat";
}

function insightEmoji(a: AiInsight, tone: "firsat" | "uyari" | "kritik") {
  if (a.emoji) return a.emoji;
  if (tone === "kritik") return "🔴";
  if (tone === "uyari") return "⚠️";
  return "💡";
}

function statusPillClass(status: string) {
  const s = status.toLowerCase();
  if (/(onay|tamam|ödendi|odendi|paid|done|success)/.test(s)) return "ok";
  if (/(bekle|draft|taslak|pending)/.test(s)) return "wait";
  if (/(iptal|red|iptal|cancel|fail|hata)/.test(s)) return "bad";
  return "wait";
}

function formatTaskDueLine(due?: string | null, priority?: string): ReactNode {
  const text = (due || "").trim();
  const numMatch = text.match(/(-?\d+)\s*gün/i);
  if (numMatch) {
    const n = Number(numMatch[1]);
    let tone: "ok" | "warn" | "bad" = "ok";
    let label = `Kalan: ${n} gün`;
    if (n < 0) {
      tone = "bad";
      label = `Gecikme: ${Math.abs(n)} gün`;
    } else if (n <= 2) tone = "bad";
    else if (n <= 7) tone = "warn";
    return <span className={`remain ${tone}`}>{label}</span>;
  }
  if (/kalan/i.test(text)) {
    return (
      <span className="due-line">
        <span className="due-remain">{text}</span>
      </span>
    );
  }
  if (text) return <span className="due-line">Son tarih: {text}</span>;
  if (priority === "high") return <span className="remain bad">Acil</span>;
  return <span className="remain ok">Bugün</span>;
}

function kpiDetailRows(key: string, kpi: DashboardKpiResponse | null): string[] {
  if (!kpi) return ["Detay bilgisi hazır"];
  const cards = Array.isArray(kpi.cards) ? kpi.cards : [];
  switch (key) {
    case "sales":
      return (kpi.income_expense || kpi.sales_trend || []).slice(0, 8).map((p) => {
        if ("income" in p) {
          return `${p.label}: Gelir ${money(p.income)} ₺ · Gider ${money(p.expense)} ₺`;
        }
        return `${p.label}: ${money(p.value)} ₺`;
      });
    case "profit": {
      const ie = kpi.income_expense || [];
      const profitVal = Number(cards.find((c) => c.key === "profit")?.value || 684200);
      if (!ie.length) return [`Net kar: ${money(profitVal)} ₺`];
      return ie.map((p) => `${p.label}: Net ≈ ${money(p.income - p.expense)} ₺`);
    }
    case "cash":
      return (kpi.cash_flow || []).length
        ? (kpi.cash_flow || []).map((p) => {
            const a = p.actual != null ? `Gerçekleşen ${money(p.actual)} ₺` : "—";
            const pr = p.projected != null ? `Projeksiyon ${money(p.projected)} ₺` : "—";
            return `${p.label}: ${a} · ${pr}`;
          })
        : [
            "100.01 Merkez Kasa: 85.000 ₺",
            "102.01 Garanti Ticari: 640.500 ₺",
            "102.02 İş Bankası: 483.000 ₺",
            "108.01 POS Tahsilatları: 220.000 ₺",
          ];
    case "receivables":
      return (kpi.alerts || []).length
        ? (kpi.alerts || [])
            .filter((a) => a.key === "overdue" || (a.label && a.label.toLowerCase().includes("vade")))
            .map((a) => `${a.label || a.key}: ${a.count} adet (${a.severity})`)
        : [
            "Vadesi Geçmiş: 312.000 ₺ (4 Cari hesap)",
            "Bu Hafta Vadesi Gelenler: 482.200 ₺ (6 Fatura)",
            "Bu Ay İçi Vadeli: 640.000 ₺",
            "30+ Gün Vadeli: 420.000 ₺",
          ];
    case "payables":
      return [
        "Vadesi Geçmiş Tedarikçi: 115.000 ₺",
        "Bu Hafta Ödenecek Faturalar: 380.600 ₺",
        "Bu Ay Vadeli Borçlar: 450.000 ₺",
        "Gelecek Dönem Borçları: 273.000 ₺",
      ];
    case "checks":
      return [
        "Cüzdandaki Müşteri Çekleri: 520.000 ₺",
        "Teminata Verilen Çekler: 280.000 ₺",
        "Tahsildeki Çekler: 110.000 ₺",
        "Verilen Borç Senetleri: 92.400 ₺",
      ];
    case "credits":
      return [
        "Aktif Kredi Anapara: 1.850.000 ₺",
        "Bu Ay Taksit: 124.500 ₺ (95.000 ₺ anapara)",
        "Toplam Kalan Faiz: 165.500 ₺",
        "Ortalama Vade: 14 Ay",
      ];
    case "working_capital":
      return [
        "Dönen Varlıklar: 4.175.100 ₺",
        "Kısa Vadeli Borçlar: 2.111.000 ₺",
        "Net İşletme Sermayesi: 2.064.100 ₺",
        "Cari Oran: 1.98 (Sağlıklı)",
      ];
    case "inventory":
      return [
        "150 İlk Madde & Hammadde: 980.000 ₺",
        "151 Yarı Mamul Ambarı: 420.000 ₺",
        "152 Mamul Deposu: 1.050.000 ₺",
        "Kritik Stok Uyarısı: 3 Kalem",
      ];
    case "production":
      return [
        "Aylık Mamul Üretimi: 4.850 Adet",
        "Plan Gerçekleşme: %97.0",
        "Kapasite Kullanım (KKO): %88.5",
        "Makine Verimliliği (OEE): %84.2",
      ];
    case "cost_budget":
      return [
        "Bütçelenen Birim Maliyet: 480,00 ₺",
        "Fiili Birim Maliyet (7/A): 491,50 ₺",
        "Maliyet Sapma Oranı: +%2.4",
        "Aylık Fabrika Gideri: 2.385.000 ₺",
      ];
    case "orders":
      return [
        `Aktif sipariş: ${cards.find((c) => c.key === "orders")?.value ?? 14} adet`,
        "Detay için Satış & Satınalma › Siparişler hub’ına bakın.",
      ];
    case "vat":
      return [
        `Tahmini KDV: ${money(kpi.estimated_vat || 184200)} ₺`,
        kpi.estimated_vat_note || "Ciro üzerinden yaklaşık KDV tahmini",
        "Öneri (bilgi): Dönem ödeme planını nakit takviminize işleyin.",
      ];
    case "yevmiye":
      return [
        `Başarı oranı: ${(kpi.yevmiye_success_pct ?? 99.4).toFixed(1)}%`,
        "Onaylı / toplam otomatik yevmiye oranı",
        "Öneri (bilgi): Düşük oranda muhasebe eşlemelerini kontrol edin.",
      ];
    case "staff":
      return [
        `Personel Sayısı: ${cards.find((c) => c.key === "staff")?.value ?? 34} kişi`,
        "Aylık Net Ücret Bordrosu: 365.000 ₺",
        "SGK İşveren Payı: 128.000 ₺",
        "Muhtasar Stopaj Vergisi: 49.000 ₺",
      ];
    default:
      return ["Detay bilgisi hazır"];
  }
}

function ChartAiPanel({
  open,
  kind,
  onClose,
  branchId,
  recordTypeId,
}: {
  open: boolean;
  kind: ChartKind | null;
  onClose: () => void;
  branchId?: number;
  recordTypeId?: number;
}) {
  const meta = kind ? CHART_META[kind] : null;
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !kind) return;
    const chartMeta = CHART_META[kind];
    setMsgs([]);
    setQ("");
    setErr(null);
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await myasistanApi.ask(chartMeta.starter, branchId, recordTypeId);
        if (!cancelled) {
          setMsgs([
            {
              role: "ai",
              text:
                res.answer ||
                `${chartMeta.context} için özet hazır. Sorularınızı aşağıya yazabilirsiniz.`,
            },
          ]);
        }
      } catch (e) {
        if (!cancelled) {
          setMsgs([
            {
              role: "ai",
              text: `${chartMeta.title}: Grafik verilerine göre kısa yorum. Detay sorusu sorabilirsiniz.`,
            },
          ]);
          setErr(e instanceof Error ? e.message : null);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, kind, branchId, recordTypeId]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!meta || !q.trim() || busy) return;
    const question = q.trim();
    setQ("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    setErr(null);
    try {
      const prompt = `${meta.context} hakkında soru: ${question}. Yanıtında 'bunu yapayım mı', 'ister misiniz' gibi uzatma soruları sorma. Bilgi amaçlı öneri ver.`;
      const res = await myasistanApi.ask(prompt, branchId, recordTypeId);
      setMsgs((m) => [...m, { role: "ai", text: res.answer || "Yanıt alınamadı." }]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Soru işlenemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SidePanel open={open && Boolean(kind)} title={`AI Analiz · ${meta?.title || ""}`} onClose={onClose} size="md">
      <div className="dash-ai-chat">
        <p className="dash-ai-chat-hint">
          Grafik hakkında soru sorun. Öneriler bilgi amaçlıdır; sohbet uzatılmaz.
        </p>
        <div className="dash-ai-chat-msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`dash-ai-bubble ${m.role}`}>
              {m.text}
            </div>
          ))}
          {busy ? <div className="dash-ai-bubble ai muted">Analiz ediliyor…</div> : null}
        </div>
        {err ? <div className="dash-ai-chat-err">{err}</div> : null}
        <form className="dash-ai-chat-form" onSubmit={send}>
          <input
            className="form-control"
            placeholder="Örn: Bu ay gider neden yükseldi?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn-primary" disabled={busy || !q.trim()}>
            Sor
          </button>
        </form>
      </div>
    </SidePanel>
  );
}

export function DashboardHub({ branchId, recordTypeId, userName }: Props) {
  const [kpi, setKpi] = useState<DashboardKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuick, setActiveQuick] = useState<string>("pos");
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [kpiCategory, setKpiCategory] = useState<"all" | "finans" | "operasyon">("all");
  const [aiChart, setAiChart] = useState<ChartKind | null>(null);
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>("genel");
  const [quickItems, setQuickItems] = useState<QuickAccessItem[]>(() => loadQuickAccess());
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    const sync = () => setQuickItems(loadQuickAccess());
    window.addEventListener("tabia-quick-access-changed", sync);
    return () => window.removeEventListener("tabia-quick-access-changed", sync);
  }, []);

  const catalog = useMemo(() => {
    const fromHub = flattenHubFavorites().map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      icon: f.icon,
      to: f.to,
      activeClass: (f.activeClass as QuickAccessItem["activeClass"]) || "active-blue",
    }));
    const map = new Map<string, QuickAccessItem>();
    [...DEFAULT_QUICK_ACCESS, ...fromHub].forEach((x) => map.set(x.id, x));
    return Array.from(map.values());
  }, []);

  function toggleCustomizeItem(item: QuickAccessItem) {
    const exists = quickItems.some((q) => q.id === item.id);
    if (exists) {
      setQuickItems(saveQuickAccess(quickItems.filter((q) => q.id !== item.id)));
      return;
    }
    if (quickItems.length >= QUICK_ACCESS_MAX) {
      window.alert(`Hızlı erişime en fazla ${QUICK_ACCESS_MAX} öğe eklenebilir.`);
      return;
    }
    setQuickItems(saveQuickAccess([...quickItems, item]));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const kpiRes = await dashboardApi.kpi(branchId, recordTypeId);
        if (!cancelled) setKpi(kpiRes);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Dashboard yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, recordTypeId]);

  const kpiTiles = useMemo(() => buildKpiTiles(kpi), [kpi]);

  const incomeExpense = kpi?.income_expense?.length
    ? kpi.income_expense
    : (kpi?.sales_trend || []).map((p) => ({
        label: p.label,
        income: p.value,
        expense: Math.round(p.value * 0.62),
      }));

  const breakdownGenel = kpi?.income_breakdown?.length
    ? kpi.income_breakdown
    : [
        { name: "Satış", value: Number(kpiTiles.find((c) => c.key === "sales")?.value || 0) },
        { name: "Diğer", value: Number(kpiTiles.find((c) => c.key === "sales")?.value || 0) * 0.1 },
      ];

  const breakdownUrun = useMemo(
    () => deriveProductBreakdown(kpi, kpi?.income_breakdown || []),
    [kpi],
  );

  const breakdown = breakdownMode === "urun" ? breakdownUrun : breakdownGenel;

  const cashFlow = kpi?.cash_flow?.length
    ? kpi.cash_flow
    : [
        { label: "M-2", actual: 120000, projected: null },
        { label: "M-1", actual: 145000, projected: null },
        {
          label: "Bu ay",
          actual: Number(kpiTiles.find((c) => c.key === "cash")?.value || 160000),
          projected: null,
        },
        { label: "+1ay", actual: null, projected: 175000 },
        { label: "+2ay", actual: null, projected: 188000 },
        { label: "+3ay", actual: null, projected: 202000 },
      ];

  const aiInsights = kpi?.ai_insights?.length ? kpi.ai_insights : AI_FALLBACK;
  const todayTasks = kpi?.today_tasks || [];
  const recentTxns = kpi?.recent_transactions || [];
  const detailRows = activeKpi ? kpiDetailRows(activeKpi, kpi) : [];
  const activeKpiLabel = kpiTiles.find((c) => c.key === activeKpi)?.label || "";

  if (loading) return <div className="dash-loading">Yükleniyor…</div>;
  if (error) return <div className="reports-error">{error}</div>;

  return (
    <div className="dash-root">
      <div className="dash-hero">
        <div>
          <h2 className="dash-hello">Merhaba{userName ? `, ${userName}` : ""} 👋</h2>
          <p className="dash-date">{todayTr()}</p>
        </div>
        <div className="dash-hero-actions">
          <NavLink to="/app/hub/raporlar" className="btn-secondary">
            Rapor İndir
          </NavLink>
          <NavLink to="/app/hub/satis" className="btn-save">
            Yeni İşlem
          </NavLink>
        </div>
      </div>

      <section className="dash-frame">
        <div className="dash-frame-head">
          <div className="dash-frame-title">Hızlı Erişim</div>
          <button type="button" className="dash-customize-btn" onClick={() => setCustomizeOpen(true)}>
            ⚙ Özelleştir
          </button>
        </div>
        <div className="dash-quick" style={{ gridTemplateColumns: `repeat(${Math.max(1, quickItems.length)}, minmax(0, 1fr))` }}>
          {quickItems.map((q) => (
            <NavLink
              key={q.id}
              to={q.to}
              className={({ isActive }) =>
                `dash-quick-card${isActive || activeQuick === q.id ? ` ${q.activeClass || "active-blue"}` : ""}`
              }
              onClick={() => setActiveQuick(q.id)}
              onMouseEnter={() => setActiveQuick(q.id)}
            >
              <span className="dash-quick-icon">{q.icon}</span>
              <strong>{q.title}</strong>
              <span>{q.description}</span>
            </NavLink>
          ))}
          {!quickItems.length ? (
            <div className="dash-quick-empty">Özelleştir ile hızlı erişim ekleyin (en fazla {QUICK_ACCESS_MAX}).</div>
          ) : null}
        </div>
      </section>

      <section className="dash-frame">
        <div className="dash-frame-head" style={{ flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <div className="dash-frame-title">📊 Özet Göstergeler (1. ve 2. Görsel Finans &amp; Operasyon)</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Kutucuklara tıklayarak hemen altında açılan detayları inceleyebilir, tekrar tıklayarak kapatabilirsiniz.
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className={`btn-secondary${kpiCategory === "all" ? " active" : ""}`}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                background: kpiCategory === "all" ? "#2563eb" : "#f1f5f9",
                color: kpiCategory === "all" ? "#fff" : "#475569",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => setKpiCategory("all")}
            >
              Tüm Göstergeler ({kpiTiles.length})
            </button>
            <button
              type="button"
              className={`btn-secondary${kpiCategory === "finans" ? " active" : ""}`}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                background: kpiCategory === "finans" ? "#2563eb" : "#f1f5f9",
                color: kpiCategory === "finans" ? "#fff" : "#475569",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => setKpiCategory("finans")}
            >
              🏦 1. Görsel: Finans &amp; Likidite ({kpiTiles.filter((c) => c.group === "finans").length})
            </button>
            <button
              type="button"
              className={`btn-secondary${kpiCategory === "operasyon" ? " active" : ""}`}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                background: kpiCategory === "operasyon" ? "#2563eb" : "#f1f5f9",
                color: kpiCategory === "operasyon" ? "#fff" : "#475569",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => setKpiCategory("operasyon")}
            >
              🏭 2. Görsel: Operasyon &amp; Maliyet ({kpiTiles.filter((c) => c.group === "operasyon").length})
            </button>
          </div>
        </div>

        <div className="dash-kpi-grid">
          {kpiTiles
            .filter((card) => kpiCategory === "all" || card.group === kpiCategory)
            .map((card) => {
              const icon = getKpiIcon(card.key);
              const pill = kpiPillMeta(card, kpi);
              const isOpen = activeKpi === card.key;
              const detail = isOpen ? getKpiDetailInfo(card.key, kpi) : null;

              return (
                <div key={card.key} className="dash-kpi-card-wrapper">
                  <button
                    type="button"
                    className={`dash-kpi-card${isOpen ? " is-active" : ""}`}
                    onClick={() => setActiveKpi((prev) => (prev === card.key ? null : card.key))}
                  >
                    <div className="kpi-top">
                      <div className="kpi-label">{card.label}</div>
                      <div className="kpi-icon" style={{ background: icon.bg }} aria-hidden>
                        {icon.emoji}
                      </div>
                    </div>
                    <div className="kpi-value">
                      {typeof card.value === "number"
                        ? card.unit === "%" || card.unit?.includes("%")
                          ? `%${card.value.toFixed(1)}`
                          : `${money(card.value)} ₺`
                        : `${card.value}${card.unit ? ` ${card.unit}` : ""}`}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="dash-kpi-pill">{KPI_UNIT_HINTS[card.key] || pill.text}</div>
                      <span style={{ fontSize: 11, color: isOpen ? "#2563eb" : "#64748b", fontWeight: 700 }}>
                        {isOpen ? "▲ Kapat" : "▼ Detay Aç"}
                      </span>
                    </div>
                  </button>

                  {/* HER KUTUCUĞA TIKLAYINCA HEMEN ALTINDA DETAY AÇILSIN */}
                  {isOpen && detail && (
                    <div className="dash-kpi-inline-detail">
                      <div className="dash-kpi-detail-title-bar">
                        <div className="dash-kpi-detail-head">{detail.title}</div>
                        <button
                          type="button"
                          className="dash-kpi-close-btn"
                          title="Detayı Kapat"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveKpi(null);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {detail.items.map((sub, sIdx) => (
                          <div key={sIdx} className="dash-kpi-subitem">
                            <div>
                              <div className="dash-kpi-subitem-label">{sub.label}</div>
                              {sub.hint && <div className="dash-kpi-subitem-hint">{sub.hint}</div>}
                            </div>
                            <div className={`dash-kpi-subitem-val tone-${sub.tone || "info"}`}>
                              {sub.value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {detail.note && (
                        <div className="dash-kpi-detail-note">
                          💡 {detail.note}
                        </div>
                      )}
                      {detail.action && (
                        <NavLink to={detail.action.to} className="dash-kpi-detail-action">
                          {detail.action.label}
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      <div className="dash-charts-stack">
        <div className="dash-card dash-chart-card">
          <div className="dash-chart-head">
            <div>
              <h3>Gelir – Gider Analizi</h3>
              <p className="dash-chart-sub">Son 12 ay performansı</p>
            </div>
            <button type="button" className="dash-ai-btn" onClick={() => setAiChart("income_expense")}>
              AI Analiz
            </button>
          </div>
          <div className="dash-chart dash-chart-tall">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeExpense} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₺${moneyAxis(Number(v))}`}
                />
                <Tooltip formatter={(v) => `${money(Number(v))} ₺`} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 12, fontSize: 12 }} />
                <Bar dataKey="income" name="Gelir" fill="#4A89F3" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Gider" fill="#9D58E6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-card dash-chart-card">
          <div className="dash-chart-head">
            <div className="dash-breakdown-head">
              <h3>Gelir Dağılımı</h3>
              <div className="dash-seg-toggle" role="tablist" aria-label="Dağılım modu">
                <button
                  type="button"
                  role="tab"
                  aria-selected={breakdownMode === "genel"}
                  className={breakdownMode === "genel" ? "on" : ""}
                  onClick={() => setBreakdownMode("genel")}
                >
                  Genel
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={breakdownMode === "urun"}
                  className={breakdownMode === "urun" ? "on" : ""}
                  onClick={() => setBreakdownMode("urun")}
                >
                  Ürün bazında
                </button>
              </div>
            </div>
            <button type="button" className="dash-ai-btn" onClick={() => setAiChart("income_breakdown")}>
              AI Analiz
            </button>
          </div>
          <div className={`dash-pie-layout${breakdownMode === "urun" ? " with-side-legend" : ""}`}>
            <div className="dash-chart dash-chart-tall">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${money(Number(v))} ₺`} />
                  {breakdownMode === "genel" ? <Legend /> : null}
                </PieChart>
              </ResponsiveContainer>
            </div>
            {breakdownMode === "urun" ? (
              <ul className="dash-pie-legend">
                {breakdown.map((item, i) => (
                  <li key={item.name}>
                    <span
                      className="swatch"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="name">{item.name}</span>
                    <span className="val">{money(item.value)} ₺</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="dash-card dash-chart-card">
          <div className="dash-chart-head">
            <h3>Nakit Akışı &amp; AI Gelecek Projeksiyonu</h3>
            <button type="button" className="dash-ai-btn" onClick={() => setAiChart("cash_flow")}>
              AI Analiz
            </button>
          </div>
          <div className="dash-chart dash-chart-tall">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₺${moneyAxis(Number(v))}`}
                />
                <Tooltip formatter={(v) => `${money(Number(v))} ₺`} />
                <Legend />
                <Bar dataKey="actual" name="Gerçekleşen" fill="#4A89F3" radius={[6, 6, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="projected"
                  name="AI Projeksiyon"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <section className="dash-card dash-ai-insights">
        <div className="dash-ai-insights-head">
          <h3>AI Öngörüleri &amp; Öneriler</h3>
          <button
            type="button"
            className="dash-live-pill"
            onClick={() => setAiChart("income_expense")}
          >
            Canlı Analiz
          </button>
        </div>
        <ul className="dash-ai-insight-list">
          {aiInsights.map((a, i) => {
            const tone = insightTone(a.severity);
            return (
              <li key={i} className={`tone-${tone}`}>
                <span className={`dash-status-dot ${tone}`} aria-hidden />
                <span className="dash-ai-insight-emoji" aria-hidden>
                  {insightEmoji(a, tone)}
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="dash-card dash-tasks-card">
        <div className="dash-tasks-head">
          <div className="dash-tasks-title">
            <span className="dash-tasks-cal" aria-hidden>
              📅
            </span>
            <h3>Bugünün İşleri</h3>
          </div>
          <span className="dash-tasks-count">{todayTasks.length} görev</span>
        </div>
        <ul className="dash-tasks-v2">
          {todayTasks.map((t) => (
            <li key={t.id}>
              <span className="bullet" aria-hidden />
              <div className="body">
                <strong>{t.title}</strong>
                {formatTaskDueLine(t.due, t.priority)}
              </div>
            </li>
          ))}
          {!todayTasks.length ? <li className="empty">Bugün için iş yok</li> : null}
        </ul>
      </section>

      <section className="dash-card dash-recent-full">
        <div className="dash-recent-head">
          <h3>Son İşlemler</h3>
          <NavLink to="/app/hub/satis" className="dash-see-all">
            Tümünü Gör →
          </NavLink>
        </div>
        <div className="dash-table-wrap dash-table-wrap-full">
          <table className="data-table dash-recent-table" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th>TARİH</th>
                <th>BELGE NO</th>
                <th>CARİ</th>
                <th>AÇIKLAMA</th>
                <th>TUTAR</th>
                <th>DURUM</th>
              </tr>
            </thead>
            <tbody>
              {recentTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>
                    Kayıt yok
                  </td>
                </tr>
              ) : (
                recentTxns.map((r) => (
                  <tr key={r.id}>
                    <td>{r.when}</td>
                    <td>{r.doc_no || r.doc_type || "—"}</td>
                    <td>{r.partner || r.cari || "—"}</td>
                    <td>{r.description}</td>
                    <td className="amt">{money(r.amount)} ₺</td>
                    <td>
                      <span className={`dash-status-pill ${statusPillClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div id="dash-myasistan">
        <MyAsistanPanel branchId={branchId} recordTypeId={recordTypeId} />
      </div>

      <ChartAiPanel
        open={Boolean(aiChart)}
        kind={aiChart}
        onClose={() => setAiChart(null)}
        branchId={branchId}
        recordTypeId={recordTypeId}
      />

      <SidePanel
        open={customizeOpen}
        title="Hızlı Erişim Özelleştir"
        onClose={() => setCustomizeOpen(false)}
        size="md"
      >
        <p className="dash-ai-chat-hint">
          En fazla {QUICK_ACCESS_MAX} öğe. Seçilenler dashboard Hızlı Erişim satırında görünür.
        </p>
        <div className="dash-customize-list">
          {catalog.map((item) => {
            const checked = quickItems.some((q) => q.id === item.id);
            return (
              <label key={item.id} className={`dash-customize-row${checked ? " on" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCustomizeItem(item)}
                />
                <span className="dash-customize-ico">{item.icon}</span>
                <span>
                  <strong>{item.title}</strong>
                  <em>{item.description}</em>
                </span>
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setQuickItems(saveQuickAccess([...DEFAULT_QUICK_ACCESS]))}
          >
            Varsayılana Dön
          </button>
          <button type="button" className="btn-primary" onClick={() => setCustomizeOpen(false)}>
            Tamam
          </button>
        </div>
      </SidePanel>
    </div>
  );
}
