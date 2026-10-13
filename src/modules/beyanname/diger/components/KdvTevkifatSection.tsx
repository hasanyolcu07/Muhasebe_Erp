import { BeyannameGibSection } from "../../vergi/components/BeyannameGibSection";
import { KDV_TEVKIFAT_MENU_ITEMS } from "../config/kdvTevkifatMenu";
import { KDV_TEVKIFAT_TABLE_DEFS } from "../config/kdvTevkifatTables";

export function KdvTevkifatSection() {
  return (
    <BeyannameGibSection
      declarationType="KDV_TEVKIFAT"
      title="KDV Tevkifat"
      shortTitle="Tevkifat"
      description="Kesinti yapılan satıcılar — tam / kısmi / isteğe bağlı tevkifat ve vergi özeti."
      periodKind="month"
      menuItems={KDV_TEVKIFAT_MENU_ITEMS}
      tableDefs={KDV_TEVKIFAT_TABLE_DEFS}
      accountLinks={[
        { key: "tevkifat", label: "Tevkifat KDV Hesabı" },
        { key: "odenecek", label: "Ödenecek KDV" },
        { key: "satici", label: "Satıcı / Yüklenici Hesapları" },
      ]}
    />
  );
}
