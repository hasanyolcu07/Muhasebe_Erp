import { useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { AccessDeniedScreen } from "@/components/ProtectedRoute";
import {
  CariKartlarPage,
  GelirGiderKartlariPage,
  KasaBankaKartlariPage,
  SabitKiymetPage,
  StokFiyatListeleriPage,
} from "@/modules/kart-tanimlari";
import { StokHareketPage } from "@/modules/stok-depo";
import {
  BankaIslemleriPage,
  BankaKredileriPage,
  CariIslemleriPage,
  CekSenetIslemleriPage,
  FisDekontPage,
  KasaIslemleriPage,
} from "@/modules/finans-islemleri";
import { DocumentHubSection } from "@/modules/satis-satin-alma/components/DocumentHubSection";
import { BelgeAkisiHubPage } from "@/modules/siparis/pages/BelgeAkisiHubPage";
import { IncomingDocumentsSection, OutgoingDocumentsSection } from "@/modules/e-belge/components/DocumentsSection";
import { EmmHubPage } from "@/modules/e-belge/emm/pages/EmmHubPage";
import { UretimHubPage } from "@/modules/uretim";
import { YevmiyeDefterHubPage } from "@/modules/yevmiye";
import { BeyannameHubPage } from "@/modules/beyanname";
import { ReportsHubPage } from "@/modules/raporlar";
import { ExcelImportPage } from "@/modules/excel-import/pages/ExcelImportPage";
import { SablonTasarimciPage } from "@/modules/sablon/pages/SablonTasarimciPage";
import { AyarlarHubPage, FirmaKullaniciPage } from "@/modules/ayarlar";
import {
  PersonelKartlarView,
  IseGirisCikisView,
  PuantajView,
  IzinDevamsizlikView,
  BordroHesaplamaView,
  BordroListesiView,
  SgkBildirimView,
  PersonelRaporlarView,
  PersonelParametrelerView,
} from "@/modules/personel/components";
import { KobiIslemleriPage } from "@/modules/kobi/KobiIslemleriPage";

const CONTENT_KEY_MODULE: Record<string, string> = {
  "satis-faturalar": "fatura",
  "satis-irsaliyeler": "irsaliye",
  "satis-siparisler": "fatura",
  "satis-teklifler": "fatura",
  "alis-faturalar": "fatura",
  "alis-irsaliyeler": "irsaliye",
  "alis-siparisler": "fatura",
  "alis-teklifler": "fatura",
  "stok-hareket": "stok",
  "kasa-islemleri": "finans",
  "banka-islemleri": "finans",
  "cek-senet-islemleri": "finans",
  "cari-islemleri": "finans",
  "fis-dekont": "finans",
  "banka-kredileri": "finans",
  "ebelge-giden": "e_belge",
  "ebelge-gelen": "e_belge",
  "ebelge-emm": "e_belge",
  "uretim-emir": "maliyet",
  "uretim-bom": "maliyet",
  "uretim-plan": "maliyet",
  "uretim-makina": "maliyet",
  "uretim-maliyet-butce": "maliyet",
  "yevmiye-fisleri": "resmi_muhasebe",
  "yevmiye-defter": "resmi_muhasebe",
  "beyanname": "resmi_muhasebe",
  "cari-kartlar": "cari",
  "stok-fiyat-listeleri": "stok",
  "sabit-kiymet": "finans",
  "kasa-banka-kartlari": "finans",
  "gelir-gider-kartlari": "finans",
  reports: "raporlar",
  "excel-import": "raporlar",
  "sablon-tasarimci": "raporlar",
  "ayr-tanimlar": "ayarlar",
  "ayr-firma-kullanici": "ayarlar",
  "ayr-sistem": "ayarlar",
  "ayr-program": "ayarlar",
  "ayr-lisans": "ayarlar",
  "personel-kartlar": "personel",
  "ise-giris-cikis": "personel",
  puantaj: "personel",
  "izin-devamsizlik": "personel",
  "bordro-hesaplama": "personel",
  "bordro-listesi": "personel",
  "sgk-bildirim": "personel",
  "personel-raporlar": "personel",
  "personel-parametreleri": "personel",
  "kobi-ortaklik": "kobi",
  "kobi-yatirim": "kobi",
};

function DocEmbed({
  title,
  side,
  module,
}: {
  title: string;
  side: "sales" | "purchase";
  module: "fatura" | "irsaliye";
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <DocumentHubSection
      title={title}
      side={side}
      module={module}
      refreshKey={refreshKey}
      onRefresh={() => setRefreshKey((k) => k + 1)}
    />
  );
}

function renderRawContent(contentKey: string) {
  switch (contentKey) {
    case "satis-faturalar":
      return <DocEmbed title="Satış Faturaları" side="sales" module="fatura" />;
    case "satis-irsaliyeler":
      return <DocEmbed title="Satış İrsaliyeleri" side="sales" module="irsaliye" />;
    case "satis-siparisler":
      return <BelgeAkisiHubPage docKind="SIPARIS" fixedDirection="ALINAN" hideDirectionSwitcher />;
    case "satis-teklifler":
      return <BelgeAkisiHubPage docKind="TEKLIF" fixedDirection="ALINAN" hideDirectionSwitcher />;
    case "alis-faturalar":
      return <DocEmbed title="Alış Faturaları" side="purchase" module="fatura" />;
    case "alis-irsaliyeler":
      return <DocEmbed title="Alış İrsaliyeleri" side="purchase" module="irsaliye" />;
    case "alis-siparisler":
      return <BelgeAkisiHubPage docKind="SIPARIS" fixedDirection="VERILEN" hideDirectionSwitcher />;
    case "alis-teklifler":
      return <BelgeAkisiHubPage docKind="TEKLIF" fixedDirection="VERILEN" hideDirectionSwitcher />;
    case "stok-hareket":
      return <StokHareketPage />;

    case "kasa-islemleri":
      return <KasaIslemleriPage />;
    case "banka-islemleri":
      return <BankaIslemleriPage />;
    case "cek-senet-islemleri":
      return <CekSenetIslemleriPage />;
    case "cari-islemleri":
      return <CariIslemleriPage />;
    case "fis-dekont":
      return <FisDekontPage />;
    case "banka-kredileri":
      return <BankaKredileriPage />;

    case "ebelge-giden":
      return <OutgoingDocumentsSection />;
    case "ebelge-gelen":
      return <IncomingDocumentsSection />;
    case "ebelge-emm":
      return <EmmHubPage />;

    case "uretim-emir":
      return <UretimHubPage embeddedSection="emir" />;
    case "uretim-bom":
      return <UretimHubPage embeddedSection="bom" />;
    case "uretim-plan":
      return <UretimHubPage embeddedSection="plan" />;
    case "uretim-makina":
      return <UretimHubPage embeddedSection="makina" />;
    case "uretim-maliyet-butce":
      return <UretimHubPage embeddedSection="maliyet-butce" />;

    case "yevmiye-fisleri":
      return <YevmiyeDefterHubPage showTabs />;
    case "yevmiye-defter":
      return <YevmiyeDefterHubPage showTabs />;
    case "beyanname":
      return <BeyannameHubPage />;

    case "cari-kartlar":
      return <CariKartlarPage />;
    case "stok-fiyat-listeleri":
      return <StokFiyatListeleriPage />;
    case "sabit-kiymet":
      return <SabitKiymetPage />;
    case "kasa-banka-kartlari":
      return <KasaBankaKartlariPage />;
    case "gelir-gider-kartlari":
      return <GelirGiderKartlariPage />;

    case "reports":
      return <ReportsHubPage />;
    case "excel-import":
      return <ExcelImportPage />;
    case "sablon-tasarimci":
      return <SablonTasarimciPage />;

    case "ayr-tanimlar":
      return <AyarlarHubPage hub="tanimlar" />;
    case "ayr-firma-kullanici":
      return <FirmaKullaniciPage />;
    case "ayr-sistem":
      return <AyarlarHubPage hub="sistem" />;
    case "ayr-program":
      return <AyarlarHubPage hub="program" />;
    case "ayr-lisans":
      return <AyarlarHubPage hub="lisans" />;

    case "personel-kartlar":
      return <PersonelKartlarView />;
    case "ise-giris-cikis":
      return <IseGirisCikisView />;
    case "puantaj":
      return <PuantajView />;
    case "izin-devamsizlik":
      return <IzinDevamsizlikView />;
    case "bordro-hesaplama":
      return <BordroHesaplamaView />;
    case "bordro-listesi":
      return <BordroListesiView />;
    case "sgk-bildirim":
      return <SgkBildirimView />;
    case "personel-raporlar":
      return <PersonelRaporlarView />;
    case "personel-parametreleri":
      return <PersonelParametrelerView />;
    case "kobi-ortaklik":
      return <KobiIslemleriPage mode="ortaklik" />;
    case "kobi-yatirim":
      return <KobiIslemleriPage mode="yatirim" />;

    default:
      return <div className="card" style={{ padding: 16 }}>Bölüm bulunamadı: {contentKey}</div>;
  }
}

/** Hub içeriği — mevcut ekranları gömer ve modül bazlı yetkilendirme uygular */
export function HubContent({ contentKey }: { contentKey: string }) {
  const mod = CONTENT_KEY_MODULE[contentKey];
  const node = renderRawContent(contentKey);
  if (!mod) return node;

  return (
    <PermissionGate
      module={mod}
      action="view"
      fallback={<AccessDeniedScreen module={mod} action="view" />}
    >
      {node}
    </PermissionGate>
  );
}
