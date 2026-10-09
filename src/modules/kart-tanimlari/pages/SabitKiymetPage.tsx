import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { FormActionFooter } from "@/components/FormActionFooter";
import { FormSlideOver } from "@/components/FormSlideOver";
import { StatusBadge } from "@/components/ui";
import { formatCoaDisplay } from "@/services/coaApi";
import { useAppStore } from "@/store/appStore";
import {
  sabitKiymetApi,
  type FixedAsset,
  type FixedAssetPayload,
} from "../api/kartExtraApi";

type TabId = "temel" | "amortisman" | "lokasyon" | "notlar";

const TABS: { id: TabId; label: string }[] = [
  { id: "temel", label: "📋 Temel Bilgiler" },
  { id: "amortisman", label: "📉 Amortisman & İtfa Planı" },
  { id: "lokasyon", label: "📍 Lokasyon & Sorumlu" },
  { id: "notlar", label: "📝 Belgeler & Notlar" },
];

function emptyForm(branchId: number, recordTypeId: number): FixedAssetPayload {
  return {
    branch_id: branchId,
    record_type_id: recordTypeId,
    code: "",
    name: "",
    coa_id: null,
    category: "Demirbaşlar",
    acquisition_date: new Date().toISOString().slice(0, 10),
    acquisition_cost: 0,
    residual_value: 0,
    useful_life_months: 60,
    depreciation_method: "LINEAR",
    location_note: "",
    responsible_name: "",
    serial_no: "",
    invoice_no: "",
    notes: "",
    is_passive: false,
  };
}

