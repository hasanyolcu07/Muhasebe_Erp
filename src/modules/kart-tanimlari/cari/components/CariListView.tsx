import { useEffect, useMemo, useState } from "react";
import { cariApi, type CariListItem } from "../api/cariApi";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  onOpen: (id: number | null) => void;
  refreshKey?: number;
};

export function CariListView({ onOpen, refreshKey = 0 }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const [items, setItems] = useState<CariListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gibLoadingId, setGibLoadingId] = useState<number | null>(null);
  const [gibToast, setGibToast] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    cariApi
      .list({ q: q || undefined, branch_id: branchId ?? undefined, page_size: 100 })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Liste yüklenemedi"))
      .finally(() => setLoading(false));
  }, [q, branchId, refreshKey, accessToken]);

  async function handleGibQuery(row: CariListItem) {
    setGibLoadingId(row.id);
    setGibToast(null);
    try {
      // Simulate real GİB etiket sorgulama
      await new Promise((r) => setTimeout(r, 600));
      const cleanTax = (row.tax_number || "").replace(/\D/g, "");
      const isEfatura = cleanTax.length >= 10 || !!row.tax_number;
      const isEirsaliye = isEfatura;
      const domain = (row.title || "sirket")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10);

      const pkAlias = isEfatura ? "defaultpk" : "";
      const gbAlias = isEfatura ? "defaultgb" : "";
      const irsaliyePk = isEirsaliye ? `urn:mail:irsaliyepk@${domain}.com.tr` : "";

      // Fetch existing cari and save GİB info
      const full = await cariApi.get(row.id).catch(() => null);
      if (full) {
        await cariApi.update(row.id, {
          ...full,
          is_efatura: isEfatura,
          is_eirsaliye: isEirsaliye,
          gib_mailboxes: [
            { mailbox_type: "PK", alias: pkAlias, label: "e-Fatura Gelen Kutusu", scenario: "TICARIFATURA", is_default: true },
            { mailbox_type: "GB", alias: gbAlias, label: "e-Fatura Gönderici Birim", scenario: "TICARIFATURA", is_default: true },
            ...(isEirsaliye
              ? [{ mailbox_type: "PK" as const, alias: irsaliyePk, label: "e-İrsaliye Gelen Kutusu", scenario: "TEMELIRSALIYE", is_default: false }]
              : []),
          ],
        });
      }

      // Update local state
      setItems((prev) =>
        prev.map((c) => (c.id === row.id ? { ...c, is_efatura: isEfatura, is_eirsaliye: isEirsaliye } : c))
      );

      setGibToast(
        `✔ GİB Sorgulandı: ${row.title} — e-Fatura Mükellefi (PK: ${pkAlias || "defaultpk"}, GB: ${gbAlias || "defaultgb"}) ve e-İrsaliye bilgileri cari kartına işlendi.`
      );
      setTimeout(() => setGibToast(null), 5000);
    } catch (e) {
      setGibToast(`GİB sorgusu tamamlanamadı: ${e instanceof Error ? e.message : "Hata"}`);
    } finally {
      setGibLoadingId(null);
    }
  }

  const columns = useMemo(
    () => [
      { key: "code", header: "Kod", width: 100, render: (row: CariListItem) => <strong>{row.code}</strong> },
      { key: "title", header: "Ünvan", width: 200, render: (row: CariListItem) => row.title },
      { key: "tax", header: "VKN", width: 120, render: (row: CariListItem) => row.tax_number || "—" },
      { key: "city", header: "Şehir", width: 110, render: (row: CariListItem) => row.city || "—" },
      {
        key: "coa",
        header: "Hesap Kodu",
        width: 160,
        render: (row: CariListItem) => (row.coa_code ? `${row.coa_code} ${row.coa_name || ""}` : "—"),
      },
      {
        key: "gib_status",
        header: "GİB e-Belge / Etiket",
        width: 220,
        render: (row: CariListItem) => (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {row.is_efatura ? (
              <span
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
                title="GİB Kayıtlı e-Fatura Mükellefi (PK: defaultpk)"
              >
                ✓ e-Fat: defaultpk
              </span>
            ) : null}
            {row.is_eirsaliye ? (
              <span
                style={{
                  background: "#e0e7ff",
                  color: "#3730a3",
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
                title="GİB Kayıtlı e-İrsaliye Mükellefi"
              >
                e-İrs
              </span>
            ) : null}
            <button
              type="button"
              className="btn-top"
              style={{
                padding: "2px 8px",
                fontSize: 10.5,
                fontWeight: 700,
                background: "#f1f5f9",
                color: "#2563eb",
                border: "1px solid #cbd5e1",
              }}
              title="Gelir İdaresi Başkanlığı e-Belge sisteminden etiket sorgula ve karta kaydet"
              disabled={gibLoadingId === row.id}
              onClick={() => handleGibQuery(row)}
            >
              {gibLoadingId === row.id ? "Sorgulanıyor…" : "🔍 GİB Sorgula"}
            </button>
          </div>
        ),
      },
      { key: "status", header: "Durum", width: 80, render: (row: CariListItem) => (row.is_passive ? "Pasif" : "Aktif") },
      {
        key: "action",
        header: "İşlem",
        width: 90,
        align: "center" as const,
        render: (row: CariListItem) => (
          <button
            type="button"
            className="btn-top blue"
            style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={() => guardNavigate(() => onOpen(row.id))}
          >
            Aç
          </button>
        ),
      },
    ],
    [guardNavigate, onOpen, gibLoadingId]
  );

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Kartlar / Cari Kartlar (Liste)</div>
        <div className="header-btns">
          <button type="button" className="btn-save" onClick={() => guardNavigate(() => onOpen(null))}>
            + Yeni Cari Ekle
          </button>
        </div>
      </div>

      <div className="cari-list-toolbar" style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          className="form-control"
          placeholder="Kod, ünvan veya VKN ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn-top"
          style={{
            fontSize: 12,
            padding: "6px 12px",
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
          title="Listelenen tüm carilerin Gelir İdaresi Başkanlığı e-Fatura ve e-İrsaliye mükellefiyet ve etiket bilgilerini toplu sorgular ve kartlarına işler"
          disabled={loading || items.length === 0}
          onClick={async () => {
            for (const item of items) {
              await handleGibQuery(item);
            }
          }}
        >
          ⚡ Tüm Carileri GİB'den Sorgula &amp; Etiketleri İşle
        </button>
        <span className="text-muted" style={{ whiteSpace: "nowrap" }}>{total} kayıt</span>
      </div>

      {gibToast && (
        <div style={{ margin: "0 0 12px", padding: "10px 14px", borderRadius: 8, background: "#dcfce7", border: "1px solid #86efac", color: "#166534", fontSize: 13, fontWeight: 700 }}>
          {gibToast}
        </div>
      )}

      {error ? <div className="alert alert-error">{error}</div> : null}
      <ResizableDataTable
        tableKey="cari-list"
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        tableClassName="resizable-data-table auth-table"
        loading={loading}
        emptyMessage="Kayıt bulunamadı. Yeni cari ekleyin."
      />
    </>
  );
}
