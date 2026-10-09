/**
 * Tabia ERP — Çevrimdışı / Simülasyon Rapor Veri Üreticisi
 * Tüm rapor grupları için zengin, gerçekçi Türk Ticaret ve Muhasebe formatında
 * kolon ve veri satırları üretir.
 */

export interface ReportMeta {
  report_key: string;
  title: string;
  columns: Array<{ key: string; label: string }>;
  row_count: number;
  filters: Record<string, unknown>;
  kpi_cards?: Array<{
    key: string;
    label: string;
    value: number | string | null;
    format?: string;
  }>;
}

export interface ReportResponse {
  meta: ReportMeta;
  rows: Array<Record<string, unknown>>;
}

export function generateMockReport(
  apiGroup: string,
  reportKey: string,
  filters: Record<string, unknown> = {}
): ReportResponse {
  const g = (apiGroup || "").toLowerCase();
  const k = (reportKey || "").toLowerCase();

  // 1. STOK RAPORLARI
  if (g === "stok" || k === "durum" || k === "kritik" || k === "hareket" || k === "degerleme") {
    if (k === "kritik") {
      return {
        meta: {
          report_key: k,
          title: "Kritik Seviye ve Sipariş İhtiyaç Raporu",
          columns: [
            { key: "code", label: "Stok Kodu" },
            { key: "name", label: "Stok Adı" },
            { key: "unit", label: "Birim" },
            { key: "qty_on_hand", label: "Mevcut Miktar" },
            { key: "critical_level", label: "Kritik Seviye" },
            { key: "min_stock", label: "Min. Seviye" },
            { key: "order_needed", label: "Sipariş İhtiyacı" },
            { key: "supplier", label: "Önerilen Tedarikçi" },
          ],
          row_count: 3,
          filters,
        },
        rows: [
          {
            code: "STK-001",
            name: "Endüstriyel Rulman 6204 2RS (SKF)",
            unit: "Adet",
            qty_on_hand: 42,
            critical_level: 80,
            min_stock: 50,
            order_needed: 158,
            supplier: "Rulman Sanayi A.Ş.",
          },
          {
            code: "STK-002",
            name: "Paslanmaz Çelik Sac 304 Kalite 2mm",
            unit: "KG",
            qty_on_hand: 190,
            critical_level: 400,
            min_stock: 250,
            order_needed: 600,
            supplier: "Yıldız Çelik Haddesi",
          },
          {
            code: "STK-004",
            name: "Endüstriyel Hidrolik Yağ ISO VG 46",
            unit: "Litre",
            qty_on_hand: 320,
            critical_level: 600,
            min_stock: 400,
            order_needed: 680,
            supplier: "Mobil Kimya San.",
          },
        ],
      };
    }

    if (k === "hareket") {
      return {
        meta: {
          report_key: k,
          title: "Stok Ekstresi ve Hareket Detayı",
          columns: [
            { key: "date", label: "Tarih" },
            { key: "doc_no", label: "Belge No" },
            { key: "stock_name", label: "Stok Adı" },
            { key: "type", label: "İşlem Türü" },
            { key: "in_qty", label: "Giriş" },
            { key: "out_qty", label: "Çıkış" },
            { key: "balance", label: "Kalan Bakiye" },
            { key: "unit_price", label: "Birim Fiyat (₺)" },
          ],
          row_count: 5,
          filters,
        },
        rows: [
          {
            date: "2024-03-01",
            doc_no: "IRS-2024-0102",
            stock_name: "Endüstriyel Rulman 6204 2RS",
            type: "Satın Alma İrsaliyesi",
            in_qty: 100,
            out_qty: 0,
            balance: 142,
            unit_price: 145.0,
          },
          {
            date: "2024-03-05",
            doc_no: "EMR-2024-001",
            stock_name: "Endüstriyel Rulman 6204 2RS",
            type: "Üretime Çıkış (Sarf)",
            in_qty: 0,
            out_qty: 50,
            balance: 92,
            unit_price: 145.0,
          },
          {
            date: "2024-03-12",
            doc_no: "FTR-2024-0442",
            stock_name: "Alüminyum Sigma Profil 40x40",
            type: "Satış Faturası",
            in_qty: 0,
            out_qty: 40,
            balance: 260,
            unit_price: 360.0,
          },
          {
            date: "2024-03-15",
            doc_no: "DEVIR-2024",
            stock_name: "Paslanmaz Çelik Sac 304",
            type: "Dönem Başı Devir",
            in_qty: 500,
            out_qty: 0,
            balance: 500,
            unit_price: 92.5,
          },
          {
            date: "2024-03-18",
            doc_no: "EMR-2024-002",
            stock_name: "Paslanmaz Çelik Sac 304",
            type: "Üretime Çıkış (Sarf)",
            in_qty: 0,
            out_qty: 310,
            balance: 190,
            unit_price: 92.5,
          },
        ],
      };
    }

    // Default stok durum / değerleme
    return {
      meta: {
        report_key: k || "durum",
        title: "Stok Durum ve Envanter Değerleme Raporu",
        columns: [
          { key: "code", label: "Stok Kodu" },
          { key: "name", label: "Stok Adı" },
          { key: "type", label: "Türü" },
          { key: "unit", label: "Birim" },
          { key: "qty", label: "Mevcut Miktar" },
          { key: "unit_cost", label: "Birim Maliyet (₺)" },
          { key: "total_cost", label: "Toplam Maliyet (₺)" },
          { key: "sale_price", label: "Satış Fiyatı (₺)" },
          { key: "total_sale", label: "Satış Değeri (₺)" },
        ],
        row_count: 5,
        filters,
      },
      rows: [
        {
          code: "STK-001",
          name: "Endüstriyel Rulman 6204 2RS (SKF)",
          type: "Ticari Mal",
          unit: "Adet",
          qty: 142,
          unit_cost: 145.0,
          total_cost: 20590.0,
          sale_price: 240.0,
          total_sale: 34080.0,
        },
        {
          code: "STK-002",
          name: "Paslanmaz Çelik Sac 304 Kalite 2mm",
          type: "Hammadde",
          unit: "KG",
          qty: 1250,
          unit_cost: 92.5,
          total_cost: 115625.0,
          sale_price: 145.0,
          total_sale: 181250.0,
        },
        {
          code: "STK-003",
          name: "Alüminyum Sigma Profil 40x40 Ağır Tip",
          type: "Mamul",
          unit: "Metre",
          qty: 480,
          unit_cost: 215.0,
          total_cost: 103200.0,
          sale_price: 360.0,
          total_sale: 172800.0,
        },
        {
          code: "STK-004",
          name: "Endüstriyel Hidrolik Yağ ISO VG 46",
          type: "Sarf Malzeme",
          unit: "Litre",
          qty: 850,
          unit_cost: 68.0,
          total_cost: 57800.0,
          sale_price: 105.0,
          total_sale: 89250.0,
        },
        {
          code: "STK-005",
          name: "Asenkron Elektrik Motoru 1.5 kW",
          type: "Ticari Mal",
          unit: "Adet",
          qty: 24,
          unit_cost: 2650.0,
          total_cost: 63600.0,
          sale_price: 4100.0,
          total_sale: 98400.0,
        },
      ],
    };
  }

  // 2. CARİ RAPORLARI
  if (g === "cari") {
    return {
      meta: {
        report_key: k,
        title: "Cari Bakiye, Satış ve Tahsilat Raporu",
        columns: [
          { key: "code", label: "Cari Kodu" },
          { key: "name", label: "Cari Ünvanı" },
          { key: "type", label: "Türü" },
          { key: "debit", label: "Borç (₺)" },
          { key: "credit", label: "Alacak (₺)" },
          { key: "balance", label: "Bakiye (₺)" },
          { key: "status", label: "Bakiye Yönü" },
        ],
        row_count: 4,
        filters,
      },
      rows: [
        {
          code: "120.01.001",
          name: "Atlas Makine ve Otomasyon San. A.Ş.",
          type: "Müşteri",
          debit: 345000.0,
          credit: 180000.0,
          balance: 165000.0,
          status: "Borçlu (Alacağımız)",
        },
        {
          code: "120.01.002",
          name: "Öztürk Mühendislik Çelik Konstrüksiyon",
          type: "Müşteri",
          debit: 215000.0,
          credit: 140000.0,
          balance: 75000.0,
          status: "Borçlu (Alacağımız)",
        },
        {
          code: "320.01.001",
          name: "Rulman Sanayi ve Ticaret A.Ş.",
          type: "Satıcı",
          debit: 110000.0,
          credit: 185000.0,
          balance: 75000.0,
          status: "Alacaklı (Borcumuz)",
        },
        {
          code: "320.01.002",
          name: "Yıldız Çelik Haddesi San. Ltd.",
          type: "Satıcı",
          debit: 95000.0,
          credit: 160000.0,
          balance: 65000.0,
          status: "Alacaklı (Borcumuz)",
        },
      ],
    };
  }

  // 3. FİNANS & KASA & BANKA RAPORLARI
  if (g === "finans") {
    return {
      meta: {
        report_key: k,
        title: "Kasa & Banka Likidite ve Hareket Raporu",
        columns: [
          { key: "code", label: "Hesap Kodu" },
          { key: "name", label: "Hesap Adı" },
          { key: "currency", label: "Para Birimi" },
          { key: "total_in", label: "Giriş (Tahsilat)" },
          { key: "total_out", label: "Çıkış (Tediye)" },
          { key: "balance", label: "Kalan Bakiye" },
        ],
        row_count: 4,
        filters,
      },
      rows: [
        {
          code: "100.01",
          name: "Merkez Ana TL Kasası",
          currency: "TRY",
          total_in: 485000.0,
          total_out: 412000.0,
          balance: 73000.0,
        },
        {
          code: "102.01",
          name: "Garanti BBVA Ticari TL Hesabı",
          currency: "TRY",
          total_in: 1850000.0,
          total_out: 1420000.0,
          balance: 430000.0,
        },
        {
          code: "102.02",
          name: "İş Bankası Şirket Hesabı",
          currency: "TRY",
          total_in: 920000.0,
          total_out: 710000.0,
          balance: 210000.0,
        },
        {
          code: "102.03",
          name: "Akbank İhracat USD Hesabı",
          currency: "USD",
          total_in: 85000.0,
          total_out: 42000.0,
          balance: 43000.0,
        },
      ],
    };
  }

  // 4. GELİR & GİDER RAPORLARI
  if (g === "gelir-gider") {
    return {
      meta: {
        report_key: k,
        title: "Gelir & Gider Dağılım ve Kar/Zarar Karşılaştırma",
        columns: [
          { key: "code", label: "Kart Kodu" },
          { key: "name", label: "Gelir / Gider Tanımı" },
          { key: "type", label: "Türü" },
          { key: "group", label: "Grup" },
          { key: "coa_code", label: "Hesap Planı" },
          { key: "amount", label: "Dönem Tutarı (₺)" },
          { key: "vat", label: "KDV Tutarı (₺)" },
        ],
        row_count: 6,
        filters,
      },
      rows: [
        {
          code: "GEL-001",
          name: "Yurtiçi Mamul Satış Gelirleri",
          type: "GELİR",
          group: "Esas Faaliyet",
          coa_code: "600.01",
          amount: 1450000.0,
          vat: 290000.0,
        },
        {
          code: "GEL-002",
          name: "Teknik Servis ve Montaj Gelirleri",
          type: "GELİR",
          group: "Hizmet Gelirleri",
          coa_code: "600.02",
          amount: 185000.0,
          vat: 37000.0,
        },
        {
          code: "GID-001",
          name: "Fabrika Elektrik Tüketim Gideri",
          type: "GİDER",
          group: "GÜG",
          coa_code: "730.01",
          amount: 68500.0,
          vat: 13700.0,
        },
        {
          code: "GID-002",
          name: "Genel Yönetim ve Ofis Kira Gideri",
          type: "GİDER",
          group: "Yönetim",
          coa_code: "770.01",
          amount: 45000.0,
          vat: 0.0,
        },
        {
          code: "GID-003",
          name: "Pazarlama ve Reklam Giderleri",
          type: "GİDER",
          group: "Pazarlama",
          coa_code: "760.01",
          amount: 32000.0,
          vat: 6400.0,
        },
        {
          code: "GID-004",
          name: "Lojistik ve Nakliye Giderleri",
          type: "GİDER",
          group: "Lojistik",
          coa_code: "760.02",
          amount: 28400.0,
          vat: 5680.0,
        },
      ],
    };
  }

  // 5. MUHASEBE & MİZAN & KDV RAPORLARI
  if (g === "muhasebe") {
    return {
      meta: {
        report_key: k,
        title: "Genel Mizan & TDHP Bakiye Özeti",
        columns: [
          { key: "account_code", label: "Hesap Kodu" },
          { key: "account_name", label: "Hesap Adı" },
          { key: "debit_total", label: "Borç Toplamı" },
          { key: "credit_total", label: "Alacak Toplamı" },
          { key: "debit_balance", label: "Borç Bakiye" },
          { key: "credit_balance", label: "Alacak Bakiye" },
        ],
        row_count: 8,
        filters,
      },
      rows: [
        {
          account_code: "100",
          account_name: "KASA",
          debit_total: 485000.0,
          credit_total: 412000.0,
          debit_balance: 73000.0,
          credit_balance: 0.0,
        },
        {
          account_code: "102",
          account_name: "BANKALAR",
          debit_total: 2855000.0,
          credit_total: 2172000.0,
          debit_balance: 683000.0,
          credit_balance: 0.0,
        },
        {
          account_code: "120",
          account_name: "ALICILAR",
          debit_total: 1650000.0,
          credit_total: 1410000.0,
          debit_balance: 240000.0,
          credit_balance: 0.0,
        },
        {
          account_code: "150",
          account_name: "İLK MADDE VE MALZEME",
          debit_total: 540000.0,
          credit_total: 366625.0,
          debit_balance: 173375.0,
          credit_balance: 0.0,
        },
        {
          account_code: "152",
          account_name: "MAMULLER",
          debit_total: 480000.0,
          credit_total: 376800.0,
          debit_balance: 103200.0,
          credit_balance: 0.0,
        },
        {
          account_code: "191",
          account_name: "İNDİRİLECEK KDV",
          debit_total: 184500.0,
          credit_total: 142000.0,
          debit_balance: 42500.0,
          credit_balance: 0.0,
        },
        {
          account_code: "320",
          account_name: "SATICILAR",
          debit_total: 940000.0,
          credit_total: 1080000.0,
          debit_balance: 0.0,
          credit_balance: 140000.0,
        },
        {
          account_code: "391",
          account_name: "HESAPLANAN KDV",
          debit_total: 242000.0,
          credit_total: 327000.0,
          debit_balance: 0.0,
          credit_balance: 85000.0,
        },
      ],
    };
  }

  // 6. ÜRETİM & MALİYET RAPORLARI
  if (g === "uretim" || g === "maliyet") {
    return {
      meta: {
        report_key: k,
        title: "VUK 7/A Üretim Maliyet Dağılımı ve Sapma Analizi",
        columns: [
          { key: "order_no", label: "Emir No" },
          { key: "product_name", label: "Mamul Adı" },
          { key: "qty", label: "Miktar" },
          { key: "std_mat_cost", label: "710 Direkt Malzeme" },
          { key: "std_lab_cost", label: "720 Direkt İşçilik" },
          { key: "std_overhead", label: "730 GÜG" },
          { key: "total_std_cost", label: "Standart Maliyet" },
          { key: "actual_cost", label: "Fiili Maliyet" },
          { key: "variance", label: "Maliyet Sapması (₺)" },
        ],
        row_count: 3,
        filters,
      },
      rows: [
        {
          order_no: "EMR-2024-001",
          product_name: "CNC Hassas Alüminyum Gövde Grubu",
          qty: 50,
          std_mat_cost: 50037.5,
          std_lab_cost: 3750.0,
          std_overhead: 3487.5,
          total_std_cost: 57275.0,
          actual_cost: 56800.0,
          variance: -475.0,
        },
        {
          order_no: "EMR-2024-002",
          product_name: "Elektrik Motorlu Redüktör Ünitesi",
          qty: 20,
          std_mat_cost: 57080.0,
          std_lab_cost: 6600.0,
          std_overhead: 5320.0,
          total_std_cost: 69000.0,
          actual_cost: 68400.0,
          variance: -600.0,
        },
        {
          order_no: "EMR-2024-003",
          product_name: "Paslanmaz Çelik Şasi Montajı",
          qty: 30,
          std_mat_cost: 34500.0,
          std_lab_cost: 4200.0,
          std_overhead: 3800.0,
          total_std_cost: 42500.0,
          actual_cost: 43100.0,
          variance: 600.0,
        },
      ],
    };
  }

  // 7. GENEL / SATIŞ / DİĞER
  return {
    meta: {
      report_key: k || "genel",
      title: `${apiGroup.toUpperCase()} — ${reportKey.toUpperCase()} Raporu`,
      columns: [
        { key: "code", label: "Kayıt Kodu" },
        { key: "name", label: "Açıklama / Tanım" },
        { key: "date", label: "İşlem Tarihi" },
        { key: "amount", label: "Tutar (₺)" },
        { key: "status", label: "Durum" },
      ],
      row_count: 3,
      filters,
    },
    rows: [
      {
        code: "KAY-001",
        name: "Standart Cari & Fatura İşlemi",
        date: "2024-03-01",
        amount: 85000.0,
        status: "Tamamlandı",
      },
      {
        code: "KAY-002",
        name: "Hizmet ve Malzeme Satış Hareketi",
        date: "2024-03-10",
        amount: 142000.0,
        status: "Onaylandı",
      },
      {
        code: "KAY-003",
        name: "Dönem Sonu Hesap Mutabakatı",
        date: "2024-03-20",
        amount: 95500.0,
        status: "İşlendi",
      },
    ],
  };
}
