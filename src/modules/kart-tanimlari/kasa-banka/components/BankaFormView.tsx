import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { kasaBankaApi, type CurrencyLookup } from "../api/kasaBankaApi";
import {
  BANK_OPTIONS,
  bankaDetailToForm,
  bankaFormSchema,
  emptyBankaForm,
  type BankaFormValues,
} from "../schemas/kasaBankaSchema";
import { useAppStore } from "@/store/appStore";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { FinancialFormSync } from "@/components/financial/FinancialFormSync";
import { FormActionFooter } from "@/components/FormActionFooter";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { formatCoaDisplay } from "@/services/coaApi";
import { CodeSelectFields, type CodeSelectValues } from "@/modules/ayarlar/components/CodeSelectFields";

type Props = {
  bankaId: number | null;
  onCancel: () => void;
  onSaved: (id: number) => void;
  saveLabel?: string;
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

export function BankaFormView({ bankaId, onCancel, onSaved, saveLabel, trackDirty = true }: Props) {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const setDirty = useAppStore((s) => s.setDirty);
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const defaultBranch = branchId ?? branches[0]?.id ?? 1;
  const defaultRt = recordTypeId ?? recordTypes[0]?.id ?? 1;

  const [loading, setLoading] = useState(!!bankaId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyLookup[]>([]);
  const [showPos, setShowPos] = useState(false);
  const [coaLabel, setCoaLabel] = useState("");
  const [codeVals, setCodeVals] = useState<CodeSelectValues>({});

  const methods = useForm<BankaFormValues>({
    resolver: zodResolver(bankaFormSchema) as Resolver<BankaFormValues>,
    defaultValues: emptyBankaForm(defaultBranch, defaultRt),
    mode: "onBlur",
  });

  const { handleSubmit, reset, register, watch, setValue, formState } = methods;
  const isPassive = watch("is_passive");
  const posEnabled = watch("pos_info.pos_enabled");
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
      const cur = await kasaBankaApi.lookupCurrencies();
      setCurrencies(cur.items);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (!bankaId) {
      reset(emptyBankaForm(defaultBranch, defaultRt));
      setLoading(false);
      return;
    }
    setLoading(true);
    kasaBankaApi
      .getBanka(bankaId)
      .then((detail) => {
        const form = bankaDetailToForm(detail as Record<string, unknown>);
        reset(form);
        setShowPos(Boolean(form.pos_info?.pos_enabled));
        const d = detail as Record<string, unknown>;
        if (d.coa_code) {
          setCoaLabel(`${d.coa_code} — ${d.coa_name ?? ""}`.trim());
        } else {
          setCoaLabel("");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Yükleme hatası"))
      .finally(() => setLoading(false));
  }, [bankaId, defaultBranch, defaultRt, reset]);

  async function onSubmit(values: BankaFormValues) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        currency_id: values.currency_id || null,
        branch_name: values.branch_name || null,
        account_no: values.account_no || null,
        pos_info: {
          ...values.pos_info,
          pos_terminal_id: values.pos_info.pos_terminal_id || null,
          virtual_pos_merchant_id: values.pos_info.virtual_pos_merchant_id || null,
          virtual_pos_api_key: values.pos_info.virtual_pos_api_key || null,
          notes: values.pos_info.notes || null,
        },
        coa_id: values.coa_id || null,
      };
      if (bankaId) {
        const saved = await kasaBankaApi.updateBanka(bankaId, payload);
        reset(bankaDetailToForm(saved as Record<string, unknown>));
        onSaved(saved.id);
      } else {
        const saved = await kasaBankaApi.createBanka(payload);
        reset(bankaDetailToForm(saved as Record<string, unknown>));
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
    return <div className="card">Banka kartı yükleniyor…</div>;
  }

  return (
    <FormProvider {...methods}>
      <FinancialFormSync isEdit={!!bankaId}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div id="kasa-tab-banka" className="kasa-subscreen active">
          <div className="kasa-white-box">
            <div className="kasa-box-title">Banka Hesap Bilgileri</div>

            <div className="kasa-form-row">
              <label htmlFor="banka-adi">Banka Adı</label>
              <select id="banka-adi" className="form-control required" {...register("bank_name")}>
                {BANK_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="kasa-form-row">
              <label htmlFor="banka-kod">Banka Kodu</label>
              <input id="banka-kod" type="text" className="form-control required" placeholder="Örn: BN-001" {...register("code")} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="banka-hesap-adi">Hesap Adı</label>
              <input id="banka-hesap-adi" type="text" className="form-control required" placeholder="Örn: Garanti BBVA TL Hesabı" {...register("name")} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="banka-sube-kodu">Şube / Kodu</label>
              <input id="banka-sube-kodu" type="text" className="form-control" placeholder="Kadıköy / 412" {...register("branch_name")} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="banka-hesap-no">Hesap No</label>
              <input id="banka-hesap-no" type="text" className="form-control" placeholder="62000123" {...register("account_no")} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="banka-iban">IBAN Numarası</label>
              <input id="banka-iban" type="text" className="form-control required" placeholder="TR38 0006 2000 0000 0062 0001 23" {...register("iban")} />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="banka-pb">Para Birimi</label>
              <select id="banka-pb" className="form-control required" {...register("currency_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
                <option value="">Seçim Yapın</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <BranchRecordTypeFields variant="form-row" />
            <div className="kasa-form-row">
              <label htmlFor="banka-coa">Muhasebe Hesap Kodu</label>
              <ChartOfAccountsPicker
                id="banka-coa"
                value={coaId ?? null}
                displayLabel={coaLabel}
                initialSearch="102"
                onChange={(id, item) => {
                  setValue("coa_id", id, { shouldDirty: true });
                  setCoaLabel(item ? formatCoaDisplay(item) : "");
                }}
              />
            </div>
            <div className="kasa-form-row">
              <label htmlFor="banka-acilis">Açılış Bakiyesi</label>
              <input id="banka-acilis" type="number" step="0.01" className="form-control" {...register("opening_balance", { valueAsNumber: true })} />
            </div>
            <div className="kasa-form-row" style={{ alignItems: "flex-start" }}>
              <label>Kod / Proje / Masraf</label>
              <div style={{ flex: 1 }}>
                <CodeSelectFields
                  entityType="BANK"
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

          <div className="kasa-white-box" style={{ marginTop: 20 }}>
            <div className="kasa-box-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>POS / Sanal POS Bilgileri (Opsiyonel)</span>
              <button type="button" className="btn-top" style={{ fontSize: 11 }} onClick={() => setShowPos((s) => !s)}>
                {showPos ? "Gizle ▴" : "Göster ▾"}
              </button>
            </div>
            {showPos ? (
              <>
                <div className="kasa-form-row">
                  <label>POS Aktif</label>
                  <div className="toggle-box" style={{ marginTop: 0 }}>
                    <ToggleSwitch
                      checked={posEnabled}
                      onChange={(v) => setValue("pos_info.pos_enabled", v, { shouldDirty: true })}
                    />
                  </div>
                </div>
                <div className="kasa-form-row">
                  <label htmlFor="pos-terminal">POS Terminal ID</label>
                  <input id="pos-terminal" type="text" className="form-control" placeholder="POS-001" {...register("pos_info.pos_terminal_id")} />
                </div>
                <div className="kasa-form-row">
                  <label htmlFor="vpos-merchant">Sanal POS Üye İşyeri No</label>
                  <input id="vpos-merchant" type="text" className="form-control" placeholder="VP-12345" {...register("pos_info.virtual_pos_merchant_id")} />
                </div>
                <div className="kasa-form-row">
                  <label htmlFor="vpos-key">Sanal POS API Anahtarı</label>
                  <input id="vpos-key" type="text" className="form-control" {...register("pos_info.virtual_pos_api_key")} />
                </div>
                <div className="kasa-form-row">
                  <label htmlFor="pos-notes">Notlar</label>
                  <input id="pos-notes" type="text" className="form-control" {...register("pos_info.notes")} />
                </div>
              </>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                POS terminal ve sanal POS bilgilerini tanımlamak için &quot;Göster&quot; düğmesine tıklayın.
              </p>
            )}
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
            {saving ? "Kaydediliyor…" : saveLabel ?? "BANKAYI KAYDET"}
          </button>
        </FormActionFooter>
      </form>
      </FinancialFormSync>
    </FormProvider>
  );
}
