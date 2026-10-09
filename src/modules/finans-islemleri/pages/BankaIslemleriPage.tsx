import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FormProvider, useForm } from "react-hook-form";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { useAppStore } from "@/store/appStore";
import { bankaIslemleriApi, type BankaLookup } from "../banka/api/bankaIslemleriApi";
import { ActionPillBar } from "@/components/ActionPillBar";
import { BankaHareketFormPanel } from "../banka/components/BankaHareketFormPanel";
import { BankaHareketListView } from "../banka/components/BankaHareketListView";
import { TXN_TYPE_OPTIONS, type BankTxnType } from "../banka/schemas/bankaIslemleriSchema";

const PRIMARY_TYPES = new Set<BankTxnType>(["HAVALE_EFT", "POS_BLOKE_COZUMU", "VIRMAN"]);

const VARIANT_MAP: Record<string, "blue" | "green" | "amber" | "orange" | "red" | "default"> = {
  HAVALE_EFT: "blue",
  POS_TAHSILAT: "green",
  POS_BLOKE_COZUMU: "green",
  VIRMAN: "amber",
  KUR_FARKI: "orange",
  BANKA_MASRAFI: "red",
  CEK_TAHSIL_TEDIYE: "default",
};

export function BankaIslemleriPage() {
  const navigate = useNavigate();
  const branchId = useAppStore((s) => s.branchId);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTxnType, setPanelTxnType] = useState<BankTxnType>("HAVALE_EFT");
  const [refreshKey, setRefreshKey] = useState(0);
  const [bankaList, setBankaList] = useState<BankaLookup[]>([]);
  const [filterBankAccountId, setFilterBankAccountId] = useState<number | null>(null);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(todayStr);

  const headerForm = useForm({
    defaultValues: { branch_id: branchId ?? 1, record_type_id: 1 },
  });

  useEffect(() => {
    bankaIslemleriApi
      .lookupBanka({ branch_id: branchId ?? undefined })
      .then((res) => {
        const items = res.items ?? [];
        setBankaList(items);
        if (items.length && filterBankAccountId == null) {
          setFilterBankAccountId(items[0].id);
        }
      })
      .catch(() => undefined);
  }, [branchId, refreshKey]);

  function openPanel(type: BankTxnType) {
    guardNavigate(() => {
      setPanelTxnType(type);
      setPanelOpen(true);
    });
  }

  async function handleDelete(id: number) {
    try {
      await bankaIslemleriApi.remove(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  const primaryPills = TXN_TYPE_OPTIONS.filter((o) => PRIMARY_TYPES.has(o.value)).map((o) => ({
    id: o.value,
    label: o.value === "HAVALE_EFT" ? "Yeni Banka Fişi / Hareketi Ekle" : o.label,
    icon: o.value === "HAVALE_EFT" ? "➕" : o.value === "POS_BLOKE_COZUMU" ? "💳" : "🔄",
    variant: VARIANT_MAP[o.value] ?? "default",
    onClick: () => openPanel(o.value),
  }));

  const secondaryPills = TXN_TYPE_OPTIONS.filter((o) => !PRIMARY_TYPES.has(o.value)).map((o) => ({
    id: o.value,
    label: o.label,
    icon: o.value === "KUR_FARKI" ? "💱" : o.value === "BANKA_MASRAFI" ? "💸" : o.value === "CEK_TAHSIL_TEDIYE" ? "📄" : "💳",
    variant: VARIANT_MAP[o.value] ?? "default",
    onClick: () => openPanel(o.value),
  }));

  const activePillId = panelOpen ? panelTxnType : null;

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">
          Finans / Banka İşlemleri (Havale, EFT, POS Bloke Çözümü &amp; Banka Fişleri)
        </div>
        <div className="header-btns">
          <FormProvider {...headerForm}>
            <FinancialFormSync syncFromTopbar />
            <BranchRecordTypeFields variant="header" disabled={panelOpen} />
          </FormProvider>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => guardNavigate(() => navigate("/app/kart-tanimlari/kasa-banka-kartlari"))}
          >
            🏛️ Banka Kartlarına Git
          </button>
        </div>
      </div>

      <div className="cari-list-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>Seçili Banka Hesabı:</label>
          <select
            className="form-control"
            id="bankaIslemSelector"
            style={{ width: 340, fontWeight: 700, color: "#1e3a8a" }}
            value={filterBankAccountId ?? ""}
            onChange={(e) => setFilterBankAccountId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Tüm bankalar</option>
            {bankaList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} | {b.name} — Bakiye: {Number(b.balance).toLocaleString("tr-TR")}{" "}
                {b.currency_code || "₺"}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="form-control"
            style={{ width: 130 }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span>-</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 130 }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <button
            type="button"
            className="btn-top blue"
            style={{ padding: "7px 14px" }}
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            🔍 FİLTRELE
          </button>
        </div>
        <ActionPillBar pills={primaryPills} activeId={activePillId} />
        <ActionPillBar pills={secondaryPills} activeId={activePillId} className="action-pill-bar-secondary" />
      </div>

      <BankaHareketFormPanel
        open={panelOpen}
        initialTxnType={panelTxnType}
        filterBankAccountId={filterBankAccountId}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <BankaHareketListView
        refreshKey={refreshKey}
        filterBankAccountId={filterBankAccountId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDelete={handleDelete}
      />
    </>
  );
}
