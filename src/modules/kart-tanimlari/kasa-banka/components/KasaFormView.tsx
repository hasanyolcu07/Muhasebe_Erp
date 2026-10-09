import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/appStore";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { formatCoaDisplay } from "@/services/coaApi";
import { CodeSelectFields, type CodeSelectValues } from "@/modules/ayarlar/components/CodeSelectFields";
import { kasaBankaApi, type CurrencyLookup, type UserLookup } from "../api/kasaBankaApi";
import {
  emptyKasaForm,
  kasaDetailToForm,
  kasaFormSchema,
  type KasaFormValues,
} from "../schemas/kasaBankaSchema";

type Props = {
  kasaId: number | null;
  onCancel: () => void;
  onSaved: (id: number) => void;
  /** Override primary save button label (e.g. "Kaydet & Seç") */
  saveLabel?: string;
  /** When false, do not touch global isDirty (nested quick-add) */
  trackDirty?: boolean;
};

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`toggle-switch${checked ? " active" : ""}`}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    />
  );
}

export function KasaFormView({ kasaId, onCancel, onSaved, saveLabel, trackDirty = true }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [loading, setLoading] = useState(!!kasaId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyLookup[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [coaLabel, setCoaLabel] = useState("");
  const [codeVals, setCodeVals] = useState<CodeSelectValues>({});

  const methods = useForm<KasaFormValues>({
    resolver: zodResolver(kasaFormSchema) as Resolver<KasaFormValues>,
    defaultValues: emptyKasaForm(defaultBranch, defaultRt),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, formState } = methods;
  const isPassive = watch("is_passive");
  const coaId = watch("coa_id");

  useEffect(() => {
    if (!trackDirty) return;
    setDirty(formState.isDirty);
  }, [formState.isDirty, setDirty, trackDirty]);

  useEffect(() => {
    if (!trackDirty) return;
    return () => setDirty(false);
  }, [setDirty, trackDirty]);

  const loadLookups = useCallback(async () => {
    try {
      const [cur, usr] = await Promise.all([
        kasaBankaApi.lookupCurrencies(),
        kasaBankaApi.lookupUsers(),
      ]);
      setCurrencies(cur.items);
      setUsers(usr.items);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (!kasaId) {
      reset(emptyKasaForm(defaultBranch, defaultRt));
      setLoading(false);
      return;
    }
    setLoading(true);
    kasaBankaApi
      .getKasa(kasaId)
      .then((detail) => {
        reset(kasaDetailToForm(detail as Record<string, unknown>));
        const d = detail as Record<string, unknown>;
        if (d.coa_code) {
          setCoaLabel(`${d.coa_code} — ${d.coa_name ?? ""}`.trim());
        } else {
          setCoaLabel("");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Yükleme hatası"))
      .finally(() => setLoading(false));
  }, [kasaId, defaultBranch, defaultRt, reset]);

  async function onSubmit(values: KasaFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        currency_id: values.currency_id || null,
        responsible_user_id: values.responsible_user_id || null,
        coa_id: values.coa_id || null,
      };
      if (kasaId) {
        const saved = await kasaBankaApi.updateKasa(kasaId, payload);
        reset(kasaDetailToForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      } else {
        const saved = await kasaBankaApi.createKasa(payload);
        reset(kasaDetailToForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      }
      if (trackDirty) setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card">Kasa kartı yükleniyor…</div>;
  }

  return (
    <FormProvider {...methods}>
      <FinancialFormSync isEdit={!!kasaId}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div id="kasa-tab-kasa" className="kasa-subscreen active">
          <div className="kasa-white-box">
            <div className="kasa-box-title">Kasa Hesap Bilgileri</div>

            <div className="kasa-form-row">
              <label htmlFor="kasa-adi">Kasa Adı</label>
              <input id="kasa-adi" type="text" className="form-control required" placeholder="Örn: Merkez Nakit Kasası (TL)" {...register("name")} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="kasa-kodu">Kasa Kodu</label>
              <input id="kasa-kodu" type="text" className="form-control required" placeholder="Örn: KS-001" {...register("code")} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="kasa-pb">Para Birimi</label>
              <select id="kasa-pb" className="form-control required" {...register("currency_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
                <option value="">Seçim Yapın</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>
            <BranchRecordTypeFields variant="form-row" />
            <div className="kasa-form-row">
              <label htmlFor="kasa-sorumlu">Sorumlu</label>
              <select id="kasa-sorumlu" className="form-control" {...register("responsible_user_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
                <option value="">Seçim Yapın</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="kasa-form-row">
              <label htmlFor="kasa-acilis">Açılış Bakiyesi</label>
              <input id="kasa-acilis" type="number" step="0.01" className="form-control" {...register("opening_balance", { valueAsNumber: true })} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="kasa-coa">Muhasebe Hesap Kodu</label>
              <ChartOfAccountsPicker
                id="kasa-coa"
                value={coaId ?? null}
                displayLabel={coaLabel}
                initialSearch="100"
                onChange={(id, item) => {
                  setValue("coa_id", id, { shouldDirty: true });
                  setCoaLabel(item ? formatCoaDisplay(item) : "");
                }}
              />
            </div>
            <div className="kasa-form-row" style={{ alignItems: "flex-start" }}>
              <label>Kod / Proje / Masraf</label>
              <div style={{ flex: 1 }}>
                <CodeSelectFields
                  entityType="CASH"
                  values={codeVals}
                  onChange={(patch) => setCodeVals((v) => ({ ...v, ...patch }))}
                />
              </div>
            </div>
            <div className="kasa-form-row">
              <label>Pasif</label>
              <div className="toggle-box" style={{ marginTop: 0 }}>
                <ToggleSwitch checked={isPassive} onChange={(v) => setValue("is_passive", v, { shouldDirty: true })} />
              </div>
            </div>
          </div>
        </div>

        {error ? <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div> : null}

        <FormActionFooter sticky={false}>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => (trackDirty ? guardNavigate(onCancel) : onCancel())}
          >
            ✖ VAZGEÇ
          </button>
          <button type="submit" className="btn-save" disabled={saving}>
            {saving ? "Kaydediliyor…" : saveLabel ?? "KASAYI KAYDET"}
          </button>
        </FormActionFooter>
      </form>
      </FinancialFormSync>
    </FormProvider>
  );
}
