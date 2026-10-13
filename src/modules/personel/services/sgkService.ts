/**
 * SGK 4A İşe Giriş ve İşten Ayrılış Bildirgesi Servisi
 * Resmî Kaynak: SGK 4A Sigortalı İşe Giriş ve İşten Ayrılış Bildirgesi Teknik Kılavuzu
 * URL: https://e.sgk.gov.tr/Uygulamalar/Detay/4a-Sigortali-Ise-Giris-ve-Isten-Ayrilis-Bildirgesi-2024-10-02-10-08-51
 *
 * KRİTİK GÜVENLİK KURALI:
 * Canlı SGK e-Bildirge/Web Servis kimlik bilgileri ve işyeri sertifikası olmadan
 * "SGK'ya başarıyla gönderildi" simülasyonu KESİNLİKLE YAPILAMAZ.
 * Sistem durumu 'DOSYA_HAZIR' veya 'GONDERIM_BEKLIYOR' olarak tutar ve kullanıcıya
 * SGK portalına yüklenecek resmî XML dosyasını indirme imkanı verir.
 */

import { validateTCKN } from "@/lib/validation/taxIdValidation";
import type {
  PersonelRecord,
  SgkNotificationRecord,
  SgkNotificationType,
  SgkSubmissionStatus,
} from "../types/personelTypes";

/**
 * SGK 4A Yasal Bildirim Süresi Kontrolü (5510 Sayılı Kanun Madde 8 ve Madde 9):
 * - İşe Giriş: Kural olarak işe başlamadan en geç 1 gün önce (özel sektör).
 * - İşten Ayrılış: İşten ayrılış tarihini takip eden 10 gün içinde.
 */
export function checkSgkLegalDeadline(
  type: SgkNotificationType,
  eventDate: string,
  noticeDate: string = new Date().toISOString().slice(0, 10)
): { deadlineDate: string; isWithinLegalPeriod: boolean; description: string } {
  const event = new Date(eventDate);
  const notice = new Date(noticeDate);

  if (type === "ISE_GIRIS") {
    // 1 gün öncesi
    const deadline = new Date(event);
    deadline.setDate(deadline.getDate() - 1);
    const deadlineStr = deadline.toISOString().slice(0, 10);
    const isWithin = notice <= deadline;
    return {
      deadlineDate: deadlineStr,
      isWithinLegalPeriod: isWithin,
      description: isWithin
        ? "Yasal süreye uygun (İşe başlama tarihinden en geç 1 gün önce bildiriliyor)."
        : `YASAL SÜRE AŞIMI UYARISI: İşe giriş bildiriminin en geç ${deadlineStr} tarihine kadar yapılması gerekiyordu. İdari para cezası (İPC) riski bulunmaktadır.`,
    };
  } else if (type === "ISTEN_AYRILIS") {
    // 10 gün içinde
    const deadline = new Date(event);
    deadline.setDate(deadline.getDate() + 10);
    const deadlineStr = deadline.toISOString().slice(0, 10);
    const isWithin = notice <= deadline;
    return {
      deadlineDate: deadlineStr,
      isWithinLegalPeriod: isWithin,
      description: isWithin
        ? "Yasal süreye uygun (Ayrılış tarihinden itibaren 10 günlük bildirim süresi içinde)."
        : `YASAL SÜRE AŞIMI UYARISI: İşten ayrılış bildiriminin en geç ${deadlineStr} tarihine kadar yapılması gerekiyordu. 5510 s. Kanun Madde 102 uyarınca asgari ücret tutarında İPC uygulanabilir.`,
    };
  }

  return {
    deadlineDate: eventDate,
    isWithinLegalPeriod: true,
    description: "Dönemsel bildirim kontrolü uygulandı.",
  };
}

/**
 * SGK e-Sigorta Portalı uyumlu 4A XML şablonu oluşturucu
 */
