/**
 * Tabia ERP — Çevrimdışı / Simülasyon Veri Deposu
 * API sunucusu çevrimdışıyken tüm modüllerin (Stok, Birim Seti, Sabit Kıymet, Gelir/Gider, Üretim & MRP vb.)
 * gerçek bir ERP gibi ekleme, düzenleme, silme ve listeleme yapmasını sağlar.
 * Veriler tarayıcı localStorage üzerinde güvenle saklanır.
 */

export interface MockStockItem {
  id: number;
  code: string;
  name: string;
  stock_type: string;
  barcode: string | null;
  unit_name: string | null;
  unit_id?: number | null;
  tax_rate_id?: number | null;
  category_id?: number | null;
  warehouse_id?: number | null;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  max_stock: number;
  critical_level: number;
  is_passive: boolean;
  branch_id: number;
  record_type_id: number;
  yurtici_satis_kodu?: string;
  ihracat_satis_kodu?: string;
  alis_kodu?: string;
  smm_kodu?: string;
  satis_iskonto_kodu?: string;
  satis_iade_kodu?: string;
  hesaplanan_kdv_kodu?: string;
  indirilecek_kdv_kodu?: string;
  gtip_no?: string;
  mensei?: string;
  marka?: string;
  model?: string;
  raf_kodu?: string;
  emniyet_stoku?: number;
  temin_suresi_gun?: number;
}

export interface MockUnitItem {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  conversion_factor: number;
  base_unit_id: number | null;
  base_unit_code?: string | null;
  is_base: boolean;
  branch_id: number | null;
  record_type_id: number | null;
  is_active: boolean;
  description: string | null;
  width_val?: number | null;
  length_val?: number | null;
  height_val?: number | null;
  weight_val?: number | null;
  volume_val?: number | null;
  content_qty?: number | null;
  barcode?: string | null;
  set_name?: string | null;
}

export interface MockFixedAsset {
  id: number;
  branch_id: number;
  record_type_id: number;
  code: string;
  name: string;
  coa_id: number | null;
  coa_code?: string | null;
  coa_name?: string | null;
  category: string | null;
  acquisition_date: string | null;
  acquisition_cost: number;
  residual_value: number;
  useful_life_months: number;
  depreciation_method: "LINEAR" | "DECLINING" | "UNITS";
  location_note: string | null;
  responsible_name: string | null;
  serial_no: string | null;
  invoice_no: string | null;
  notes: string | null;
  is_passive: boolean;
  accumulated_depreciation?: number;
  net_book_value?: number;
}

export interface MockGelirGiderItem {
  id: number;
  code: string;
  name: string;
  card_type: "GELIR" | "GIDER";
  branch_id: number;
  record_type_id: number;
  default_vat_rate: number;
  card_group: string | null;
  branch_ratio: number | null;
  is_passive: boolean;
  coa_id: number | null;
  coa_code: string | null;
  link_count: number;
  links: Array<{
    id: number;
    account_id: number;
    account_code?: string;
    account_name?: string;
    branch_id: number | null;
    vat_rate: number | null;
    ratio: number;
    description: string | null;
  }>;
}

export interface MockBomItem {
  id: number;
  branch_id: number;
  record_type_id: number;
  code: string;
  name: string;
  stock_id: number;
  stock_code: string;
  stock_name: string;
  unit_name: string;
  base_qty: number;
  std_cost_tl: number;
  is_active: boolean;
  notes?: string | null;
  items: Array<{
    id: number;
    stock_id: number;
    stock_code: string;
    stock_name: string;
    cost_type: "710" | "720" | "730";
    qty: number;
    unit_name: string;
    unit_cost_tl: number;
    total_cost_tl: number;
    wastage_pct: number;
  }>;
}

export interface MockProductionOrder {
  id: number;
  order_no: string;
  branch_id: number;
  record_type_id: number;
  bom_id: number;
  bom_code: string;
  bom_name: string;
  stock_id: number;
  stock_code: string;
  stock_name: string;
  qty_planned: number;
  qty_produced: number;
  planned_date: string;
  due_date: string;
  status: "DRAFT" | "RELEASED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
  unit_std_cost: number;
  total_std_cost: number;
  total_actual_cost: number;
  yevmiye_fis_nos?: string[];
}

export interface MockMachine {
  id: number;
  branch_id: number;
  code: string;
  name: string;
  machine_type: string;
  brand?: string;
  model?: string;
  serial_no?: string;
  manufacture_year?: number;
  fixed_asset_code?: string;
  power_kw: number;
  standby_power_kw?: number;
  hourly_rate_tl: number;
  hourly_labor_tl?: number;
  hourly_depreciation_tl?: number;
  hourly_maintenance_tl?: number;
  daily_hours: number;
  shifts_per_day?: number;
  monthly_work_days?: number;
  capacity_hours_per_day?: number;
  work_center: string;
  efficiency_pct: number;
  scrap_pct?: number;
  status: "ACTIVE" | "MAINTENANCE" | "IDLE" | "PASSIVE";
  notes?: string;
}

export interface MockWorkPlanItem {
  id: number;
  branch_id: number;
  plan_date: string;
  machine_id: number;
  machine_code: string;
  machine_name: string;
  bom_id: number;
  bom_code: string;
  bom_name: string;
  stock_id: number;
  stock_code: string;
  stock_name: string;
  unit_name: string;
  qty_planned: number;
  operation_name: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  notes?: string;
}

export interface MockNotificationRule {
  key: string;
  label: string;
  enabled: boolean;
  days: number | null;
  threshold: number | null;
}

export interface MockMachineType {
  id: number;
  code: string;
  name: string;
  hourly_amortization_tl?: number;
  energy_multiplier?: number;
  description?: string;
  is_active: boolean;
}

export interface MockWarehouse {
  id: number;
  code: string;
  name: string;
  branch_id: number;
  branch_name?: string;
  warehouse_type: "150_HAMMADDE" | "151_YARIMAMUL" | "152_MAMUL" | "153_TICARI" | "KONSINYE" | "HURDA";
  coa_code: string;
  coa_name?: string;
  manager_name?: string;
  location?: string;
  area_sqm?: number;
  allow_negative_stock: boolean;
  is_active: boolean;
}

