import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { stokApi, type LookupItem, type LotSummaryItem } from "../api/stokApi";
import { STOCK_TYPES } from "../constants";
import type { StokFormValues } from "../schemas/stokSchema";
import { DualTransferPanel } from "./DualTransferPanel";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { DynamicCodeFields } from "@/components/DynamicCodeFields";
import { CodeSelectFields } from "@/modules/ayarlar/components/CodeSelectFields";
import { formatCoaDisplay } from "@/services/coaApi";
import { kodTanimlariApi, type IstisnaCode, type TevkifatCodeExtended } from "@/modules/kod-tanimlari/api/kodTanimlariApi";

type Props = {
  activeTab: string;
  branchId: number;
  stockId: number | null;
};

export function StokTabPanels({ activeTab, branchId, stockId }: Props) {
  const { register, watch, setValue } = useFormContext<StokFormValues>();
  const suppliers = watch("suppliers");
  const warehouseLots = watch("warehouse_lots");
  const coaId = watch("coa_id");

  const [coaLabel, setCoaLabel] = useState("");
  const [istisnaCodes, setIstisnaCodes] = useState<IstisnaCode[]>([]);
  const [tevkifatCodes, setTevkifatCodes] = useState<TevkifatCodeExtended[]>([]);

  const [supplierLookups, setSupplierLookups] = useState<LookupItem[]>([]);
  const [warehouseLookups, setWarehouseLookups] = useState<LookupItem[]>([]);
  const [units, setUnits] = useState<LookupItem[]>([]);
  const [taxRates, setTaxRates] = useState<LookupItem[]>([]);
  const [lotSummary, setLotSummary] = useState<LotSummaryItem[]>([]);
  const [filterWh, setFilterWh] = useState<number | "">("");
  const [filterStock, setFilterStock] = useState<number | "">("");
  const [filterLot, setFilterLot] = useState("");

  useEffect(() => {
    kodTanimlariApi.listIstisna().then((r) => setIstisnaCodes(r.items)).catch(() => undefined);
    kodTanimlariApi.listTevkifat().then((r) => setTevkifatCodes(r.items)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!stockId) {
      setCoaLabel("");
      return;
    }
    stokApi
      .get(stockId)
      .then((detail) => {
        const d = detail as Record<string, unknown>;
        if (d.coa_code) {
          setCoaLabel(`${d.coa_code} — ${d.coa_name ?? ""}`.trim());
        } else {
          setCoaLabel("");
        }
      })
      .catch(() => setCoaLabel(""));
  }, [stockId]);

  const loadLookups = useCallback(async () => {
    const [sup, wh, u, tr] = await Promise.all([
      stokApi.lookupSuppliers(),
      stokApi.lookupWarehouses(branchId),
      stokApi.lookupUnits(),
      stokApi.lookupTaxRates(),
    ]);
    setSupplierLookups(sup.items);
    setWarehouseLookups(wh.items);
    setUnits(u.items);
    setTaxRates(tr.items);
  }, [branchId]);

  useEffect(() => {
    loadLookups().catch(() => undefined);
  }, [loadLookups]);

  const loadLotSummary = useCallback(async () => {
    try {
      const rows = await stokApi.lotSummary({
        warehouse_id: filterWh ? Number(filterWh) : undefined,
        stock_id: filterStock ? Number(filterStock) : stockId ?? undefined,
        lot_q: filterLot || undefined,
      });
      setLotSummary(rows);
    } catch {
      setLotSummary([]);
    }
  }, [filterWh, filterStock, filterLot, stockId]);

  useEffect(() => {
    if (activeTab === "stok-ozet") loadLotSummary();
  }, [activeTab, loadLotSummary]);

  function transferSuppliers(ids: number[]) {
    const next = [...suppliers];
    for (const id of ids) {
      if (next.some((s) => s.account_id === id)) continue;
      const lookup = supplierLookups.find((l) => l.id === id);
      next.push({
        account_id: id,
        account_code: lookup?.code ?? null,
        account_title: lookup?.name ?? "",
        supplier_code: "",
        purchase_price: 0,
        moq: 0,
        lead_time_days: 0,
      });
    }
    setValue("suppliers", next, { shouldDirty: true });
  }

  function removeSupplier(key: string) {
    setValue(
      "suppliers",
      suppliers.filter((s) => String(s.account_id) !== key),
      { shouldDirty: true }
    );
  }

  function updateSupplierField(key: string, field: string, value: string | number) {
    setValue(
      "suppliers",
      suppliers.map((s) =>
        String(s.account_id) === key ? { ...s, [field]: value } : s
      ),
      { shouldDirty: true }
    );
  }

  function transferWarehouses(ids: number[]) {
    const next = [...warehouseLots];
    for (const id of ids) {
      if (next.some((w) => w.warehouse_id === id)) continue;
      const lookup = warehouseLookups.find((l) => l.id === id);
      next.push({
        warehouse_id: id,
        warehouse_code: lookup?.code ?? null,
        warehouse_name: lookup?.name ?? "",
        lot_no: "",
        lot_name: "",
        shelf_location: "",
        qty_on_hand: 0,
        qty_reserved: 0,
        min_level: 0,
        max_level: 0,
        production_date: "",
        expiry_date: "",
        is_passive: false,
      });
    }
    setValue("warehouse_lots", next, { shouldDirty: true });
  }

  function removeWarehouse(key: string) {
    setValue(
      "warehouse_lots",
      warehouseLots.filter((w) => String(w.warehouse_id) !== key),
      { shouldDirty: true }
    );
  }

  function updateWarehouseField(key: string, field: string, value: string | number) {
    setValue(
      "warehouse_lots",
      warehouseLots.map((w) =>
        String(w.warehouse_id) === key ? { ...w, [field]: value } : w
      ),
      { shouldDirty: true }
    );
  }

  const lotColumns = useMemo(
    () => [
      { key: "wh", header: "Depo Kod", width: 100, render: (row: LotSummaryItem) => <strong>{row.warehouse_code}</strong> },
      { key: "stock_code", header: "Stok Kod", width: 110, render: (row: LotSummaryItem) => row.stock_code },
      { key: "stock_name", header: "Stok Adı", width: 160, render: (row: LotSummaryItem) => row.stock_name },
      {
        key: "lot_no",
        header: "Lot Kod",
        width: 110,
        render: (row: LotSummaryItem) => <strong style={{ color: "var(--primary)" }}>{row.lot_no}</strong>,
      },
      { key: "lot_name", header: "Lot Adı", width: 120, render: (row: LotSummaryItem) => row.lot_name },
      {
        key: "qty",
        header: "Miktar",
        width: 90,
        align: "right" as const,
        render: (row: LotSummaryItem) => <strong style={{ color: "var(--success)" }}>{row.qty_on_hand}</strong>,
      },
      { key: "prod", header: "Üretim Tarihi", width: 120, render: (row: LotSummaryItem) => row.production_date ?? "—" },
      { key: "exp", header: "SKT", width: 110, render: (row: LotSummaryItem) => row.expiry_date ?? "—" },
      {
        key: "days",
        header: "Gün",
        width: 80,
        render: (row: LotSummaryItem) => (row.days_since_production != null ? `${row.days_since_production} Gün` : "—"),
      },
      {
        key: "passive",
        header: "Pasif mi?",
        width: 90,
        render: (row: LotSummaryItem) => (
          <span className={`badge ${row.is_passive ? "badge-red" : "badge-green"}`}>
            {row.is_passive ? "Pasif" : "Aktif"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <>
      <div id="tab-stok-temel" className={`stok-subscreen${activeTab === "stok-temel" ? " active" : ""}`}>
        <div className="stok-grid-2col">
          <div>
            <div className="form-row">
              <label>Stok Kodu (SKU)</label>
              <input type="text" className="form-control required" {...register("code")} />
            </div>
            <div className="form-row">
              <label>Stok Adı</label>
              <input type="text" className="form-control required" {...register("name")} />
            </div>
            <div className="form-row">
              <label>Barkod / EAN-13</label>
              <input type="text" className="form-control" {...register("barcode")} />
            </div>
            <div className="form-row">
              <label>Stok Tipi</label>
              <select className="form-control" {...register("stock_type")}>
                {STOCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Birim</label>
              <select className="form-control" {...register("unit_id", { valueAsNumber: true })}>
                <option value="">Seçin</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>KDV Oranı</label>
              <select className="form-control" {...register("tax_rate_id", { valueAsNumber: true })}>
                <option value="">Seçin</option>
                {taxRates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="stok-coa">Muhasebe Hesap Kodu</label>
              <ChartOfAccountsPicker
                id="stok-coa"
                value={coaId ?? null}
                displayLabel={coaLabel}
                initialSearch="153"
                onChange={(id, item) => {
                  setValue("coa_id", id, { shouldDirty: true });
                  setCoaLabel(item ? formatCoaDisplay(item) : "");
                }}
              />
            </div>
            <BranchRecordTypeFields variant="card" />
            <div className="form-row">
              <label>Varsayılan İstisna Kodu</label>
              <select className="form-control" {...register("default_istisna_code")}>
                <option value="">— Yok —</option>
                {istisnaCodes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Varsayılan Tevkifat Kodu</label>
              <select className="form-control" {...register("default_tevkifat_code")}>
                <option value="">— Yok —</option>
                {tevkifatCodes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Grup / Özel Kodlar</label>
              <DynamicCodeFields entityType="STOCK" entityId={stockId} />
            </div>
            <CodeSelectFields
              entityType="STOCK"
              values={{}}
              onChange={() => undefined}
              showGroupSpecial={false}
            />
            <div className="form-row">
              <label>Min Stok</label>
              <input type="number" className="form-control" {...register("min_stock")} />
            </div>
            <div className="form-row">
              <label>Max Stok</label>
              <input type="number" className="form-control" {...register("max_stock")} />
            </div>
            <div className="form-row">
              <label>Kritik Seviye</label>
              <input type="number" className="form-control" {...register("critical_level")} />
            </div>
            <div className="form-row">
              <label>Alış Fiyatı (₺)</label>
              <input type="number" step="0.01" className="form-control" {...register("purchase_price")} />
            </div>
            <div className="form-row">
              <label>Satış Fiyatı (₺)</label>
              <input type="number" step="0.01" className="form-control" {...register("sale_price")} />
            </div>
            <div className="form-row">
              <label>Lot Takibi</label>
              <div className="toggle-box">
                <input type="checkbox" {...register("track_lot")} />
                <span style={{ marginLeft: 8, fontSize: 13 }}>Aktif</span>
              </div>
            </div>
            <div className="form-row">
              <label>Seri Takibi</label>
              <div className="toggle-box">
                <input
                  type="checkbox"
                  {...register("track_serial", {
                    onChange: (e) => {
                      const checked = e.target.checked;
                      setValue("track_serial", checked, { shouldDirty: true });
                      setValue("serial_lot_enabled", checked, { shouldDirty: true });
                    },
                  })}
                />
                <span style={{ marginLeft: 8, fontSize: 13 }}>Aktif</span>
              </div>
            </div>
            <div className="form-row">
              <label>Pasif</label>
              <div className="toggle-box">
                <input type="checkbox" {...register("is_passive")} />
              </div>
            </div>
          </div>
          <div>
            <div className="stok-info-box">
              <h4>💡 İkili Aktarım Paneli Ergonomisi</h4>
              <p>
                Pop-up açmadan üstteki Çoklu Tedarikçi Atama ve Depo Stok sekmelerinden sol listedeki
                firmaları seçip sağdaki aktif stok kartına alabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="tab-stok-tedarikci" className={`stok-subscreen${activeTab === "stok-tedarikci" ? " active" : ""}`}>
        <DualTransferPanel
          leftTitle="Mevcut Tüm Tedarikçi Firmalar"
          rightTitle="Bu Stok Kartına Atanan Seçili Tedarikçiler"
          leftItems={supplierLookups}
          leftSearchPlaceholder="Tedarikçi ara..."
          assigned={suppliers.map((s) => ({
            key: String(s.account_id),
            label: `🏢 ${s.account_title ?? s.account_code ?? s.account_id}`,
            fields: [
              { name: "supplier_code", label: "Tedarikçi Ürün Kodu", value: s.supplier_code ?? "" },
              { name: "purchase_price", label: "Alış Fiyatı (₺)", type: "number", value: s.purchase_price ?? 0 },
              { name: "moq", label: "MOQ", type: "number", value: s.moq ?? 0 },
            ],
          }))}
          onTransfer={transferSuppliers}
          onRemove={removeSupplier}
          onFieldChange={updateSupplierField}
        />
      </div>

      <div id="tab-stok-depo" className={`stok-subscreen${activeTab === "stok-depo" ? " active" : ""}`}>
        <DualTransferPanel
          leftTitle="Mevcut Depolar ve Şubeler"
          rightTitle="Seçilen Depolar & Lot / Raf Konumları"
          leftItems={warehouseLookups}
          leftHeaderBg="#475569"
          rightHeaderBg="#92400e"
          transferLabel="👉 DEPO AKTAR"
          transferColor="#d97706"
          leftSearchPlaceholder="Depo ara..."
          assigned={warehouseLots.map((w) => ({
            key: String(w.warehouse_id),
            label: `🏭 ${w.warehouse_name ?? w.warehouse_code ?? w.warehouse_id}`,
            fields: [
              {
                name: "qty_on_hand",
                label: "Eldeki Miktar",
                type: "number",
                value: w.qty_on_hand ?? 0,
                readOnly: true,
              },
              {
                name: "qty_reserved",
                label: "Rezerve",
                type: "number",
                value: w.qty_reserved ?? 0,
                readOnly: true,
              },
              { name: "min_level", label: "Min Seviye", type: "number", value: w.min_level ?? 0 },
              { name: "max_level", label: "Max Seviye", type: "number", value: w.max_level ?? 0 },
              { name: "lot_no", label: "Lot Kodu", value: w.lot_no ?? "" },
              { name: "lot_name", label: "Lot Adı", value: w.lot_name ?? "" },
              { name: "shelf_location", label: "Raf Konumu", value: w.shelf_location ?? "" },
              { name: "production_date", label: "Üretim Tarihi", type: "date", value: w.production_date ?? "" },
              { name: "expiry_date", label: "SKT", type: "date", value: w.expiry_date ?? "" },
            ],
          }))}
          assignedGridClass="assigned-grid assigned-grid-loose"
          onTransfer={transferWarehouses}
          onRemove={removeWarehouse}
          onFieldChange={updateWarehouseField}
        />
      </div>

      {/* 🏛️ Muhasebe Kodları Sekmesi */}
      <div id="tab-stok-muhasebe" className={`stok-subscreen${activeTab === "stok-muhasebe" ? " active" : ""}`}>
        <div style={{ padding: "16px", background: "var(--card-bg, #ffffff)", borderRadius: "8px", border: "1px solid var(--border-color, #e2e8f0)" }}>
          <div style={{ marginBottom: "16px", borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "8px" }}>
            <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700 }}>🏛️ Tek Düzen Hesap Planı (TDHP) Muhasebe Entegrasyon Kodları</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              Fatura, irsaliye ve fiş kesildiğinde bu stoğa ait satırların otomatik bağlanacağı genel muhasebe hesap kodları.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Yurt İçi Satışlar Hesabı (600)</label>
              <input type="text" className="form-control" placeholder="Örn: 600.01.001 - %20 Yurt İçi Satışlar" defaultValue="600.01.001" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>İhracat Satışları Hesabı (601)</label>
              <input type="text" className="form-control" placeholder="Örn: 601.01.001 - Mal İhracatı" defaultValue="601.01.001" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Alışlar / Ticari Mallar Hesabı (153 / 150)</label>
              <input type="text" className="form-control" placeholder="Örn: 153.01.001 - Ticari Mallar" defaultValue="153.01.001" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Satılan Malın Maliyeti (SMM) Hesabı (621 / 620)</label>
              <input type="text" className="form-control" placeholder="Örn: 621.01.001 - Satılan Ticari Mallar Maliyeti" defaultValue="621.01.001" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Satış İskontoları Hesabı (611)</label>
              <input type="text" className="form-control" placeholder="Örn: 611.01.001 - Satış İskontoları" defaultValue="611.01.001" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Satış İadeleri Hesabı (610)</label>
              <input type="text" className="form-control" placeholder="Örn: 610.01.001 - Satıştan İadeler" defaultValue="610.01.001" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Hesaplanan KDV Hesabı (391)</label>
              <input type="text" className="form-control" placeholder="Örn: 391.01.020 - %20 Hesaplanan KDV" defaultValue="391.01.020" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>İndirilecek KDV Hesabı (191)</label>
              <input type="text" className="form-control" placeholder="Örn: 191.01.020 - %20 İndirilecek KDV" defaultValue="191.01.020" />
            </div>
          </div>
        </div>
      </div>

      {/* 📐 Birim Seti & Barkod Sekmesi */}
      <div id="tab-stok-birim-set" className={`stok-subscreen${activeTab === "stok-birim-set" ? " active" : ""}`}>
        <div style={{ padding: "16px", background: "var(--card-bg, #ffffff)", borderRadius: "8px", border: "1px solid var(--border-color, #e2e8f0)" }}>
          <div style={{ marginBottom: "16px", borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "8px" }}>
            <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700 }}>📐 Çoklu Birim Seti, Çarpanlar ve Barkod Matrisi</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              Ana birim (Adet, KG vb.) haricinde koli, kutu veya palet gibi ambalaj birimleri, boyutlar ve tekil barkod tanımları.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px", marginBottom: "16px" }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Birim Seti Seçimi</label>
              <select className="form-control" defaultValue="1">
                <option value="1">Standart Adet Seti (Adet, Koli, Palet)</option>
                <option value="2">Ağırlık Seti (Gram, Kilogram, Ton)</option>
                <option value="3">Uzunluk Seti (Milimetre, Metre, Rulo)</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Ana Birim EAN-13 Barkod</label>
              <input type="text" className="form-control" placeholder="8690000000001" defaultValue="8691234567890" />
            </div>
          </div>

          <table className="fatura-table" style={{ width: "100%", fontSize: "13px", marginTop: "12px" }}>
            <thead>
              <tr>
                <th>Birim Adı</th>
                <th>Tür</th>
                <th>Çarpan</th>
                <th>Birim Barkodu</th>
                <th>En (mm)</th>
                <th>Boy (mm)</th>
                <th>Yükseklik (mm)</th>
                <th>Ağırlık (kg)</th>
                <th>Desi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Adet (C62)</strong></td>
                <td><span className="badge badge-primary">Ana Birim</span></td>
                <td>1.0000</td>
                <td>8691234567890</td>
                <td>100</td>
                <td>150</td>
                <td>50</td>
                <td>0.25</td>
                <td>0.25</td>
              </tr>
              <tr>
                <td><strong>Koli (BX)</strong></td>
                <td><span className="badge badge-amber">Alt Birim</span></td>
                <td>24.0000</td>
                <td>8691234567999</td>
                <td>400</td>
                <td>300</td>
                <td>300</td>
                <td>6.50</td>
                <td>12.00</td>
              </tr>
              <tr>
                <td><strong>Palet (PX)</strong></td>
                <td><span className="badge badge-blue">Üst Birim</span></td>
                <td>720.0000</td>
                <td>8691234567111</td>
                <td>1200</td>
                <td>800</td>
                <td>1600</td>
                <td>210.00</td>
                <td>512.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ⚙️ Stok Parametreleri & Raf Lokasyonu Sekmesi */}
      <div id="tab-stok-parametreler" className={`stok-subscreen${activeTab === "stok-parametreler" ? " active" : ""}`}>
        <div style={{ padding: "16px", background: "var(--card-bg, #ffffff)", borderRadius: "8px", border: "1px solid var(--border-color, #e2e8f0)" }}>
          <div style={{ marginBottom: "16px", borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "8px" }}>
            <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700 }}>⚙️ Lojistik, Raf Lokasyonu ve İthalat/İhracat Kodları</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              Depo raf/hücre yönetimi, gümrük GTİP numarası ve satın alma emniyet seviyeleri.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>GTİP Kodu (Gümrük Tarife)</label>
              <input type="text" className="form-control" placeholder="Örn: 8471.30.00.00.00" defaultValue="8471.30.00.00.00" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Menşei Ülke</label>
              <input type="text" className="form-control" placeholder="Örn: Türkiye (TR)" defaultValue="Türkiye (TR)" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Marka</label>
              <input type="text" className="form-control" placeholder="Marka adı..." defaultValue="Tabia Tech" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Model / Versiyon</label>
              <input type="text" className="form-control" placeholder="Model kodu..." defaultValue="TB-2026-PRO" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Depo Koridor / Raf No</label>
              <input type="text" className="form-control" placeholder="Örn: KORIDOR-A / RAF-04" defaultValue="A-04-KAT2" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Göz / Hücre Kodu</label>
              <input type="text" className="form-control" placeholder="Örn: H-12" defaultValue="H-12" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Emniyet Stoku (Güvenlik Miktarı)</label>
              <input type="number" className="form-control" placeholder="0" defaultValue="25" />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Tedarikçi Temin Süresi (Gün)</label>
              <input type="number" className="form-control" placeholder="Gün" defaultValue="5" />
            </div>
          </div>
        </div>
      </div>

      <div id="tab-stok-ozet" className={`stok-subscreen${activeTab === "stok-ozet" ? " active" : ""}`}>
        <div className="filter-header-bar">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            <div className="filter-group">
              <label>Depo</label>
              <select value={filterWh} onChange={(e) => setFilterWh(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Seçim Yapın</option>
                {warehouseLookups.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Lot Kod / Adı</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" placeholder="Lot ara..." value={filterLot} onChange={(e) => setFilterLot(e.target.value)} />
                <button type="button" className="btn-top" style={{ background: "#1e293b", color: "#fff" }} onClick={loadLotSummary}>
                  FİLTRELE
                </button>
              </div>
            </div>
          </div>
        </div>
        <ResizableDataTable
          tableKey="stok-lot-summary"
          columns={lotColumns}
          data={lotSummary}
          rowKey={(row) => row.id}
          tableClassName="resizable-data-table auth-table"
          emptyMessage="Kayıt bulunamadı"
        />
      </div>
    </>
  );
}
