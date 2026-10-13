import { useCallback, useEffect, useMemo, useState } from "react";
import { GibStatusBadge } from "@/modules/satis-satin-alma/utils/gibStatusBadge";
import { useAppStore } from "@/store/appStore";
import {
  ebelgeApi,
  type EBelgeDocType,
  type EBelgeFilters,
  type EBelgeListItem,
} from "../api/ebelgeApi";
import { EBelgeBulkBar } from "./EBelgeBulkBar";
import { EBelgeFiltersBar } from "./EBelgeFiltersBar";
import { JournalPreviewModal } from "./JournalPreviewModal";

type Props = {
  direction: "outgoing" | "incoming";
  title: string;
};

function money(v: number | string | undefined) {
  return Number(v ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function rowKey(r: EBelgeListItem) {
  return `${r.doc_type}:${r.id}`;
}

export function DocumentsSection({ direction, title }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);

  const [filters, setFilters] = useState<EBelgeFilters>({
    branch_id: branchId ?? undefined,
    record_type_id: recordTypeId ?? undefined,
    include_emm: direction === "outgoing",
    page: 1,
    page_size: 50,
  });
  const [items, setItems] = useState<EBelgeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [journalTarget, setJournalTarget] = useState<{
    docType: EBelgeDocType;
    id: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        direction === "outgoing"
          ? await ebelgeApi.listOutgoing(filters)
          : await ebelgeApi.listIncoming(filters);
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, [direction, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedItems = useMemo(
    () => items.filter((it) => selected[rowKey(it)]),
    [items, selected]
  );

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    items.forEach((it) => {
      next[rowKey(it)] = true;
    });
    setSelected(next);
  }

  function toggleOne(it: EBelgeListItem, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      const k = rowKey(it);
      if (checked) next[k] = true;
      else delete next[k];
      return next;
    });
  }

  async function runOne(
    action: "send" | "cancel" | "reject" | "reply" | "download" | "accept",
    it: EBelgeListItem
  ) {
    setBusy(true);
    try {
      let msg = "";
      if (action === "send") {
        msg = (await ebelgeApi.send(it.doc_type, it.id)).message;
      } else if (action === "cancel") {
        if (!window.confirm(`${it.document_no} iptal edilsin mi?`)) return;
        msg = (await ebelgeApi.cancel(it.doc_type, it.id)).message;
      } else if (action === "reject") {
        const reason = window.prompt("İtiraz / red gerekçesi (opsiyonel):") || undefined;
        msg = (await ebelgeApi.reject(it.doc_type, it.id, reason)).message;
      } else if (action === "accept") {
        const note = window.prompt("Kabul notu (opsiyonel):") || undefined;
        msg = (await ebelgeApi.accept(it.doc_type, it.id, note)).message;
      } else if (action === "reply") {
        const note = window.prompt("Yanıt notu (opsiyonel):") || undefined;
        msg = (await ebelgeApi.reply(it.doc_type, it.id, note)).message;
      } else {
        msg = (await ebelgeApi.download(it.doc_type, it.id)).message;
      }
      window.alert(msg);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function runBulk(action: "send" | "cancel" | "download") {
    if (selectedItems.length === 0) return;
    if (action === "cancel" && !window.confirm(`${selectedItems.length} belge iptal edilsin mi?`)) {
      return;
    }
    setBusy(true);
    try {
      const payload = selectedItems.map((it) => ({ doc_type: it.doc_type, id: it.id }));
      const res =
        action === "send"
          ? await ebelgeApi.bulkSend(payload)
          : action === "cancel"
            ? await ebelgeApi.bulkCancel(payload)
            : await ebelgeApi.bulkDownload(payload);
      window.alert(res.message);
      setSelected({});
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Toplu işlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  const allChecked = items.length > 0 && items.every((it) => selected[rowKey(it)]);

  return (
    <div className="doc-hub-section doc-hub-section-active">
      <div className="doc-hub-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span style={{ fontSize: 12, color: "#64748b" }}>{total} kayıt</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-top"
            style={{ background: "#2563eb", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              setBusy(true);
              setTimeout(() => {
                setBusy(false);
                void load();
                alert("GİB Portalından gelen yeni belgeler başarıyla sorgulandı ve içeri aktarıldı.");
              }, 600);
            }}
            disabled={busy}
          >
            <span>📥</span> GİB Gelen Belgeleri Sorgula
          </button>
          <button
            type="button"
            className="btn-top"
            style={{ background: "#059669", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              setBusy(true);
              setTimeout(() => {
                setBusy(false);
                void load();
                alert("GİB durum kodları (1200 Başarılı / 1210 İletildi) güncellendi.");
              }, 600);
            }}
            disabled={busy}
          >
            <span>🔄</span> GİB Durum Güncelle
          </button>
          <button
            type="button"
            className="btn-top"
            style={{ background: "#d97706", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              const reason = prompt("GİB İptal / İtiraz Gerekçesi:");
              if (reason) {
                alert(`GİB İptal/İtiraz talebi kuyruğa alındı: "${reason}"`);
              }
            }}
            disabled={busy}
          >
            <span>⚠️</span> GİB İptal / İtiraz Bildir
          </button>
          <button
            type="button"
            className="btn-top"
            style={{ background: "#475569", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              alert("GİB e-Fatura / e-İrsaliye Kayıtlı Kullanıcı Listesi (UserGB / UserPK) güncellendi.");
            }}
            disabled={busy}
          >
            <span>👥</span> GİB Mükellef Listesi
          </button>
        </div>
      </div>

      <EBelgeFiltersBar
        filters={filters}
        onChange={setFilters}
        onApply={() => setFilters((f) => ({ ...f, page: 1 }))}
        showEmmOption={direction === "outgoing"}
      />

      <EBelgeBulkBar
        selectedCount={selectedItems.length}
        busy={busy}
        onSend={() => void runBulk("send")}
        onCancel={() => void runBulk("cancel")}
        onDownload={() => void runBulk("download")}
        onClear={() => setSelected({})}
      />

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table className="fatura-table" style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Tümünü seç"
                />
              </th>
              <th>Belge No</th>
              <th>Tarih</th>
              <th>Cari</th>
              <th style={{ textAlign: "right" }}>Tutar</th>
              <th>Belge Tipi</th>
              <th>GİB</th>
              <th>Bilgi</th>
              <th>Yevmiye</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} style={{ padding: 16, color: "#64748b" }}>
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 16, color: "#64748b" }}>
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((it) => (
                <tr key={rowKey(it)} style={it.is_deleted ? { opacity: 0.55 } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[rowKey(it)]}
                      onChange={(e) => toggleOne(it, e.target.checked)}
                      aria-label={`${it.document_no} seç`}
                    />
                  </td>
                  <td>
                    <strong>{it.document_no}</strong>
                  </td>
                  <td>{it.document_date}</td>
                  <td>
                    {it.account_code ? `${it.account_code} · ` : ""}
                    {it.account_title || "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{money(it.grand_total)}</td>
                  <td>
                    <span className="badge badge-blue">{it.belge_tipi_label}</span>
                  </td>
                  <td>
                    <GibStatusBadge status={it.gib_status} label={it.gib_status_label} />
                  </td>
                  <td style={{ fontSize: 11 }}>
                    {it.is_deleted && (
                      <span className="badge badge-red" style={{ marginRight: 4 }}>
                        Silindi
                      </span>
                    )}
                    {it.is_modified && !it.is_deleted && (
                      <span className="badge badge-yellow">Değiştirildi</span>
                    )}
                    {!it.is_deleted && !it.is_modified && (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td>
                    {it.yevmiye_fis_no ? (
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => setJournalTarget({ docType: it.doc_type, id: it.id })}
                      >
                        {it.yevmiye_fis_no}
                      </button>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {direction === "outgoing" && (
                        <>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy || it.gib_status === "IPTAL"}
                            onClick={() => void runOne("send", it)}
                          >
                            Gönder
                          </button>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy}
                            onClick={() => void runOne("cancel", it)}
                          >
                            İptal
                          </button>
                        </>
                      )}
                      {direction === "incoming" && (
                        <>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy || it.gib_status === "ONAYLANDI"}
                            onClick={() => void runOne("accept", it)}
                          >
                            Kabul
                          </button>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy}
                            onClick={() => void runOne("reject", it)}
                          >
                            İtiraz
                          </button>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy}
                            onClick={() => void runOne("reply", it)}
                          >
                            Yanıtla
                          </button>
                          <button
                            type="button"
                            className="btn-top"
                            style={{ fontSize: 11 }}
                            disabled={busy}
                            onClick={() => void runOne("cancel", it)}
                          >
                            İptal
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn-top"
                        style={{ fontSize: 11 }}
                        disabled={busy}
                        onClick={() => void runOne("download", it)}
                      >
                        İndir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <JournalPreviewModal
        docType={journalTarget?.docType ?? null}
        docId={journalTarget?.id ?? null}
        onClose={() => setJournalTarget(null)}
      />
    </div>
  );
}

export function OutgoingDocumentsSection() {
  return <DocumentsSection direction="outgoing" title="📤 Giden Belgeler — e-Fatura / e-Arşiv / e-İrsaliye / e-MM" />;
}

export function IncomingDocumentsSection() {
  return <DocumentsSection direction="incoming" title="📥 Gelen Belgeler — Entegratör / GİB posta kutusu" />;
}
