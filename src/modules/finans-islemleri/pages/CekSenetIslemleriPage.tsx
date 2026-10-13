import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { useAppStore } from "@/store/appStore";
import { ActionPillBar } from "@/components/ActionPillBar";
import { CekSenetFormPanel } from "../cek-senet/components/CekSenetFormPanel";
import { CekSenetListView } from "../cek-senet/components/CekSenetListView";
import { cekSenetApi, type CheckBondListItem } from "../cek-senet/api/cekSenetApi";
import {
  ALINAN_TXN_OPTIONS,
  VERILEN_TXN_OPTIONS,
  type AlinanTxnType,
  type CekSenetTxnType,
  type Direction,
  type VerilenTxnType,
} from "../cek-senet/schemas/cekSenetSchema";

type TabId = "liste" | "alinan" | "verilen";

export function CekSenetIslemleriPage() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [activeTab, setActiveTab] = useState<TabId>("liste");
  const [refreshKey, setRefreshKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelDirection, setPanelDirection] = useState<Direction>("ALINAN");
  const [panelTxnType, setPanelTxnType] = useState<CekSenetTxnType>("PORTFOY_GIRIS");

  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterInstrument, setFilterInstrument] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const headerForm = useForm({
    defaultValues: { branch_id: branchId ?? 1, record_type_id: recordTypeId ?? 1 },
  });

  function switchTab(tab: TabId) {
    guardNavigate(() => setActiveTab(tab));
  }

  function openPanel(direction: Direction, txnType: CekSenetTxnType) {
    guardNavigate(() => {
      setPanelDirection(direction);
      setPanelTxnType(txnType);
      setPanelOpen(true);
      setActiveTab(direction === "ALINAN" ? "alinan" : "verilen");
    });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Bu çek/senet kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await cekSenetApi.remove(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  function handleEdit(item: CheckBondListItem) {
    const msg = `Kayıt: ${item.document_no}\nDurum: ${item.status_label}\n\nYalnızca hareket görmeyen portföy/verildi kayıtları düzenlenebilir.`;
    window.alert(msg);
  }

  const activePillId = panelOpen ? panelTxnType : null;

  const tabs: { id: TabId; label: string; short: string }[] = [
    { id: "liste", label: "📋 Liste", short: "Liste" },
    { id: "alinan", label: "🔵 Alınan İşlemler", short: "Alınan Çek/Senetler" },
    { id: "verilen", label: "🟠 Verilen İşlemler", short: "Verilen Çek/Senetler" },
  ];

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Finans / Çek-Senet İşlemleri (Portföy, Ciro, Tahsilat &amp; Ödeme)</div>
        <div className="header-btns">
          <FormProvider {...headerForm}>
            <FinancialFormSync syncFromTopbar />
            <BranchRecordTypeFields variant="header" disabled={panelOpen} />
          </FormProvider>
        </div>
      </div>

      <div className="section-tabs-bar">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`section-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => switchTab(t.id)}
            role="tab"
            tabIndex={0}
            aria-selected={activeTab === t.id}
            onKeyDown={(e) => e.key === "Enter" && switchTab(t.id)}
            title={t.short}
          >
            <strong>{t.label}</strong>
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.9, marginTop: 2 }}>{t.short}</div>
          </div>
        ))}
      </div>

      {(activeTab === "liste" || activeTab === "alinan" || activeTab === "verilen") && (
        <div className="cari-list-toolbar" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Seri/No, cari ara…"
              style={{ width: 200 }}
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
            />
            <select
              className="form-control"
              style={{ width: 140 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tüm durumlar</option>
              <option value="PORTFOY">Portföyde</option>
              <option value="CIRO">Ciro</option>
              <option value="TAHSIL">Tahsil</option>
              <option value="VERILDI">Verildi</option>
              <option value="KARSILIKSIZ">Karşılıksız</option>
              <option value="TEMINATTA">Teminatta</option>
            </select>
            <select
              className="form-control"
              style={{ width: 120 }}
              value={filterInstrument}
              onChange={(e) => setFilterInstrument(e.target.value)}
            >
              <option value="">Tümü</option>
              <option value="CEK">Çek</option>
              <option value="SENET">Senet</option>
            </select>
            <input
              type="date"
              className="form-control"
              style={{ width: 130 }}
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
            />
            <span>-</span>
            <input
              type="date"
              className="form-control"
              style={{ width: 130 }}
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
            />
            <button type="button" className="btn-top blue" style={{ padding: "7px 14px" }} onClick={() => setRefreshKey((k) => k + 1)}>
              🔍 FİLTRELE
            </button>
          </div>
        </div>
      )}

      {activeTab === "alinan" && (
        <ActionPillBar
          pills={ALINAN_TXN_OPTIONS.map((o) => ({
            id: o.value,
            label: o.label,
            icon: "➕",
            variant: "blue" as const,
            onClick: () => openPanel("ALINAN", o.value as AlinanTxnType),
          }))}
          activeId={activePillId}
        />
      )}

      {activeTab === "verilen" && (
        <ActionPillBar
          pills={VERILEN_TXN_OPTIONS.map((o) => ({
            id: o.value,
            label: o.label,
            icon: "➕",
            variant: "orange" as const,
            onClick: () => openPanel("VERILEN", o.value as VerilenTxnType),
          }))}
          activeId={activePillId}
        />
      )}

      <CekSenetFormPanel
        open={panelOpen}
        direction={panelDirection}
        initialTxnType={panelTxnType}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      {(activeTab === "liste" || activeTab === "alinan" || activeTab === "verilen") && (
        <CekSenetListView
          refreshKey={refreshKey}
          branchId={branchId}
          recordTypeId={recordTypeId}
          filterQ={filterQ}
          filterStatus={filterStatus}
          filterInstrument={filterInstrument}
          dueFrom={dueFrom}
          dueTo={dueTo}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
