import { BeyannameGibSection } from "./BeyannameGibSection";
import { GECICI_MENU_ITEMS } from "../config/geciciMenu";
import { GECICI_TABLE_DEFS } from "../config/geciciTables";

export function GeciciVergiSection() {
  return (
    <BeyannameGibSection
      declarationType="GECICI_VERGI"
      title="Kurumlar Geçici Vergi"
      shortTitle="Geçici"
      description="Çeyreklik kurumlar geçici vergi — matrah, vergi bildirimi, bilanço/gelir tablosu varyantları."
      periodKind="quarter"
      menuItems={GECICI_MENU_ITEMS}
      tableDefs={GECICI_TABLE_DEFS}
      accountLinks={[
        { key: "matrah", label: "Geçici Vergi Matrah Hesabı" },
        { key: "odenecek", label: "Ödenecek Geçici Vergi" },
        { key: "kkeg", label: "Kanunen Kabul Edilmeyen Giderler" },
      ]}
    />
  );
}