export function buildSgkXmlPayload(
  type: SgkNotificationType,
  personel: PersonelRecord,
  eventDate: string,
  reasonCode?: string
): string {
  const docTypeTag = type === "ISE_GIRIS" ? "IseGirisBildirgesi" : "IstenAyrilisBildirgesi";
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<SGK_Bildirge_Paketi xmlns="http://sgk.gov.tr/ebildirge/4a" versiyon="2024.10">
  <Header>
    <IsyeriSicilNo>${personel.sgk_workplace_no || ""}</IsyeriSicilNo>
    <UretimTarihi>${now}</UretimTarihi>
    <Uygulama>TabiaERP-v1.3</Uygulama>
  </Header>
  <${docTypeTag}>
    <Sigortali>
      <TCKN>${personel.tc_kimlik_no}</TCKN>
      <Ad>${personel.first_name}</Ad>
      <Soyad>${personel.last_name}</Soyad>
      <IseBaslamaTarihi>${type === "ISE_GIRIS" ? eventDate : personel.start_date}</IseBaslamaTarihi>
      ${type === "ISTEN_AYRILIS" ? `<IstenAyrilisTarihi>${eventDate}</IstenAyrilisTarihi>` : ""}
      ${type === "ISTEN_AYRILIS" && reasonCode ? `<AyrilisNedeniKodu>${reasonCode}</AyrilisNedeniKodu>` : ""}
      <MeslekKodu>${personel.meslek_kodu || ""}</MeslekKodu>
      <MeslekAdi>${personel.job_title}</MeslekAdi>
      <KanunKodu>${personel.sgk_law_code || ""}</KanunKodu>
      <SigortaKolu>4A_NORMAL</SigortaKolu>
      <SozlesmeTuru>${personel.contract_type}</SozlesmeTuru>
      <UcretTuru>${personel.wage_type}</UcretTuru>
    </Sigortali>
  </${docTypeTag}>
</SGK_Bildirge_Paketi>`.trim();
}

/**
 * Yeni SGK Bildirim Kaydı oluşturur ve ön doğrulamaları tamamlar
 */
export function prepareSgkNotification(
  type: SgkNotificationType,
  personel: PersonelRecord,
  eventDate: string,
  reasonCode?: string
): SgkNotificationRecord {
  // TCKN doğrulaması zorunludur
  if (!validateTCKN(personel.tc_kimlik_no)) {
    throw new Error(
      `Geçersiz TC Kimlik Numarası (${personel.tc_kimlik_no}). Resmî SGK bildirgesi oluşturulamaz.`
    );
  }
  if (!String(personel.sgk_workplace_no || "").trim()) {
    throw new Error("SGK işyeri sicil numarası personel kartında yok. Bildirge hazırlanmadı.");
  }

  const { deadlineDate, isWithinLegalPeriod, description } = checkSgkLegalDeadline(type, eventDate);
  const xml = buildSgkXmlPayload(type, personel, eventDate, reasonCode);

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type,
    personel_id: personel.id,
    personel_name: personel.full_name,
    tc_no: personel.tc_kimlik_no,
    document_date: new Date().toISOString().slice(0, 10),
    event_date: eventDate,
    legal_deadline: deadlineDate,
    is_within_legal_period: isWithinLegalPeriod,
    reason_code: reasonCode,
    workplace_sgk_no: personel.sgk_workplace_no,
    submission_status: "DOSYA_HAZIR", // Gerçek web servis bağlı olmadığı için dosya indirilebilir hazır durumda
    is_live_service_available: false,
    xml_payload: xml,
    notes: description,
    ilisik_durumu: type === "ISTEN_AYRILIS" ? "YOK" : undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const CIKIS_NEDENI: Record<string, string> = {
  "03": "Belirsiz süreli iş sözleşmesinin işçi tarafından feshi (istifa)",
  "04": "Belirsiz süreli iş sözleşmesinin işveren tarafından haklı sebep bildirilmeden feshi",
  "05": "Belirli süreli iş sözleşmesinin sona ermesi",
  "08": "Emeklilik (yaşlılık) veya toptan ödeme",
  "16": "Aynı işverene ait başka işyerine nakil",
  "22": "Diğer nedenler",
};

/** İş Kanunu md. 28 çalışma belgesi ve 5510 md. 9 ayrılış bilgisi. SGK kabulü değildir. */
export function buildIlisikKesmeBelgesi(personel: PersonelRecord, eventDate: string, reasonCode?: string): string {
  const neden = CIKIS_NEDENI[reasonCode || ""] || "Kartta seçilen çıkış kodu";
  return [
    "İLİŞİK KESME / ÇALIŞMA BELGESİ",
    "Dayanak: 4857 sayılı İş Kanunu madde 28 ve 5510 sayılı Kanun madde 9.",
    "Bu metin personel kartındaki bilgilerle hazırlanmıştır. SGK'ya iletildiği anlamına gelmez.",
    `Personel: ${personel.full_name}`,
    `TCKN: ${personel.tc_kimlik_no}`,
    `Meslek: ${personel.meslek_kodu || "-"} ${personel.job_title}`,
    `İşyeri SGK sicil: ${personel.sgk_workplace_no}`,
    `Kanun no: ${personel.sgk_law_code || "-"}`,
    `İşe giriş: ${personel.start_date}`,
    `İşten ayrılış: ${eventDate}`,
    `SGK çıkış kodu: ${reasonCode || "-"} — ${neden}`,
    `Sözleşme: ${personel.contract_type}`,
    `Düzenleme tarihi: ${new Date().toISOString().slice(0, 10)}`,
  ].join("\n");
}

/**
 * Resmî SGK Web Servisi gönderim simülasyonu engellemesi:
 * Kullanıcı "Gönder" butonuna bastığında sahte başarı VERİLMEZ.
 */
export function attemptSgkSubmission(
  recordId: number
): { success: false; message: string; recommendedAction: string; status: SgkSubmissionStatus } {
  return {
    success: false,
    status: "GONDERIM_BEKLIYOR",
    message:
      "SGK Web Servis bağlantısı ve e-Bildirge v2 API kimlik bilgileri yapılandırılmamış. Mevzuat güvenliği gereği sahte gönderim onayı verilmez.",
    recommendedAction:
      "Hazırlanan resmî XML paketini 'XML İndir' butonuyla bilgisayarınıza indirin ve https://ebildirge.sgk.gov.tr portalı üzerinden '4A Toplu Dosya Transferi' adımıyla yükleyin.",
  };
}
