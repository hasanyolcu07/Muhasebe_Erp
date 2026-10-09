import { useEffect, useMemo, useState } from "react";
import { mockStore, type MockBomItem, type MockMachine } from "@/services/mockDataStore";

// --- TYPES ---
export type UretimPlanRow = {
  id: number;
  productGroup: string;
  productName: string;
  productType: "MAMUL" | "YARI_MAMUL";
  machineId: number;
  machineName: string;
  dailyQty: number;
  workDays: number;
  scrapPct: number;
};

export type BirimMaliyetItem = {
  id: number;
  costType: "710" | "720" | "730";
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
};

export type BirimProductCard = {
  id: number;
  code: string;
  name: string;
  productGroup: string;
  productType: "MAMUL" | "YARI_MAMUL";
  unit: string;
  targetMargin: number;
  items: BirimMaliyetItem[];
};

export type AylikMaliyetRow = {
  id: number;
  costGroup:
    | "710 Direkt İlk Madde ve Malzeme"
    | "720 Direkt İşçilik Giderleri"
    | "730 Genel Üretim Giderleri"
    | "760 Pazarlama, Satış ve Dağıtım"
    | "770 Genel Yönetim Giderleri"
    | "780 Finansman Giderleri";
  costItem: string;
  productRelation: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

export type SatisCiroRow = {
  id: number;
  productGroup: string;
  productName: string;
  unitCost: number;
  salesPrice: number;
  monthlyProduction: number;
};

type ElecRow = {
  machineId: number;
  machineName: string;
  powerKw: number;
  qty: number;
  hoursDay: number;
  workDays: number;
  rateTl: number;
};

function money(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function money2(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InfoBadge({ title, text, linkHint }: { title: string; text: string; linkHint?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 5 }}>
      <button
        type="button"
        style={{
          width: 17,
          height: 17,
          borderRadius: "50%",
          background: "#2563eb",
          color: "#ffffff",
          fontSize: 11,
          fontWeight: 800,
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: 0,
        }}
        title="Tanım kaynağı bilgisi için tıklayın (!)"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        !
      </button>
      {open && (
        <span
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 6,
            zIndex: 100,
            background: "#0f172a",
            color: "#f8fafc",
            padding: "10px 14px",
            borderRadius: 8,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.4)",
            width: 280,
            fontSize: 11.5,
            fontWeight: 400,
            lineHeight: 1.45,
            whiteSpace: "normal",
            textAlign: "left",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, borderBottom: "1px solid #334155", paddingBottom: 4 }}>
            <strong style={{ color: "#93c5fd", fontWeight: 700 }}>ℹ️ {title}</strong>
            <button
              type="button"
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: 0 }}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </span>
          <span style={{ display: "block" }}>{text}</span>
          {linkHint && (
            <span style={{ display: "block", marginTop: 6, paddingTop: 6, borderTop: "1px dashed #334155", color: "#60a5fa", fontWeight: 600 }}>
              {linkHint}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export function MaliyetButcesiPanel() {
  const [tab, setTab] = useState<"uretim" | "birim" | "aylik" | "ciro" | "kar" | "elektrik">("uretim");

  // Global çalışma günü & elektrik tarifesi
  const [globalWorkDays, setGlobalWorkDays] = useState<number>(22);
  const [globalRateTl, setGlobalRateTl] = useState<number>(3.85);

  const [machines, setMachines] = useState<MockMachine[]>([]);
  const [boms, setBoms] = useState<MockBomItem[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);

  useEffect(() => {
    setMachines(mockStore.getMachines());
    setBoms(mockStore.getBoms());
    setStocks(mockStore.getStocks());
  }, []);

  const availableProductOptions = useMemo(() => {
    const list = [
      { code: "MM-001", name: "CNC Freze Gövdesi", group: "Endüstriyel Makineler", type: "MAMUL" as const },
      { code: "MM-002", name: "Hidrolik Güç Ünitesi", group: "Endüstriyel Makineler", type: "MAMUL" as const },
      { code: "YM-001", name: "Lazer Kesim Şasi Paneli", group: "Sac & Profil İşleme", type: "YARI_MAMUL" as const },
      { code: "YM-002", name: "Abkant Büküm Muhafaza Sacı", group: "Sac & Profil İşleme", type: "YARI_MAMUL" as const },
      { code: "MM-003", name: "Robotik Kaynak Fikstürü", group: "Kaynak & Konstrüksiyon", type: "MAMUL" as const },
      { code: "MM-004", name: "PLC Kontrol Panosu & Otomasyon", group: "Otomasyon & Pano", type: "MAMUL" as const },
    ];
    (stocks || []).forEach((s) => {
      if (!list.some((x) => x.name.toLowerCase() === (s.name || "").toLowerCase())) {
        list.push({
          code: s.code || `STK-${s.id}`,
          name: s.name,
          group: (s as any).category_name || (s.stock_type === "YM" ? "Sac & Profil İşleme" : "Endüstriyel Makineler"),
          type: s.stock_type === "YM" ? "YARI_MAMUL" : "MAMUL",
        });
      }
    });
    return list;
  }, [stocks]);

  const availableProductGroups = useMemo(() => {
    const s = new Set<string>();
    availableProductOptions.forEach((p) => s.add(p.group));
    ["Endüstriyel Makineler", "Sac & Profil İşleme", "Kaynak & Konstrüksiyon", "Otomasyon & Pano", "Plastik & Enjeksiyon"].forEach((g) => s.add(g));
    return Array.from(s);
  }, [availableProductOptions]);

  const availableCostItems = useMemo(
    () => [
      // 710 İlk Madde & Malzeme
      { costType: "710" as const, name: "S355 Yapı Çeliği Levha Sac (45 kg)", unit: "kg", unitCost: 68 },
      { costType: "710" as const, name: "Döküm Taban Yatağı Bloğu", unit: "Adet", unitCost: 8500 },
      { costType: "710" as const, name: "Lineer Kızak & Vidalı Mil Seti", unit: "Set", unitCost: 4200 },
      { costType: "710" as const, name: "Elektrostatik Toz Boya Sarfı", unit: "kg", unitCost: 140 },
      { costType: "710" as const, name: "8.8 Çelik Civata & Bağlantı Paketi", unit: "Paket", unitCost: 320 },
      { costType: "710" as const, name: "DKP Sac Levha 3mm (18 kg)", unit: "kg", unitCost: 55 },
      { costType: "710" as const, name: "3 Fazlı Asenkron Elektrik Motoru 7.5kW", unit: "Adet", unitCost: 6200 },
      { costType: "710" as const, name: "Değişken Debili Pistonlu Pompa", unit: "Adet", unitCost: 5100 },
      { costType: "710" as const, name: "Hidrolik Valf Bloğu & Bobin Grubu", unit: "Set", unitCost: 3400 },
      { costType: "710" as const, name: "100 Lt Yağ Deposu & Seviye Göstergesi", unit: "Adet", unitCost: 2400 },
      { costType: "710" as const, name: "Lazer Kesim Azot/Oksijen Gaz Sarfı", unit: "Adet", unitCost: 85 },
      { costType: "710" as const, name: "Galvanizli Sac Rulo 1.5mm", unit: "kg", unitCost: 48 },
      // 720 İşçilik
      { costType: "720" as const, name: "CNC Freze Operatör İşçiliği", unit: "Saat", unitCost: 350 },
      { costType: "720" as const, name: "Kaynak & Tesviye Ustalığı", unit: "Saat", unitCost: 340 },
      { costType: "720" as const, name: "Boya & Kalite Kontrol İşçiliği", unit: "Saat", unitCost: 320 },
      { costType: "720" as const, name: "Lazer Operatörü & Çapak Alma", unit: "Saat", unitCost: 320 },
      { costType: "720" as const, name: "Abkant Büküm Operatörü", unit: "Saat", unitCost: 330 },
      { costType: "720" as const, name: "Hidrolik Montaj & Borulama İşçiliği", unit: "Saat", unitCost: 360 },
      { costType: "720" as const, name: "Basınç & Sızdırmazlık Test Operatörü", unit: "Saat", unitCost: 350 },
      // 730 Genel Üretim Giderleri
      { costType: "730" as const, name: "Makine Elektrik & Enerji Tüketim Payı", unit: "Birim", unitCost: 850 },
      { costType: "730" as const, name: "CNC Tezgahı Amortisman Payı (253)", unit: "Birim", unitCost: 650 },
      { costType: "730" as const, name: "Lazer Tezgahı Amortismanı", unit: "Birim", unitCost: 65 },
      { costType: "730" as const, name: "Kesici Takım & Soğutma Sıvısı Sarfı", unit: "Birim", unitCost: 420 },
      { costType: "730" as const, name: "Fabrika Genel Yönetim & Bina Payı", unit: "Birim", unitCost: 355 },
      { costType: "730" as const, name: "Test İstasyonu Elektrik & Yağ Sarfı", unit: "Birim", unitCost: 480 },
      { costType: "730" as const, name: "Montaj Hattı Amortisman & Sarf Payı", unit: "Birim", unitCost: 390 },
      { costType: "730" as const, name: "Lazer Teçhizatı Elektrik & Lazer Kaynak Payı", unit: "Birim", unitCost: 110 },
    ],
    []
  );

  const monthlyCostOptions = useMemo(
    () => [
      { costGroup: "710 Direkt İlk Madde ve Malzeme" as const, costItem: "710.01 S355 Yapı Çeliği ve Levha Saclar", unit: "kg", unitPrice: 68 },
      { costGroup: "710 Direkt İlk Madde ve Malzeme" as const, costItem: "710.02 Döküm Blok & Mekanik Komponentler", unit: "Adet", unitPrice: 8500 },
      { costGroup: "710 Direkt İlk Madde ve Malzeme" as const, costItem: "710.03 Vidalı Mil, Rulman & Aktarma Elemanları", unit: "Set", unitPrice: 4200 },
      { costGroup: "720 Direkt İşçilik Giderleri" as const, costItem: "720.01 CNC & Talaşlı İmalat Operatör Maaşları", unit: "Adam/Ay", unitPrice: 58000 },
      { costGroup: "720 Direkt İşçilik Giderleri" as const, costItem: "720.02 Kaynak & Çelik Konstrüksiyon İşçiliği", unit: "Adam/Ay", unitPrice: 55000 },
      { costGroup: "720 Direkt İşçilik Giderleri" as const, costItem: "720.03 Montaj, Boya ve Kalite Test Ekibi", unit: "Adam/Ay", unitPrice: 52000 },
      { costGroup: "730 Genel Üretim Giderleri" as const, costItem: "730.01 Fabrika & Makine Parkuru Elektrik Tüketimi", unit: "kWh", unitPrice: 3.85 },
      { costGroup: "730 Genel Üretim Giderleri" as const, costItem: "730.02 Makine & Tesis Amortisman Payları (253)", unit: "Ay", unitPrice: 185000 },
      { costGroup: "730 Genel Üretim Giderleri" as const, costItem: "730.03 Periyodik Bakım, Yağ & Yedek Parça", unit: "Ay", unitPrice: 65000 },
      { costGroup: "730 Genel Üretim Giderleri" as const, costItem: "730.04 Fabrika Binası Kira & Ortak Alan Gideri", unit: "Ay", unitPrice: 95000 },
      { costGroup: "760 Pazarlama, Satış ve Dağıtım" as const, costItem: "760.01 Mamul Sevk, Nakliye ve Lojistik Sigortası", unit: "Ay", unitPrice: 85000 },
      { costGroup: "760 Pazarlama, Satış ve Dağıtım" as const, costItem: "760.02 Satış Primleri & Müşteri Tanıtım Giderleri", unit: "Ay", unitPrice: 60000 },
      { costGroup: "770 Genel Yönetim Giderleri" as const, costItem: "770.01 Merkez Ofis & Muhasebe Personel Gideri", unit: "Ay", unitPrice: 120000 },
      { costGroup: "770 Genel Yönetim Giderleri" as const, costItem: "770.02 İletişim, Yazılım Lisans & Danışmanlık", unit: "Ay", unitPrice: 45000 },
      { costGroup: "780 Finansman Giderleri" as const, costItem: "780.01 Rotatif Kredi & BCH Faiz Giderleri", unit: "Ay", unitPrice: 75000 },
    ],
    []
  );

  // 1. ÜRETİM HESAPLAMA VERİLERİ (Ürün grubu × makina × günlük üretim × çalışma günü → aylık/yıllık üretim)
  const [uretimRows, setUretimRows] = useState<UretimPlanRow[]>([
    {
      id: 1,
      productGroup: "Endüstriyel Makineler",
      productName: "CNC Freze Gövdesi",
      productType: "MAMUL",
      machineId: 1,
      machineName: "CNC-01 — 5 Eksen Dikey İşleme Merkezi",
      dailyQty: 8,
      workDays: 22,
      scrapPct: 1.5,
    },
    {
      id: 2,
      productGroup: "Endüstriyel Makineler",
      productName: "Hidrolik Güç Ünitesi",
      productType: "MAMUL",
      machineId: 3,
      machineName: "ASS-01 — Montaj & Test İstasyonu",
      dailyQty: 12,
      workDays: 22,
      scrapPct: 1.0,
    },
    {
      id: 3,
      productGroup: "Sac & Profil İşleme",
      productName: "Lazer Kesim Şasi Paneli",
      productType: "YARI_MAMUL",
      machineId: 4,
      machineName: "LZR-01 — 4kW Fiber Lazer Kesim",
      dailyQty: 45,
      workDays: 22,
      scrapPct: 2.0,
    },
    {
      id: 4,
      productGroup: "Sac & Profil İşleme",
      productName: "Abkant Büküm Muhafaza Sacı",
      productType: "YARI_MAMUL",
      machineId: 5,
      machineName: "ABK-01 — CNC Abkant Pres (175 Ton)",
      dailyQty: 40,
      workDays: 22,
      scrapPct: 1.5,
    },
    {
      id: 5,
      productGroup: "Talaşlı İmalat",
      productName: "Hassas Mil & Şaft Grubu",
      productType: "YARI_MAMUL",
      machineId: 2,
      machineName: "TRN-01 — CNC Torna (Çift Taretli)",
      dailyQty: 60,
      workDays: 22,
      scrapPct: 2.5,
    },
    {
      id: 6,
      productGroup: "Otomasyon & Pano",
      productName: "PLC Kontrol Panosu & Otomasyon",
      productType: "MAMUL",
      machineId: 3,
      machineName: "ELK-01 — Elektrik Pano Montaj Masası",
      dailyQty: 15,
      workDays: 22,
      scrapPct: 0.5,
    },
  ]);

  // Üretim Hesaplama İcmali
  const uretimTotals = useMemo(() => {
    return uretimRows.map((r) => {
      const grossMonthly = r.dailyQty * r.workDays;
      const scrapQty = Math.round(grossMonthly * (r.scrapPct / 100));
      const netMonthly = grossMonthly - scrapQty;
      const yearlyQty = netMonthly * 12;
      return {
        ...r,
        grossMonthly,
        scrapQty,
        netMonthly,
        yearlyQty,
      };
    });
  }, [uretimRows]);

  const totalDailyProduction = uretimTotals.reduce((s, r) => s + r.dailyQty, 0);
  const totalNetMonthlyProduction = uretimTotals.reduce((s, r) => s + r.netMonthly, 0);
  const totalYearlyProduction = uretimTotals.reduce((s, r) => s + r.yearlyQty, 0);

  // 2. BİRİM MALİYET VERİLERİ (Üretilen ürün (mamül/yarı mamül) + maliyet kalemleri gridi: 710 + 720 + 730)
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [productCards, setProductCards] = useState<BirimProductCard[]>([
    {
      id: 1,
      code: "MM-001",
      name: "CNC Freze Gövdesi",
      productGroup: "Endüstriyel Makineler",
      productType: "MAMUL",
      unit: "Adet",
      targetMargin: 35,
      items: [
        { id: 1, costType: "710", name: "S355 Yapı Çeliği Levha Sac (45 kg)", qty: 45, unit: "kg", unitCost: 68 },
        { id: 2, costType: "710", name: "Döküm Taban Yatağı Bloğu", qty: 1, unit: "Adet", unitCost: 8500 },
        { id: 3, costType: "710", name: "Lineer Kızak & Vidalı Mil Seti", qty: 1, unit: "Set", unitCost: 4200 },
        { id: 4, costType: "710", name: "Elektrostatik Toz Boya Sarfı", qty: 3, unit: "kg", unitCost: 140 },
        { id: 5, costType: "710", name: "8.8 Çelik Civata & Bağlantı Paketi", qty: 1, unit: "Paket", unitCost: 320 },
        { id: 6, costType: "720", name: "CNC Freze Operatör İşçiliği", qty: 3.5, unit: "Saat", unitCost: 350 },
        { id: 7, costType: "720", name: "Kaynak & Tesviye Ustalığı", qty: 2.0, unit: "Saat", unitCost: 340 },
        { id: 8, costType: "720", name: "Boya & Kalite Kontrol İşçiliği", qty: 1.0, unit: "Saat", unitCost: 320 },
        { id: 9, costType: "730", name: "Makine Elektrik & Enerji Tüketim Payı", qty: 1, unit: "Birim", unitCost: 850 },
        { id: 10, costType: "730", name: "CNC Tezgahı Amortisman Payı (253)", qty: 1, unit: "Birim", unitCost: 650 },
        { id: 11, costType: "730", name: "Kesici Takım & Soğutma Sıvısı Sarfı", qty: 1, unit: "Birim", unitCost: 420 },
        { id: 12, costType: "730", name: "Fabrika Genel Yönetim & Bina Payı", qty: 1, unit: "Birim", unitCost: 355 },
      ],
    },
    {
      id: 2,
      code: "MM-002",
      name: "Hidrolik Güç Ünitesi",
      productGroup: "Endüstriyel Makineler",
      productType: "MAMUL",
      unit: "Adet",
      targetMargin: 30,
      items: [
        { id: 1, costType: "710", name: "3 Fazlı Asenkron Elektrik Motoru 7.5kW", qty: 1, unit: "Adet", unitCost: 6200 },
        { id: 2, costType: "710", name: "Değişken Debili Pistonlu Pompa", qty: 1, unit: "Adet", unitCost: 5100 },
        { id: 3, costType: "710", name: "Hidrolik Valf Bloğu & Bobin Grubu", qty: 1, unit: "Set", unitCost: 3400 },
        { id: 4, costType: "710", name: "100 Lt Yağ Deposu & Seviye Göstergesi", qty: 1, unit: "Adet", unitCost: 2400 },
        { id: 5, costType: "720", name: "Hidrolik Montaj & Borulama İşçiliği", qty: 4.0, unit: "Saat", unitCost: 360 },
        { id: 6, costType: "720", name: "Basınç & Sızdırmazlık Test Operatörü", qty: 1.5, unit: "Saat", unitCost: 350 },
        { id: 7, costType: "730", name: "Test İstasyonu Elektrik & Yağ Sarfı", qty: 1, unit: "Birim", unitCost: 480 },
        { id: 8, costType: "730", name: "Montaj Hattı Amortisman & Sarf Payı", qty: 1, unit: "Birim", unitCost: 390 },
      ],
    },
    {
      id: 3,
      code: "YM-001",
      name: "Lazer Kesim Şasi Paneli",
      productGroup: "Sac & Profil İşleme",
      productType: "YARI_MAMUL",
      unit: "Adet",
      targetMargin: 25,
      items: [
        { id: 1, costType: "710", name: "DKP Sac Levha 3mm (18 kg)", qty: 18, unit: "kg", unitCost: 55 },
        { id: 2, costType: "710", name: "Lazer Kesim Azot/Oksijen Gaz Sarfı", qty: 1, unit: "Adet", unitCost: 85 },
        { id: 3, costType: "720", name: "Lazer Operatörü & Çapak Alma", qty: 0.4, unit: "Saat", unitCost: 320 },
        { id: 4, costType: "730", name: "Lazer Teçhizatı Elektrik & Lazer Kaynak Payı", qty: 1, unit: "Birim", unitCost: 110 },
        { id: 5, costType: "730", name: "Lazer Tezgahı Amortismanı", qty: 1, unit: "Birim", unitCost: 65 },
      ],
    },
    {
      id: 4,
      code: "YM-002",
      name: "Abkant Büküm Muhafaza Sacı",
      productGroup: "Sac & Profil İşleme",
      productType: "YARI_MAMUL",
      unit: "Adet",
      targetMargin: 25,
      items: [
        { id: 1, costType: "710", name: "Kesilmiş Sac Plaka 2mm", qty: 1, unit: "Adet", unitCost: 480 },
        { id: 2, costType: "720", name: "CNC Abkant Büküm Operatörü", qty: 0.35, unit: "Saat", unitCost: 330 },
        { id: 3, costType: "730", name: "Abkant Hidrolik Enerji & Bıçak Aşınma", qty: 1, unit: "Birim", unitCost: 55 },
      ],
    },
    {
      id: 5,
      code: "YM-003",
      name: "Hassas Mil & Şaft Grubu",
      productGroup: "Talaşlı İmalat",
      productType: "YARI_MAMUL",
      unit: "Adet",
      targetMargin: 28,
      items: [
        { id: 1, costType: "710", name: "4140 Islah Çeliği Transmisyon Mili (6 kg)", qty: 6, unit: "kg", unitCost: 85 },
        { id: 2, costType: "720", name: "CNC Torna Çift Taret İşleme", qty: 0.5, unit: "Saat", unitCost: 340 },
        { id: 3, costType: "730", name: "Tornalama Takım & Bor Yağı Payı", qty: 1, unit: "Birim", unitCost: 75 },
      ],
    },
    {
      id: 6,
      code: "MM-003",
      name: "PLC Kontrol Panosu & Otomasyon",
      productGroup: "Otomasyon & Pano",
      productType: "MAMUL",
      unit: "Adet",
      targetMargin: 35,
      items: [
        { id: 1, costType: "710", name: "PLC CPU Modülü + Dijital G/Ç Modülleri", qty: 1, unit: "Set", unitCost: 7800 },
        { id: 2, costType: "710", name: "7 İnç Renkli Dokunmatik HMI Ekran", qty: 1, unit: "Adet", unitCost: 3200 },
        { id: 3, costType: "710", name: "Kontaktör, Sigorta & Ray Klemensleri", qty: 1, unit: "Set", unitCost: 2100 },
        { id: 4, costType: "710", name: "IP55 Çelik Pano Kabini 800x600x300", qty: 1, unit: "Adet", unitCost: 2600 },
        { id: 5, costType: "720", name: "Otomasyon & Pano Montaj Teknisyeni", qty: 4.5, unit: "Saat", unitCost: 380 },
        { id: 6, costType: "720", name: "PLC Yazılım & Devreye Alma Mühendisi", qty: 2.0, unit: "Saat", unitCost: 450 },
        { id: 7, costType: "730", name: "Elektriksel Test Cihazları & Yazılım Lisans Payı", qty: 1, unit: "Birim", unitCost: 380 },
      ],
    },
  ]);

  // Seçili ürün ve maliyet toplamları
  const currentProduct = productCards.find((p) => p.id === selectedProductId) || productCards[0];
  const currentMat710 = (currentProduct.items || [])
    .filter((it) => it.costType === "710")
    .reduce((s, it) => s + it.qty * it.unitCost, 0);
  const currentLab720 = (currentProduct.items || [])
    .filter((it) => it.costType === "720")
    .reduce((s, it) => s + it.qty * it.unitCost, 0);
  const currentOvh730 = (currentProduct.items || [])
    .filter((it) => it.costType === "730")
    .reduce((s, it) => s + it.qty * it.unitCost, 0);
  const currentUnitCost = currentMat710 + currentLab720 + currentOvh730;
  const currentSuggestedPrice = Math.round(currentUnitCost * (1 + currentProduct.targetMargin / 100));

  // Tüm ürünlerin birim maliyet özet haritası
  const productCostMap = useMemo(() => {
    const map = new Map<string, { unitCost: number; price: number; margin: number }>();
    productCards.forEach((p) => {
      const mat = p.items.filter((it) => it.costType === "710").reduce((s, it) => s + it.qty * it.unitCost, 0);
      const lab = p.items.filter((it) => it.costType === "720").reduce((s, it) => s + it.qty * it.unitCost, 0);
      const ovh = p.items.filter((it) => it.costType === "730").reduce((s, it) => s + it.qty * it.unitCost, 0);
      const cost = mat + lab + ovh;
      const price = Math.round(cost * (1 + p.targetMargin / 100));
      map.set(p.name, { unitCost: cost, price, margin: p.targetMargin });
    });
    return map;
  }, [productCards]);

  // 3. AYLIK MALİYET VERİLERİ (Maliyet grubu / kalem / ürün karşılığı / miktar / birim / fiyat / oran% (grup) / oran% (toplam gider))
  const [aylikCostRows, setAylikCostRows] = useState<AylikMaliyetRow[]>([
    // 710
    { id: 1, costGroup: "710 Direkt İlk Madde ve Malzeme", costItem: "S355 Yapı Çeliği & DKP Sac Levha", productRelation: "Sac & Profil İşleme", qty: 32000, unit: "kg", unitPrice: 65 },
    { id: 2, costGroup: "710 Direkt İlk Madde ve Malzeme", costItem: "Döküm Gövde & Mekanik Aksam", productRelation: "Endüstriyel Makineler", qty: 180, unit: "Adet", unitPrice: 4800 },
    { id: 3, costGroup: "710 Direkt İlk Madde ve Malzeme", costItem: "Motor, Pompa & Hidrolik Komponent", productRelation: "Endüstriyel Makineler", qty: 260, unit: "Set", unitPrice: 3200 },
    { id: 4, costGroup: "710 Direkt İlk Madde ve Malzeme", costItem: "PLC, HMI & Elektronik Şalt Grubu", productRelation: "Otomasyon & Pano", qty: 330, unit: "Set", unitPrice: 4500 },
    { id: 5, costGroup: "710 Direkt İlk Madde ve Malzeme", costItem: "Bağlantı Civatası, Boya & Sarf", productRelation: "Tüm Ürünler / Fabrika", qty: 1800, unit: "kg", unitPrice: 110 },
    // 720
    { id: 6, costGroup: "720 Direkt İşçilik Giderleri", costItem: "CNC Freze & Torna Operatörleri", productRelation: "Talaşlı İmalat & Gövde", qty: 12, unit: "Kişi/Ay", unitPrice: 38500 },
    { id: 7, costGroup: "720 Direkt İşçilik Giderleri", costItem: "Lazer & Abkant Kesim Ustaları", productRelation: "Sac & Profil İşleme", qty: 8, unit: "Kişi/Ay", unitPrice: 36000 },
    { id: 8, costGroup: "720 Direkt İşçilik Giderleri", costItem: "Hidrolik & Mekanik Montaj Ekibi", productRelation: "Endüstriyel Makineler", qty: 6, unit: "Kişi/Ay", unitPrice: 37500 },
    { id: 9, costGroup: "720 Direkt İşçilik Giderleri", costItem: "Otomasyon Teknisyeni & Pano Ekibi", productRelation: "Otomasyon & Pano", qty: 4, unit: "Kişi/Ay", unitPrice: 42000 },
    // 730
    { id: 10, costGroup: "730 Genel Üretim Giderleri", costItem: "Elektrik Enerjisi Tüketim Bütçesi", productRelation: "Tüm Makine Parkuru", qty: 38500, unit: "kWh", unitPrice: 3.85 },
    { id: 11, costGroup: "730 Genel Üretim Giderleri", costItem: "Makine Parkuru Amortismanı (253)", productRelation: "Tüm Makineler", qty: 1, unit: "Ay", unitPrice: 95000 },
    { id: 12, costGroup: "730 Genel Üretim Giderleri", costItem: "Periyodik Bakım & Yedek Parça Sarfı", productRelation: "Tüm Makine Parkuru", qty: 1, unit: "Ay", unitPrice: 48000 },
    { id: 13, costGroup: "730 Genel Üretim Giderleri", costItem: "Fabrika Üretim Tesisi Kira & Sigorta", productRelation: "Fabrika Binası", qty: 1, unit: "Ay", unitPrice: 75000 },
    { id: 14, costGroup: "730 Genel Üretim Giderleri", costItem: "İş Güvenliği & Fabrika Genel Sarfları", productRelation: "Genel Fabrika", qty: 1, unit: "Ay", unitPrice: 28500 },
    // 760
    { id: 15, costGroup: "760 Pazarlama, Satış ve Dağıtım", costItem: "Müşteri Sevkiyatı & Nakliye Lojistiği", productRelation: "Tüm Mamuller", qty: 42, unit: "Sefer", unitPrice: 2900 },
    { id: 16, costGroup: "760 Pazarlama, Satış ve Dağıtım", costItem: "Satış & İhracat Ekibi Prim & Seyahat", productRelation: "Yurt İçi & İhracat", qty: 4, unit: "Kişi/Ay", unitPrice: 21500 },
    // 770
    { id: 17, costGroup: "770 Genel Yönetim Giderleri", costItem: "Yönetim, Muhasebe & İK Maaşları", productRelation: "Merkez Yönetim", qty: 6, unit: "Kişi/Ay", unitPrice: 34500 },
    { id: 18, costGroup: "770 Genel Yönetim Giderleri", costItem: "ERP Yazılım Lisansları & IT Altyapı", productRelation: "Bilgi İşlem", qty: 1, unit: "Ay", unitPrice: 42000 },
    { id: 19, costGroup: "770 Genel Yönetim Giderleri", costItem: "Müşavirlik, Hukuk & Danışmanlık", productRelation: "Genel İdare", qty: 1, unit: "Ay", unitPrice: 35000 },
    // 780
    { id: 20, costGroup: "780 Finansman Giderleri", costItem: "Banka İşletme Kredisi Faiz & BSMV", productRelation: "Finansman Yönetimi", qty: 1, unit: "Ay", unitPrice: 36500 },
  ]);

  // Aylık Maliyet Hesaplamaları
  const aylikTotals = useMemo(() => {
    const rowsWithTotal = aylikCostRows.map((r) => ({
      ...r,
      monthlyTotal: r.qty * r.unitPrice,
    }));

    const groupSumMap = new Map<string, number>();
    let grandTotal = 0;
    rowsWithTotal.forEach((r) => {
      grandTotal += r.monthlyTotal;
      groupSumMap.set(r.costGroup, (groupSumMap.get(r.costGroup) || 0) + r.monthlyTotal);
    });

    return {
      rows: rowsWithTotal.map((r) => {
        const gSum = groupSumMap.get(r.costGroup) || 1;
        const groupPct = (r.monthlyTotal / gSum) * 100;
        const totalPct = (r.monthlyTotal / (grandTotal || 1)) * 100;
        return {
          ...r,
          groupPct,
          totalPct,
        };
      }),
      groupSumMap,
      grandTotal,
    };
  }, [aylikCostRows]);

  const [filterCostGroup, setFilterCostGroup] = useState<string>("TÜMÜ");

  // 4. SATIŞ CİRO VERİLERİ (Ürün grubu — birim maliyet — satış fiyatı — kar marjı% — aylık üretim — aylık ciro)
  // Üretim Hesaplama ve Birim Maliyet'ten dinamik senkronize edilir
  const ciroRows = useMemo(() => {
    // Sadece MAMUL olanları ciro hesabına dahil et
    const mamulPlanRows = uretimTotals.filter((r) => r.productType === "MAMUL");
    return mamulPlanRows.map((u) => {
      const costInfo = productCostMap.get(u.productName) || {
        unitCost: 15000,
        price: 21000,
        margin: 30,
      };

      const unitCost = costInfo.unitCost;
      const salesPrice = costInfo.price;
      const marginPct = salesPrice > 0 ? ((salesPrice - unitCost) / salesPrice) * 100 : costInfo.margin;
      const monthlyProduction = u.netMonthly;
      const monthlyCiro = salesPrice * monthlyProduction;
      const monthlyCost = unitCost * monthlyProduction;
      const monthlyGrossProfit = monthlyCiro - monthlyCost;
      const grossMarginPct = monthlyCiro > 0 ? (monthlyGrossProfit / monthlyCiro) * 100 : 0;

      return {
        id: u.id,
        productGroup: u.productGroup,
        productName: u.productName,
        unitCost,
        salesPrice,
        marginPct,
        monthlyProduction,
        monthlyCiro,
        monthlyCost,
        monthlyGrossProfit,
        grossMarginPct,
      };
    });
  }, [uretimTotals, productCostMap]);

  const totalMonthlyCiro = ciroRows.reduce((s, r) => s + r.monthlyCiro, 0);
  const totalMonthlyCost = ciroRows.reduce((s, r) => s + r.monthlyCost, 0);
  const totalMonthlyGrossProfit = totalMonthlyCiro - totalMonthlyCost;
  const overallGrossMarginPct = totalMonthlyCiro > 0 ? (totalMonthlyGrossProfit / totalMonthlyCiro) * 100 : 0;

  // 5. GELİR & KAR ANALİZİ (P&L, EBITDA, Net Kar, Başabaş BEP Noktası)
  // Tüm bilgiler diğer bölümlerden otomatik toplanır
  const pnlData = useMemo(() => {
    const brutSatislar = totalMonthlyCiro;
    const iadelerVeIskontolar = Math.round(brutSatislar * 0.015); // %1.5 standart iskonto/iade
    const netSatislar = brutSatislar - iadelerVeIskontolar;
    const smm = totalMonthlyCost; // Satılan Mamul Maliyeti
    const brutSatisKari = netSatislar - smm;
    const brutKarMarji = netSatislar > 0 ? (brutSatisKari / netSatislar) * 100 : 0;

    // Faaliyet Giderleri (Aylık Maliyet tablosundan 760 ve 770 toplamları)
    const pazarlama760 = aylikTotals.groupSumMap.get("760 Pazarlama, Satış ve Dağıtım") || 207800;
    const yonetim770 = aylikTotals.groupSumMap.get("770 Genel Yönetim Giderleri") || 284000;
    const faaliyetGiderleri = pazarlama760 + yonetim770;

    // Faaliyet Karı (EBITDA / FAVÖK)
    const faaliyetKari = brutSatisKari - faaliyetGiderleri;
    const faaliyetKarMarji = netSatislar > 0 ? (faaliyetKari / netSatislar) * 100 : 0;

    // Finansman Giderleri (Aylık Maliyet tablosundan 780 toplamı)
    const finansman780 = aylikTotals.groupSumMap.get("780 Finansman Giderleri") || 36500;

    // Vergi Öncesi Kar & Kurumlar Vergisi (%25)
    const vergiOncesiKar = faaliyetKari - finansman780;
    const kurumlarVergisi = vergiOncesiKar > 0 ? Math.round(vergiOncesiKar * 0.25) : 0;
    const netDonemKari = vergiOncesiKar - kurumlarVergisi;
    const netKarMarji = netSatislar > 0 ? (netDonemKari / netSatislar) * 100 : 0;

    // Başabaş Noktası (BEP) Analizi
    const sabitGiderler =
      (aylikTotals.groupSumMap.get("730 Genel Üretim Giderleri") || 295000) * 0.65 +
      faaliyetGiderleri +
      finansman780;
    const degiskenGiderler = smm * 0.85;
    const degiskenOran = netSatislar > 0 ? degiskenGiderler / netSatislar : 0.62;
    const bepHasilat = degiskenOran < 1 ? Math.round(sabitGiderler / (1 - degiskenOran)) : 0;
    const guvenlikMarji = netSatislar > 0 ? ((netSatislar - bepHasilat) / netSatislar) * 100 : 0;

    return {
      brutSatislar,
      iadelerVeIskontolar,
      netSatislar,
      smm,
      brutSatisKari,
      brutKarMarji,
      pazarlama760,
      yonetim770,
      faaliyetGiderleri,
      faaliyetKari,
      faaliyetKarMarji,
      finansman780,
      vergiOncesiKar,
      kurumlarVergisi,
      netDonemKari,
      netKarMarji,
      sabitGiderler,
      bepHasilat,
      guvenlikMarji,
    };
  }, [totalMonthlyCiro, totalMonthlyCost, aylikTotals]);

  // 6. ELEKTRİK TÜKETİM BÜTÇESİ (Makina Parkurundan çekilen verilerle)
  const [elecRows, setElecRows] = useState<ElecRow[]>([]);

  useEffect(() => {
    if (machines.length > 0 && elecRows.length === 0) {
      setElecRows(
        machines.map((m) => ({
          machineId: m.id,
          machineName: `${m.code} — ${m.name}`,
          powerKw: m.power_kw || 18,
          qty: 1,
          hoursDay: m.daily_hours || 16,
          workDays: m.monthly_work_days || globalWorkDays,
          rateTl: globalRateTl,
        }))
      );
    }
  }, [machines, globalWorkDays, globalRateTl, elecRows.length]);

  const elecTotals = useMemo(() => {
    return elecRows.map((r) => {
      const totalKw = r.powerKw * r.qty;
      const kwhDay = totalKw * r.hoursDay;
      const tlDay = kwhDay * r.rateTl;
      const monthlyKwh = kwhDay * r.workDays;
      const monthlyTl = tlDay * r.workDays;
      return { ...r, totalKw, kwhDay, tlDay, monthlyKwh, monthlyTl };
    });
  }, [elecRows]);

  const totalMonthlyElecTl = elecTotals.reduce((s, r) => s + r.monthlyTl, 0);
  const totalMonthlyElecKwh = elecTotals.reduce((s, r) => s + r.monthlyKwh, 0);

  // Tab tanımları
  const tabs = [
    { id: "uretim" as const, label: "🏭 1. Üretim Hesaplama", desc: "Ürün Grubu × Makina × Günlük × Gün → Aylık/Yıllık" },
    { id: "birim" as const, label: "📐 2. Birim Maliyet (Mamül & Yarı Mamül)", desc: "Ürün Seçimi + 710/720/730 Maliyet Kalemleri" },
    { id: "aylik" as const, label: "📅 3. Aylık Maliyet Dağılımı", desc: "Maliyet Grubu / Kalem / Miktar / Fiyat / Oran%" },
    { id: "ciro" as const, label: "💰 4. Satış Ciro & Karlılık", desc: "Birim Maliyet — Satış Fiyatı — Kar Marjı% — Ciro" },
    { id: "kar" as const, label: "📈 5. Gelir & Kar Analizi (P&L)", desc: "EBITDA, Net Kar & Başabaş (BEP) Analizi" },
    { id: "elektrik" as const, label: "⚡ 6. Makina Elektrik Bütçesi", desc: "Makine Parkuru Enerji & kWh Maliyeti" },
  ];

  return (
    <div className="ayar-form-card" style={{ padding: 18 }}>
      {/* ÜST BAŞLIK VE GENEL PARAMETRELER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <span>📊</span> Maliyet Bütçesi &amp; Üretim Maliyet Muhasebesi (VUK 7/A)
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
            Üretim hesaplama, birim maliyet kalemleri, aylık gider dağılımı, satış cirosu ve gelir tablosu entegre motoru
          </p>
        </div>

        {/* Global Parametre Giriş Kutuları */}
        <div style={{ display: "flex", gap: 10, background: "#f8fafc", padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", alignItems: "center" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
            📅 Aylık Çalışma Günü:
            <input
              type="number"
              className="form-control"
              style={{ width: 65, marginLeft: 6, display: "inline-block", fontSize: 12, fontWeight: 700 }}
              value={globalWorkDays}
              onChange={(e) => {
                const days = Number(e.target.value) || 22;
                setGlobalWorkDays(days);
                setUretimRows((prev) => prev.map((r) => ({ ...r, workDays: days })));
                setElecRows((prev) => prev.map((r) => ({ ...r, workDays: days })));
              }}
            />
            <span style={{ fontSize: 11, color: "#64748b", marginLeft: 3 }}>Gün</span>
          </label>

          <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
            ⚡ Elektrik Birim Fiyatı:
            <input
              type="number"
              step="0.05"
              className="form-control"
              style={{ width: 75, marginLeft: 6, display: "inline-block", fontSize: 12, fontWeight: 700 }}
              value={globalRateTl}
              onChange={(e) => {
                const rate = Number(e.target.value) || 3.85;
                setGlobalRateTl(rate);
                setElecRows((prev) => prev.map((r) => ({ ...r, rateTl: rate })));
              }}
            />
            <span style={{ fontSize: 11, color: "#64748b", marginLeft: 3 }}>₺/kWh</span>
          </label>
        </div>
      </div>

      {/* SEKMELER */}
      <nav className="hub-tabs" style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hub-tab${tab === t.id ? " active" : ""}`}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: tab === t.id ? 700 : 500,
              fontSize: 12.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              border: tab === t.id ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: tab === t.id ? "#eff6ff" : "#fff",
              color: tab === t.id ? "#1d4ed8" : "#334155",
            }}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ========================================================
          1. ÜRETİM HESAPLAMA TABI
          (Ürün grubu × makina × günlük üretim × çalışma günü → aylık/yıllık üretim)
         ======================================================== */}
      {tab === "uretim" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Toplam Günlük Üretim Kapasitesi</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {totalDailyProduction.toLocaleString("tr-TR")} Adet / Gün
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Aylık Net Mamul &amp; Yarı Mamul Üretimi</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
                {totalNetMonthlyProduction.toLocaleString("tr-TR")} Adet / Ay
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Yıllık Toplam Üretim Hacmi</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
                {totalYearlyProduction.toLocaleString("tr-TR")} Adet / Yıl
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ minWidth: 175 }}>
                    Ürün Grubu
                    <InfoBadge
                      title="Ürün Grubu Tanımı"
                      text="Bu alan Stok & Depo Yönetimi › Stok Kartları (Kategori / Grup alanı) üzerinden tanımlanmaktadır. Tanımlanan mamul ve yarı mamul grupları bu menüden otomatik seçilir."
                      linkHint="Kaynak Modül: Stok & Depo › Stok Kartları"
                    />
                  </th>
                  <th style={{ minWidth: 220 }}>
                    Ürün / Mamul Adı
                    <InfoBadge
                      title="Ürün / Mamul Seçimi"
                      text="Bu ürünler Stok & Depo Yönetimi › Stok Kartları menüsünden tanımlanmaktadır. 'Kart Türü: Mamul (152)' veya 'Yarı Mamul (151)' olan tüm stok kartları bu alanda seçilebilir olarak listelenir."
                      linkHint="Kaynak Modül: Stok & Depo › Stok Kartları"
                    />
                  </th>
                  <th style={{ width: 110 }}>Tür</th>
                  <th style={{ minWidth: 190 }}>Makina (Makina Parkurundan)</th>
                  <th style={{ width: 95, textAlign: "right" }}>Günlük Üretim</th>
                  <th style={{ width: 85, textAlign: "center" }}>Çalışma Günü</th>
                  <th style={{ width: 105, textAlign: "right" }}>Brüt Aylık</th>
                  <th style={{ width: 80, textAlign: "center" }}>Fire (%)</th>
                  <th style={{ width: 110, textAlign: "right" }}>Net Aylık Üretim</th>
                  <th style={{ width: 120, textAlign: "right" }}>Yıllık Üretim</th>
                  <th style={{ width: 50, textAlign: "center" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {uretimTotals.map((r, idx) => (
                  <tr key={r.id}>
                    <td>
                      <select
                        className="form-control"
                        style={{ fontSize: 12, fontWeight: 600 }}
                        value={r.productGroup}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUretimRows((rows) =>
                            rows.map((x, i) => (i === idx ? { ...x, productGroup: val } : x))
                          );
                        }}
                      >
                        {availableProductGroups.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}
                        value={r.productName}
                        onChange={(e) => {
                          const selName = e.target.value;
                          const found = availableProductOptions.find((p) => p.name === selName);
                          setUretimRows((rows) =>
                            rows.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    productName: selName,
                                    productGroup: found ? found.group : x.productGroup,
                                    productType: found ? found.type : x.productType,
                                  }
                                : x
                            )
                          );
                        }}
                      >
                        {availableProductOptions.map((p) => (
                          <option key={p.code + p.name} value={p.name}>
                            [{p.type === "MAMUL" ? "152 Mamul" : "151 Yarı Mamul"}] {p.code} — {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ fontSize: 11, fontWeight: 600 }}
                        value={r.productType}
                        onChange={(e) =>
                          setUretimRows((rows) =>
                            rows.map((x, i) =>
                              i === idx ? { ...x, productType: e.target.value as "MAMUL" | "YARI_MAMUL" } : x
                            )
                          )
                        }
                      >
                        <option value="MAMUL">Mamul (152)</option>
                        <option value="YARI_MAMUL">Yarı Mamul (151)</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ fontSize: 11 }}
                        value={r.machineId}
                        onChange={(e) => {
                          const mid = Number(e.target.value);
                          const m = machines.find((x) => x.id === mid);
                          setUretimRows((rows) =>
                            rows.map((x, i) =>
                              i === idx
                                ? { ...x, machineId: mid, machineName: m ? `${m.code} — ${m.name}` : "" }
                                : x
                            )
                          );
                        }}
                      >
                        {machines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} — {m.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 80, textAlign: "right", fontSize: 12, fontWeight: 700 }}
                        value={r.dailyQty ?? 0}
                        onChange={(e) =>
                          setUretimRows((rows) =>
                            rows.map((x, i) =>
                              i === idx ? { ...x, dailyQty: Number(e.target.value) || 0 } : x
                            )
                          )
                        }
                      />
                    </td>
                    <td style={{ textAlign: "center", color: "#64748b" }}>{r.workDays} gün</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{r.grossMonthly.toLocaleString("tr-TR")} ad</td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        style={{ width: 60, textAlign: "center", fontSize: 11 }}
                        value={r.scrapPct ?? 0}
                        onChange={(e) =>
                          setUretimRows((rows) =>
                            rows.map((x, i) =>
                              i === idx ? { ...x, scrapPct: Number(e.target.value) || 0 } : x
                            )
                          )
                        }
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#2563eb" }}>
                      {r.netMonthly.toLocaleString("tr-TR")} ad
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                      {r.yearlyQty.toLocaleString("tr-TR")} ad
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn-cancel"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        title="Satırı sil"
                        onClick={() => setUretimRows((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const nextId = uretimRows.length + 1;
                const m = machines[0];
                setUretimRows((prev) => [
                  ...prev,
                  {
                    id: nextId,
                    productGroup: "Yeni Ürün Grubu",
                    productName: `Yeni Ürün ${nextId}`,
                    productType: "MAMUL",
                    machineId: m ? m.id : 1,
                    machineName: m ? `${m.code} — ${m.name}` : "CNC-01",
                    dailyQty: 10,
                    workDays: globalWorkDays,
                    scrapPct: 1.0,
                  },
                ]);
              }}
            >
              ➕ Yeni Üretim Planı Satırı Ekle
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          2. BİRİM MALİYET TABI
          (Üretilen ürün (mamül/yarı mamül) + maliyet kalemleri gridi: 710 + 720 + 730)
         ======================================================== */}
      {tab === "birim" && (
        <div>
          {/* Ürün Seçim ve Özet Kartı */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                🎯 Maliyet Kartı İncelenecek Ürün:
              </label>
              <select
                className="form-control"
                style={{ fontSize: 13, fontWeight: 700, minWidth: 260 }}
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
              >
                {productCards.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.productType}] {p.code} — {p.name} ({p.productGroup})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 11, color: "#64748b" }}>Hedef Kar Marjı:</span>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: 65, marginLeft: 6, display: "inline-block", fontSize: 12, fontWeight: 700 }}
                  value={currentProduct.targetMargin ?? 0}
                  onChange={(e) => {
                    const margin = Number(e.target.value) || 0;
                    setProductCards((cards) =>
                      cards.map((c) => (c.id === currentProduct.id ? { ...c, targetMargin: margin } : c))
                    );
                  }}
                />
                <span style={{ fontSize: 11, color: "#64748b", marginLeft: 3 }}>%</span>
              </div>

              <div style={{ textAlign: "right", borderLeft: "1px solid #e2e8f0", paddingLeft: 14 }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Önerilen Satış Fiyatı</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>
                  ₺{money(currentSuggestedPrice)}
                </div>
              </div>
            </div>
          </div>

          {/* VUK 7/A 3'lü Maliyet Grubu Özeti */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 700 }}>710 Direkt İlk Madde ve Malzeme</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a", marginTop: 2 }}>
                ₺{money2(currentMat710)}
              </div>
              <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>
                %{((currentMat710 / (currentUnitCost || 1)) * 100).toFixed(1)} birim payı
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>720 Direkt İşçilik Giderleri</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#14532d", marginTop: 2 }}>
                ₺{money2(currentLab720)}
              </div>
              <div style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>
                %{((currentLab720 / (currentUnitCost || 1)) * 100).toFixed(1)} birim payı
              </div>
            </div>

            <div style={{ background: "#fefce8", border: "1px solid #fef08a", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#854d0e", fontWeight: 700 }}>730 Genel Üretim Giderleri (GÜG)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#713f12", marginTop: 2 }}>
                ₺{money2(currentOvh730)}
              </div>
              <div style={{ fontSize: 11, color: "#eab308", marginTop: 2 }}>
                %{((currentOvh730 / (currentUnitCost || 1)) * 100).toFixed(1)} birim payı
              </div>
            </div>

            <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#334155", fontWeight: 700 }}>TOPLAM BİRİM MAMUL MALİYETİ</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", marginTop: 2 }}>
                ₺{money2(currentUnitCost)}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                VUK Madde 275 standardı
              </div>
            </div>
          </div>

          {/* Maliyet Kalemleri Gridi */}
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ width: 140 }}>Maliyet Kodu (VUK)</th>
                  <th style={{ minWidth: 260 }}>
                    Maliyet Kalemi Tanımı
                    <InfoBadge
                      title="Maliyet Kalemi Tanımı"
                      text="Maliyet kalemleri Genel Muhasebe › Hesap Planı (7/A Maliyet Hesapları: 710, 720, 730) ve Üretim & MRP › BOM (Reçeteler) menülerindeki tanımlardan beslenmektedir. Kalem seçildiğinde hesap kodu, birim ve standart maliyeti otomatik gelir."
                      linkHint="Kaynak Modül: Genel Muhasebe › Hesap Planı & BOM Reçeteleri"
                    />
                  </th>
                  <th style={{ width: 90, textAlign: "right" }}>Miktar</th>
                  <th style={{ width: 80 }}>Birim</th>
                  <th style={{ width: 110, textAlign: "right" }}>Birim Maliyet (₺)</th>
                  <th style={{ width: 130, textAlign: "right" }}>Toplam Kalem Tutarı (₺)</th>
                  <th style={{ width: 85, textAlign: "right" }}>Payı (%)</th>
                  <th style={{ width: 50, textAlign: "center" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {currentProduct.items.map((it, idx) => {
                  const itemTotal = it.qty * it.unitCost;
                  const itemPct = (itemTotal / (currentUnitCost || 1)) * 100;
                  return (
                    <tr key={it.id}>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 11,
                            background:
                              it.costType === "710"
                                ? "#dbeafe"
                                : it.costType === "720"
                                ? "#dcfce7"
                                : "#fef9c3",
                            color:
                              it.costType === "710"
                                ? "#1e40af"
                                : it.costType === "720"
                                ? "#166534"
                                : "#854d0e",
                          }}
                        >
                          {it.costType === "710"
                            ? "710 İlk Madde"
                            : it.costType === "720"
                            ? "720 İşçilik"
                            : "730 Genel Üretim"}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ fontSize: 12, fontWeight: 600, minWidth: 220 }}
                          value={it.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = availableCostItems.find((c) => c.name === val);
                            setProductCards((cards) =>
                              cards.map((c) =>
                                c.id === currentProduct.id
                                  ? {
                                      ...c,
                                      items: c.items.map((item, i) =>
                                        i === idx
                                          ? {
                                              ...item,
                                              name: val,
                                              costType: found ? found.costType : item.costType,
                                              unit: found ? found.unit : item.unit,
                                              unitCost: found ? found.unitCost : item.unitCost,
                                            }
                                          : item
                                      ),
                                    }
                                  : c
                              )
                            );
                          }}
                        >
                          {availableCostItems.map((c, cIdx) => (
                            <option key={cIdx} value={c.name}>
                              [{c.costType}] {c.name} ({c.unitCost} ₺/{c.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          style={{ width: "100%", textAlign: "right", fontSize: 12 }}
                          value={it.qty ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setProductCards((cards) =>
                              cards.map((c) =>
                                c.id === currentProduct.id
                                  ? {
                                      ...c,
                                      items: c.items.map((item, i) => (i === idx ? { ...item, qty: val } : item)),
                                    }
                                  : c
                              )
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control"
                          style={{ width: "100%", fontSize: 11 }}
                          value={it.unit ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductCards((cards) =>
                              cards.map((c) =>
                                c.id === currentProduct.id
                                  ? {
                                      ...c,
                                      items: c.items.map((item, i) => (i === idx ? { ...item, unit: val } : item)),
                                    }
                                  : c
                              )
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          style={{ width: "100%", textAlign: "right", fontSize: 12 }}
                          value={it.unitCost ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setProductCards((cards) =>
                              cards.map((c) =>
                                c.id === currentProduct.id
                                  ? {
                                      ...c,
                                      items: c.items.map((item, i) => (i === idx ? { ...item, unitCost: val } : item)),
                                    }
                                  : c
                              )
                            );
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                        ₺{money2(itemTotal)}
                      </td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>%{itemPct.toFixed(1)}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn-cancel"
                          style={{ padding: "2px 6px", fontSize: 11 }}
                          title="Kalemi sil"
                          onClick={() => {
                            setProductCards((cards) =>
                              cards.map((c) =>
                                c.id === currentProduct.id
                                  ? { ...c, items: c.items.filter((_, i) => i !== idx) }
                                  : c
                              )
                            );
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const nextId = currentProduct.items.length + 1;
                const newItem: BirimMaliyetItem = {
                  id: nextId,
                  costType: "710",
                  name: `Yeni Maliyet Kalemi ${nextId}`,
                  qty: 1,
                  unit: "Adet",
                  unitCost: 100,
                };
                setProductCards((cards) =>
                  cards.map((c) => (c.id === currentProduct.id ? { ...c, items: [...c.items, newItem] } : c))
                );
              }}
            >
              ➕ Bu Ürüne Yeni Maliyet Kalemi Ekle
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          3. AYLIK MALİYET TABI
          (Maliyet grubu / kalem / ürün karşılığı / miktar / birim / fiyat / oran% (grup) / oran% (toplam gider))
         ======================================================== */}
      {tab === "aylik" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Grup Filtresi:</span>
              {[
                "TÜMÜ",
                "710 Direkt İlk Madde ve Malzeme",
                "720 Direkt İşçilik Giderleri",
                "730 Genel Üretim Giderleri",
                "760 Pazarlama, Satış ve Dağıtım",
                "770 Genel Yönetim Giderleri",
                "780 Finansman Giderleri",
              ].map((grp) => (
                <button
                  key={grp}
                  type="button"
                  className={`btn-secondary${filterCostGroup === grp ? " active" : ""}`}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    background: filterCostGroup === grp ? "#2563eb" : "#f1f5f9",
                    color: filterCostGroup === grp ? "#fff" : "#475569",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => setFilterCostGroup(grp)}
                >
                  {grp.length > 25 ? grp.slice(0, 18) + "..." : grp}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
              Toplam Aylık İşletme Gideri: <span style={{ color: "#dc2626" }}>₺{money(aylikTotals.grandTotal)}</span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ minWidth: 160 }}>Maliyet Grubu</th>
                  <th style={{ minWidth: 260 }}>
                    Kalem Tanımı
                    <InfoBadge
                      title="Kalem Tanımı"
                      text="Kalem tanımları Genel Muhasebe › Hesap Planı (710, 720, 730, 760, 770 Hesapları) ve Maliyet Muhasebesi › Masraf Merkezleri menüsünden gelmektedir. Giderin türüne göre ilgili 7/A hesabını seçebilirsiniz."
                      linkHint="Kaynak Modül: Genel Muhasebe › Hesap Planı (7/A)"
                    />
                  </th>
                  <th style={{ minWidth: 200 }}>
                    Ürün Karşılığı
                    <InfoBadge
                      title="Ürün Karşılığı"
                      text="Ürün karşılığı Stok & Depo Yönetimi › Stok Kartları menüsünden çekilmektedir. Belirli bir mamule ait olmayan ortak fabrika giderleri için 'Tüm Mamuller (Ortak Dağıtım)' seçilmelidir."
                      linkHint="Kaynak Modül: Stok & Depo › Stok Kartları"
                    />
                  </th>
                  <th style={{ width: 85, textAlign: "right" }}>Miktar</th>
                  <th style={{ width: 80 }}>Birim</th>
                  <th style={{ width: 105, textAlign: "right" }}>Fiyat (₺)</th>
                  <th style={{ width: 125, textAlign: "right" }}>Aylık Tutar (₺)</th>
                  <th style={{ width: 95, textAlign: "right" }}>Oran% (Grup)</th>
                  <th style={{ width: 105, textAlign: "right" }}>Oran% (Toplam Gider)</th>
                  <th style={{ width: 45, textAlign: "center" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {aylikTotals.rows
                  .filter((r) => filterCostGroup === "TÜMÜ" || r.costGroup === filterCostGroup)
                  .map((r, idx) => (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: "#1e40af", fontSize: 11 }}>
                          {r.costGroup}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ fontSize: 12, fontWeight: 500 }}
                          value={r.costItem}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = monthlyCostOptions.find((m) => m.costItem === val);
                            setAylikCostRows((prev) =>
                              prev.map((item) =>
                                item.id === r.id
                                  ? {
                                      ...item,
                                      costItem: val,
                                      costGroup: found ? found.costGroup : item.costGroup,
                                      unit: found ? found.unit : item.unit,
                                      unitPrice: found ? found.unitPrice : item.unitPrice,
                                    }
                                  : item
                              )
                            );
                          }}
                        >
                          {monthlyCostOptions.map((opt, oIdx) => (
                            <option key={oIdx} value={opt.costItem}>
                              {opt.costItem}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ fontSize: 11, color: "#334155", fontWeight: 600 }}
                          value={r.productRelation}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAylikCostRows((prev) =>
                              prev.map((item) => (item.id === r.id ? { ...item, productRelation: val } : item))
                            );
                          }}
                        >
                          <option value="Tüm Mamuller (Ortak Dağıtım)">Tüm Mamuller (Ortak Dağıtım)</option>
                          {availableProductOptions.map((p) => (
                            <option key={p.code + p.name} value={p.name}>
                              {p.name} ({p.code})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          style={{ textAlign: "right", fontSize: 12 }}
                          value={r.qty ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setAylikCostRows((prev) =>
                              prev.map((item) => (item.id === r.id ? { ...item, qty: val } : item))
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="form-control"
                          style={{ fontSize: 11 }}
                          value={r.unit ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAylikCostRows((prev) =>
                              prev.map((item) => (item.id === r.id ? { ...item, unit: val } : item))
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          style={{ textAlign: "right", fontSize: 12 }}
                          value={r.unitPrice ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setAylikCostRows((prev) =>
                              prev.map((item) => (item.id === r.id ? { ...item, unitPrice: val } : item))
                            );
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                        ₺{money(r.monthlyTotal)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "#2563eb" }}>
                        %{r.groupPct.toFixed(1)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#065f46" }}>
                        %{r.totalPct.toFixed(1)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn-cancel"
                          style={{ padding: "2px 6px", fontSize: 11 }}
                          title="Satırı sil"
                          onClick={() => setAylikCostRows((prev) => prev.filter((item) => item.id !== r.id))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const nextId = aylikCostRows.length + 1;
                const newRow: AylikMaliyetRow = {
                  id: nextId,
                  costGroup: "730 Genel Üretim Giderleri",
                  costItem: `Yeni Gider Kalemi ${nextId}`,
                  productRelation: "Tüm Fabrika",
                  qty: 1,
                  unit: "Ay",
                  unitPrice: 15000,
                };
                setAylikCostRows((prev) => [...prev, newRow]);
              }}
            >
              ➕ Yeni Aylık Maliyet Satırı Ekle
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          4. SATIŞ CİRO TABI
          (Ürün grubu — birim maliyet — satış fiyatı — kar marjı% — aylık üretim — aylık ciro)
         ======================================================== */}
      {tab === "ciro" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Aylık Toplam Ciro (600)</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", marginTop: 2 }}>
                ₺{money(totalMonthlyCiro)}
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Satılan Mamul Maliyeti (620)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                ₺{money(totalMonthlyCost)}
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Aylık Brüt Satış Karı</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#16a34a", marginTop: 2 }}>
                ₺{money(totalMonthlyGrossProfit)}
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Ağırlıklı Kar Marjı</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
                %{overallGrossMarginPct.toFixed(1)}
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ minWidth: 150 }}>Ürün Grubu</th>
                  <th style={{ minWidth: 180 }}>Ürün / Mamul Adı</th>
                  <th style={{ width: 120, textAlign: "right" }}>Birim Maliyet (₺)</th>
                  <th style={{ width: 120, textAlign: "right" }}>Satış Fiyatı (₺)</th>
                  <th style={{ width: 95, textAlign: "center" }}>Kar Marjı (%)</th>
                  <th style={{ width: 105, textAlign: "right" }}>Aylık Üretim</th>
                  <th style={{ width: 135, textAlign: "right" }}>Aylık Ciro (₺)</th>
                  <th style={{ width: 130, textAlign: "right" }}>Aylık Maliyet (620)</th>
                  <th style={{ width: 130, textAlign: "right" }}>Brüt Kar (₺)</th>
                </tr>
              </thead>
              <tbody>
                {ciroRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{r.productGroup}</span>
                    </td>
                    <td>
                      <strong style={{ color: "#0f172a" }}>{r.productName}</strong>
                    </td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>₺{money(r.unitCost)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#2563eb" }}>
                      ₺{money(r.salesPrice)}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#16a34a" }}>
                      %{r.marginPct.toFixed(1)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{r.monthlyProduction} ad</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                      ₺{money(r.monthlyCiro)}
                    </td>
                    <td style={{ textAlign: "right", color: "#dc2626" }}>₺{money(r.monthlyCost)}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#16a34a" }}>
                      ₺{money(r.monthlyGrossProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          5. GELİR & KAR ANALİZİ (P&L TABLOSU & BAŞABAŞ NOKTASI)
          (Diğer bölümlerden alınan bilgiler ve hesaplamalarla tam entegre)
         ======================================================== */}
      {tab === "kar" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Gelir Tablosu (P&L) */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "#1e293b", display: "flex", justifyContent: "space-between" }}>
              <span>📈 Finansal Gelir Tablosu &amp; Karlılık (P&amp;L)</span>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Aylık Bütçe</span>
            </h4>

            <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th>Kalem Açıklaması</th>
                  <th style={{ textAlign: "right" }}>Tutar (₺)</th>
                  <th style={{ textAlign: "right", width: 75 }}>Oran%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>A. BRÜT SATIŞLAR (600)</strong></td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>₺{money(pnlData.brutSatislar)}</td>
                  <td style={{ textAlign: "right" }}>%100.0</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 18, color: "#64748b" }}>Satış İndirimleri &amp; İadeler (610/611)</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>-₺{money(pnlData.iadelerVeIskontolar)}</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>-%1.5</td>
                </tr>
                <tr style={{ background: "#f8fafc" }}>
                  <td><strong>NET SATIŞLAR (601/602)</strong></td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a" }}>₺{money(pnlData.netSatislar)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>%98.5</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 18, color: "#64748b" }}>Satılan Mamul Maliyeti (SMM - 620)</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>-₺{money(pnlData.smm)}</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>
                    -%{((pnlData.smm / (pnlData.netSatislar || 1)) * 100).toFixed(1)}
                  </td>
                </tr>
                <tr style={{ background: "#ecfdf5" }}>
                  <td><strong style={{ color: "#065f46" }}>BRÜT SATIŞ KARI (GROSS PROFIT)</strong></td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#065f46" }}>₺{money(pnlData.brutSatisKari)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#065f46" }}>
                    %{pnlData.brutKarMarji.toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 18, color: "#64748b" }}>760 Pazarlama, Satış ve Dağıtım</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>-₺{money(pnlData.pazarlama760)}</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>
                    -%{((pnlData.pazarlama760 / (pnlData.netSatislar || 1)) * 100).toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 18, color: "#64748b" }}>770 Genel Yönetim Giderleri</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>-₺{money(pnlData.yonetim770)}</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>
                    -%{((pnlData.yonetim770 / (pnlData.netSatislar || 1)) * 100).toFixed(1)}
                  </td>
                </tr>
                <tr style={{ background: "#eff6ff" }}>
                  <td><strong style={{ color: "#1e40af" }}>FAALİYET KARI (EBITDA / FAVÖK)</strong></td>
                  <td style={{ textAlign: "right", fontWeight: 900, color: "#1e40af" }}>₺{money(pnlData.faaliyetKari)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#1e40af" }}>
                    %{pnlData.faaliyetKarMarji.toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 18, color: "#64748b" }}>780 Finansman Giderleri (Kredi Faizleri)</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>-₺{money(pnlData.finansman780)}</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>
                    -%{((pnlData.finansman780 / (pnlData.netSatislar || 1)) * 100).toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td><strong>VERGİ ÖNCESİ DÖNEM KARI (EBT)</strong></td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>₺{money(pnlData.vergiOncesiKar)}</td>
                  <td style={{ textAlign: "right" }}>
                    %{((pnlData.vergiOncesiKar / (pnlData.netSatislar || 1)) * 100).toFixed(1)}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 18, color: "#64748b" }}>Dönem Karı Vergi Karşılığı (%25)</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>-₺{money(pnlData.kurumlarVergisi)}</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>-%25.0</td>
                </tr>
                <tr style={{ background: "#d1fae5" }}>
                  <td><strong style={{ color: "#065f46", fontSize: 14 }}>DÖNEM NET KARI (NET PROFIT)</strong></td>
                  <td style={{ textAlign: "right", fontWeight: 900, color: "#065f46", fontSize: 16 }}>
                    ₺{money(pnlData.netDonemKari)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 900, color: "#065f46" }}>
                    %{pnlData.netKarMarji.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Başabaş (BEP) ve Karlılık Rasyoları */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
                🎯 Başabaş Noktası (BEP) Analizi
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Aylık Sabit Maliyetler:</span>
                  <strong>₺{money(pnlData.sabitGiderler)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Başabaş Satış Hasılatı:</span>
                  <strong style={{ color: "#2563eb" }}>₺{money(pnlData.bepHasilat)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#64748b" }}>Güvenlik Marjı (%):</span>
                  <strong style={{ color: "#16a34a" }}>%{pnlData.guvenlikMarji.toFixed(1)}</strong>
                </div>
              </div>

              <div style={{ marginTop: 12, background: "#ecfdf5", padding: "8px 12px", borderRadius: 6, fontSize: 11, color: "#065f46" }}>
                💡 Mevcut satış hacminiz, başabaş noktası eşiğinin <strong>%{pnlData.guvenlikMarji.toFixed(1)}</strong> üzerinde olup işletme operasyonel güvenlik bölgesindedir.
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
                📊 Karlılık Rasyoları Özeti
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Brüt Kar Marjı</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
                    %{pnlData.brutKarMarji.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Faaliyet Marjı (EBITDA)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
                    %{pnlData.faaliyetKarMarji.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Net Kar Marjı</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                    %{pnlData.netKarMarji.toFixed(1)}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Faaliyet Gider Oranı</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                    %{((pnlData.faaliyetGiderleri / (pnlData.netSatislar || 1)) * 100).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. MAKİNA ELEKTRİK TÜKETİM BÜTÇESİ TABI
         ======================================================== */}
      {tab === "elektrik" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Aylık Toplam Elektrik Tüketimi</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {totalMonthlyElecKwh.toLocaleString("tr-TR")} kWh
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Aylık Elektrik Gideri (730.01)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                ₺{money(totalMonthlyElecTl)}
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Aktif Tarife &amp; Gün</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
                ₺{globalRateTl.toFixed(2)} / kWh — {globalWorkDays} Gün
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ minWidth: 200 }}>Makina Seçimi (Makina Parkurundan)</th>
                  <th>Güç (kW)</th>
                  <th>Adet</th>
                  <th>Toplam kW</th>
                  <th>Saat/Gün</th>
                  <th>kWh/Gün</th>
                  <th>₺/kWh</th>
                  <th>₺/Gün</th>
                  <th>Çalışma Günü</th>
                  <th>Aylık kWh</th>
                  <th style={{ textAlign: "right" }}>Aylık Tutar (₺)</th>
                </tr>
              </thead>
              <tbody>
                {elecTotals.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <select
                        className="form-control"
                        style={{ fontSize: 12, fontWeight: 600 }}
                        value={r.machineId}
                        onChange={(e) => {
                          const mid = Number(e.target.value);
                          const m = machines.find((x) => x.id === mid);
                          if (!m) return;
                          setElecRows((rows) =>
                            rows.map((row, idx) =>
                              idx === i
                                ? {
                                    ...row,
                                    machineId: m.id,
                                    machineName: `${m.code} — ${m.name}`,
                                    powerKw: m.power_kw || 15,
                                    hoursDay: m.daily_hours || 16,
                                  }
                                : row
                            )
                          );
                        }}
                      >
                        {machines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} — {m.name} ({m.power_kw} kW)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{r.powerKw} kW</td>
                    <td>{r.qty}</td>
                    <td><strong>{r.totalKw.toFixed(1)}</strong></td>
                    <td>{r.hoursDay} saat</td>
                    <td>{r.kwhDay.toFixed(0)}</td>
                    <td>₺{r.rateTl}</td>
                    <td>₺{r.tlDay.toFixed(0)}</td>
                    <td>{r.workDays} gün</td>
                    <td><strong>{r.monthlyKwh.toFixed(0)}</strong></td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                      ₺{money(r.monthlyTl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
