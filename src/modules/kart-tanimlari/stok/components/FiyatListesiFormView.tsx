import { useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stokApi } from "../api/stokApi";
import { FIYAT_TABS, type FiyatTabId } from "../constants";
import {
  detailToPriceListForm,
  emptyPriceListForm,
  priceListFormSchema,
  type PriceListFormValues,
} from "../schemas/stokSchema";
import { FiyatTabPanels } from "./FiyatTabPanels";
import { useAppStore } from "@/store/appStore";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";

type Props = {
  priceListId: number | null;
  onCancel: () => void;
  onSaved: (id: number) => void;
};

export function FiyatListesiFormView({ priceListId, onCancel, onSaved }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? null;

  const [activeTab, setActiveTab] = useState<FiyatTabId>("fl-bilgiler");
  const [loading, setLoading] = useState(!!priceListId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methods = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListFormSchema) as Resolver<PriceListFormValues>,
    defaultValues: emptyPriceListForm(defaultBranch, defaultRt),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState } = methods;

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  useEffect(() => () => setDirty(false), [setDirty]);

  useEffect(() => {
    if (!priceListId) {
      reset(emptyPriceListForm(defaultBranch, defaultRt));
      setLoading(false);
      return;
    }
    setLoading(true);
    stokApi
      .getPriceList(priceListId)
      .then((detail) => reset(detailToPriceListForm(detail as Record<string, unknown>)))
      .catch((e) => setError(e instanceof Error ? e.message : "Yükleme hatası"))
      .finally(() => setLoading(false));
  }, [priceListId, defaultBranch, defaultRt, reset]);

  async function onSubmit(values: PriceListFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        record_type_id: values.record_type_id,
        currency_id: values.currency_id || null,
        valid_from: values.valid_from || null,
        valid_to: values.valid_to || null,
      };
      if (priceListId) {
        const saved = await stokApi.updatePriceList(priceListId, payload);
        reset(detailToPriceListForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      } else {
        const saved = await stokApi.createPriceList(payload);
        reset(detailToPriceListForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      }
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Yükleniyor…</div>;

  return (
    <FormProvider {...methods}>
      <FinancialFormSync isEdit={!!priceListId}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="header-bar">
          <div className="header-breadcrumb">Kartlar / Stoklar & Fiyat Listeleri / Fiyat Listesi</div>
          <div className="header-btns">
            <BranchRecordTypeFields variant="header" />
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="stok-tabs-bar">
          {FIYAT_TABS.map((tab) => (
            <div
              key={tab.id}
              className={`stok-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              role="button"
              tabIndex={0}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="stok-form-card">
          <FiyatTabPanels activeTab={activeTab} branchId={defaultBranch} />
        </div>

        <FormActionFooter>
          <button type="button" className="btn-cancel" onClick={() => guardNavigate(onCancel)}>
            ✖ VAZGEÇ
          </button>
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? "Kaydediliyor…" : "FİYAT LİSTESİNİ KAYDET"}
          </button>
        </FormActionFooter>
      </form>
      </FinancialFormSync>
    </FormProvider>
  );
}
