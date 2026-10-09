import { Navigate, RouteObject } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { SetupWizardPage } from "./pages/SetupWizardPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SiparislerPage } from "./modules/siparis/pages/SiparislerPage";
import { TekliflerPage } from "./modules/siparis/pages/TekliflerPage";

import { DocumentSeriesPage } from "./pages/DocumentSeriesPage";
import { ALL_NAV_ITEMS, LEGACY_PATH_REDIRECTS } from "./config/navConfig";
import { SIDEBAR_HUBS } from "./config/moduleHubConfig";
import { ModuleHubPage } from "./modules/hub/pages/ModuleHubPage";
import { PermissionGate } from "./components/PermissionGate";
import { usePermissions } from "./hooks/usePermissions";
import { useAppStore } from "./store/appStore";
import {
  CariKartlarPage,
  GelirGiderKartlariPage,
  KasaBankaKartlariPage,
  SabitKiymetPage,
  StokBirimleriPage,
  StokFiyatListeleriPage,
} from "./modules/kart-tanimlari";
import {
  BankaIslemleriPage,
  BankaKredileriPage,
  CekSenetIslemleriPage,
  FisDekontPage,
  KasaIslemleriPage,
} from "./modules/finans-islemleri";
import { StokHareketPage } from "./modules/stok-depo";
import { FaturaFormPage, IrsaliyeFormPage, SatislarEFaturaHubPage, AlislarGiderlerHubPage } from "./modules/satis-satin-alma";
import { EBelgeHubPage } from "./modules/e-belge";
import { YevmiyeDefterHubPage } from "./modules/yevmiye";
import { BeyannameHubPage } from "./modules/beyanname";
import { UretimHubPage } from "./modules/uretim";
import { MaliyetHubPage } from "./modules/maliyet";
import { ReportsHubPage } from "./modules/raporlar";
import { ExcelImportPage } from "./modules/excel-import/pages/ExcelImportPage";
import { PosPage } from "./modules/pos/pages/PosPage";
import { SablonTasarimciPage } from "./modules/sablon/pages/SablonTasarimciPage";
import { AyarlarHubPage, FirmaKullaniciPage } from "./modules/ayarlar";

function DashboardRoute() {
  const { can, roleCode, amountLimit } = usePermissions();
  const setDirty = useAppStore((s) => s.setDirty);
  return (
    <DashboardPage
      canCreate={can("dashboard", "create") || can("*", "create")}
      roleCode={roleCode}
      amountLimit={amountLimit}
      onToggleDirty={() => setDirty(!useAppStore.getState().isDirty)}
    />
  );
}

const KART_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  "cari-kartlar": () => <CariKartlarPage />,
  "stok-fiyat-listeleri": () => <StokFiyatListeleriPage />,
  "stok-birimleri": () => <StokBirimleriPage />,
  "sabit-kiymet": () => <SabitKiymetPage />,
  "kasa-banka-kartlari": () => <KasaBankaKartlariPage />,
  "gelir-gider-kartlari": () => <GelirGiderKartlariPage />,
};

const FINANS_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  "kasa-islemleri": () => <KasaIslemleriPage />,
  "banka-islemleri": () => <BankaIslemleriPage />,
  "cek-senet-islemleri": () => <CekSenetIslemleriPage />,
  "fis-dekont": () => <FisDekontPage />,
  "banka-kredileri": () => <BankaKredileriPage />,
};

const STOK_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  "stock-tx": () => <StokHareketPage />,
};

const SATIS_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  sales: () => <SatislarEFaturaHubPage />,
  purchases: () => <AlislarGiderlerHubPage />,
  teklifler: () => <TekliflerPage />,
  orders: () => <SiparislerPage />,
  pos: () => <PosPage />,

  "satis-faturalar": () => <FaturaFormPage />,
  "satis-irsaliyeler": () => <IrsaliyeFormPage />,
  "alis-faturalar": () => <FaturaFormPage />,
  "alis-irsaliyeler": () => <IrsaliyeFormPage />,
};

const EBELGE_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  edoc: () => <EBelgeHubPage />,
};

const RESMI_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  "yevmiye-fisleri": () => <YevmiyeDefterHubPage />,
  journal: () => <YevmiyeDefterHubPage />,
  beyanname: () => <BeyannameHubPage />,
};

