export { BeyannameHubPage } from "./pages/BeyannameHubPage";
export { BabsSection } from "./babs/components/BabsSection";
export { BeyannameDeclarationSection } from "./components/BeyannameDeclarationSection";
export { BeyannameLayout } from "./components/BeyannameLayout";
export {
  BeyannamePeriodsPanel,
  PeriodsTable,
  PeriodActions,
  StatusBadge,
  SummaryTotals,
} from "./components/BeyannamePeriodsPanel";
export {
  AccountSelectField,
  type AccountSelectMode,
  type AccountSelectValue,
} from "./components/AccountSelectField";
export {
  HUB_TABS,
  SECTION_MENU_ITEMS,
  STATUS_LABELS,
  STATUS_STYLE,
  normalizeStatus,
} from "./config/beyannameMenus";
export { beyannameApi, type DeclarationType, type BeyannamePeriod } from "./api/beyannameApi";
export {
  Kdv1Section,
  Kdv2Section,
  GibTablePanel,
  KDV1_MENU_ITEMS,
  KDV1_TABLE_DEFS,
  KDV2_MENU_ITEMS,
  KDV2_TABLE_DEFS,
} from "./kdv";
export {
  Muhtasar1003ASection,
  Muhtasar1003BSection,
  MuhtasarSection,
  MUHTASAR_1003A_MENU_ITEMS,
  MUHTASAR_1003B_MENU_ITEMS,
  MUHTASAR_1003A_TABLE_DEFS,
  MUHTASAR_1003B_TABLE_DEFS,
} from "./muhtasar";
export {
  BeyannameGibSection,
  GeciciVergiSection,
  KurumlarVergiSection,
  GelirVergiSection,
  GECICI_MENU_ITEMS,
  KURUMLAR_MENU_ITEMS,
  GELIR_MENU_ITEMS,
} from "./vergi";
export {
  DamgaSection,
  PosetSection,
  KesinMizanSection,
  KdvTevkifatSection,
  DAMGA_MENU_ITEMS,
  POSET_MENU_ITEMS,
  KESIN_MIZAN_MENU_ITEMS,
  KDV_TEVKIFAT_MENU_ITEMS,
} from "./diger";
