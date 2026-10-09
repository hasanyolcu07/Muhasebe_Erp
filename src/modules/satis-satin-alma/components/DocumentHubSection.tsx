import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import {
  defaultInvoiceTypeForSide,
  defaultWaybillTypeForSide,
  invoiceTypesForSide,
  waybillTypesForSide,
  type DocumentSide,
} from "../constants/documentContext";
import { faturaApi, type InvoiceListItem } from "../fatura/api/faturaApi";
import { FaturaFormPanel } from "../fatura/components/FaturaFormPanel";
import { FaturaListView } from "../fatura/components/FaturaListView";
import type { InvoiceTypeCode } from "../fatura/constants/invoiceTypes";
import { irsaliyeApi, type WaybillListItem } from "../irsaliye/api/irsaliyeApi";
import { IrsaliyeFormPanel } from "../irsaliye/components/IrsaliyeFormPanel";
import { ListView } from "../irsaliye/components/ListView";
import type { WaybillTypeCode } from "../irsaliye/constants/dispatchTypes";

export type HubModule = "fatura" | "irsaliye";

type Props = {
  title: string;
  side: DocumentSide;
  module: HubModule;
  refreshKey: number;
  onRefresh: () => void;
};

export function DocumentHubSection({ title, side, module, refreshKey, onRefresh }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [activeInvoiceType, setActiveInvoiceType] = useState<InvoiceTypeCode>(defaultInvoiceTypeForSide(side));
  const [activeWaybillType, setActiveWaybillType] = useState<WaybillTypeCode>(defaultWaybillTypeForSide(side));
  const [faturaItems, setFaturaItems] = useState<InvoiceListItem[]>([]);
  const [irsaliyeItems, setIrsaliyeItems] = useState<WaybillListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      if (module === "fatura") {
        const allowedTypes = invoiceTypesForSide(side);
        const res = await faturaApi.list({
          branch_id: branchId ?? undefined,
          record_type_id: recordTypeId ?? undefined,
          page_size: 50,
        });
        const raw = res?.items ?? (Array.isArray(res) ? (res as any) : []);
        setFaturaItems(
          Array.isArray(raw) ? raw.filter((item: any) => allowedTypes.includes(item.invoice_type as InvoiceTypeCode)) : []
        );
      } else {
        const allowedTypes = waybillTypesForSide(side);
        const res = await irsaliyeApi.list({
          branch_id: branchId ?? undefined,
          record_type_id: recordTypeId ?? undefined,
          page_size: 50,
        });
        const raw = res?.items ?? (Array.isArray(res) ? (res as any) : []);
        setIrsaliyeItems(
          Array.isArray(raw) ? raw.filter((item: any) => allowedTypes.includes(item.waybill_type as WaybillTypeCode)) : []
        );
      }
    } catch {
      if (module === "fatura") setFaturaItems([]);
      else setIrsaliyeItems([]);
    } finally {
      setLoading(false);
    }
  }, [module, side, branchId, recordTypeId, refreshKey]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function openNew() {
    guardNavigate(() => {
      setEditId(null);
      setFormOpen(true);
      if (module === "fatura") setActiveInvoiceType(defaultInvoiceTypeForSide(side));
      else setActiveWaybillType(defaultWaybillTypeForSide(side));
    });
  }

  function openEdit(id: number) {
    guardNavigate(() => {
      setEditId(id);
      setFormOpen(true);
    });
  }

  function closeForm() {
    setFormOpen(false);
    setEditId(null);
  }

  function onSaved() {
    onRefresh();
    loadList();
  }

  async function handleReceiveIncoming() {
    setReceiving(true);
    try {
      const res = await irsaliyeApi.eirsaliyeReceiveNew({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
      });
      window.alert(res.message || "Gelen belgeler alındı.");
      onRefresh();
      loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Gelen belge alımı başarısız");
    } finally {
      setReceiving(false);
    }
  }

  async function handleCopy(id: number) {
    try {
      if (module === "fatura") {
        const copied = await faturaApi.copy(id);
        window.alert(`Kopya oluşturuldu: ${copied.invoice_no}`);
      } else {
        const copied = await irsaliyeApi.copy(id);
        window.alert(`Kopya oluşturuldu: ${copied.waybill_no}`);
      }
      onRefresh();
      loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Kopyalama başarısız");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(module === "fatura" ? "Bu faturayı silmek istiyor musunuz?" : "Bu irsaliyeyi silmek istiyor musunuz?"))
      return;
    try {
      if (module === "fatura") await faturaApi.remove(id);
      else await irsaliyeApi.remove(id);
      if (editId === id) closeForm();
      onRefresh();
      loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  async function handleConvert(id: number) {
    try {
      const res = await irsaliyeApi.convertToInvoice(id);
      window.alert(`${res.message}\nFatura No: ${res.invoice_no}`);
      onRefresh();
      loadList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Faturaya dönüşüm başarısız");
    }
  }

  return (
    <div className="doc-hub-section doc-hub-section-active">
      <div className="doc-hub-section-header">
        <h3>{title}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {module === "irsaliye" && side === "purchase" ? (
            <button
              type="button"
              className="btn-top blue"
              style={{ fontSize: 12, padding: "6px 12px" }}
              disabled={receiving}
              onClick={() => void handleReceiveIncoming()}
            >
              Gelen Belge Al
            </button>
          ) : null}
          <button type="button" className="btn-save" style={{ fontSize: 12, padding: "6px 12px" }} onClick={openNew}>
            + Yeni
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="doc-hub-form-panel doc-hub-form-panel-top">
          {module === "fatura" ? (
            <FaturaFormPanel
              side={side}
              editId={editId}
              activeType={activeInvoiceType}
              onTypeChange={setActiveInvoiceType}
              onSaved={onSaved}
              onCancel={closeForm}
              embedded
              showTypeBar
            />
          ) : (
            <IrsaliyeFormPanel
              side={side}
              editId={editId}
              activeType={activeWaybillType}
              onTypeChange={setActiveWaybillType}
              onSaved={onSaved}
              onCancel={closeForm}
              embedded
              showTypeBar
            />
          )}
        </div>
      )}

      {module === "fatura" ? (
        <FaturaListView
          items={faturaItems}
          loading={loading}
          compact
          side={side}
          title="Fatura Listesi"
          onOpen={openEdit}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onRefresh={loadList}
        />
      ) : (
        <ListView
          items={irsaliyeItems}
          loading={loading}
          compact
          side={side}
          title="İrsaliye Listesi"
          onOpen={openEdit}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onConvert={handleConvert}
          onRefresh={loadList}
        />
      )}
    </div>
  );
}
