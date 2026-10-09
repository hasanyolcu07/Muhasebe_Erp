import { useEffect, useMemo, useState } from "react";
import { kodTanimlariApi, type CodeFieldSlot, type CodeMasterEntry } from "@/modules/kod-tanimlari/api/kodTanimlariApi";
import { api } from "@/services/api";

export type KodEntityType =
  | "ACCOUNT"
  | "STOCK"
  | "CASH"
  | "BANK"
  | "CHEQUE"
  | "COA"
  | "VOUCHER"
  | "INVOICE"
  | "WAYBILL"
  | "QUOTE"
  | "ORDER";

type ProjectOpt = { id: number; code: string; name: string; is_active?: boolean };
type CostOpt = { id: number; code: string; name: string; is_active?: boolean };

type Values = {
  group_code?: string | null;
  special_code?: string | null;
  special_code2?: string | null;
  special_code3?: string | null;
  project_code?: string | null;
  project_code_id?: number | null;
  cost_center_code?: string | null;
  cost_center_id?: number | null;
};

export type CodeSelectValues = Values;

type Props = {
  entityType: KodEntityType | string;
  /** Opsiyonel — entity_code_assignments yüklemek için */
  entityId?: number | null;
  compact?: boolean;
  disabled?: boolean;
  showProject?: boolean;
  showCostCenter?: boolean;
  showGroupSpecial?: boolean;
  /** Tek patch API */
  values?: Values;
  onChange?: (patch: Values) => void;
  /** Alternatif prop API (form watch/setValue) */
  projectCode?: string;
  costCenterCode?: string;
  groupCode?: string;
  specialCode?: string;
  onProjectChange?: (code: string) => void;
  onCostCenterChange?: (code: string) => void;
  onGroupChange?: (code: string) => void;
  onSpecialChange?: (code: string) => void;
};

