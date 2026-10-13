import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";

type Variant = "header" | "form-row" | "inline" | "card";

type Props = {
  variant?: Variant;
  /** Muhasebeleşme durumu rozeti göster */
  showAccountingBadge?: boolean;
  branchField?: string;
  recordTypeField?: string;
  disabled?: boolean;
  className?: string;
};

function AccountingPostingBadge({ enabled }: { enabled: boolean }) {
  if (enabled) return null;
  return (
    <span
      className="dirty-badge"
      style={{ marginLeft: 8, background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }}
      title="Gayri Resmi kayıt türü seçildi — muhasebeleşme kapalı"
    >
      Muhasebeleşme kapalı
    </span>
  );
}

/**
 * Yeniden kullanılabilir Şube + Kayıt Türü alanları (RHF).
 * Fatura, kasa hareket, banka, fiş formlarında da kullanılabilir.
 */
export function BranchRecordTypeFields({
  variant = "header",
  showAccountingBadge = true,
  branchField = "branch_id",
  recordTypeField = "record_type_id",
  disabled = false,
  className = "",
}: Props) {
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const { register, control } = useFormContext();

  const watchedRecordTypeId = useWatch({ control, name: recordTypeField });
  const accountingEnabled = useMemo(
    () => isAccountingEnabledForRecordType(recordTypes, watchedRecordTypeId),
    [recordTypes, watchedRecordTypeId]
  );

  if (variant === "form-row") {
    return (
      <>
        <div className={`kasa-form-row ${className}`.trim()}>
          <label htmlFor="frt-branch">Şube</label>
          <select
            id="frt-branch"
            className="form-control required"
            disabled={disabled}
            {...register(branchField, { valueAsNumber: true })}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className={`kasa-form-row ${className}`.trim()}>
          <label htmlFor="frt-rt">Kayıt Türü</label>
          <select
            id="frt-rt"
            className="form-control required"
            disabled={disabled}
            {...register(recordTypeField, { valueAsNumber: true })}
          >
            {recordTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.code} — {rt.name}
              </option>
            ))}
          </select>
          {showAccountingBadge ? <AccountingPostingBadge enabled={accountingEnabled} /> : null}
        </div>
      </>
    );
  }

  if (variant === "card") {
    return (
      <>
        <div className={`form-row ${className}`.trim()}>
          <label htmlFor="card-branch">Şube</label>
          <select
            id="card-branch"
            className="form-control required"
            disabled={disabled}
            {...register(branchField, { valueAsNumber: true })}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className={`form-row ${className}`.trim()}>
          <label htmlFor="card-rt">
            Kayıt Türü (GR/R)
            {showAccountingBadge ? <AccountingPostingBadge enabled={accountingEnabled} /> : null}
          </label>
          <select
            id="card-rt"
            className="form-control required"
            disabled={disabled}
            {...register(recordTypeField, { valueAsNumber: true })}
          >
            {recordTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.code} — {rt.name}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  }

  const boxClass =
    variant === "inline" ? `global-kayit-turu-box ${className}`.trim() : `global-kayit-turu-box ${className}`.trim();

  return (
    <div className={boxClass}>
      <span>Şube:</span>
      <select disabled={disabled} {...register(branchField, { valueAsNumber: true })}>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {variant === "header" ? `${b.code} — ${b.name}` : b.name}
          </option>
        ))}
      </select>
      <span>Kayıt Türü:</span>
      <select disabled={disabled} {...register(recordTypeField, { valueAsNumber: true })}>
        {recordTypes.map((r) => (
          <option key={r.id} value={r.id}>
            {variant === "header" ? `${r.code} | ${r.name}` : r.name}
          </option>
        ))}
      </select>
      {showAccountingBadge ? <AccountingPostingBadge enabled={accountingEnabled} /> : null}
    </div>
  );
}

type AccountingToggleProps = {
  name?: string;
  label?: string;
};

/**
 * Gelecek finansal hareket formları için muhasebeleşme anahtarı.
 * Gayri Resmi seçiliyken otomatik kapalı ve değiştirilemez.
 */
export function AccountingPostingToggle({
  name = "muhasebelestir",
  label = "Muhasebeleştir",
}: AccountingToggleProps) {
  const recordTypes = useAppStore((s) => s.recordTypes);
  const { register, control, setValue } = useFormContext();
  const recordTypeId = useWatch({ control, name: "record_type_id" });
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, recordTypeId);

  useEffect(() => {
    if (!accountingEnabled) {
      setValue(name, false, { shouldDirty: false });
    }
  }, [accountingEnabled, name, setValue]);

  return (
    <div className="kasa-form-row">
      <label>{label}</label>
      <div className="toggle-box" style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" disabled={!accountingEnabled} {...register(name)} />
        {!accountingEnabled ? <AccountingPostingBadge enabled={false} /> : null}
      </div>
    </div>
  );
}
