import { MUHTASAR_1003A_MENU_ITEMS } from "../config/muhtasar1003aMenu";
import { MUHTASAR_1003A_TABLE_DEFS } from "../config/muhtasarTables";
import { MuhtasarSection } from "./MuhtasarSection";

export function Muhtasar1003ASection() {
  return (
    <MuhtasarSection
      declarationType="MUHTASAR_1003A"
      title="Muhtasar Beyannamesi - 1003A"
      shortTitle="1003A"
      description="Vergi kesintileri ile sigorta primlerinin birlikte bildirildiği GIB 1003A beyannamesi."
      menuItems={MUHTASAR_1003A_MENU_ITEMS}
      tableDefs={MUHTASAR_1003A_TABLE_DEFS}
    />
  );
}