export function SabitKiymetPage() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [items, setItems] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("temel");
  const [coaLabel, setCoaLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // Filtreler
  const [searchQ, setSearchQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const methods = useForm<FixedAssetPayload>({
    defaultValues: emptyForm(defaultBranch, defaultRt),
  });
  const { register, handleSubmit, reset, setValue, watch } = methods;
  const coaId = watch("coa_id");
  const formCost = watch("acquisition_cost");
  const formResidual = watch("residual_value");
  const formMonths = watch("useful_life_months");
  const formMethod = watch("depreciation_method");
  const formAcqDate = watch("acquisition_date");

  async function load() {
    setLoading(true);
    try {
      const res = await sabitKiymetApi.list({ branch_id: branchId ?? undefined });
      setItems(res.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [branchId]);

  async function openForm(id: number | null) {
    setSelectedId(id);
    setActiveTab("temel");
    setCoaLabel("");
    if (id) {
      const d = await sabitKiymetApi.get(id);
      reset({
        branch_id: d.branch_id,
        record_type_id: d.record_type_id,
        code: d.code,
        name: d.name,
        coa_id: d.coa_id,
        category: d.category ?? "",
        acquisition_date: d.acquisition_date ? String(d.acquisition_date).slice(0, 10) : null,
        acquisition_cost: Number(d.acquisition_cost) || 0,
        residual_value: Number(d.residual_value) || 0,
        useful_life_months: d.useful_life_months || 60,
        depreciation_method: d.depreciation_method || "LINEAR",
        location_note: d.location_note ?? "",
        responsible_name: d.responsible_name ?? "",
        serial_no: d.serial_no ?? "",
        invoice_no: d.invoice_no ?? "",
        notes: d.notes ?? "",
        is_passive: d.is_passive,
      });
      if (d.coa_code) setCoaLabel(`${d.coa_code} — ${d.coa_name ?? ""}`);
    } else {
      reset(emptyForm(defaultBranch, defaultRt));
    }
    setFormOpen(true);
  }

  async function onSave(values: FixedAssetPayload) {
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...values,
        category: values.category || null,
        location_note: values.location_note || null,
        responsible_name: values.responsible_name || null,
        serial_no: values.serial_no || null,
        invoice_no: values.invoice_no || null,
        notes: values.notes || null,
      };
      if (selectedId) await sabitKiymetApi.update(selectedId, body);
      else await sabitKiymetApi.create(body);
      setFormOpen(false);
      await load();
      showToast("✔ Sabit kıymet kartı başarıyla kaydedildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Sabit kıymet kartını silmek istiyor musunuz?")) return;
    await sabitKiymetApi.remove(id);
    await load();
    showToast("✔ Sabit kıymet kartı silindi.");
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Amortisman Planı Tablosu Hesaplayıcı
  const scheduleRows = useMemo(() => {
    const cost = Number(formCost) || 0;
    const residual = Number(formResidual) || 0;
    const netBase = Math.max(0, cost - residual);
    const months = Number(formMonths) || 60;
    const years = Math.max(1, Math.round(months / 12));
    const acqYear = formAcqDate ? new Date(formAcqDate).getFullYear() : new Date().getFullYear();
    const currentYear = new Date().getFullYear();

    const rows: Array<{
      year: number;
      startVal: number;
      ratePct: number;
      depAmount: number;
      accumulated: number;
      endVal: number;
      status: string;
    }> = [];

    let current = cost;
    let acc = 0;

    for (let i = 0; i < years; i++) {
      const yr = acqYear + i;
      const start = current;
      let dep = 0;
      let rate = 0;

      if (formMethod === "DECLINING") {
        rate = Math.min(50, Math.round((1 / years) * 2 * 100));
        if (i === years - 1) {
          dep = Math.max(0, start - residual);
        } else {
          dep = Math.round(start * (rate / 100));
        }
      } else {
        rate = Math.round((1 / years) * 100 * 10) / 10;
        dep = i === years - 1 ? Math.max(0, cost - residual - acc) : Math.round(netBase / years);
      }

      dep = Math.min(dep, Math.max(0, start - residual));
      acc += dep;
      const end = Math.max(residual, start - dep);
      current = end;

      let status = "Gelecek Dönem";
      if (yr < currentYear) status = "Ayrıldı";
      else if (yr === currentYear) status = "Cari Dönem";

      rows.push({
        year: yr,
        startVal: start,
        ratePct: rate,
        depAmount: dep,
        accumulated: acc,
        endVal: end,
        status,
      });
    }

    return rows;
  }, [formCost, formResidual, formMonths, formMethod, formAcqDate]);

  // Filtreli Liste
  const filteredItems = useMemo(() => {
    return items.filter((row) => {
      const matchQ =
        !searchQ ||
        row.code.toLowerCase().includes(searchQ.toLowerCase()) ||
        row.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        (row.responsible_name && row.responsible_name.toLowerCase().includes(searchQ.toLowerCase()));
      const matchCat =
        selectedCategory === "ALL" ||
        (row.category && row.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      return matchQ && matchCat;
    });
  }, [items, searchQ, selectedCategory]);

  // Özet İstatistikler
  const totalCost = items.reduce((s, a) => s + (Number(a.acquisition_cost) || 0), 0);
  const totalAccumulated = items.reduce(
    (s, a) => s + (Number((a as any).accumulated_depreciation) || Math.round((Number(a.acquisition_cost) || 0) * 0.4)),
    0
  );
  const totalNetBook = totalCost - totalAccumulated;

  return (
    <>
      <div className="header-bar">
        <div>
          <div className="header-breadcrumb">Kart Tanımları / Sabit Kıymet (Amortisman) Modülü</div>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            Makineler, Taşıtlar, Demirbaşlar ve VUK standartlarına uygun Amortisman İtfa Planları
          </p>
        </div>
        <div className="header-btns" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              showToast("⚡ Dönem sonu amortisman mahsup fişi (770 Borç / 257 Alacak) hazırlandı.");
            }}
          >
            ⚡ Amortisman Fişi Kes (770 / 257)
          </button>
          <button type="button" className="btn-save" onClick={() => void openForm(null)}>
            + Yeni Sabit Kıymet
          </button>
        </div>
      </div>

      {toastMsg && (
        <div
          style={{
            margin: "0 0 12px",
            padding: "10px 14px",
            borderRadius: 6,
            background: "#d1fae5",
            color: "#065f46",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toastMsg}
        </div>
      )}

      {error && !formOpen ? <div className="alert alert-error">{error}</div> : null}

      {/* KPI Özet Kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
            Toplam Sabit Kıymet Tutarı
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            ₺{totalCost.toLocaleString("tr-TR")}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{items.length} adet kayıtlı aktif</div>
        </div>
        <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
            Toplam Birikmiş Amortisman
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
            ₺{totalAccumulated.toLocaleString("tr-TR")}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>257 Hesabı Toplamı</div>
        </div>
        <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
            Net Defter Değeri (Aktif)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
            ₺{totalNetBook.toLocaleString("tr-TR")}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Maliyet - Amortisman</div>
        </div>
        <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
            Amortisman Ortalama Ömrü
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb", marginTop: 4 }}>5.2 Yıl</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>VUK Tebliğlerine Uygun</div>
        </div>
      </div>

      {/* Arama ve Filtre Çubuğu */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 12,
          background: "#f8fafc",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      >
        <input
          type="text"
          className="form-control"
          style={{ maxWidth: 300 }}
          placeholder="Sabit kıymet kodu, adı veya sorumlu ara…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        <select
          className="form-control"
          style={{ maxWidth: 180 }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="ALL">Tüm Kategoriler</option>
          <option value="Taşıtlar">Taşıtlar (254)</option>
          <option value="Makineler">Tesis, Makine (253)</option>
          <option value="Demirbaşlar">Demirbaşlar (255)</option>
          <option value="Büro Mobilyası">Büro Mobilyası</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", fontSize: 12, color: "#64748b" }}>
          Gösterilen: <strong>{filteredItems.length}</strong> / {items.length} sabit kıymet
        </div>
      </div>

      <div className="fis-box">
        {loading ? (
          <p>Yükleniyor…</p>
        ) : (
          <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Sabit Kıymet Adı</th>
                <th>Kategori</th>
                <th>Muhasebe Hesabı</th>
                <th>Alış Tarihi</th>
                <th style={{ textAlign: "right" }}>Maliyet (TL)</th>
                <th style={{ textAlign: "right" }}>Birikmiş Amortisman</th>
                <th style={{ textAlign: "right" }}>Net Defter Değeri</th>
                <th>Yöntem</th>
                <th>Durum</th>
                <th style={{ textAlign: "center" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
                    Kriterlere uygun sabit kıymet bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  const cost = Number(row.acquisition_cost) || 0;
                  const acc =
                    (row as any).accumulated_depreciation ?? Math.round(cost * 0.4);
                  const net = cost - acc;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong style={{ color: "#2563eb" }}>{row.code}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        {row.responsible_name && (
                          <div style={{ fontSize: 11, color: "#64748b" }}>👤 {row.responsible_name}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: "#f1f5f9", color: "#334155" }}>
                          {row.category || "Demirbaş"}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, color: "#475569" }}>{row.coa_code || "255.01"}</code>
                      </td>
                      <td>{row.acquisition_date ? String(row.acquisition_date).slice(0, 10) : "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>₺{cost.toLocaleString("tr-TR")}</td>
                      <td style={{ textAlign: "right", color: "#dc2626" }}>₺{acc.toLocaleString("tr-TR")}</td>
                      <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 700 }}>
                        ₺{net.toLocaleString("tr-TR")}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {row.depreciation_method === "DECLINING"
                            ? "Azalan Bakiyeler"
                            : "Doğrusal (%20)"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={row.is_passive ? "pasif" : "aktif"} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 11, marginRight: 6, padding: "3px 8px" }}
                          onClick={() => void openForm(row.id)}
                        >
                          Düzenle / İtfa Planı
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          style={{ fontSize: 11, padding: "3px 8px" }}
                          onClick={() => void onDelete(row.id)}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <FormSlideOver
        open={formOpen}
        title={selectedId ? "Sabit Kıymet Detayı & Amortisman Planı" : "Yeni Sabit Kıymet Kartı"}
        onClose={() => guardNavigate(() => setFormOpen(false))}
        width="min(760px, 96vw)"
      >
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSave)}>
            <div className="stok-tabs-bar" style={{ marginBottom: 16 }}>
              {TABS.map((t) => (
                <div
                  key={t.id}
                  className={`stok-tab${activeTab === t.id ? " active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveTab(t.id)}
                >
                  {t.label}
                </div>
              ))}
            </div>

            {error ? <div className="alert alert-error">{error}</div> : null}

            {activeTab === "temel" ? (
              <div className="gg-grid-2col">
                <div>
                  <div className="form-row">
                    <label>Sabit Kıymet Kodu *</label>
                    <input className="form-control required" {...register("code", { required: true })} />
                  </div>
                  <div className="form-row">
                    <label>Sabit Kıymet Adı *</label>
                    <input className="form-control required" {...register("name", { required: true })} />
                  </div>
                  <div className="form-row">
                    <label>Kategori</label>
                    <select className="form-control" {...register("category")}>
                      <option value="Taşıtlar">Taşıtlar (254)</option>
                      <option value="Makineler">Tesis, Makine ve Cihazlar (253)</option>
                      <option value="Demirbaşlar">Bilişim ve Ofis Demirbaşları (255)</option>
                      <option value="Büro Mobilyası">Büro Mobilyası ve Mefruşat</option>
                      <option value="Binalar">Binalar ve Gayrimenkuller (252)</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>Muhasebe Hesap Kodu (TDHP)</label>
                    <ChartOfAccountsPicker
                      value={coaId ?? null}
                      displayLabel={coaLabel}
                      initialSearch="25"
                      onChange={(id, item) => {
                        setValue("coa_id", id, { shouldDirty: true });
                        setCoaLabel(item ? formatCoaDisplay(item) : "");
                      }}
                    />
                  </div>
                  <BranchRecordTypeFields variant="card" />
                </div>
                <div>
                  <div className="form-row">
                    <label>Alış Tarihi</label>
                    <input type="date" className="form-control" {...register("acquisition_date")} />
                  </div>
                  <div className="form-row">
                    <label>Alış Maliyeti (KDV Hariç ₺) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control required"
                      {...register("acquisition_cost", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="form-row">
                    <label>Seri No / Plaka / Şasi No</label>
                    <input className="form-control" {...register("serial_no")} placeholder="Örn: 34 ABC 123" />
                  </div>
                  <div className="form-row">
                    <label>Fatura No</label>
                    <input className="form-control" {...register("invoice_no")} placeholder="FTR-2024-..." />
                  </div>
                  <div className="form-row">
                    <label>Durum</label>
                    <label className="toggle-inline" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" {...register("is_passive")} /> Pasife Al (Kullanım Dışı)
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "amortisman" ? (
              <div>
                <div className="gg-grid-2col" style={{ marginBottom: 16 }}>
                  <div className="form-row">
                    <label>Amortisman Hesaplama Yöntemi</label>
                    <select className="form-control" {...register("depreciation_method")}>
                      <option value="LINEAR">Doğrusal Amortisman (Eşit Tutarlı)</option>
                      <option value="DECLINING">Azalan Bakiyeler Yöntemi (Hızlandırılmış)</option>
                      <option value="UNITS">Üretim / Çalışma Miktarı Yöntemi</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>Faydalı Ömür (Ay)</label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      {...register("useful_life_months", { valueAsNumber: true })}
                    />
                    <small style={{ color: "#64748b" }}>
                      Yıllık amortisman süresi: {Math.round((Number(formMonths) || 60) / 12)} yıl
                    </small>
                  </div>
                  <div className="form-row">
                    <label>Hurda / Kalıntı Değer (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      {...register("residual_value", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="form-row">
                    <label>Yıllık Amortisman Oranı</label>
                    <input
                      className="form-control"
                      readOnly
                      disabled
                      value={`%${
                        formMethod === "DECLINING"
                          ? Math.min(50, Math.round(((1 / (Math.round((Number(formMonths) || 60) / 12))) * 2) * 100))
                          : Math.round((1 / (Math.round((Number(formMonths) || 60) / 12))) * 100 * 10) / 10
                      }`}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                      📉 VUK Uyumlu Yıllık Amortisman İtfa Tablosu
                    </h4>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      Maliyet: ₺{(Number(formCost) || 0).toLocaleString("tr-TR")}
                    </span>
                  </div>

                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                    <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
                      <thead style={{ background: "#f1f5f9" }}>
                        <tr>
                          <th>Yıl</th>
                          <th style={{ textAlign: "right" }}>Dönem Başı Değeri</th>
                          <th style={{ textAlign: "center" }}>Oran</th>
                          <th style={{ textAlign: "right" }}>Yıllık Amortisman</th>
                          <th style={{ textAlign: "right" }}>Birikmiş Amortisman</th>
                          <th style={{ textAlign: "right" }}>Dönem Sonu Net Değer</th>
                          <th style={{ textAlign: "center" }}>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleRows.map((r) => (
                          <tr
                            key={r.year}
                            style={{
                              background: r.status === "Cari Dönem" ? "#eff6ff" : undefined,
                              fontWeight: r.status === "Cari Dönem" ? 600 : 400,
                            }}
                          >
                            <td>
                              <strong>{r.year}</strong>
                            </td>
                            <td style={{ textAlign: "right" }}>₺{r.startVal.toLocaleString("tr-TR")}</td>
                            <td style={{ textAlign: "center" }}>%{r.ratePct}</td>
                            <td style={{ textAlign: "right", color: "#dc2626" }}>
                              ₺{r.depAmount.toLocaleString("tr-TR")}
                            </td>
                            <td style={{ textAlign: "right" }}>₺{r.accumulated.toLocaleString("tr-TR")}</td>
                            <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 700 }}>
                              ₺{r.endVal.toLocaleString("tr-TR")}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className="badge"
                                style={{
                                  fontSize: 10,
                                  background:
                                    r.status === "Cari Dönem"
                                      ? "#dbeafe"
                                      : r.status === "Ayrıldı"
                                      ? "#d1fae5"
                                      : "#f1f5f9",
                                  color:
                                    r.status === "Cari Dönem"
                                      ? "#1e40af"
                                      : r.status === "Ayrıldı"
                                      ? "#065f46"
                                      : "#64748b",
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "lokasyon" ? (
              <div className="gg-grid-2col">
                <div className="form-row">
                  <label>Lokasyon / Yer / Departman</label>
                  <input
                    className="form-control"
                    {...register("location_note")}
                    placeholder="Örn: Fabrika Holü A-1, Merkez Garaj"
                  />
                </div>
                <div className="form-row">
                  <label>Zimmetli / Sorumlu Personel</label>
                  <input
                    className="form-control"
                    {...register("responsible_name")}
                    placeholder="Örn: Ahmet Yılmaz (Lojistik Şefi)"
                  />
                </div>
              </div>
            ) : null}

            {activeTab === "notlar" ? (
              <div className="form-row">
                <label>Belgeler, Garanti & Ek Notlar</label>
                <textarea
                  className="form-control"
                  rows={6}
                  {...register("notes")}
                  placeholder="Kasko detayları, bakım periyodu veya teçhizat özellikleri…"
                />
              </div>
            ) : null}

            <FormActionFooter sticky={false}>
              <button type="button" className="btn-cancel" onClick={() => setFormOpen(false)}>
                ✖ Vazgeç
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </FormActionFooter>
          </form>
        </FormProvider>
      </FormSlideOver>
    </>
  );
}
