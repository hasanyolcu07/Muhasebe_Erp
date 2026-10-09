import type { LookupItem, PeriodMode } from "../api/raporApi";

export type ReportFilterValues = {
  branch_id: string;
  record_type_id: string;
  period_mode: PeriodMode;
  date_from: string;
  date_to: string;
  year: string;
  month: string;
  cash_account_id: string;
  bank_account_id: string;
  due_days: string;
  due_days_custom: string;
  q: string;
};

type Props = {
  values: ReportFilterValues;
  onChange: (patch: Partial<ReportFilterValues>) => void;
  onSubmit: () => void;
  loading?: boolean;
  branches: LookupItem[];
  recordTypes: LookupItem[];
  cashAccounts?: LookupItem[];
  bankAccounts?: LookupItem[];
  showCashPicker?: boolean;
  showBankPicker?: boolean;
  showDueDays?: boolean;
  showMaliCompare?: boolean;
};

const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: "range", label: "Tarih aralığı" },
  { value: "month", label: "Ay Bazında" },
  { value: "year", label: "Yıl Bazında" },
  { value: "month_compare_3", label: "Ay Karşılaştırma (3 Ay)" },
  { value: "year_compare_3", label: "Yıl Karşılaştırma (3 Yıl)" },
];

const MALI_EXTRA: { value: PeriodMode; label: string }[] = [
  { value: "year_compare_5", label: "Yıl Karşılaştırma (5 Yıl)" },
  { value: "year_month_compare", label: "Yıl-Ay Karşılaştırma" },
];

const DUE_PRESETS = [10, 15, 20, 25, 30];

export function ReportFilterBar({
  values,
  onChange,
  onSubmit,
  loading,
  branches,
  recordTypes,
  cashAccounts = [],
  bankAccounts = [],
  showCashPicker,
  showBankPicker,
  showDueDays,
  showMaliCompare,
}: Props) {
  const periodOptions = showMaliCompare ? [...PERIOD_OPTIONS, ...MALI_EXTRA] : PERIOD_OPTIONS;
  const mode = values.period_mode;
  const showRange = mode === "range";
  const showMonth = mode === "month" || mode === "month_compare_3" || mode === "year_month_compare";
  const showYear =
    mode === "year" ||
    mode === "year_compare_3" ||
    mode === "year_compare_5" ||
    mode === "month" ||
    mode === "month_compare_3" ||
    mode === "year_month_compare";

  return (
    <form
      className="reports-filter-bar"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label>
        Şube
        <select
          value={values.branch_id ?? ""}
          onChange={(e) => onChange({ branch_id: e.target.value })}
        >
          <option value="">Tümü</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kayıt Türü GR-R
        <select
          value={values.record_type_id ?? ""}
          onChange={(e) => onChange({ record_type_id: e.target.value })}
        >
          <option value="">Tümü</option>
          {recordTypes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code} — {r.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dönem
        <select
          value={values.period_mode ?? "year"}
          onChange={(e) => onChange({ period_mode: e.target.value as PeriodMode })}
        >
          {periodOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {showRange ? (
        <>
          <label>
            Başlangıç
            <input
              type="date"
              value={values.date_from ?? ""}
              onChange={(e) => onChange({ date_from: e.target.value })}
            />
          </label>
          <label>
            Bitiş
            <input
              type="date"
              value={values.date_to ?? ""}
              onChange={(e) => onChange({ date_to: e.target.value })}
            />
          </label>
        </>
      ) : null}
      {showYear ? (
        <label>
          Yıl
          <input
            type="number"
            min={2000}
            max={2100}
            value={values.year ?? new Date().getFullYear()}
            onChange={(e) => onChange({ year: e.target.value })}
          />
        </label>
      ) : null}
      {showMonth ? (
        <label>
          Ay
          <select value={values.month ?? (new Date().getMonth() + 1)} onChange={(e) => onChange({ month: e.target.value })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showCashPicker ? (
        <label>
          Kasa
          <select
            value={values.cash_account_id ?? ""}
            onChange={(e) => onChange({ cash_account_id: e.target.value })}
          >
            <option value="">Tümü</option>
            {cashAccounts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showBankPicker ? (
        <label>
          Banka
          <select
            value={values.bank_account_id ?? ""}
            onChange={(e) => onChange({ bank_account_id: e.target.value })}
          >
            <option value="">Tümü</option>
            {bankAccounts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showDueDays ? (
        <label className="reports-due-presets">
          Vade (gün)
          <div className="reports-due-btns">
            {DUE_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                className={`btn-top${values.due_days === String(d) ? " active" : ""}`}
                onClick={() => onChange({ due_days: String(d), due_days_custom: "" })}
              >
                {d}
              </button>
            ))}
            <input
              type="number"
              min={0}
              placeholder="Özel"
              value={values.due_days_custom ?? ""}
              onChange={(e) =>
                onChange({ due_days_custom: e.target.value, due_days: e.target.value })
              }
              style={{ width: 72 }}
            />
          </div>
        </label>
      ) : null}
      <label className="reports-filter-q">
        Ara
        <input
          type="search"
          placeholder="Kod / ad / belge"
          value={values.q ?? ""}
          onChange={(e) => onChange({ q: e.target.value })}
        />
      </label>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Yükleniyor…" : "Raporla"}
      </button>
    </form>
  );
}
