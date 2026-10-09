import { useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stokApi } from "../api/stokApi";
import { STOK_TABS, type StokTabId } from "../constants";
import {
  detailToStokForm,
  emptyStokForm,
  stokFormSchema,
  type StokFormValues,
} from "../schemas/stokSchema";
import { StokTabPanels } from "./StokTabPanels";
import { useAppStore } from "@/store/appStore";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";

type Props = {
  stockId: number | null;
  onCancel: () => void;
  onSaved: (id: number) => void;
};

export function StokFormView({ stockId, onCancel, onSaved }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [activeTab, setActiveTab] = useState<StokTabId>("stok-temel");
  const [loading, setLoading] = useState(!!stockId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methods = useForm<StokFormValues>({
    resolver: zodResolver(stokFormSchema) as Resolver<StokFormValues>,
    defaultValues: emptyStokForm(defaultBranch, defaultRt),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState } = methods;

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  useEffect(() => () => setDirty(false), [setDirty]);

  useEffect(() => {
    if (!stockId) {
      reset(emptyStokForm(defaultBranch, defaultRt));
      setLoading(false);
      return;
    }
    setLoading(true);
    stokApi
      .get(stockId)
      .then((detail) => reset(detailToStokForm(detail as Record<string, unknown>)))
      .catch((e) => setError(e instanceof Error ? e.message : "Yükleme hatası"))
      .finally(() => setLoading(false));
  }, [stockId, defaultBranch, defaultRt, reset]);

  async function onSubmit(values: StokFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        unit_id: values.unit_id || null,
        tax_rate_id: values.tax_rate_id || null,
        category_id: values.category_id || null,
        currency_id: values.currency_id || null,
        coa_id: values.coa_id || null,
        barcode: values.barcode || null,
      };
      if (stockId) {
        const saved = await stokApi.update(stockId, payload);
        reset(detailToStokForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      } else {
        const saved = await stokApi.create(payload);
        reset(detailToStokForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      }
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    guardNavigate(onCancel);
  }

  if (loading) return <div className="card">Yükleniyor…</div>;

  return (
    <FormProvider {...methods}>
      <FinancialFormSync isEdit={!!stockId}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="header-bar">
          <div className="header-breadcrumb">Kartlar / Stoklar & Fiyat Listeleri / Stok Kartı</div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="stok-tabs-bar">
          {STOK_TABS.map((tab) => (
            <div
              key={tab.id}
              className={`stok-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setActiveTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="stok-form-card">
          <StokTabPanels activeTab={activeTab} branchId={defaultBranch} stockId={stockId} />
        </div>

        <FormActionFooter>
          <button type="button" className="btn-cancel" onClick={handleCancel}>
            ✖ VAZGEÇ
          </button>
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? "Kaydediliyor…" : "STOK KARTINI KAYDET"}
          </button>
        </FormActionFooter>
      </form>
      </FinancialFormSync>
    </FormProvider>
  );
}
