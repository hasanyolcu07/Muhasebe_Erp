import { BeyannameGibSection } from "./BeyannameGibSection";
import { GELIR_MENU_ITEMS } from "../config/gelirMenu";
import { GELIR_TABLE_DEFS } from "../config/gelirTables";

export function GelirVergiSection() {
  return (
    <BeyannameGibSection
      declarationType="GELIR_YILLIK"
      title="Yıllık Gelir Vergisi"
      shortTitle="Gelir"
      description="Yıllık gelir vergisi — kazanç detayları, indirim/istisna, ayrıntılı bilanço ve basit usul."
      periodKind="year"
      menuItems={GELIR_MENU_ITEMS}
      tableDefs={GELIR_TABLE_DEFS}
      accountLinks={[
        { key: "ticari", label: "Ticari Kazanç" },
        { key: "sm", label: "Serbest Meslek" },
        { key: "gmsi", label: "Gayrimenkul Sermaye İradı" },
        { key: "gv_matrah", label: "Gelir Vergisi Matrahı" },
      ]}
    />
  );
}
