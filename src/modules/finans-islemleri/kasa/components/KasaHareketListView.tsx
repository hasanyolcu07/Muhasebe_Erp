import { useEffect, useMemo, useState } from "react";
import {
  kasaIslemleriApi,
  type CashTransactionListItem,
  type CashTransactionSummary,
  type KasaLookup,
} from "../api/kasaIslemleriApi";
import { formatMoney } from "../schemas/kasaIslemleriSchema";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  refreshKey: number;
  filterCashAccountId: number | null;
  dateFrom: string;
  dateTo: string;
  onDelete: (id: number) => void;
};

function txnBadgeClass(txnType: string): string {
  if (txnType === "TAHSILAT") return "badge badge-green";
  if (txnType === "ODEME") return "badge badge-red";
  return "badge badge-blue";
}

export function KasaHareketListView({
  refreshKey,
  filterCashAccountId,
  dateFrom,
  dateTo,
  onDelete,
}: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [items, setItems] = useState<CashTransactionListItem[]>([]);
  const [summary, setSummary] = useState<CashTransactionSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kasaBalances, setKasaBalances] = useState<KasaLookup[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    kasaIslemleriApi
      .list({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
        cash_account_id: filterCashAccountId ?? undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page_size: 100,
      })
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
        setSummary(res.summary);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Liste yüklenemedi"))
      .finally(() => setLoading(false));
  }, [branchId, recordTypeId, filterCashAccountId, dateFrom, dateTo, refreshKey, accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    kasaIslemleriApi
      .lookupKasa({ branch_id: branchId ?? undefined })
      .then((res) => setKasaBalances(res.items ?? []))
      .catch(() => undefined);
  }, [branchId, refreshKey, accessToken]);

  const selectedKasaBalance = filterCashAccountId
    ? kasaBalances.find((k) => k.id === filterCashAccountId)?.balance
    : null;

  const columns = useMemo(
    () => [
      { key: "txn_no", header: "Har. No", width: 90, render: (row: CashTransactionListItem) => <strong>{row.txn_no}</strong> },
      { key: "date", header: "Tarih", width: 110, render: (row: CashTransactionListItem) => row.txn_date },
      {
        key: "kasa",
        header: "Kasa Kodu / Adı",
        width: 170,
        render: (row: CashTransactionListItem) => `${row.cash_account_code} | ${row.cash_account_name}`,
      },
      {
        key: "type",
        header: "İşlem Türü",
        width: 130,
        render: (row: CashTransactionListItem) => (
          <span className={txnBadgeClass(row.txn_type)}>{row.txn_type_label}</span>
        ),
      },
      {
        key: "detail",
        header: "Karşı Hesap / Cari Detay",
        width: 220,
        render: (row: CashTransactionListItem) => (
          <span style={{ fontWeight: 700 }}>
            {row.account_label || row.target_cash_account_label || row.invoice_no || row.description || "—"}
          </span>
        ),
      },
      {
        key: "debit",
        header: "Giriş (Borç ₺)",
        width: 120,
        align: "right" as const,
        render: (row: CashTransactionListItem) => (
          <span style={{ fontWeight: 700, color: "#10b981" }}>
            {Number(row.debit_amount) > 0 ? formatMoney(Number(row.debit_amount)) : "0,00"}
          </span>
        ),
      },
      {
        key: "credit",
        header: "Çıkış (Alacak ₺)",
        width: 120,
        align: "right" as const,
        render: (row: CashTransactionListItem) => (
          <span style={{ fontWeight: 700, color: "#ef4444" }}>
            {Number(row.credit_amount) > 0 ? formatMoney(Number(row.credit_amount)) : "0,00"}
          </span>
        ),
      },
      {
        key: "posted",
        header: "Muhasebeleşti",
        width: 130,
        align: "center" as const,
        render: (row: CashTransactionListItem) =>
          row.is_posted ? (
            <span className="badge badge-green" style={{ fontSize: 11 }}>
              🟢 Evet
            </span>
          ) : (
            <span className="badge badge-red" style={{ fontSize: 11 }}>
              🔴 Hayır ({row.record_type_code || "GR"})
            </span>
          ),
      },
      {
        key: "action",
        header: "İşlemler",
        width: 100,
        align: "center" as const,
        render: (row: CashTransactionListItem) =>
          !row.is_posted ? (
            <button
              type="button"
              className="hover-btn"
              style={{ color: "#b91c1c" }}
              onClick={() =>
                guardNavigate(() => {
                  if (window.confirm("Kasa hareketi silinsin mi?")) onDelete(row.id);
                })
              }
            >
              🗑️ Sil
            </button>
          ) : (
            <span className="text-muted" style={{ fontSize: 11 }}>
              {row.yevmiye_fis_no || "—"}
            </span>
          ),
      },
    ],
    [guardNavigate, onDelete]
  );

  return (
    <>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <ResizableDataTable
        tableKey="kasa-hareket-list"
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        tableClassName="resizable-data-table fatura-table"
        loading={loading}
        emptyMessage="Kayıt bulunamadı. Yeni kasa hareketi ekleyin."
        wrapperClassName="card"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ borderLeft: "4px solid #10b981" }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>TOPLAM NAKİT GİRİŞİ (TAHSİLAT)</span>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
            {formatMoney(Number(summary?.total_tahsilat ?? 0))} ₺
          </div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #ef4444" }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>TOPLAM NAKİT ÇIKIŞI (ÖDEME)</span>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444", marginTop: 4 }}>
            {formatMoney(Number(summary?.total_odeme ?? 0))} ₺
          </div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #3b82f6", background: "#eff6ff" }}>
          <span style={{ fontSize: 12, color: "#1e40af", fontWeight: 700 }}>NET KASA HAREKET FARKI</span>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a", marginTop: 4 }}>
            {formatMoney(Number(summary?.net_balance ?? 0))} ₺
            {selectedKasaBalance != null ? (
              <span style={{ display: "block", fontSize: 13, marginTop: 4 }}>
                Seçili kasa bakiyesi: {formatMoney(Number(selectedKasaBalance))} ₺
              </span>
            ) : null}
          </div>
          <span className="text-muted" style={{ fontSize: 11 }}>
            {total} hareket listelendi
          </span>
        </div>
      </div>
    </>
  );
}