const URETIM_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  production: () => <UretimHubPage />,
};

const MALIYET_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  cost: () => <MaliyetHubPage />,
};

const RAPOR_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  reports: () => <ReportsHubPage />,
  "excel-import": () => <ExcelImportPage />,
  "sablon-tasarimci": () => <SablonTasarimciPage />,
};

const AYARLAR_PAGE_BY_ID: Record<string, () => React.ReactNode> = {
  "ayr-tanimlar": () => <AyarlarHubPage hub="tanimlar" />,
  "ayr-firma-kullanici": () => <FirmaKullaniciPage />,
  "ayr-sistem": () => <AyarlarHubPage hub="sistem" />,
  "ayr-program": () => <AyarlarHubPage hub="program" />,
  "ayr-lisans": () => <AyarlarHubPage hub="lisans" />,
};

function ModuleRoute({ moduleId }: { moduleId: string }) {
  const KartPage = KART_PAGE_BY_ID[moduleId];
  if (KartPage) return KartPage();
  const FinansPage = FINANS_PAGE_BY_ID[moduleId];
  if (FinansPage) return FinansPage();
  const StokPage = STOK_PAGE_BY_ID[moduleId];
  if (StokPage) return StokPage();
  const SatisPage = SATIS_PAGE_BY_ID[moduleId];
  if (SatisPage) return SatisPage();
  const EbelgePage = EBELGE_PAGE_BY_ID[moduleId];
  if (EbelgePage) return EbelgePage();
  const ResmiPage = RESMI_PAGE_BY_ID[moduleId];
  if (ResmiPage) return ResmiPage();
  const UretimPage = URETIM_PAGE_BY_ID[moduleId];
  if (UretimPage) return UretimPage();
  const MaliyetPage = MALIYET_PAGE_BY_ID[moduleId];
  if (MaliyetPage) return MaliyetPage();
  const RaporPage = RAPOR_PAGE_BY_ID[moduleId];
  if (RaporPage) return RaporPage();
  const AyarPage = AYARLAR_PAGE_BY_ID[moduleId];
  if (AyarPage) return AyarPage();
  const item = ALL_NAV_ITEMS.find((i) => i.id === moduleId);
  return <PlaceholderPage moduleId={moduleId} title={item?.title} />;
}

function AppFooter() {
  const { roleCode } = usePermissions();
  return (
    <PermissionGate module="ayarlar" action="view" mode="disable">
      <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-muted)" }}>
        RBAC aktif · Rol: {roleCode || "—"}
      </div>
    </PermissionGate>
  );
}

function AppLayout() {
  return (
    <ProtectedRoute>
      <AppShell footer={<AppFooter />} />
    </ProtectedRoute>
  );
}

const legacyRedirects: RouteObject[] = Object.entries(LEGACY_PATH_REDIRECTS).map(
  ([legacy, target]) => ({
    path: legacy,
    element: <Navigate to={`/app/${target}`} replace />,
  })
);

/** Eski e-MM yolu → hub sekmesi */
const ebelgeEmmRedirect: RouteObject = {
  path: "e-belge/emm",
  element: <Navigate to="/app/e-belge?section=emm" replace />,
};

const hubRoutes: RouteObject[] = SIDEBAR_HUBS.filter((h) => !h.direct).map((hub) => ({
  path: hub.path,
  element: <ModuleHubPage hubId={hub.id} />,
}));

const moduleRoutes: RouteObject[] = ALL_NAV_ITEMS.map((item) => ({
  path: item.path,
  element:
    item.id === "dashboard" ? (
      <DashboardRoute />
    ) : (
      <ModuleRoute moduleId={item.id} />
    ),
}));

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/setup", element: <SetupWizardPage /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      ...legacyRedirects,
      ebelgeEmmRedirect,
      { path: "ayarlar/tanimlar/fis-no-serileri", element: <Navigate to="/app/ayarlar/program" replace /> },
      { path: "ayarlar/tanimlar/fis-no-serileri-list", element: <DocumentSeriesPage /> },
      ...hubRoutes,
      ...moduleRoutes,
    ],
  },
  { path: "/", element: <Navigate to="/app" replace /> },
  { path: "*", element: <Navigate to="/app" replace /> },
];
