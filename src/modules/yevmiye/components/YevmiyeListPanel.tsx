import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SidePanel } from "@/components/ui/side-panel";
import { useAppStore } from "@/store/appStore";
import {
  yevmiyeApi,
  type JournalChangeCompare,
  type JournalVoucher,
  type JournalVoucherSummary,
} from "../api/yevmiyeApi";
import { YevmiyeEntryForm } from "./YevmiyeEntryForm";

function money(v: number | string | undefined | null) {
  return Number(v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matchesQuery(row: JournalVoucherSummary, q: string): boolean {
  const raw = q.trim();
  if (!raw) return true;
  const needle = raw.toLocaleLowerCase("tr");
  const fields = [
    String(row.voucher_no ?? ""),
    String(row.madde_no ?? ""),
    String(row.description ?? ""),
    String(row.total_debit ?? ""),
    String(row.total_credit ?? ""),
    money(row.total_debit),
    money(row.total_credit),
  ];
  if (fields.some((f) => f.toLocaleLowerCase("tr").includes(needle))) return true;

  const asNum = Number(String(raw).replace(",", "."));
  if (Number.isFinite(asNum) && raw !== "") {
    if (Number(row.total_debit) === asNum || Number(row.total_credit) === asNum) return true;
  }
  return false;
}

function LineTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>{title}</h4>
      <table className="data-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th>Hesap</th>
            <th>Borç</th>
            <th>Alacak</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Kayıt yok
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                {String(r.coa_code ?? r.coa_id ?? "")} {String(r.coa_name ?? r.description ?? "")}
              </td>
              <td style={{ textAlign: "right" }}>{money(r.debit as number)}</td>
              <td style={{ textAlign: "right" }}>{money(r.credit as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YevmiyeListPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [items, setItems] = useState<JournalVoucherSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [detail, setDetail] = useState<JournalVoucher | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmp, setCmp] = useState<JournalChangeCompare | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editVoucherId, setEditVoucherId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await yevmiyeApi.listVouchers({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
        limit: 300,
      });
      setItems(res.items ?? []);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [branchId, recordTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(
    () => items.filter((row) => matchesQuery(row, appliedQ)),
    [items, appliedQ]
  );

  function runSearch() {
    setAppliedQ(q);
  }

  async function openEdit(row: JournalVoucherSummary) {
    try {
      setEditVoucherId(row.id);
      setFormOpen(true);
      setEditOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Fiş açılamadı");
    }
  }

  async function openChanges(row: JournalVoucherSummary) {
    try {
      const c = await yevmiyeApi.getChanges(row.id);
      setCmp(c);
      setCmpOpen(true);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Karşılaştırma alınamadı");
    }
  }

  async function saveEdit() {
    if (!detail) return;
    setSaving(true);
    try {
      await yevmiyeApi.updateVoucher(detail.id, {
        description: editDesc,
        voucher_date: editDate,
        correction_note: "Açıklama/tarih güncelleme",
      });
      setEditOpen(false);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: JournalVoucherSummary) {
    if (!window.confirm(`${row.voucher_no} silinsin mi? Kaynak belgede “Yevmiye oluşmadı” görünür.`)) {
      return;
    }
    try {
      await yevmiyeApi.deleteVoucher(row.id);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  const columns: DataTableColumn<JournalVoucherSummary>[] = useMemo(
    () => [
      {
        key: "voucher_date",
        header: "Tarih",
        width: 110,
        render: (r) => String(r.voucher_date).slice(0, 10),
      },
      {
        key: "madde_no",
        header: "Madde No",
        width: 90,
        render: (r) => r.madde_no ?? "—",
      },
      {
        key: "voucher_no",
        header: "Fiş No",
        width: 140,
        render: (r) => <code style={{ fontWeight: 700 }}>{r.voucher_no}</code>,
      },
      {
        key: "description",
        header: "Açıklama",
        width: 220,
        render: (r) => r.description || "—",
      },
      {
        key: "debit",
        header: "Borç",
        width: 110,
        align: "right",
        render: (r) => money(r.total_debit),
      },
      {
        key: "credit",
        header: "Alacak",
        width: 110,
        align: "right",
        render: (r) => money(r.total_credit),
      },
      {
        key: "status",
        header: "Durum",
        width: 100,
        render: (r) => r.status,
      },
      {
        key: "changes",
        header: "Değişiklik",
        width: 130,
        render: (r) =>
          r.has_changes || r.revision_no > 0 ? (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: "2px 8px" }}
              onClick={(e) => {
                e.stopPropagation();
                void openChanges(r);
              }}
            >
              Değişiklik var
            </button>
          ) : (
            <span className="muted">—</span>
          ),
      },
      {
        key: "actions",
        header: "İşlem",
        width: 160,
        render: (r) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: "2px 8px" }}
              onClick={(e) => {
                e.stopPropagation();
                void openEdit(r);
              }}
            >
              Değiştir
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: "2px 8px", color: "#b91c1c" }}
              onClick={(e) => {
                e.stopPropagation();
                void removeRow(r);
              }}
            >
              Sil
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="ayar-form-card">
      <div className="yev-list-title-row">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Yevmiye Fişleri</h3>
        <button
          type="button"
          className="btn-add"
          onClick={() => {
            setEditVoucherId(null);
            setFormOpen(true);
          }}
        >
          + Yevmiye Fişi Ekle
        </button>
      </div>

      <YevmiyeEntryForm
        open={formOpen}
        voucherId={editVoucherId}
        onClose={() => {
          setFormOpen(false);
          setEditVoucherId(null);
        }}
        onSaved={() => void load()}
      />

      <div className="yev-list-toolbar">
        <input
          className="form-control"
          placeholder="Fiş / madde / açıklama / borç / alacak"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
        />
        <button type="button" className="btn-primary" onClick={runSearch}>
          Ara
        </button>
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          Yenile
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <DataTable
        tableKey="yevmiye-fisler"
        columns={columns}
        data={filteredItems}
        rowKey={(r) => r.id}
        zebra
        loading={loading}
        emptyMessage="Yevmiye fişi yok."
      />

      <SidePanel
        open={editOpen}
        title={detail ? `Değiştir — ${detail.voucher_no}` : "Değiştir"}
        onClose={() => setEditOpen(false)}
        size="md"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>
              Vazgeç
            </button>
            <button type="button" className="btn-save" disabled={saving} onClick={() => void saveEdit()}>
              Kaydet
            </button>
          </div>
        }
      >
        {detail && (
          <>
            <div className="form-row compact">
              <label>Tarih</label>
              <input type="date" className="form-control" value={editDate ?? ""} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="form-row compact">
              <label>Açıklama</label>
              <textarea className="form-control" rows={3} value={editDesc ?? ""} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Madde No: {detail.madde_no ?? "—"} · Rev: {detail.revision_no}
            </p>
            <table className="data-table" style={{ fontSize: 12, marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Hesap</th>
                  <th>Borç</th>
                  <th>Alacak</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((ln) => (
                  <tr key={ln.line_no}>
                    <td>
                      {ln.coa_code} {ln.coa_name}
                    </td>
                    <td style={{ textAlign: "right" }}>{money(ln.debit)}</td>
                    <td style={{ textAlign: "right" }}>{money(ln.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </SidePanel>

      <SidePanel
        open={cmpOpen}
        title={cmp ? `Değişiklik — ${cmp.voucher_no}` : "Değişiklik"}
        onClose={() => setCmpOpen(false)}
        size="lg"
      >
        {cmp && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <LineTable title="Oluşturulan Yevmiye" rows={cmp.olusturulan} />
            <LineTable title="Kayıtlı Yevmiye" rows={cmp.kayitli} />
          </div>
        )}
      </SidePanel>
    </div>
  );
}
