import { useState } from "react";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
import { ResizableDataTable, type ResizableColumn } from "@/components/ResizableDataTable";
import { DocTypeBadgesInline } from "../../components/DocTypeBadgesInline";
import type { DocumentSide } from "../../constants/documentContext";
import { GibStatusBadge } from "../../utils/gibStatusBadge";
import { irsaliyeApi, type WaybillListItem } from "../api/irsaliyeApi";

type Props = {
  items: WaybillListItem[];
  loading?: boolean;
  title?: string;
  compact?: boolean;
  side?: DocumentSide;
  onOpen: (id: number) => void;
  onCopy: (id: number) => void;
  onDelete: (id: number) => void;
  onConvert?: (id: number) => void;
  onRefresh?: () => void;
};

export function ListView({
  items,
  loading,
  title = "Son İrsaliyeler",
  compact,
  side,
  onOpen,
  onCopy,
  onDelete,
  onConvert,
  onRefresh,
}: Props) {
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleQueryStatus(id: number) {
    setBusyId(id);
    try {
      const res = await irsaliyeApi.eirsaliyeQueryStatus(id);
      window.alert(`GİB Durum: ${res.gib_status_label}\nETTN: ${res.ettn ?? "—"}`);
      onRefresh?.();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Durum sorgulanamadı");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(id: number) {
    setBusyId(id);
    try {
      const res = await irsaliyeApi.eirsaliyeCreate(id);
      window.alert(res.message);
      onRefresh?.();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Oluşturma başarısız");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSend(id: number) {
    setBusyId(id);
    try {
      const res = await irsaliyeApi.eirsaliyeSend(id);
      window.alert(res.message);
      onRefresh?.();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Gönderim başarısız");
    } finally {
      setBusyId(null);
    }
  }

  const columns: ResizableColumn<WaybillListItem>[] = [
    { key: "waybill_no", header: "İrsaliye No", width: 140, render: (r) => r.waybill_no },
    {
      key: "doc_type",
      header: "Belge Tipi",
      width: 180,
      render: (r) => <DocTypeBadgesInline kind="waybill" row={r} showDirection={side === "purchase" || !!r.is_incoming} />,
    },
    { key: "type", header: "İşlem Türü", width: 140, render: (r) => r.waybill_type_label },
    { key: "date", header: "Tarih", width: 110, render: (r) => r.waybill_date },
    { key: "cari", header: "Cari", width: 160, render: (r) => r.account_title ?? "—" },
    {
      key: "invoice_no",
      header: "Fatura No",
      width: 120,
      render: (r) =>
        r.invoice_id && (r.invoice_no || r.invoice_fis_no) ? (
          <button
            type="button"
            className="link-btn"
            style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", padding: 0 }}
            onClick={() => setPreviewInvoiceId(r.invoice_id!)}
          >
            {r.invoice_no ?? r.invoice_fis_no}
          </button>
        ) : (
          "—"
        ),
    },
    {
      key: "gib_status",
      header: "GİB Durum",
      width: 110,
      render: (r) => <GibStatusBadge status={r.gib_status} label={r.gib_status_label} />,
    },
    {
      key: "status",
      header: "Durum",
      width: 90,
      render: (r) => (
        <span className={`badge ${r.status === "APPROVED" ? "badge-green" : "badge-yellow"}`}>
          {r.status === "APPROVED" ? "Onaylı" : "Taslak"}
        </span>
      ),
    },
    { key: "line_count", header: "Kalem", width: 70, align: "center", render: (r) => r.line_count },
    { key: "total_qty", header: "Toplam Miktar", width: 110, align: "right", render: (r) => r.total_qty },
    {
      key: "actions",
      header: "İşlem",
      width: 320,
      render: (r) => {
        const isEirs =
          r.e_irsaliye_type === "E_IRSALIYE" ||
          r.document_channel === "E_IRSALIYE" ||
          r.document_channel === "ENTEGRATOR_INCOMING";
        const canCreate = r.waybill_type === "SATIS" && !r.is_incoming;
        const canSend = r.waybill_type === "SATIS" && isEirs && !r.is_incoming;
        return (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button type="button" className="btn-top blue" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => onOpen(r.id)}>
              Aç
            </button>
            <button type="button" className="btn-top" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => onCopy(r.id)}>
              Kopyala
            </button>
            {canCreate && r.document_channel !== "E_IRSALIYE" && (
              <button
                type="button"
                className="btn-top"
                style={{ padding: "2px 8px", fontSize: 11 }}
                disabled={busyId === r.id}
                onClick={() => handleCreate(r.id)}
              >
                e-İrsaliye
              </button>
            )}
            {canSend && (
              <button
                type="button"
                className="btn-top blue"
                style={{ padding: "2px 8px", fontSize: 11 }}
                disabled={busyId === r.id}
                onClick={() => handleSend(r.id)}
              >
                GİB
              </button>
            )}
            {isEirs && (
              <button
                type="button"
                className="btn-top"
                style={{ padding: "2px 8px", fontSize: 11 }}
                disabled={busyId === r.id}
                onClick={() => handleQueryStatus(r.id)}
              >
                Durum
              </button>
            )}
            {onConvert && !r.invoice_id && (
              <button type="button" className="btn-top" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => onConvert(r.id)}>
                → Fatura
              </button>
            )}
            {r.status === "DRAFT" && (
              <button
                type="button"
                className="btn-top"
                style={{ padding: "2px 8px", fontSize: 11, background: "#fee2e2", color: "#b91c1c" }}
                onClick={() => onDelete(r.id)}
              >
                Sil
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className={`card${compact ? " doc-hub-list-card" : ""}`} style={compact ? undefined : { marginTop: 24 }}>
        <div className="card-header">
          <h3>{title}</h3>
        </div>
        <ResizableDataTable
          tableKey={`irsaliye-list-${side ?? "all"}`}
          columns={columns}
          data={items}
          rowKey={(r) => r.id}
          tableClassName="resizable-data-table fatura-table"
          loading={loading}
          emptyMessage="Henüz irsaliye kaydı yok."
        />
      </div>

      <DocumentPreviewModal invoiceId={previewInvoiceId} onClose={() => setPreviewInvoiceId(null)} />
    </>
  );
}