const DEFAULT_STOCKS: MockStockItem[] = [
  {
    id: 1,
    code: "STK-001",
    name: "Endüstriyel Rulman 6204 2RS (SKF)",
    stock_type: "TM",
    barcode: "8690123456789",
    unit_name: "Adet",
    unit_id: 1,
    tax_rate_id: 1,
    purchase_price: 145.0,
    sale_price: 240.0,
    min_stock: 50,
    max_stock: 600,
    critical_level: 80,
    is_passive: false,
    branch_id: 1,
    record_type_id: 1,
    yurtici_satis_kodu: "600.01.001",
    alis_kodu: "153.01.001",
    smm_kodu: "621.01.001",
    hesaplanan_kdv_kodu: "391.20",
    indirilecek_kdv_kodu: "191.20",
    gtip_no: "8482.10.10.00.00",
    mensei: "TR",
    marka: "SKF",
    model: "6204-2RS",
    raf_kodu: "A-04-12",
    emniyet_stoku: 40,
    temin_suresi_gun: 3,
  },
  {
    id: 2,
    code: "STK-002",
    name: "Paslanmaz Çelik Sac 304 Kalite 2.00 mm",
    stock_type: "HM",
    barcode: "8690123456790",
    unit_name: "Kilogram",
    unit_id: 2,
    tax_rate_id: 1,
    purchase_price: 92.5,
    sale_price: 145.0,
    min_stock: 250,
    max_stock: 3500,
    critical_level: 400,
    is_passive: false,
    branch_id: 1,
    record_type_id: 1,
    yurtici_satis_kodu: "600.01.002",
    alis_kodu: "150.01.001",
    smm_kodu: "710.01.001",
    hesaplanan_kdv_kodu: "391.20",
    indirilecek_kdv_kodu: "191.20",
    gtip_no: "7219.34.00.00.00",
    mensei: "TR",
    marka: "Yıldız Çelik",
    model: "304-2B",
    raf_kodu: "HAM-01-A",
    emniyet_stoku: 200,
    temin_suresi_gun: 7,
  },
  {
    id: 3,
    code: "STK-003",
    name: "Alüminyum Sigma Profil 40x40 Ağır Tip",
    stock_type: "MM",
    barcode: "8690123456791",
    unit_name: "Metre",
    unit_id: 3,
    tax_rate_id: 1,
    purchase_price: 215.0,
    sale_price: 360.0,
    min_stock: 120,
    max_stock: 1200,
    critical_level: 180,
    is_passive: false,
    branch_id: 1,
    record_type_id: 1,
    yurtici_satis_kodu: "600.01.003",
    alis_kodu: "152.01.001",
    smm_kodu: "620.01.001",
    hesaplanan_kdv_kodu: "391.20",
    indirilecek_kdv_kodu: "191.20",
    gtip_no: "7604.21.00.00.00",
    mensei: "TR",
    marka: "AluProfile",
    model: "40x40-H",
    raf_kodu: "P-02-05",
    emniyet_stoku: 100,
    temin_suresi_gun: 5,
  },
  {
    id: 4,
    code: "STK-004",
    name: "Endüstriyel Hidrolik Yağ ISO VG 46 (200 Lt)",
    stock_type: "SR",
    barcode: "8690123456792",
    unit_name: "Litre",
    unit_id: 4,
    tax_rate_id: 1,
    purchase_price: 68.0,
    sale_price: 105.0,
    min_stock: 400,
    max_stock: 3000,
    critical_level: 600,
    is_passive: false,
    branch_id: 1,
    record_type_id: 1,
    yurtici_satis_kodu: "600.01.004",
    alis_kodu: "150.02.001",
    smm_kodu: "730.01.001",
    hesaplanan_kdv_kodu: "391.20",
    indirilecek_kdv_kodu: "191.20",
    gtip_no: "2710.19.99.00.29",
    mensei: "TR",
    marka: "Mobil",
    model: "DTE 25",
    raf_kodu: "KIM-YAG-01",
    emniyet_stoku: 300,
    temin_suresi_gun: 4,
  },
  {
    id: 5,
    code: "STK-005",
    name: "Asenkron Elektrik Motoru 1.5 kW 1400 d/d 3 Faz",
    stock_type: "TM",
    barcode: "8690123456793",
    unit_name: "Adet",
    unit_id: 1,
    tax_rate_id: 1,
    purchase_price: 2650.0,
    sale_price: 4100.0,
    min_stock: 10,
    max_stock: 80,
    critical_level: 15,
    is_passive: false,
    branch_id: 1,
    record_type_id: 1,
    yurtici_satis_kodu: "600.01.005",
    alis_kodu: "153.01.002",
    smm_kodu: "621.01.002",
    hesaplanan_kdv_kodu: "391.20",
    indirilecek_kdv_kodu: "191.20",
    gtip_no: "8501.51.00.00.00",
    mensei: "TR",
    marka: "GAMAK",
    model: "AGM2E 90 L 4a",
    raf_kodu: "MTR-03-B",
    emniyet_stoku: 8,
    temin_suresi_gun: 6,
  },
];

const DEFAULT_UNITS: MockUnitItem[] = [
  {
    id: 1,
    code: "ADET",
    name: "Adet",
    symbol: "Ad.",
    conversion_factor: 1,
    base_unit_id: null,
    is_base: true,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "Ana temel adet birimi",
    width_val: 0,
    length_val: 0,
    height_val: 0,
    weight_val: 0.1,
    volume_val: 0,
    content_qty: 1,
    barcode: "8690001001",
    set_name: "Adet / Koli / Palet Seti",
  },
  {
    id: 2,
    code: "KOLI",
    name: "Koli (24 Adet)",
    symbol: "Kl.",
    conversion_factor: 24,
    base_unit_id: 1,
    base_unit_code: "ADET",
    is_base: false,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "1 Koli = 24 Adet standart ambalaj",
    width_val: 300,
    length_val: 400,
    height_val: 250,
    weight_val: 4.8,
    volume_val: 30,
    content_qty: 24,
    barcode: "869000100201",
    set_name: "Adet / Koli / Palet Seti",
  },
  {
    id: 3,
    code: "PALET",
    name: "Euro Palet (960 Adet / 40 Koli)",
    symbol: "Plt.",
    conversion_factor: 960,
    base_unit_id: 1,
    base_unit_code: "ADET",
    is_base: false,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "1 Palet = 40 Koli = 960 Adet",
    width_val: 800,
    length_val: 1200,
    height_val: 1440,
    weight_val: 215.0,
    volume_val: 1380,
    content_qty: 960,
    barcode: "869000100301",
    set_name: "Adet / Koli / Palet Seti",
  },
  {
    id: 4,
    code: "KG",
    name: "Kilogram",
    symbol: "kg",
    conversion_factor: 1,
    base_unit_id: null,
    is_base: true,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "Standart Ağırlık Birimi",
    weight_val: 1.0,
    content_qty: 1,
    barcode: "8690002001",
    set_name: "Ağırlık Seti (Gram / Kg / Ton)",
  },
  {
    id: 5,
    code: "GRAM",
    name: "Gram",
    symbol: "gr",
    conversion_factor: 0.001,
    base_unit_id: 4,
    base_unit_code: "KG",
    is_base: false,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "1 Gram = 0.001 KG",
    weight_val: 0.001,
    content_qty: 0.001,
    set_name: "Ağırlık Seti (Gram / Kg / Ton)",
  },
  {
    id: 6,
    code: "TON",
    name: "Metrik Ton",
    symbol: "Tn",
    conversion_factor: 1000,
    base_unit_id: 4,
    base_unit_code: "KG",
    is_base: false,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "1 Ton = 1000 KG",
    weight_val: 1000.0,
    content_qty: 1000,
    set_name: "Ağırlık Seti (Gram / Kg / Ton)",
  },
  {
    id: 7,
    code: "METRE",
    name: "Metre",
    symbol: "m",
    conversion_factor: 1,
    base_unit_id: null,
    is_base: true,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "Uzunluk Ana Birimi",
    length_val: 1000,
    content_qty: 1,
    set_name: "Uzunluk Seti (mm / cm / m / Top)",
  },
  {
    id: 8,
    code: "TOP",
    name: "Top (50 Metre)",
    symbol: "Top",
    conversion_factor: 50,
    base_unit_id: 7,
    base_unit_code: "METRE",
    is_base: false,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "1 Top Rulo = 50 Metre",
    length_val: 50000,
    content_qty: 50,
    set_name: "Uzunluk Seti (mm / cm / m / Top)",
  },
  {
    id: 9,
    code: "LITRE",
    name: "Litre",
    symbol: "Lt",
    conversion_factor: 1,
    base_unit_id: null,
    is_base: true,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "Sıvı Hacim Ana Birimi",
    volume_val: 1,
    content_qty: 1,
    set_name: "Hacim Seti (ml / lt / Varil)",
  },
  {
    id: 10,
    code: "VARIL",
    name: "Varil (200 Litre)",
    symbol: "Vrl",
    conversion_factor: 200,
    base_unit_id: 9,
    base_unit_code: "LITRE",
    is_base: false,
    branch_id: 1,
    record_type_id: 1,
    is_active: true,
    description: "1 Varil = 200 Litre Sanayi Standardı",
    volume_val: 200,
    weight_val: 185,
    content_qty: 200,
    set_name: "Hacim Seti (ml / lt / Varil)",
  },
];

