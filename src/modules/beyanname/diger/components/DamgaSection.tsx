import { BeyannameGibSection } from "../../vergi/components/BeyannameGibSection";
import { DAMGA_MENU_ITEMS } from "../config/damgaMenu";
import { DAMGA_TABLE_DEFS } from "../config/damgaTables";

export function DamgaSection() {
  return (
    <BeyannameGibSection
      declarationType="DAMGA"
      title="Damga Vergisi"
      shortTitle="Damga"
      description="Aylık damga vergisi — düzenlenen kağıtlar, istisna ve vergi özeti."
      periodKind="month"
      menuItems={DAMGA_MENU_ITEMS}
      tableDefs={DAMGA_TABLE_DEFS}
      accountLinks={[
        { key: "matrah", label: "Damga Vergisi Matrah Hesabı" },
        { key: "odenecek", label: "Ödenecek Damga Vergisi" },
      ]}
    />
  );
}
