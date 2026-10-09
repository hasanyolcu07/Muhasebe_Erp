import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useAppStore } from "@/store/appStore";
import { yevmiyeApi, type MaddeRenumberPreview } from "../api/yevmiyeApi";

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function money(v: number) {
  return Number(v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MaddeNumaralamaPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [dateFrom, setDateFrom] = useState(yearStart());
  const [dateTo, setDateTo] = useState(today());
  const [lastNo, setLastNo] = useState(0);
  const [startNo, setStartNo] = useState(1);
  const [preview, setPreview] = useState<MaddeRenumberPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLast = useCallback(async () => {
    try {
      const res = await yevmiyeApi.maddeSonNo({
        date_from: dateFrom,
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
      });
      setLastNo(res.last_madde_no);
      setStartNo(res.start_madde_no);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Son numara alınamadı");
    }
  }, [dateFrom, branchId, recordTypeId]);

  useEffect(() => {
    void refreshLast();
  }, [refreshLast]);

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      await refreshLast();
      const res = await yevmiyeApi.maddePreview({
        date_from: dateFrom,
        date_to: dateTo,
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
      });
      setPreview(res);
      setLastNo(res.last_madde_no);
      setStartNo(res.start_madde_no);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Önizleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!preview || preview.count === 0) {
      window.alert("Önce önizleme alın");
      return;
    }
    if (
      !window.confirm(
        `${preview.count} fiş ${preview.start_madde_no}–${preview.end_madde_no} aralığında numaralanacak. Onaylıyor musunuz?`
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await yevmiyeApi.maddeApply({
        date_from: dateFrom,
        date_to: dateTo,
        branch_id: branchId,
        record_type_id: recordTypeId,
        start_madde_no: startNo,
      });
      setPreview(res);
      window.alert(`Numaralama kaydedildi. Son madde: ${res.end_madde_no}`);
      await refreshLast();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydet başarısız");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<MaddeRenumberPreview["rows"][number]>[] = useMemo(
    () => [
      { key: "voucher_date", header: "Tarih", width: 110, render: (r) => String(r.voucher_date).slice(0, 10) },
      { key: "voucher_no", header: "Fiş No", width: 140, render: (r) => r.voucher_no },
      { key: "old", header: "Eski Madde", width: 90, render: (r) => r.old_madde_no ?? "—" },
      {
        key: "new",
        header: "Yeni Madde",
        width: 100,
        render: (r) => <strong>{r.new_madde_no}</strong>,
      },
      { key: "desc", header: "Açıklama", width: 220, render: (r) => r.description || "—" },
      {
        key: "debit",
        header: "Borç",
        width: 110,
        align: "right",
        render: (r) => money(r.total_debit),
      },
    ],
    []
  );

  return (
    <div className="ayar-form-card">
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Yevmiye Madde Numaralama</h3>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        GIB mevzuatına uygun tarih sıralı yeniden numaralama. Sonraki işlem kaldığı yerden devam eder.
      </p>

      <div className="gg-grid-2col" style={{ marginBottom: 12 }}>
        <div className="form-row compact">
          <label>Başlangıç Tarihi</label>
          <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="form-row compact">
          <label>Bitiş Tarihi</label>
          <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="form-row compact">
          <label>En Son Yevmiye Madde Numarası</label>
          <input className="form-control" value={lastNo ?? 0} readOnly disabled />
        </div>
        <div className="form-row compact">
          <label>Başlangıç Madde No</label>
          <input className="form-control" value={startNo ?? 1} readOnly disabled />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-top blue" disabled={loading} onClick={() => void runPreview()}>
          {loading ? "Önizleniyor…" : "Önizleme"}
        </button>
        <button type="button" className="btn-save" disabled={saving || !preview?.count} onClick={() => void apply()}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {preview && (
        <p style={{ fontSize: 13 }}>
          Önizleme: <strong>{preview.count}</strong> fiş · {preview.start_madde_no} → {preview.end_madde_no}
        </p>
      )}

      <DataTable
        tableKey="yevmiye-madde-onizleme"
        columns={columns}
        data={preview?.rows ?? []}
        rowKey={(r) => r.id}
        zebra
        loading={loading}
        emptyMessage="Önizleme için tarih seçip Önizleme’ye basın."
      />
    </div>
  );
}