export function CodeSelectFields({
  entityType,
  entityId,
  compact,
  disabled,
  showProject = true,
  showCostCenter = true,
  showGroupSpecial = true,
  values,
  onChange,
  projectCode,
  costCenterCode,
  groupCode,
  specialCode,
  onProjectChange,
  onCostCenterChange,
  onGroupChange,
  onSpecialChange,
}: Props) {
  const [groupSlots, setGroupSlots] = useState<CodeFieldSlot[]>([]);
  const [specialSlots, setSpecialSlots] = useState<CodeFieldSlot[]>([]);
  const [entries, setEntries] = useState<Record<number, CodeMasterEntry[]>>({});
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [costs, setCosts] = useState<CostOpt[]>([]);

  const merged: Values = useMemo(
    () => ({
      group_code: values?.group_code ?? groupCode ?? "",
      special_code: values?.special_code ?? specialCode ?? "",
      special_code2: values?.special_code2 ?? "",
      special_code3: values?.special_code3 ?? "",
      project_code: values?.project_code ?? projectCode ?? "",
      project_code_id: values?.project_code_id ?? null,
      cost_center_code: values?.cost_center_code ?? costCenterCode ?? "",
      cost_center_id: values?.cost_center_id ?? null,
    }),
    [values, groupCode, specialCode, projectCode, costCenterCode]
  );

  function patch(p: Values) {
    onChange?.(p);
    if (p.group_code !== undefined) onGroupChange?.(p.group_code ?? "");
    if (p.special_code !== undefined) onSpecialChange?.(p.special_code ?? "");
    if (p.project_code !== undefined) onProjectChange?.(p.project_code ?? "");
    if (p.cost_center_code !== undefined) onCostCenterChange?.(p.cost_center_code ?? "");
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const slotsRes = await kodTanimlariApi.listSlots(entityType);
        const slots = slotsRes.items ?? [];
        if (cancelled) return;
        setGroupSlots(slots.filter((s) => s.field_kind === "GROUP"));
        setSpecialSlots(slots.filter((s) => s.field_kind === "SPECIAL"));
        const map: Record<number, CodeMasterEntry[]> = {};
        await Promise.all(
          slots.map(async (s) => {
            const er = await kodTanimlariApi.listEntries(s.id);
            map[s.id] = er.items ?? [];
          })
        );
        if (!cancelled) setEntries(map);

        if (entityId && onChange) {
          try {
            const asg = await kodTanimlariApi.getEntityCodes(entityType, entityId);
            const next: Values = {};
            for (const a of asg.items ?? []) {
              if (a.field_kind === "GROUP") next.group_code = a.code_value ?? a.entry_name ?? "";
              if (a.field_kind === "SPECIAL" && !next.special_code) {
                next.special_code = a.code_value ?? "";
              }
            }
            if (Object.keys(next).length) onChange(next);
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          setGroupSlots([]);
          setSpecialSlots([]);
          setEntries({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  useEffect(() => {
    if (!showProject && !showCostCenter) return;
    let cancelled = false;
    (async () => {
      if (showProject) {
        try {
          const r = await api<{ items: ProjectOpt[] }>("/sistem/project-codes");
          if (!cancelled) setProjects((r.items ?? []).filter((x) => x.is_active !== false));
        } catch {
          if (!cancelled) setProjects([]);
        }
      }
      if (showCostCenter) {
        try {
          const r = await api<{ items: CostOpt[] }>("/maliyet/merkezler");
          if (!cancelled) setCosts((r.items ?? []).filter((x) => x.is_active !== false));
        } catch {
          if (!cancelled) setCosts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showProject, showCostCenter]);

  const primaryGroup = groupSlots[0];
  const specials = specialSlots.slice(0, 3);
  const cls = compact ? "gg-grid-2col code-select-fields is-compact" : "gg-grid-2col code-select-fields";

  return (
    <div className={cls}>
      {showGroupSpecial && primaryGroup ? (
        <label className="field-label-row">
          <span>{primaryGroup.label || "Grup Kodu"}</span>
          <select
            className="form-control"
            disabled={disabled}
            value={merged.group_code ?? ""}
            onChange={(e) => patch({ group_code: e.target.value || null })}
          >
            <option value="">— Seç —</option>
            {(entries[primaryGroup.id] ?? []).map((en) => (
              <option key={en.id} value={en.code}>
                {en.code} — {en.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showGroupSpecial
        ? specials.map((slot, i) => {
            const key = (i === 0 ? "special_code" : i === 1 ? "special_code2" : "special_code3") as keyof Values;
            const val = (merged[key] as string | null | undefined) ?? "";
            return (
              <label key={slot.id} className="field-label-row">
                <span>{slot.label || `Özel Kod${i ? i + 1 : ""}`}</span>
                <select
                  className="form-control"
                  disabled={disabled}
                  value={val}
                  onChange={(e) => patch({ [key]: e.target.value || null } as Values)}
                >
                  <option value="">— Seç —</option>
                  {(entries[slot.id] ?? []).map((en) => (
                    <option key={en.id} value={en.code}>
                      {en.code} — {en.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })
        : null}
      {showProject ? (
        <label className="field-label-row">
          <span>Proje Kodu</span>
          <select
            className="form-control"
            disabled={disabled}
            value={merged.project_code_id ?? merged.project_code ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const p = projects.find((x) => String(x.id) === v || x.code === v);
              patch({
                project_code_id: p?.id ?? null,
                project_code: p?.code ?? (v || null),
              });
            }}
          >
            <option value="">— Seç —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.code}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showCostCenter ? (
        <label className="field-label-row">
          <span>Masraf Merkezi</span>
          <select
            className="form-control"
            disabled={disabled}
            value={merged.cost_center_id ?? merged.cost_center_code ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const c = costs.find((x) => String(x.id) === v || x.code === v);
              patch({
                cost_center_id: c?.id ?? null,
                cost_center_code: c?.code ?? (v || null),
              });
            }}
          >
            <option value="">— Seç —</option>
            {costs.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
