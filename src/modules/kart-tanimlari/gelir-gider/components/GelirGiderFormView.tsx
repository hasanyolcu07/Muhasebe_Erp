import { useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { gelirGiderApi } from "../api/gelirGiderApi";
import { GelirGiderTabPanels } from "./GelirGiderTabPanels";
import {
  detailToForm,
  emptyGelirGiderForm,
  gelirGiderFormSchema,
  type GelirGiderFormValues,
  type GelirGiderTab,
  type GelirGiderType,
} from "../schemas/gelirGiderSchema";
import { useAppStore } from "@/store/appStore";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";

type Props = {
  cardId: number | null;
  cardType: GelirGiderType;
  onCancel: () => void;
  onSaved: (id: number) => void;
};

export function GelirGiderFormView({ cardId, cardType, onCancel, onSaved }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [activeTab, setActiveTab] = useState<GelirGiderTab>("temel");
  const [loading, setLoading] = useState(!!cardId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methods = useForm<GelirGiderFormValues>({
    resolver: zodResolver(gelirGiderFormSchema) as Resolver<GelirGiderFormValues>,
    defaultValues: emptyGelirGiderForm(defaultBranch, defaultRt, cardType),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, formState } = methods;

  useEffect(() => {
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty]);

  useEffect(() => () => setDirty(false), [setDirty]);

  useEffect(() => {
    if (!cardId) {
      reset(emptyGelirGiderForm(defaultBranch, defaultRt, cardType));
      setLoading(false);
      return;
    }
    setLoading(true);
    gelirGiderApi
      .get(cardId)
      .then((detail) => reset(detailToForm(detail as Record<string, unknown>)))
      .catch((e) => setError(e instanceof Error ? e.message : "Yükleme hatası"))
      .finally(() => setLoading(false));
  }, [cardId, defaultBranch, defaultRt, cardType, reset]);

  async function onSubmit(values: GelirGiderFormValues) {
    setSaving(true);
    setError(null);
    const payload = {
      ...values,
      card_type: cardType,
      coa_id: values.coa_id || null,
      card_group: values.card_group || null,
      branch_ratio: values.branch_ratio ?? null,
      links: values.links
        .filter((l) => l.account_id > 0)
        .map((l) => ({
          ...l,
          description: l.description || null,
          vat_rate: l.vat_rate ?? values.default_vat_rate,
        })),
    };
    try {
      if (cardId) {
        const saved = await gelirGiderApi.update(cardId, payload);
        reset(detailToForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      } else {
        const saved = await gelirGiderApi.create(payload);
        reset(detailToForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      }
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  const saveLabel = cardType === "GIDER" ? "GİDERİ KAYDET" : "GELİRİ KAYDET";

  if (loading) {
    return <div className="card">Kart yükleniyor…</div>;
  }

  return (
    <FormProvider {...methods}>
      <FinancialFormSync isEdit={!!cardId}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="gg-tabs-bar">
          <div
            className={`gg-tab${activeTab === "temel" ? " active" : ""}`}
            role="tab"
            tabIndex={0}
            onClick={() => setActiveTab("temel")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActiveTab("temel");
            }}
          >
            📋 Kart Temel Bilgileri
          </div>
          <div
            className={`gg-tab${activeTab === "musteri" ? " active" : ""}`}
            role="tab"
            tabIndex={0}
            onClick={() => setActiveTab("musteri")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActiveTab("musteri");
            }}
          >
            🔗 Müşteri & Tedarikçi Bağlantıları (Grid Tablosu)
          </div>
        </div>

        <input type="hidden" {...register("card_type")} />

        {error ? <div className="alert alert-error">{error}</div> : null}

        <GelirGiderTabPanels activeTab={activeTab} cardType={cardType} />

        <FormActionFooter sticky={false}>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => guardNavigate(onCancel)}
          >
            ✖ VAZGEÇ
          </button>
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? "Kaydediliyor…" : saveLabel}
          </button>
        </FormActionFooter>
      </form>
      </FinancialFormSync>
    </FormProvider>
  );
}