const DEFAULT_MACHINE_TYPES: MockMachineType[] = [
  { id: 1, code: "CNC", name: "CNC Dik / Yatay İşleme Merkezi", hourly_amortization_tl: 85, energy_multiplier: 1.2, description: "5 Eksen ve 3 Eksen yüksek hassasiyetli işleme", is_active: true },
  { id: 2, code: "PRES", name: "Eksantrik & Hidrolik Pres", hourly_amortization_tl: 65, energy_multiplier: 1.5, description: "100-500 Ton sac şekillendirme ve kesme", is_active: true },
  { id: 3, code: "TORNA", name: "CNC Üniversal Torna", hourly_amortization_tl: 55, energy_multiplier: 1.0, description: "Talaşlı imalat silindirik parça işleme", is_active: true },
  { id: 4, code: "LAZER", name: "Fiber Lazer Kesim & Plazma", hourly_amortization_tl: 110, energy_multiplier: 1.8, description: "Sac ve profil yüksek hızlı lazer kesim", is_active: true },
  { id: 5, code: "ENJEKSIYON", name: "Plastik Enjeksiyon Makinesi", hourly_amortization_tl: 75, energy_multiplier: 1.4, description: "Hassas kalıp plastik parça basımı", is_active: true },
  { id: 6, code: "KAYNAK", name: "Robotik Gazaltı & TIG Kaynak", hourly_amortization_tl: 45, energy_multiplier: 1.1, description: "Otomasyonlu gövde kaynak hücresi", is_active: true },
  { id: 7, code: "BOYAHANE", name: "Elektrostatik Toz Boya Hattı", hourly_amortization_tl: 95, energy_multiplier: 2.0, description: "Konveyörlü fırınlı toz boyama hattı", is_active: true },
  { id: 8, code: "MONTAJ", name: "Yarı Otomatik Montaj İstasyonu", hourly_amortization_tl: 35, energy_multiplier: 0.8, description: "Son ürün montaj ve test bandı", is_active: true },
];

const DEFAULT_WAREHOUSES: MockWarehouse[] = [
  { id: 1, code: "DEP-150", name: "Merkez İlk Madde & Hammadde Deposu", branch_id: 1, branch_name: "Merkez Şube", warehouse_type: "150_HAMMADDE", coa_code: "150.01", coa_name: "İlk Madde ve Malzeme", manager_name: "Ali Öztürk", location: "A Blok Zemin Kat Ambar", area_sqm: 1200, allow_negative_stock: false, is_active: true },
  { id: 2, code: "DEP-151", name: "İmalat Hattı Yarı Mamul Ambarı", branch_id: 1, branch_name: "Merkez Şube", warehouse_type: "151_YARIMAMUL", coa_code: "151.01", coa_name: "Yarı Mamuller", manager_name: "Hasan Usta", location: "Fabrika Üretim Sahası Hol-2", area_sqm: 600, allow_negative_stock: false, is_active: true },
  { id: 3, code: "DEP-152", name: "Ana Mamul ve Sevkiyat Deposu", branch_id: 1, branch_name: "Merkez Şube", warehouse_type: "152_MAMUL", coa_code: "152.01", coa_name: "Mamuller", manager_name: "Murat Çelik", location: "Lojistik Binası 1. Peron", area_sqm: 2400, allow_negative_stock: false, is_active: true },
  { id: 4, code: "DEP-153", name: "Ticari Mallar ve Yedek Parça Deposu", branch_id: 1, branch_name: "Merkez Şube", warehouse_type: "153_TICARI", coa_code: "153.01", coa_name: "Ticari Mallar", manager_name: "Serkan Yılmaz", location: "C Blok Raf Alanı", area_sqm: 450, allow_negative_stock: false, is_active: true },
  { id: 5, code: "DEP-KNS", name: "Müşteri Konsinye Ambarı", branch_id: 1, branch_name: "Merkez Şube", warehouse_type: "KONSINYE", coa_code: "153.90", coa_name: "Konsinye Mallar", manager_name: "Ece Demir", location: "Dış Lokasyon / Konsinye Noktası", area_sqm: 200, allow_negative_stock: false, is_active: true },
  { id: 6, code: "DEP-HRD", name: "Hurda, Talaş & Fire Stok Alanı", branch_id: 1, branch_name: "Merkez Şube", warehouse_type: "HURDA", coa_code: "157.01", coa_name: "Diğer Stoklar (Hurda)", manager_name: "Ahmet Kurt", location: "Açık Saha Atık Ayrıştırma", area_sqm: 350, allow_negative_stock: false, is_active: true },
];

const DEFAULT_FIXED_ASSETS: MockFixedAsset[] = [
  {
    id: 1,
    branch_id: 1,
    record_type_id: 1,
    code: "254.01.001",
    name: "34 ABC 123 Fiat Fiorino Combi 1.3 Multijet Servis Aracı",
    coa_id: 1,
    coa_code: "254.01",
    coa_name: "Hafif Ticari Taşıtlar",
    category: "Taşıtlar",
    acquisition_date: "2023-01-15",
    acquisition_cost: 540000,
    residual_value: 0,
    useful_life_months: 60,
    depreciation_method: "LINEAR",
    location_note: "Merkez Garaj / Filo",
    responsible_name: "Ahmet Demir (Lojistik Sorumlusu)",
    serial_no: "ZFA22500001928374",
    invoice_no: "FTR-2023-08912",
    notes: "Kasko ve trafik sigortası güncel. 5 yıl %20 amortisman.",
    is_passive: false,
    accumulated_depreciation: 216000,
    net_book_value: 324000,
  },
  {
    id: 2,
    branch_id: 1,
    record_type_id: 1,
    code: "253.01.001",
    name: "Haas VF-2SS Yüksek Hızlı CNC Dik İşleme Merkezi",
    coa_id: 2,
    coa_code: "253.01",
    coa_name: "Üretim Tesis, Makine ve Cihazları",
    category: "Makineler",
    acquisition_date: "2021-04-10",
    acquisition_cost: 1650000,
    residual_value: 50000,
    useful_life_months: 120,
    depreciation_method: "DECLINING",
    location_note: "Üretim Fabrikası Hol-1 No:4",
    responsible_name: "Kemal Usta (Fabrika Müdürü)",
    serial_no: "HAAS-VF2-2021-998",
    invoice_no: "GÇB-2021-00441",
    notes: "Azalan bakiyeler yöntemiyle amortismana tabi. 10 yıl ömür.",
    is_passive: false,
    accumulated_depreciation: 825000,
    net_book_value: 825000,
  },
  {
    id: 3,
    branch_id: 1,
    record_type_id: 1,
    code: "255.01.001",
    name: "Dell EMC PowerEdge R750 Rack Sunucu & 10Gb Fiber Switch",
    coa_id: 3,
    coa_code: "255.01",
    coa_name: "Bilgisayar ve Bilişim Cihazları",
    category: "Demirbaşlar",
    acquisition_date: "2022-07-01",
    acquisition_cost: 240000,
    residual_value: 0,
    useful_life_months: 36,
    depreciation_method: "LINEAR",
    location_note: "Sistem Odası Kabinet 2",
    responsible_name: "Mehmet IT (Bilgi İşlem Yöneticisi)",
    serial_no: "DELL-SRV-R750-X92",
    invoice_no: "FTR-2022-1145",
    notes: "3 yıl faydalı ömür (%33.33 yıllık amortisman).",
    is_passive: false,
    accumulated_depreciation: 160000,
    net_book_value: 80000,
  },
  {
    id: 4,
    branch_id: 1,
    record_type_id: 1,
    code: "255.02.001",
    name: "Yönetim Katı İtalyan Deri Toplantı Masası ve Koltuk Takımı",
    coa_id: 4,
    coa_code: "255.02",
    coa_name: "Büro Mobilyaları ve Mefruşat",
    category: "Büro Mobilyası",
    acquisition_date: "2024-02-15",
    acquisition_cost: 95000,
    residual_value: 0,
    useful_life_months: 60,
    depreciation_method: "LINEAR",
    location_note: "Genel Müdürlük 3. Kat VIP Salon",
    responsible_name: "Zeynep Kaya (İdari İşler)",
    serial_no: "MOB-2024-003",
    invoice_no: "FTR-2024-0322",
    notes: "5 yıl amortisman süresi.",
    is_passive: false,
    accumulated_depreciation: 19000,
    net_book_value: 76000,
  },
];

