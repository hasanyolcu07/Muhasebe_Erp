import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cariApi, type PriceListLookup } from "../api/cariApi";
import { FormActionFooter } from "@/components/FormActionFooter";
import { CariRightMenu } from "./CariRightMenu";
import { CariTabPanels } from "./CariTabPanels";
import type { CariTabId } from "../constants";
import {
  cariFormSchema,
  detailToFormValues,
  emptyCariForm,
  type CariFormValues,
} from "../schemas/cariSchema";
import { useAppStore } from "@/store/appStore";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";

type Props = {
  accountId: number | null;
  onCancel: () => void;
  onSaved: (id: number) => void;
  saveLabel?: string;
  trackDirty?: boolean;
};

export function CariFormView({ accountId, onCancel, onSaved, saveLabel, trackDirty = true }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const [activeTab, setActiveTab] = useState<CariTabId>("genel");
  const [loading, setLoading] = useState(!!accountId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceLists, setPriceLists] = useState<PriceListLookup[]>([]);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const methods = useForm<CariFormValues>({
    resolver: zodResolver(cariFormSchema) as Resolver<CariFormValues>,
    defaultValues: emptyCariForm(defaultBranch, defaultRt),
    mode: "onBlur",
  });

  const { handleSubmit, reset, formState } = methods;

  useEffect(() => {
    if (!trackDirty) return;
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty, trackDirty]);

  useEffect(() => {
    if (!trackDirty) return;
    return () => setDirty(false);
  }, [setDirty, trackDirty]);

  const loadLookups = useCallback(async (bid?: number) => {
    try {
      const pl = await cariApi.lookupPriceLists(bid ?? defaultBranch);
      setPriceLists(pl.items);
    } catch {
      /* ignore lookup errors */
    }
  }, [defaultBranch]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (!accountId) {
      reset(emptyCariForm(defaultBranch, defaultRt));
      setLoading(false);
      return;
    }
    setLoading(true);
    cariApi
      .get(accountId)
      .then((detail) => {
        reset(detailToFormValues(detail as Record<string, unknown>));
        loadLookups(Number(detail.branch_id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Yükleme hatası"))
      .finally(() => setLoading(false));
  }, [accountId, defaultBranch, defaultRt, reset, loadLookups]);

  async function onSubmit(values: CariFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        email: values.email || null,
        contacts: values.contacts.map((c) => ({ ...c, email: c.email || null })),
      };
      if (accountId) {
        const saved = await cariApi.update(accountId, payload);
        reset(detailToFormValues(saved as Record<string, unknown>));
        onSaved(saved.id);
      } else {
        const saved = await cariApi.create(payload);
        reset(detailToFormValues(saved as Record<string, unknown>));
        onSaved(saved.id);
      }
      if (trackDirty) setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (trackDirty) guardNavigate(onCancel);
    else onCancel();
  }

  return (
    <FormProvider {...methods}>
      <CariFormBody
        accountId={accountId}
        onCancel={onCancel}
        onSaved={onSaved}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loading={loading}
        saving={saving}
        error={error}
        priceLists={priceLists}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        handleCancel={handleCancel}
        saveLabel={saveLabel}
      />
    </FormProvider>
  );
}

function CariFormBody({
  accountId,
  onCancel,
  onSaved,
  activeTab,
  setActiveTab,
  loading,
  saving,
  error,
  priceLists,
  handleSubmit,
  onSubmit,
  handleCancel,
  saveLabel,
}: {
  accountId: number | null;
  onCancel: () => void;
  onSaved: (id: number) => void;
  activeTab: CariTabId;
  setActiveTab: (t: CariTabId) => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  priceLists: PriceListLookup[];
  handleSubmit: ReturnType<typeof useForm<CariFormValues>>["handleSubmit"];
  onSubmit: (values: CariFormValues) => Promise<void>;
  handleCancel: () => void;
  saveLabel?: string;
}) {
  if (loading) {
    return <div className="card">Cari kart yükleniyor…</div>;
  }

  return (
    <FinancialFormSync isEdit={!!accountId}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="header-bar">
          <div className="header-breadcrumb">
            Kartlar / Müşteri-Tedarikçiler (Cari Kart Detay Bilgi Girişi)
            {accountId ? ` — #${accountId}` : " — Yeni"}
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="cari-split-container">
          <div className="cari-left-form-card">
            <CariTabPanels activeTab={activeTab} priceLists={priceLists} accountId={accountId} />
          </div>
          <CariRightMenu activeTab={activeTab} onSelect={setActiveTab} />
        </div>

        <FormActionFooter>
          <button type="button" className="btn-cancel" onClick={handleCancel}>
            ✖ VAZGEÇ
          </button>
          {accountId ? (
            <button type="submit" className="btn-update" disabled={saving}>
              {saving ? "Kaydediliyor…" : "✏️ GÜNCELLE"}
            </button>
          ) : null}
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? "Kaydediliyor…" : saveLabel ?? "👥 CARİYİ KAYDET"}
          </button>
        </FormActionFooter>
      </form>
    </FinancialFormSync>
  );
}
