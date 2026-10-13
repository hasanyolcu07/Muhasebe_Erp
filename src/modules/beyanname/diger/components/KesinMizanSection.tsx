import { useMemo, useState } from "react";
import { BeyannameGibSection } from "../../vergi/components/BeyannameGibSection";
import { KESIN_MIZAN_MENU_ITEMS } from "../config/kesinMizanMenu";
import {
  DEFAULT_MIZAN_SEED,
  KESIN_MIZAN_STATIC_DEFS,
  buildMizanFromAccounts,
  makeMizanTableDef,
} from "../config/kesinMizanTables";

export function KesinMizanSection() {
  const [seed, setSeed] = useState(DEFAULT_MIZAN_SEED);
  const [remount, setRemount] = useState(0);
  const [info, setInfo] = useState<string | null>(null);

  const tableDefs = useMemo(
    () => ({
      ...KESIN_MIZAN_STATIC_DEFS,
      s2_1: makeMizanTableDef(seed),
    }),
    [seed],
  );

  function handleVeriAl() {
    const next = buildMizanFromAccounts();
    setSeed(next);
    setRemount((n) => n + 1);
    setInfo(`${next.length} hesap satırı yüklendi (yevmiye / hesap planı özeti).`);
  }

  return (
    <BeyannameGibSection
      declarationType="KESIN_MIZAN"
      title="Kesin Mizan"
      shortTitle="Mizan"
      description="Yıllık kesin mizan — hesap kodu, borç/alacak toplam ve kalan."
      periodKind="year"
      menuItems={KESIN_MIZAN_MENU_ITEMS}
      tableDefs={tableDefs}
      tableRemountKey={remount}
      accountLinks={[
        { key: "mizan_kaynak", label: "Mizan Kaynak Hesap Aralığı" },
        { key: "kapanis", label: "Kapanış Hesabı" },
      ]}
      panelExtras={{
        s2_1: (
          <div className="card" style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={handleVeriAl}>
              Veri Al
            </button>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Yevmiye / hesap planından mizan satırlarını doldurur.
            </span>
            {info && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#065f46" }}>{info}</span>
            )}
          </div>
        ),
      }}
    />
  );
}
