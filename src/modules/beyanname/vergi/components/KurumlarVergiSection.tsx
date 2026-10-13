import { BeyannameGibSection } from "./BeyannameGibSection";
import { KURUMLAR_MENU_ITEMS } from "../config/kurumlarMenu";
import { KURUMLAR_TABLE_DEFS } from "../config/kurumlarTables";

export function KurumlarVergiSection() {
  return (
    <BeyannameGibSection
      declarationType="KURUMLAR"
      title="Kurumlar Vergisi"
      shortTitle="Kurumlar"
      description="Yıllık kurumlar vergisi — KVK 5/1, bilanço tipi varyantları, transfer fiyatlandırması, AR-GE ve ek tablolar."
      periodKind="year"
      menuItems={KURUMLAR_MENU_ITEMS}
      tableDefs={KURUMLAR_TABLE_DEFS}
      accountLinks={[
        { key: "ticari_kar", label: "Ticari Bilanço Kârı" },
        { key: "kkeg", label: "Kanunen Kabul Edilmeyen Giderler" },
        { key: "kv_matrah", label: "Kurumlar Vergisi Matrahı" },
        { key: "odenecek", label: "Ödenecek Kurumlar Vergisi" },
      ]}
    />
  );
}
