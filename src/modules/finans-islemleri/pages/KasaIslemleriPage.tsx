import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FormProvider, useForm } from "react-hook-form";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { useAppStore } from "@/store/appStore";
import { kasaIslemleriApi, type KasaLookup } from "../kasa/api/kasaIslemleriApi";
import { ActionPillBar } from "@/components/ActionPillBar";
import { KasaHareketFormPanel } from "../kasa/components/KasaHareketFormPanel";
import { KasaHareketListView } from "../kasa/components/KasaHareketListView";
import type { CashTxnType } from "../kasa/schemas/kasaIslemleriSchema";

export function KasaIslemleriPage() {
  const navigate = useNavigate();
  const branchId = useAppStore((s) => s.branchId);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTxnType, setPanelTxnType] = useState<CashTxnType>("TAHSILAT");
  const [refreshKey, setRefreshKey] = useState(0);
  const [kasaList, setKasaList] = useState<KasaLookup[]>([]);
  const [filterCashAccountId, setFilterCashAccountId] = useState<number | null>(null);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(todayStr);

  const headerForm = useForm({
    defaultValues: { branch_id: branchId ?? 1, record_type_id: 1 },
  });

  useEffect(() => {
    kasaIslemleriApi
      .lookupKasa({ branch_id: branchId ?? undefined })
      .then((res) => {
        const items = res.items ?? [];
        setKasaList(items);
        if (items.length && filterCashAccountId == null) {
          setFilterCashAccountId(items[0].id);
        }
      })
      .catch(() => undefined);
  }, [branchId, refreshKey]);

  function openPanel(type: CashTxnType) {
    guardNavigate(() => {
      setPanelTxnType(type);
      setPanelOpen(true);
    });
  }

  async function handleDelete(id: number) {
    try {
      await kasaIslemleriApi.remove(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  const activePillId = panelOpen
    ? panelTxnType === "TAHSILAT"
      ? "tahsilat"
      : panelTxnType === "ODEME"
        ? "odeme"
        : "virman"
    : null;

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">
          Finans / Kasa İşlemleri (Nakit Tahsilat &amp; Ödeme Hareketleri)
        </div>
        <div className="header-btns">
          <FormProvider {...headerForm}>
            <FinancialFormSync syncFromTopbar />
            <BranchRecordTypeFields variant="header" disabled={panelOpen} />
          </FormProvider>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => guardNavigate(() => navigate("/app/kart-tanimlari/kasa-banka"))}
          >
            🏛️ Kasa Kartlarına Git
          </button>
        </div>
      </div>

      <div className="cari-list-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>Seçili Kasa:</label>
          <select
            className="form-control"
            id="kasaIslemSelector"
            style={{ width: 300, fontWeight: 700, color: "#1e3a8a" }}
            value={filterCashAccountId ?? ""}
            onChange={(e) => setFilterCashAccountId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Tüm kasalar</option>
            {kasaList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.code} | {k.name} — Bakiye: {Number(k.balance).toLocaleString("tr-TR")} {k.currency_code || "₺"}
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
          <button type="button" className="btn-top blue" style={{ padding: "7px 14px" }} onClick={() => setRefreshKey((k) => k + 1)}>
            🔍 FİLTRELE
          </button>
        </div>
        <ActionPillBar
          pills={[
            { id: "tahsilat", label: "Kasa Tahsilat Girişi", icon: "➕", variant: "green", onClick: () => openPanel("TAHSILAT") },
            { id: "odeme", label: "Kasa Ödeme Girişi", icon: "➕", variant: "red", onClick: () => openPanel("ODEME") },
            { id: "virman", label: "Kasa Virman", icon: "🔄", variant: "amber", onClick: () => openPanel("VIRMAN") },
          ]}
          activeId={activePillId}
        />
      </div>

      <KasaHareketFormPanel
        open={panelOpen}
        initialTxnType={panelTxnType}
        filterCashAccountId={filterCashAccountId}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <KasaHareketListView
        refreshKey={refreshKey}
        filterCashAccountId={filterCashAccountId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDelete={handleDelete}
      />
    </>
  );
}