const DEFAULT_GELIR_GIDER: MockGelirGiderItem[] = [
  {
    id: 1,
    code: "GEL-001",
    name: "Yurtiçi Mamul Satış Gelirleri",
    card_type: "GELIR",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 20,
    card_group: "Esas Faaliyet Gelirleri",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 1,
    coa_code: "600.01.001",
    link_count: 1,
    links: [
      {
        id: 1,
        account_id: 1,
        account_code: "600.01.001",
        account_name: "Yurtiçi Satışlar (Mamul)",
        branch_id: 1,
        vat_rate: 20,
        ratio: 100,
        description: "Ana satış faturası muhasebe bağlantısı",
      },
    ],
  },
  {
    id: 2,
    code: "GEL-002",
    name: "Teknik Servis, Bakım ve Montaj Hizmet Geliri",
    card_type: "GELIR",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 20,
    card_group: "Hizmet Gelirleri",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 2,
    coa_code: "600.02.001",
    link_count: 1,
    links: [],
  },
  {
    id: 3,
    code: "GEL-003",
    name: "Doğrudan İhracat Gelirleri",
    card_type: "GELIR",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 0,
    card_group: "Dış Ticaret",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 3,
    coa_code: "601.01.001",
    link_count: 1,
    links: [],
  },
  {
    id: 4,
    code: "GID-001",
    name: "Fabrika Elektrik Tüketim Gideri (Sanayi Tarifesi)",
    card_type: "GIDER",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 20,
    card_group: "Üretim Giderleri (GÜG)",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 4,
    coa_code: "730.01.001",
    link_count: 1,
    links: [],
  },
  {
    id: 5,
    code: "GID-002",
    name: "Genel Yönetim ve Merkez Ofis Kira Gideri",
    card_type: "GIDER",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 0,
    card_group: "Yönetim Giderleri",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 5,
    coa_code: "770.01.001",
    link_count: 1,
    links: [],
  },
  {
    id: 6,
    code: "GID-003",
    name: "Pazarlama, Reklam, Fuar ve Tanıtım Giderleri",
    card_type: "GIDER",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 20,
    card_group: "Pazarlama Giderleri",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 6,
    coa_code: "760.01.001",
    link_count: 1,
    links: [],
  },
  {
    id: 7,
    code: "GID-004",
    name: "Lojistik, Nakliye ve Kargo Taşıma Giderleri",
    card_type: "GIDER",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 20,
    card_group: "Lojistik & Sevk",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 7,
    coa_code: "760.02.001",
    link_count: 1,
    links: [],
  },
  {
    id: 8,
    code: "GID-005",
    name: "Banka Kredi, POS Komisyon ve Masraf Giderleri",
    card_type: "GIDER",
    branch_id: 1,
    record_type_id: 1,
    default_vat_rate: 0,
    card_group: "Finansman Giderleri",
    branch_ratio: 100,
    is_passive: false,
    coa_id: 8,
    coa_code: "780.01.001",
    link_count: 1,
    links: [],
  },
];

const DEFAULT_BOMS: MockBomItem[] = [
  {
    id: 1,
    branch_id: 1,
    record_type_id: 1,
    code: "BOM-001",
    name: "CNC Hassas Alüminyum Gövde ve Yataklama Grubu",
    stock_id: 3,
    stock_code: "STK-003",
    stock_name: "Alüminyum Sigma Profil 40x40 Ağır Tip",
    unit_name: "Adet",
    base_qty: 1,
    std_cost_tl: 1145.5,
    is_active: true,
    notes: "VUK 7/A Maliyet Muhasebesi standartlarında hazırlanmıştır.",
    items: [
      {
        id: 1,
        stock_id: 2,
        stock_code: "STK-002",
        stock_name: "Paslanmaz Çelik Sac 304 Kalite 2mm",
        cost_type: "710",
        qty: 3.5,
        unit_name: "KG",
        unit_cost_tl: 92.5,
        total_cost_tl: 323.75,
        wastage_pct: 2,
      },
      {
        id: 2,
        stock_id: 3,
        stock_code: "STK-003",
        stock_name: "Alüminyum Sigma Profil 40x40",
        cost_type: "710",
        qty: 1.8,
        unit_name: "Metre",
        unit_cost_tl: 215.0,
        total_cost_tl: 387.0,
        wastage_pct: 1,
      },
      {
        id: 3,
        stock_id: 1,
        stock_code: "STK-001",
        stock_name: "Endüstriyel Rulman 6204 2RS",
        cost_type: "710",
        qty: 2,
        unit_name: "Adet",
        unit_cost_tl: 145.0,
        total_cost_tl: 290.0,
        wastage_pct: 0,
      },
      {
        id: 4,
        stock_id: 0,
        stock_code: "ISC-01",
        stock_name: "CNC İşleme & Frezeleme Direkt İşçiliği",
        cost_type: "720",
        qty: 0.5,
        unit_name: "Saat",
        unit_cost_tl: 150.0,
        total_cost_tl: 75.0,
        wastage_pct: 0,
      },
      {
        id: 5,
        stock_id: 0,
        stock_code: "GUG-01",
        stock_name: "Makine Amortismanı ve Elektrik Payı (GÜG)",
        cost_type: "730",
        qty: 1,
        unit_name: "Puan",
        unit_cost_tl: 69.75,
        total_cost_tl: 69.75,
        wastage_pct: 0,
      },
    ],
  },
  {
    id: 2,
    branch_id: 1,
    record_type_id: 1,
    code: "BOM-002",
    name: "Elektrik Motorlu Redüktör Tahrik Ünitesi Komple",
    stock_id: 5,
    stock_code: "STK-005",
    stock_name: "Asenkron Elektrik Motoru 1.5 kW",
    unit_name: "Adet",
    base_qty: 1,
    std_cost_tl: 3450.0,
    is_active: true,
    notes: "Direkt malzeme ve montaj hattı işçilik maliyetli.",
    items: [
      {
        id: 6,
        stock_id: 5,
        stock_code: "STK-005",
        stock_name: "Asenkron Elektrik Motoru 1.5 kW",
        cost_type: "710",
        qty: 1,
        unit_name: "Adet",
        unit_cost_tl: 2650.0,
        total_cost_tl: 2650.0,
        wastage_pct: 0,
      },
      {
        id: 7,
        stock_id: 4,
        stock_code: "STK-004",
        stock_name: "Endüstriyel Hidrolik Yağ ISO VG 46",
        cost_type: "710",
        qty: 3,
        unit_name: "Litre",
        unit_cost_tl: 68.0,
        total_cost_tl: 204.0,
        wastage_pct: 0,
      },
      {
        id: 8,
        stock_id: 0,
        stock_code: "ISC-02",
        stock_name: "Mekanik Montaj ve Kablolama İşçiliği",
        cost_type: "720",
        qty: 1.5,
        unit_name: "Saat",
        unit_cost_tl: 220.0,
        total_cost_tl: 330.0,
        wastage_pct: 0,
      },
      {
        id: 9,
        stock_id: 0,
        stock_code: "GUG-02",
        stock_name: "Fabrika Genel Üretim Giderleri Dağıtım Payı",
        cost_type: "730",
        qty: 1,
        unit_name: "Puan",
        unit_cost_tl: 266.0,
        total_cost_tl: 266.0,
        wastage_pct: 0,
      },
    ],
  },
];

