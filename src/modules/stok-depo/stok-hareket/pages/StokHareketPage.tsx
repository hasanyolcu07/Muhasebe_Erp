import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { ActionPillBar } from "@/components/ActionPillBar";
import { useAppStore } from "@/store/appStore";
import { StokUyariMiniPanel } from "@/modules/stok-uyari/components/StokUyariMiniPanel";
import { MOVEMENT_TYPE_PILLS, type MovementType } from "../constants/movementTypes";
import { stokHareketApi, type WarehouseLookup } from "../api/stokHareketApi";
import { StokHareketFormPanel } from "../components/StokHareketFormPanel";
import { StokHareketListView } from "../components/StokHareketListView";

export function StokHareketPage() {
  const navigate = useNavigate();
  const branchId = useAppStore((s) => s.branchId);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelType, setPanelType] = useState<MovementType>("GIRIS");
  const [refreshKey, setRefreshKey] = useState(0);
  const [warehouses, setWarehouses] = useState<WarehouseLookup[]>([]);
  const [filterWarehouseId, setFilterWarehouseId] = useState<number | null>(null);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(todayStr);

  const headerForm = useForm({
    defaultValues: { branch_id: branchId ?? 1, record_type_id: 1 },
  });

  useEffect(() => {
    stokHareketApi
      .lookupWarehouses({ branch_id: branchId ?? undefined })
      .then((res) => {
        const items = res.items ?? [];
        setWarehouses(items);
        if (items.length && filterWarehouseId == null) {
          setFilterWarehouseId(items[0].id);
        }
      })
      .catch(() => undefined);
  }, [branchId, refreshKey]);

  function openPanel(type: MovementType) {
    guardNavigate(() => {
      setPanelType(type);
      setPanelOpen(true);
    });
  }

  async function handleDelete(id: number) {
    try {
      await stokHareketApi.remove(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  async function handleApprove(id: number) {
    try {
      await stokHareketApi.approve(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Onay başarısız");
    }
  }

  const activePillId = panelOpen
    ? MOVEMENT_TYPE_PILLS.find((p) => p.type === panelType)?.id ?? null
    : null;

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">
          Stok &amp; Depo / Stok İşlemleri (Giriş · Çıkış · Transfer · Sayım · Fire)
        </div>
        <div className="header-btns">
          <FormProvider {...headerForm}>
            <FinancialFormSync syncFromTopbar />
            <BranchRecordTypeFields variant="header" disabled={panelOpen} />
          </FormProvider>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => guardNavigate(() => navigate("/app/kart-tanimlari/stok-fiyat-listeleri"))}
          >
            📦 Stok Kartlarına Git
          </button>
        </div>
      </div>

      <div className="cari-list-toolbar" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>Depo:</label>
          <select
            className="form-control"
            style={{ width: 280, fontWeight: 700, color: "#1e3a8a" }}
            value={filterWarehouseId ?? ""}
            onChange={(e) => setFilterWarehouseId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Tüm depolar</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} | {w.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="form-control"
            style={{ width: 130 }}
            value={dateFrom ?? ""}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span>-</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 130 }}
            value={dateTo ?? ""}
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
        <ActionPillBar
          pills={MOVEMENT_TYPE_PILLS.map((p) => ({
            id: p.id,
            label: p.label,
            icon: p.icon,
            variant: p.variant,
            onClick: () => openPanel(p.type),
          }))}
          activeId={activePillId}
        />
      </div>

      <StokUyariMiniPanel branchId={branchId} compact />

      <StokHareketFormPanel
        open={panelOpen}
        initialType={panelType}
        filterWarehouseId={filterWarehouseId}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <StokHareketListView
        refreshKey={refreshKey}
        filterWarehouseId={filterWarehouseId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDelete={handleDelete}
        onApprove={handleApprove}
      />
    </>
  );
}
