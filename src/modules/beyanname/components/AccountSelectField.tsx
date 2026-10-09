import { useEffect, useState } from "react";
import { formatCoaDisplay, lookupChartOfAccounts, type CoaLookup } from "@/services/coaApi";

export type AccountSelectMode = "account" | "range" | "list" | "amount";

export type AccountSelectValue = {
  mode: AccountSelectMode;
  account_id?: number | null;
  account_code?: string | null;
  account_name?: string | null;
  from_code?: string | null;
  to_code?: string | null;
  codes?: string[];
  amount?: number | null;
};

type Props = {
  value: AccountSelectValue;
  onChange: (next: AccountSelectValue) => void;
  label?: string;
  disabled?: boolean;
};

const MODES: { id: AccountSelectMode; label: string }[] = [
  { id: "account", label: "Hesap" },
  { id: "range", label: "Hesap Aralığı" },
  { id: "list", label: "Hesap Listesi" },
  { id: "amount", label: "Tutar" },
];

function parseCodes(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AccountSelectField({ value, onChange, label = "Hesap Seçimi", disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoaLookup[]>([]);
  const [loading, setLoading] = useState(false);
  const [listText, setListText] = useState((value.codes ?? []).join("\n"));

  useEffect(() => {
    setListText((value.codes ?? []).join("\n"));
  }, [value.codes]);

  useEffect(() => {
    if (value.mode !== "account" || disabled) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      void lookupChartOfAccounts(query || undefined, 40)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(t);
  }, [query, value.mode, disabled]);

  function setMode(mode: AccountSelectMode) {
    if (disabled || mode === value.mode) return;
    onChange({ ...value, mode });
  }

  function pickAccount(item: CoaLookup) {
    onChange({
      ...value,
      mode: "account",
      account_id: item.id,
      account_code: item.code,
      account_name: item.name,
    });
    setQuery("");
  }

  function clearAccount() {
    onChange({
      ...value,
      mode: "account",
      account_id: null,
      account_code: null,
      account_name: null,
    });
  }

  const selectedLabel =
    value.account_code || value.account_name
      ? formatCoaDisplay({
          id: value.account_id ?? 0,
          code: value.account_code ?? "",
          name: value.account_name ?? "",
        })
      : "";

  return (
    <div className="card" style={{ padding: 12 }}>
      {label ? (
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{label}</div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 140,
            flex: "0 0 auto",
          }}
        >
          {MODES.map((m) => {
            const active = value.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                className={`btn btn-sm${active ? " btn-primary" : ""}`}
                style={{
                  justifyContent: "flex-start",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: active ? "var(--primary)" : "var(--border, #e5e7eb)",
                  fontWeight: active ? 700 : 500,
                }}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          {value.mode === "account" && (
            <div>
              {selectedLabel ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{selectedLabel}</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={disabled}
                    onClick={clearAccount}
                  >
                    Temizle
                  </button>
                </div>
              ) : null}
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                Hesap ara
                <input
                  value={query}
                  disabled={disabled}
                  placeholder="Kod veya hesap adı…"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div
                style={{
                  marginTop: 6,
                  maxHeight: 180,
                  overflowY: "auto",
                  border: "1px solid var(--border, #e5e7eb)",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                {loading ? (
                  <div style={{ padding: 10, fontSize: 12, color: "var(--text-muted)" }}>
                    Aranıyor…
                  </div>
                ) : results.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12, color: "var(--text-muted)" }}>
                    Sonuç yok
                  </div>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => pickAccount(item)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "7px 10px",
                        border: "none",
                        borderBottom: "1px solid var(--border, #f3f4f6)",
                        background:
                          value.account_id === item.id ? "rgba(37,99,235,0.08)" : "transparent",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      <strong>{item.code}</strong>
                      <span style={{ color: "var(--text-muted)" }}> — {item.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {value.mode === "range" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, flex: 1, minWidth: 120 }}>
                Başlangıç kodu
                <input
                  value={value.from_code ?? ""}
                  disabled={disabled}
                  placeholder="örn. 100"
                  onChange={(e) => onChange({ ...value, from_code: e.target.value || null })}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, flex: 1, minWidth: 120 }}>
                Bitiş kodu
                <input
                  value={value.to_code ?? ""}
                  disabled={disabled}
                  placeholder="örn. 199"
                  onChange={(e) => onChange({ ...value, to_code: e.target.value || null })}
                />
              </label>
            </div>
          )}

          {value.mode === "list" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Hesap kodları (virgül veya satır)
              <textarea
                rows={5}
                value={listText}
                disabled={disabled}
                placeholder={"100\n120\n320"}
                style={{ resize: "vertical", fontFamily: "inherit" }}
                onChange={(e) => {
                  const raw = e.target.value;
                  setListText(raw);
                  onChange({ ...value, codes: parseCodes(raw) });
                }}
              />
            </label>
          )}

          {value.mode === "amount" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, maxWidth: 220 }}>
              Tutar
              <input
                type="number"
                step="0.01"
                value={value.amount ?? ""}
                disabled={disabled}
                placeholder="0,00"
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...value,
                    amount: v === "" ? null : Number(v),
                  });
                }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