const DEFAULT_PRODUCTION_ORDERS: MockProductionOrder[] = [
  {
    id: 1,
    order_no: "EMR-2024-001",
    branch_id: 1,
    record_type_id: 1,
    bom_id: 1,
    bom_code: "BOM-001",
    bom_name: "CNC Hassas Alüminyum Gövde ve Yataklama Grubu",
    stock_id: 3,
    stock_code: "STK-003",
    stock_name: "Alüminyum Sigma Profil 40x40 Ağır Tip",
    qty_planned: 50,
    qty_produced: 30,
    planned_date: "2024-03-10",
    due_date: "2024-03-25",
    status: "IN_PROGRESS",
    notes: "Acil teslimatlı müşteri siparişi — CNC 1 tezgahında işleniyor.",
    unit_std_cost: 1145.5,
    total_std_cost: 57275.0,
    total_actual_cost: 34365.0,
    yevmiye_fis_nos: ["YEV-2024-0891"],
  },
  {
    id: 2,
    order_no: "EMR-2024-002",
    branch_id: 1,
    record_type_id: 1,
    bom_id: 2,
    bom_code: "BOM-002",
    bom_name: "Elektrik Motorlu Redüktör Tahrik Ünitesi Komple",
    stock_id: 5,
    stock_code: "STK-005",
    stock_name: "Asenkron Elektrik Motoru 1.5 kW",
    qty_planned: 20,
    qty_produced: 20,
    planned_date: "2024-03-01",
    due_date: "2024-03-15",
    status: "COMPLETED",
    notes: "Tamamlandı, 152 Mamuller ambarına sevk edildi.",
    unit_std_cost: 3450.0,
    total_std_cost: 69000.0,
    total_actual_cost: 68400.0,
    yevmiye_fis_nos: ["YEV-2024-0820", "YEV-2024-0821"],
  },
  {
    id: 3,
    order_no: "EMR-2024-003",
    branch_id: 1,
    record_type_id: 1,
    bom_id: 1,
    bom_code: "BOM-001",
    bom_name: "CNC Hassas Alüminyum Gövde ve Yataklama Grubu",
    stock_id: 3,
    stock_code: "STK-003",
    stock_name: "Alüminyum Sigma Profil 40x40 Ağır Tip",
    qty_planned: 100,
    qty_produced: 0,
    planned_date: "2024-04-01",
    due_date: "2024-04-20",
    status: "RELEASED",
    notes: "Malzeme rezervasyonu tamamlandı, hammadde tahsis edildi.",
    unit_std_cost: 1145.5,
    total_std_cost: 114550.0,
    total_actual_cost: 0,
  },
];

const DEFAULT_MACHINES: MockMachine[] = [
  {
    id: 1,
    branch_id: 1,
    code: "CNC-01",
    name: "Haas VF-2SS Yüksek Hızlı Dik İşleme Merkezi",
    machine_type: "CNC",
    brand: "Haas",
    model: "VF-2SS Super Speed",
    serial_no: "HAAS-VF2-2023-8891",
    manufacture_year: 2023,
    fixed_asset_code: "253.01.001",
    power_kw: 22.4,
    standby_power_kw: 2.2,
    hourly_rate_tl: 280.0,
    hourly_labor_tl: 150.0,
    hourly_depreciation_tl: 80.0,
    hourly_maintenance_tl: 50.0,
    daily_hours: 16,
    shifts_per_day: 2,
    monthly_work_days: 22,
    capacity_hours_per_day: 16,
    work_center: "Talaşlı İmalat Holü",
    efficiency_pct: 92.5,
    scrap_pct: 1.5,
    status: "ACTIVE",
    notes: "5 Eksen indekslemeli tabla, 12.000 RPM iş mili",
  },
  {
    id: 2,
    branch_id: 1,
    code: "LZR-01",
    name: "Trumpf TruLaser 3030 Fiber 4 kW Kesim",
    machine_type: "LAZER",
    brand: "Trumpf",
    model: "TruLaser 3030",
    serial_no: "TRUMPF-L30-2022-4412",
    manufacture_year: 2022,
    fixed_asset_code: "253.01.002",
    power_kw: 32.0,
    standby_power_kw: 3.5,
    hourly_rate_tl: 380.0,
    hourly_labor_tl: 180.0,
    hourly_depreciation_tl: 120.0,
    hourly_maintenance_tl: 80.0,
    daily_hours: 14,
    shifts_per_day: 2,
    monthly_work_days: 22,
    capacity_hours_per_day: 14,
    work_center: "Sac İşleme Holü",
    efficiency_pct: 88.0,
    scrap_pct: 2.0,
    status: "ACTIVE",
    notes: "Otomatik palet değiştirici, azot & oksijen kesim gazı destekli",
  },
  {
    id: 3,
    branch_id: 1,
    code: "PRS-01",
    name: "Durma AD-R 30135 CNC Abkant Pres (135 Ton)",
    machine_type: "PRESLER",
    brand: "Durma",
    model: "AD-R 30135",
    serial_no: "DURMA-ADR-2021-098",
    manufacture_year: 2021,
    fixed_asset_code: "253.01.003",
    power_kw: 15.0,
    standby_power_kw: 1.2,
    hourly_rate_tl: 190.0,
    hourly_labor_tl: 110.0,
    hourly_depreciation_tl: 50.0,
    hourly_maintenance_tl: 30.0,
    daily_hours: 12,
    shifts_per_day: 1,
    monthly_work_days: 22,
    capacity_hours_per_day: 12,
    work_center: "Sac İşleme Holü",
    efficiency_pct: 90.0,
    scrap_pct: 1.0,
    status: "ACTIVE",
    notes: "4 Eksen CNC arka dayama, lazer açı ölçüm sistemi",
  },
  {
    id: 4,
    branch_id: 1,
    code: "MNT-01",
    name: "Mekanik & Pnömatik Montaj İstasyonu",
    machine_type: "MONTAJ",
    brand: "Atlas Copco / Tabia",
    model: "Assembly Station Pro",
    serial_no: "MNT-PRO-2024",
    manufacture_year: 2024,
    fixed_asset_code: "253.01.004",
    power_kw: 4.5,
    standby_power_kw: 0.5,
    hourly_rate_tl: 140.0,
    hourly_labor_tl: 100.0,
    hourly_depreciation_tl: 25.0,
    hourly_maintenance_tl: 15.0,
    daily_hours: 8,
    shifts_per_day: 1,
    monthly_work_days: 22,
    capacity_hours_per_day: 8,
    work_center: "Montaj ve Paketleme",
    efficiency_pct: 95.0,
    scrap_pct: 0.5,
    status: "ACTIVE",
    notes: "Tork kontrollü sıkıcılar ve pnömatik pres",
  },
  {
    id: 5,
    branch_id: 1,
    code: "TST-01",
    name: "Kalite Kontrol ve Yük Test Standı",
    machine_type: "TEST",
    brand: "Mitutoyo / Zwick",
    model: "CMM Test Stand 50kN",
    serial_no: "TST-50KN-2023",
    manufacture_year: 2023,
    fixed_asset_code: "253.01.005",
    power_kw: 7.5,
    standby_power_kw: 0.8,
    hourly_rate_tl: 160.0,
    hourly_labor_tl: 120.0,
    hourly_depreciation_tl: 30.0,
    hourly_maintenance_tl: 10.0,
    daily_hours: 8,
    shifts_per_day: 1,
    monthly_work_days: 22,
    capacity_hours_per_day: 8,
    work_center: "Kalite Kontrol Laboratuvarı",
    efficiency_pct: 96.0,
    scrap_pct: 0.2,
    status: "ACTIVE",
    notes: "Kalibre edilmiş dinamik yük hücresi ve optik ölçüm",
  },
];

