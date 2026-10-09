import { useEffect, useMemo, useState } from "react";
import {
  bankaIslemleriApi,
  type BankTransactionListItem,
  type BankTransactionSummary,
  type BankaLookup,
} from "../api/bankaIslemleriApi";
import { formatMoney } from "../schemas/bankaIslemleriSchema";
import { ResizableDataTable } from "@/components/ResizableDataTable";
import { useAppStore, useAuthStore } from "@/store/appStore";

type Props = {
  refreshKey: number;
  filterBankAccountId: number | null;
  dateFrom: string;
  dateTo: string;
  onDelete: (id: number) => void;
};

function txnBadgeClass(txnType: string): string {
  if (txnType.includes("POS") || txnType === "HAVALE_EFT") return "badge badge-green";
  if (txnType === "BANKA_MASRAFI") return "badge badge-red";
  if (txnType === "VIRMAN") return "badge badge-blue";
  return "badge badge-blue";
}

export function BankaHareketListView({
  refreshKey,
  filterBankAccountId,
  dateFrom,
  dateTo,
  onDelete,
}: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [items, setItems] = useState<BankTransactionListItem[]>([]);
  const [summary, setSummary] = useState<BankTransactionSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankBalances, setBankBalances] = useState<BankaLookup[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    bankaIslemleriApi
      .list({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
        bank_account_id: filterBankAccountId ?? undefined,
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
  }, [branchId, recordTypeId, filterBankAccountId, dateFrom, dateTo, refreshKey, accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    bankaIslemleriApi
      .lookupBanka({ branch_id: branchId ?? undefined })
      .then((res) => setBankBalances(res.items ?? []))
      .catch(() => undefined);
  }, [branchId, refreshKey, accessToken]);

  const selectedBankBalance = filterBankAccountId
    ? bankBalances.find((b) => b.id === filterBankAccountId)?.balance
    : null;

  const columns = useMemo(
    () => [
      { key: "txn_no", header: "Fiş No", width: 90, render: (row: BankTransactionListItem) => <strong>{row.txn_no}</strong> },
      { key: "date", header: "Tarih", width: 110, render: (row: BankTransactionListItem) => row.txn_date },
      {
        key: "bank",
        header: "Banka Hesap Kodu / Adı",
        width: 180,
        render: (row: BankTransactionListItem) => `${row.bank_account_code} | ${row.bank_account_name}`,
      },
      {
        key: "type",
        header: "İşlem Türü",
        width: 150,
        render: (row: BankTransactionListItem) => (
          <span className={txnBadgeClass(row.txn_type)}>{row.txn_type_label}</span>
        ),
      },
      {
        key: "detail",
        header: "Karşı Hesap / Cari Detay",
        width: 220,
        render: (row: BankTransactionListItem) => (
          <span style={{ fontWeight: 700 }}>
            {row.account_label ||
              row.target_bank_account_label ||
              row.check_ref ||
              row.document_no ||
              row.description ||
              "—"}
          </span>
        ),
      },
      {
        key: "debit",
        header: "Giriş (Borç ₺)",
        width: 120,
        align: "right" as const,
        render: (row: BankTransactionListItem) => (
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
        render: (row: BankTransactionListItem) => (
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
        render: (row: BankTransactionListItem) =>
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
        render: (row: BankTransactionListItem) =>
          !row.is_posted ? (
            <button
              type="button"
              className="hover-btn"
              style={{ color: "#b91c1c" }}
              onClick={() =>
                guardNavigate(() => {
                  if (window.confirm("Banka fişi silinsin mi?")) onDelete(row.id);
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
        tableKey="banka-hareket-list"
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        tableClassName="resizable-data-table fatura-table"
        loading={loading}
        emptyMessage="Kayıt bulunamadı. Yeni banka hareketi ekleyin."
        wrapperClassName="card"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ borderLeft: "4px solid #10b981" }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            BANKALAR BORÇ TOPLAMI (GİRİŞLER)
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
            {formatMoney(Number(summary?.total_giris ?? 0))} ₺
          </div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #ef4444" }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            BANKALAR ALACAK TOPLAMI (ÇIKIŞLAR)
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444", marginTop: 4 }}>
            {formatMoney(Number(summary?.total_cikis ?? 0))} ₺
          </div>
        </div>
        <div className="card" style={{ borderLeft: "4px solid #3b82f6", background: "#eff6ff" }}>
          <span style={{ fontSize: 12, color: "#1e40af", fontWeight: 700 }}>NET BANKA MEVDUAT TOPLAMI</span>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a", marginTop: 4 }}>
            {formatMoney(Number(summary?.net_balance ?? 0))} ₺
            {selectedBankBalance != null ? (
              <span style={{ display: "block", fontSize: 13, marginTop: 4 }}>
                Seçili hesap bakiyesi: {formatMoney(Number(selectedBankBalance))} ₺
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
