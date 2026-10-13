import { MUHTASAR_1003B_MENU_ITEMS } from "../config/muhtasar1003bMenu";
import { MUHTASAR_1003B_TABLE_DEFS } from "../config/muhtasarTables";
import { MuhtasarSection } from "./MuhtasarSection";

export function Muhtasar1003BSection() {
  return (
    <MuhtasarSection
      declarationType="MUHTASAR_1003B"
      title="Muhtasar Beyannamesi - 1003B"
      shortTitle="1003B"
      description="Ücret ödemeleri ile sigortalı prim/hizmet bilgilerinin ayrı beyan edildiği GIB 1003B beyannamesi."
      menuItems={MUHTASAR_1003B_MENU_ITEMS}
      tableDefs={MUHTASAR_1003B_TABLE_DEFS}
    />
  );
}