const DEFAULT_WORK_PLANS: MockWorkPlanItem[] = [
  {
    id: 1,
    branch_id: 1,
    plan_date: new Date().toISOString().slice(0, 10),
    machine_id: 2,
    machine_code: "LZR-01",
    machine_name: "Trumpf TruLaser 3030 Fiber 4 kW",
    bom_id: 1,
    bom_code: "BOM-001",
    bom_name: "CNC Hassas Alüminyum Gövde Grubu",
    stock_id: 3,
    stock_code: "STK-003",
    stock_name: "Alüminyum Sigma Profil 40x40 Ağır Tip",
    unit_name: "Adet",
    qty_planned: 50,
    operation_name: "Op-10 Levha Lazer Kesim",
    shift_name: "1. Vardiya (Gündüz)",
    start_time: "08:00",
    end_time: "12:00",
    duration_hours: 4,
    status: "COMPLETED",
    notes: "304 Paslanmaz sac kesimi yapıldı.",
  },
  {
    id: 2,
    branch_id: 1,
    plan_date: new Date().toISOString().slice(0, 10),
    machine_id: 1,
    machine_code: "CNC-01",
    machine_name: "Haas VF-2SS Dik İşleme Merkezi",
    bom_id: 1,
    bom_code: "BOM-001",
    bom_name: "CNC Hassas Alüminyum Gövde Grubu",
    stock_id: 3,
    stock_code: "STK-003",
    stock_name: "Alüminyum Sigma Profil 40x40 Ağır Tip",
    unit_name: "Adet",
    qty_planned: 50,
    operation_name: "Op-20 5 Eksen Talaşlı İşleme",
    shift_name: "1. & 2. Vardiya",
    start_time: "08:00",
    end_time: "17:00",
    duration_hours: 9,
    status: "IN_PROGRESS",
    notes: "Hassas yataklama delikleri işleniyor.",
  },
  {
    id: 3,
    branch_id: 1,
    plan_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    machine_id: 3,
    machine_code: "PRS-01",
    machine_name: "Durma AD-R 30135 CNC Abkant Pres",
    bom_id: 2,
    bom_code: "BOM-002",
    bom_name: "Elektrik Motorlu Redüktör Ünitesi",
    stock_id: 5,
    stock_code: "STK-005",
    stock_name: "Asenkron Elektrik Motoru 1.5 kW",
    unit_name: "Adet",
    qty_planned: 20,
    operation_name: "Op-15 Abkant Büküm ve Form Verme",
    shift_name: "1. Vardiya",
    start_time: "09:00",
    end_time: "15:00",
    duration_hours: 6,
    status: "PLANNED",
    notes: "Motor montaj braketleri bükülecek.",
  },
  {
    id: 4,
    branch_id: 1,
    plan_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    machine_id: 4,
    machine_code: "MNT-01",
    machine_name: "Mekanik Montaj Hattı",
    bom_id: 2,
    bom_code: "BOM-002",
    bom_name: "Elektrik Motorlu Redüktör Ünitesi",
    stock_id: 5,
    stock_code: "STK-005",
    stock_name: "Asenkron Elektrik Motoru 1.5 kW",
    unit_name: "Adet",
    qty_planned: 20,
    operation_name: "Op-30 Nihai Montaj ve Kablolama",
    shift_name: "1. Vardiya",
    start_time: "08:30",
    end_time: "16:30",
    duration_hours: 8,
    status: "PLANNED",
    notes: "Redüktör ve motor eşleşmesi yapılacak.",
  },
];

const DEFAULT_NOTIFICATION_RULES: MockNotificationRule[] = [
  { key: "cek_vade", label: "Çek / Senet Vade Hatırlatıcısı", enabled: true, days: 5, threshold: null },
  { key: "fatura_vade", label: "Ödeme Vadesi Yaklaşan Faturalar", enabled: true, days: 3, threshold: null },
  { key: "stok_min", label: "Kritik / Minimum Stok Seviyesi Uyarısı", enabled: true, days: null, threshold: 50 },
  { key: "son_faturalar", label: "Günlük Kesilen Fatura Adet Takibi", enabled: false, days: null, threshold: 100 },
  { key: "sozlesme", label: "Sözleşme ve Lisans Bitiş Hatırlatması", enabled: true, days: 30, threshold: null },
  { key: "egm", label: "GİB & Resmi Süre / Beyanname Hatırlatıcısı", enabled: true, days: 7, threshold: null },
];

