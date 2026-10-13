import { BeyannameGibSection } from "../../vergi/components/BeyannameGibSection";
import { POSET_MENU_ITEMS } from "../config/posetMenu";
import { POSET_TABLE_DEFS } from "../config/posetTables";

export function PosetSection() {
  return (
    <BeyannameGibSection
      declarationType="POSET"
      title="Poşet Beyannamesi (GEKAP)"
      shortTitle="GEKAP"
      description="Plastik poşet ve diğer GEKAP ürün bildirimleri — istisna / mahsup."
      periodKind="month"
      menuItems={POSET_MENU_ITEMS}
      tableDefs={POSET_TABLE_DEFS}
      accountLinks={[
        { key: "poset", label: "Poşet / GEKAP Gelir Hesabı" },
        { key: "odenecek", label: "Ödenecek GEKAP" },
        { key: "mahsup", label: "Mahsup Hesabı" },
      ]}
    />
  );
}
