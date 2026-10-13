import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { gelirGiderApi, type AccountLookup } from "../api/gelirGiderApi";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { formatCoaDisplay } from "@/services/coaApi";
import {
  GELIR_GROUPS,
  GIDER_GROUPS,
  VAT_OPTIONS,
  type GelirGiderFormValues,
  type GelirGiderTab,
  type GelirGiderType,
} from "../schemas/gelirGiderSchema";
import { useFinancialFormDefaults } from "@/hooks/useFinancialFormDefaults";

type Props = {
  activeTab: GelirGiderTab;
  cardType: GelirGiderType;
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

export function GelirGiderTabPanels({ activeTab, cardType }: Props) {
  const { register, watch, setValue, control } = useFormContext<GelirGiderFormValues>();
  const { accountingEnabled } = useFinancialFormDefaults({ syncFromTopbar: false });
  const { fields, append, remove } = useFieldArray({ control, name: "links" });

  const groups = cardType === "GIDER" ? GIDER_GROUPS : GELIR_GROUPS;
  const codeLabel = cardType === "GIDER" ? "Gider Kodu" : "Gelir Kodu";
  const nameLabel = cardType === "GIDER" ? "Gider Adı" : "Gelir Adı";
  const groupLabel = cardType === "GIDER" ? "Gider Grubu" : "Gelir Grubu";
  const coaPrefix = cardType === "GIDER" ? "770" : "600";

  const [accounts, setAccounts] = useState<AccountLookup[]>([]);
  const [coaLabel, setCoaLabel] = useState("");
  const [groupOptions, setGroupOptions] = useState<string[]>([...groups]);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const coaId = watch("coa_id");
  const cardGroup = watch("card_group");

  const isPassive = watch("is_passive");
  const defaultVat = watch("default_vat_rate");

  const loadLookups = useCallback(async () => {
    const [acc, grp] = await Promise.all([
      gelirGiderApi.lookupAccounts(),
      gelirGiderApi.lookupGroups(cardType),
    ]);
    setAccounts(acc.items);
    const merged = [...new Set([...groups, ...(grp.items ?? [])])];
    setGroupOptions(merged);
  }, [cardType, groups]);

  useEffect(() => {
    loadLookups().catch(() => undefined);
  }, [loadLookups]);

  function addLinkRow() {
    const acc = accounts[0];
    append({
      account_id: acc?.id ?? 0,
      link_code: watch("code") || "",
      description: "",
      share_percent: 100,
      vat_rate: defaultVat ?? 20,
    });
  }

  function copyLinkRow(idx: number) {
    const row = watch(`links.${idx}`);
    append({ ...row });
  }

  function confirmNewGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    setGroupOptions((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setValue("card_group", name, { shouldDirty: true });
    setNewGroupName("");
    setAddingGroup(false);
  }

  return (
    <>
      <div className={`gg-subscreen${activeTab === "temel" ? " active" : ""}`}>
        <div className="gg-grid-2col">
          <div>
            <div className="form-row">
              <label>{codeLabel}</label>
              <input type="text" className="form-control required" {...register("code")} placeholder={cardType === "GIDER" ? "GDR-770-01" : "GLR-600-01"} />
            </div>
            <div className="form-row">
              <label>{nameLabel}</label>
              <input type="text" className="form-control required" {...register("name")} />
            </div>
            <div className="form-row">
              <label>Varsayılan KDV Oranı</label>
              <select className="form-control" {...register("default_vat_rate", { valueAsNumber: true })}>
                {VAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>{groupLabel}</label>
              {addingGroup ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Yeni grup adı…"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        confirmNewGroup();
                      }
                    }}
                  />
                  <button type="button" className="btn-top blue" style={{ fontSize: 11, whiteSpace: "nowrap" }} onClick={confirmNewGroup}>
                    ✔ Ekle
                  </button>
                  <button
                    type="button"
                    className="btn-top"
                    style={{ fontSize: 11 }}
                    onClick={() => {
                      setAddingGroup(false);
                      setNewGroupName("");
                    }}
                  >
                    ✖
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="form-control"
                    value={cardGroup ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setAddingGroup(true);
                        return;
                      }
                      setValue("card_group", e.target.value, { shouldDirty: true });
                    }}
                  >
                    {groupOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                    <option value="__new__">+ Yeni Grup Ekle…</option>
                  </select>
                </div>
              )}
            </div>
            <div className="form-row">
              <label>Muhasebe Hesap Kodu</label>
              <ChartOfAccountsPicker
                value={coaId ?? null}
                displayLabel={coaLabel}
                initialSearch={coaPrefix}
                disabled={!accountingEnabled}
                onChange={(id, item) => {
                  setValue("coa_id", id, { shouldDirty: true });
                  setCoaLabel(item ? formatCoaDisplay(item) : "");
                }}
              />
            </div>
            <BranchRecordTypeFields variant="card" />
            <div className="form-row">
              <label>Şube Oranı (%)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                className="form-control"
                {...register("branch_ratio", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                placeholder="100"
              />
            </div>
            <div className="form-row">
              <label>Pasif</label>
              <div className="toggle-box">
                <ToggleSwitch checked={isPassive} onChange={(v) => setValue("is_passive", v, { shouldDirty: true })} />
              </div>
            </div>
          </div>
          <div>
            <div className="gg-info-box">
              <h4>💡 Otomasyon Bilgisi</h4>
              <p>
                Eşleştirdiğiniz firmalardan gelen e-Faturalar otomatik olarak bu{" "}
                {cardType === "GIDER" ? "gidere" : "gelire"} aktarılır.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`gg-subscreen${activeTab === "musteri" ? " active" : ""}`}>
        <div className="smart-link-header">
          <div className="smart-link-title">
            <span>🔗 Bağlantılı Müşteri ve Tedarikçiler</span>
          </div>
          <button type="button" className="btn-add-link" onClick={addLinkRow}>
            + YENİ BAĞLANTI EKLE
          </button>
        </div>
        <div className="smart-table-wrapper">
          <table className="smart-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>İşlemler</th>
                <th style={{ width: 260 }}>Müşteri/Tedarikçi Ünvanı (Zorunlu)</th>
                <th style={{ width: 160 }}>
                  {cardType === "GIDER" ? "Gider" : "Gelir"} Kodu (Zorunlu)
                </th>
                <th>Açıklama</th>
                <th style={{ width: 130 }}>Pay (%) / KDV</th>
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                    Henüz bağlantı yok. &quot;+ YENİ BAĞLANTI EKLE&quot; ile cari eşleştirmesi ekleyin.
                  </td>
                </tr>
              ) : (
                fields.map((field, idx) => {
                  const share = watch(`links.${idx}.share_percent`) ?? 100;
                  const vat = watch(`links.${idx}.vat_rate`) ?? defaultVat ?? 20;
                  return (
                    <tr key={field.id}>
                      <td>
                        <div className="action-pills">
                          <button type="button" className="pill-btn" onClick={() => copyLinkRow(idx)} title="Kopyala">
                            📋
                          </button>
                          <button type="button" className="pill-btn delete" onClick={() => remove(idx)} title="Sil">
                            🗑️
                          </button>
                        </div>
                      </td>
                      <td>
                        <select
                          className="form-control required"
                          style={{ fontWeight: 600 }}
                          {...register(`links.${idx}.account_id`, { valueAsNumber: true })}
                        >
                          <option value={0}>Seçiniz</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control required"
                          style={{ fontWeight: 700 }}
                          {...register(`links.${idx}.link_code`)}
                        />
                      </td>
                      <td>
                        <input type="text" className="form-control" {...register(`links.${idx}.description`)} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            className="form-control"
                            style={{ width: 60 }}
                            {...register(`links.${idx}.share_percent`)}
                          />
                          <span className="badge badge-green">
                            %{share} (KDV %{vat})
                          </span>
                        </div>
                        <input type="hidden" {...register(`links.${idx}.vat_rate`)} value={vat} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