class MockDataStore {
  private getStorage<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`tabia_${key}`);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`tabia_${key}`, JSON.stringify(val));
    } catch {
      /* ignore storage quota */
    }
  }

  // --- STOK KARTLARI ---
  getStocks(): MockStockItem[] {
    return this.getStorage<MockStockItem[]>("stocks", DEFAULT_STOCKS);
  }

  getStock(id: number): MockStockItem | null {
    const list = this.getStocks();
    return list.find((s) => s.id === id) || null;
  }

  saveStock(item: Partial<MockStockItem> & { name: string }): MockStockItem {
    const list = this.getStocks();
    if (item.id) {
      const idx = list.findIndex((s) => s.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as MockStockItem;
        this.setStorage("stocks", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((s) => s.id)) + 1 : 1;
    const created: MockStockItem = {
      stock_type: "TM",
      barcode: null,
      unit_name: "Adet",
      purchase_price: 0,
      sale_price: 0,
      min_stock: 0,
      max_stock: 0,
      critical_level: 0,
      is_passive: false,
      branch_id: 1,
      record_type_id: 1,
      ...item,
      id: newId,
      code: item.code || `STK-${String(newId).padStart(3, "0")}`,
      name: item.name,
    };
    list.unshift(created);
    this.setStorage("stocks", list);
    return created;
  }

  deleteStock(id: number): void {
    const list = this.getStocks().filter((s) => s.id !== id);
    this.setStorage("stocks", list);
  }

  // --- BİRİM TANIMLARI & BİRİM SETLERİ ---
  getUnits(): MockUnitItem[] {
    return this.getStorage<MockUnitItem[]>("units", DEFAULT_UNITS);
  }

  saveUnit(item: Partial<MockUnitItem> & { code: string; name: string }): MockUnitItem {
    const list = this.getUnits();
    if (item.id) {
      const idx = list.findIndex((u) => u.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as MockUnitItem;
        this.setStorage("units", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((u) => u.id)) + 1 : 1;
    const created: MockUnitItem = {
      symbol: item.code.slice(0, 3),
      conversion_factor: 1,
      base_unit_id: null,
      is_base: !item.base_unit_id,
      branch_id: 1,
      record_type_id: 1,
      is_active: true,
      description: null,
      ...item,
      id: newId,
      code: item.code,
      name: item.name,
    };
    list.push(created);
    this.setStorage("units", list);
    return created;
  }

  deleteUnit(id: number): void {
    const list = this.getUnits().filter((u) => u.id !== id);
    this.setStorage("units", list);
  }

  // --- SABİT KIYMET (DEMİRBAŞ / AMORTİSMAN) ---
  getFixedAssets(): MockFixedAsset[] {
    return this.getStorage<MockFixedAsset[]>("fixed_assets", DEFAULT_FIXED_ASSETS);
  }

  getFixedAsset(id: number): MockFixedAsset | null {
    const list = this.getFixedAssets();
    return list.find((a) => a.id === id) || null;
  }

  saveFixedAsset(item: Partial<MockFixedAsset> & { code: string; name: string }): MockFixedAsset {
    const list = this.getFixedAssets();
    const cost = Number(item.acquisition_cost) || 0;
    const lifeMonths = Number(item.useful_life_months) || 60;
    const residual = Number(item.residual_value) || 0;
    const depMethod = item.depreciation_method || "LINEAR";

    const netBase = Math.max(0, cost - residual);
    const yearlyRate = depMethod === "DECLINING" ? (1 / (lifeMonths / 12)) * 2 : 1 / (lifeMonths / 12);
    const approxYears = 1.5;
    const accumulated = Math.min(netBase, Math.round(netBase * Math.min(0.9, yearlyRate * approxYears)));
    const netBook = Math.max(0, cost - accumulated);

    if (item.id) {
      const idx = list.findIndex((a) => a.id === item.id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...item,
          acquisition_cost: cost,
          useful_life_months: lifeMonths,
          residual_value: residual,
          accumulated_depreciation: accumulated,
          net_book_value: netBook,
        } as MockFixedAsset;
        this.setStorage("fixed_assets", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((a) => a.id)) + 1 : 1;
    const created: MockFixedAsset = {
      id: newId,
      branch_id: item.branch_id || 1,
      record_type_id: item.record_type_id || 1,
      code: item.code,
      name: item.name,
      coa_id: item.coa_id || null,
      coa_code: item.coa_code || "255.01",
      coa_name: item.coa_name || "Demirbaşlar",
      category: item.category || "Demirbaş",
      acquisition_date: item.acquisition_date || new Date().toISOString().slice(0, 10),
      acquisition_cost: cost,
      residual_value: residual,
      useful_life_months: lifeMonths,
      depreciation_method: depMethod,
      location_note: item.location_note || "",
      responsible_name: item.responsible_name || "",
      serial_no: item.serial_no || "",
      invoice_no: item.invoice_no || "",
      notes: item.notes || "",
      is_passive: !!item.is_passive,
      accumulated_depreciation: accumulated,
      net_book_value: netBook,
    };
    list.unshift(created);
    this.setStorage("fixed_assets", list);
    return created;
  }

  deleteFixedAsset(id: number): void {
    const list = this.getFixedAssets().filter((a) => a.id !== id);
    this.setStorage("fixed_assets", list);
  }

  // --- GELİR & GİDER KARTLARI ---
  getGelirGiderCards(cardType?: "GELIR" | "GIDER"): MockGelirGiderItem[] {
    const all = this.getStorage<MockGelirGiderItem[]>("gelir_gider", DEFAULT_GELIR_GIDER);
    if (!cardType) return all;
    return all.filter((c) => c.card_type === cardType);
  }

  getGelirGiderCard(id: number): MockGelirGiderItem | null {
    const all = this.getGelirGiderCards();
    return all.find((c) => c.id === id) || null;
  }

  saveGelirGiderCard(item: Partial<MockGelirGiderItem> & { name: string; card_type: "GELIR" | "GIDER" }): MockGelirGiderItem {
    const list = this.getStorage<MockGelirGiderItem[]>("gelir_gider", DEFAULT_GELIR_GIDER);
    if (item.id) {
      const idx = list.findIndex((c) => c.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as MockGelirGiderItem;
        this.setStorage("gelir_gider", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((c) => c.id)) + 1 : 1;
    const prefix = item.card_type === "GELIR" ? "GEL" : "GID";
    const created: MockGelirGiderItem = {
      branch_id: 1,
      record_type_id: 1,
      default_vat_rate: 20,
      card_group: "Genel",
      branch_ratio: 100,
      is_passive: false,
      coa_id: 1,
      coa_code: item.card_type === "GELIR" ? "600.01" : "770.01",
      link_count: 0,
      links: [],
      ...item,
      id: newId,
      code: item.code || `${prefix}-${String(newId).padStart(3, "0")}`,
      name: item.name,
      card_type: item.card_type,
    };
    list.unshift(created);
    this.setStorage("gelir_gider", list);
    return created;
  }

  deleteGelirGiderCard(id: number): void {
    const list = this.getStorage<MockGelirGiderItem[]>("gelir_gider", DEFAULT_GELIR_GIDER).filter((c) => c.id !== id);
    this.setStorage("gelir_gider", list);
  }

  // --- ÜRETİM: REÇETELER (BOM) ---
  getBoms(): MockBomItem[] {
    return this.getStorage<MockBomItem[]>("boms", DEFAULT_BOMS);
  }

  getBom(id: number): MockBomItem | null {
    const list = this.getBoms();
    return list.find((b) => b.id === id) || null;
  }

  saveBom(item: Partial<MockBomItem> & { name: string }): MockBomItem {
    const list = this.getBoms();
    if (item.id) {
      const idx = list.findIndex((b) => b.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as MockBomItem;
        this.setStorage("boms", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((b) => b.id)) + 1 : 1;
    const created: MockBomItem = {
      branch_id: 1,
      record_type_id: 1,
      stock_id: 3,
      stock_code: "STK-003",
      stock_name: "Mamul Ürün",
      unit_name: "Adet",
      base_qty: 1,
      std_cost_tl: 1000,
      is_active: true,
      items: [],
      ...item,
      id: newId,
      code: item.code || `BOM-${String(newId).padStart(3, "0")}`,
      name: item.name,
    };
    list.unshift(created);
    this.setStorage("boms", list);
    return created;
  }

  deleteBom(id: number): void {
    const list = this.getBoms().filter((b) => b.id !== id);
    this.setStorage("boms", list);
  }

  // --- ÜRETİM EMİRLERİ ---
  getProductionOrders(): MockProductionOrder[] {
    return this.getStorage<MockProductionOrder[]>("prod_orders", DEFAULT_PRODUCTION_ORDERS);
  }

  getProductionOrder(id: number): MockProductionOrder | null {
    return this.getProductionOrders().find((o) => o.id === id) || null;
  }

  saveProductionOrder(item: Partial<MockProductionOrder>): MockProductionOrder {
    const list = this.getProductionOrders();
    if (item.id) {
      const idx = list.findIndex((o) => o.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as MockProductionOrder;
        this.setStorage("prod_orders", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((o) => o.id)) + 1 : 1;
    const bom = this.getBom(item.bom_id || 1) || DEFAULT_BOMS[0];
    const qty = Number(item.qty_planned) || 1;
    const stdCost = bom.std_cost_tl || 1000;
    const created: MockProductionOrder = {
      id: newId,
      order_no: `EMR-${new Date().getFullYear()}-${String(newId).padStart(3, "0")}`,
      branch_id: 1,
      record_type_id: 1,
      bom_id: bom.id,
      bom_code: bom.code,
      bom_name: bom.name,
      stock_id: bom.stock_id,
      stock_code: bom.stock_code,
      stock_name: bom.stock_name,
      qty_planned: qty,
      qty_produced: 0,
      planned_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: "DRAFT",
      unit_std_cost: stdCost,
      total_std_cost: stdCost * qty,
      total_actual_cost: 0,
      ...item,
    };
    list.unshift(created);
    this.setStorage("prod_orders", list);
    return created;
  }

  deleteProductionOrder(id: number): void {
    const list = this.getProductionOrders().filter((o) => o.id !== id);
    this.setStorage("prod_orders", list);
  }

  // --- MAKİNE PARKURU ---
  getMachines(): MockMachine[] {
    return this.getStorage<MockMachine[]>("machines", DEFAULT_MACHINES);
  }

  getMachine(id: number): MockMachine | null {
    return this.getMachines().find((m) => m.id === id) || null;
  }

  saveMachine(item: Partial<MockMachine> & { code: string; name: string }): MockMachine {
    const list = this.getMachines();
    if (item.id) {
      const idx = list.findIndex((m) => m.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as MockMachine;
        this.setStorage("machines", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((m) => m.id)) + 1 : 1;
    const created: MockMachine = {
      branch_id: 1,
      machine_type: "MAKINA",
      power_kw: 15.0,
      hourly_rate_tl: 200.0,
      daily_hours: 8,
      work_center: "Fabrika",
      efficiency_pct: 90.0,
      status: "ACTIVE",
      ...item,
      id: newId,
      code: item.code,
      name: item.name,
    };
    list.push(created);
    this.setStorage("machines", list);
    return created;
  }

  deleteMachine(id: number): void {
    const list = this.getMachines().filter((m) => m.id !== id);
    this.setStorage("machines", list);
  }

  // --- İŞ PLANI (GANTT & ÇİZELGELEME) ---
  getWorkPlans(): MockWorkPlanItem[] {
    return this.getStorage<MockWorkPlanItem[]>("work_plans", DEFAULT_WORK_PLANS);
  }

  saveWorkPlan(item: Partial<MockWorkPlanItem>): MockWorkPlanItem {
    const list = this.getWorkPlans();
    if (item.id) {
      const idx = list.findIndex((w) => w.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as MockWorkPlanItem;
        this.setStorage("work_plans", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((w) => w.id)) + 1 : 1;
    const created: MockWorkPlanItem = {
      id: newId,
      branch_id: 1,
      plan_date: item.plan_date || new Date().toISOString().slice(0, 10),
      machine_id: item.machine_id || 1,
      machine_code: item.machine_code || "CNC-01",
      machine_name: item.machine_name || "CNC Dik İşleme",
      bom_id: item.bom_id || 1,
      bom_code: item.bom_code || "BOM-001",
      bom_name: item.bom_name || "Ürün Ağacı",
      stock_id: item.stock_id || 3,
      stock_code: item.stock_code || "STK-003",
      stock_name: item.stock_name || "Mamul",
      unit_name: item.unit_name || "Adet",
      qty_planned: Number(item.qty_planned) || 10,
      operation_name: item.operation_name || "İmalat Operasyonu",
      shift_name: item.shift_name || "1. Vardiya",
      start_time: item.start_time || "08:00",
      end_time: item.end_time || "17:00",
      duration_hours: Number(item.duration_hours) || 8,
      status: item.status || "PLANNED",
      notes: item.notes || "",
    };
    list.unshift(created);
    this.setStorage("work_plans", list);
    return created;
  }

  deleteWorkPlan(id: number): void {
    const list = this.getWorkPlans().filter((w) => w.id !== id);
    this.setStorage("work_plans", list);
  }

  // --- SİSTEM BİLDİRİM AYARLARI ---
  getNotificationSettings(): { company_id: number; rules: MockNotificationRule[] } {
    const rules = this.getStorage<MockNotificationRule[]>("notification_rules", DEFAULT_NOTIFICATION_RULES);
    return { company_id: 1, rules };
  }

  saveNotificationSettings(rules: MockNotificationRule[]): { company_id: number; rules: MockNotificationRule[] } {
    this.setStorage("notification_rules", rules);
    return { company_id: 1, rules };
  }

  // --- MAKİNA TİP TANIMLARI ---
  getMachineTypes(): MockMachineType[] {
    return this.getStorage<MockMachineType[]>("machine_types", DEFAULT_MACHINE_TYPES);
  }

  saveMachineType(item: Partial<MockMachineType> & { name: string; code: string }): MockMachineType {
    const list = this.getMachineTypes();
    if (item.id) {
      const idx = list.findIndex((m) => m.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item };
        this.setStorage("machine_types", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((m) => m.id)) + 1 : 1;
    const created: MockMachineType = {
      id: newId,
      code: item.code,
      name: item.name,
      hourly_amortization_tl: item.hourly_amortization_tl ?? 50,
      energy_multiplier: item.energy_multiplier ?? 1,
      description: item.description ?? "",
      is_active: item.is_active ?? true,
    };
    list.push(created);
    this.setStorage("machine_types", list);
    return created;
  }

  deleteMachineType(id: number): void {
    const list = this.getMachineTypes().filter((m) => m.id !== id);
    this.setStorage("machine_types", list);
  }

  // --- DEPO TANIMLARI ---
  getWarehouses(): MockWarehouse[] {
    return this.getStorage<MockWarehouse[]>("warehouses", DEFAULT_WAREHOUSES);
  }

  saveWarehouse(item: Partial<MockWarehouse> & { name: string; code: string }): MockWarehouse {
    const list = this.getWarehouses();
    if (item.id) {
      const idx = list.findIndex((w) => w.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item };
        this.setStorage("warehouses", list);
        return list[idx];
      }
    }
    const newId = list.length > 0 ? Math.max(...list.map((w) => w.id)) + 1 : 1;
    const created: MockWarehouse = {
      id: newId,
      code: item.code,
      name: item.name,
      branch_id: item.branch_id || 1,
      branch_name: item.branch_name || "Merkez Şube",
      warehouse_type: item.warehouse_type || "150_HAMMADDE",
      coa_code: item.coa_code || "150.01",
      coa_name: item.coa_name || "İlk Madde ve Malzeme",
      manager_name: item.manager_name || "",
      location: item.location || "",
      area_sqm: item.area_sqm || 100,
      allow_negative_stock: item.allow_negative_stock ?? false,
      is_active: item.is_active ?? true,
    };
    list.push(created);
    this.setStorage("warehouses", list);
    return created;
  }

  deleteWarehouse(id: number): void {
    const list = this.getWarehouses().filter((w) => w.id !== id);
    this.setStorage("warehouses", list);
  }
}

export const mockStore = new MockDataStore();
