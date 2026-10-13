import { buildPermissionSections, type PermissionSection } from "../utils/permissionMenu";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  sections?: PermissionSection[];
  title?: string;
  compact?: boolean;
};

export function PermissionChecklist({
  selected,
  onChange,
  sections = buildPermissionSections(),
  title = "Yetkiler",
  compact = false,
}: Props) {
  const set = new Set(selected);

  function toggle(key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  }

  function toggleSection(section: PermissionSection, checked: boolean) {
    const next = new Set(set);
    for (const item of section.items) {
      if (checked) next.add(item.key);
      else next.delete(item.key);
    }
    onChange([...next]);
  }

  function selectAll(checked: boolean) {
    if (!checked) {
      onChange([]);
      return;
    }
    onChange(sections.flatMap((s) => s.items.map((i) => i.key)));
  }

  const allKeys = sections.flatMap((s) => s.items.map((i) => i.key));
  const allChecked = allKeys.length > 0 && allKeys.every((k) => set.has(k));

  return (
    <div className={`ayar-perm-box${compact ? " compact" : ""}`}>
      <div className="ayar-perm-box-head">
        <strong>{title}</strong>
        <label className="ayar-perm-all">
          <input type="checkbox" checked={allChecked} onChange={(e) => selectAll(e.target.checked)} />
          Tümünü seç
        </label>
      </div>
      <div className="ayar-perm-sections">
        {sections.map((section) => {
          const sectionChecked =
            section.items.length > 0 && section.items.every((i) => set.has(i.key));
          const sectionPartial =
            !sectionChecked && section.items.some((i) => set.has(i.key));
          return (
            <div key={section.id} className="ayar-perm-section">
              <label className="ayar-perm-section-title">
                <input
                  type="checkbox"
                  checked={sectionChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = sectionPartial;
                  }}
                  onChange={(e) => toggleSection(section, e.target.checked)}
                />
                <span>{section.title}</span>
              </label>
              <div className="ayar-perm-items">
                {section.items.map((item) => (
                  <label key={item.key} className="ayar-perm-item">
                    <input
                      type="checkbox"
                      checked={set.has(item.key)}
                      onChange={() => toggle(item.key)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
