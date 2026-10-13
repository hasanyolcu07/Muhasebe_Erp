/**
 * FAZ 5 — Personel, Puantaj, Bordro ve SGK İşlemleri Veri Tipleri
 * Türkiye Mevzuatı (5510 Sayılı Kanun, 193 Sayılı GVK, 4857 Sayılı İş Kanunu)
 */

export type ContractType = "BELIRSIZ_SURELI" | "BELIRLI_SURELI" | "KISMI_SURELI" | "STAJYER";
export type WageType = "AYLIK" | "SAATLIK" | "GUNLUK";
export type WageCalcType = "BRUTTEN_NETE" | "NETTEN_BRUTE";

export interface PersonelAuditItem {
  id: string;
  date: string;
  changed_by: string;
  field: string;
  old_value: string;
  new_value: string;
  reason?: string;
}

export interface PersonelRecord {
  id: number;
  personel_no: string; // örn. "PER-001"
  first_name: string;
  last_name: string;
  full_name: string;
  tc_kimlik_no: string; // 11 haneli TCKN
  phone: string;
  email: string;
  address: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD veya null
  exit_reason_code?: string | null; // SGK çıkış kodu: 03 İstifa, 04 İşveren feshi vb.
  is_active: boolean;
  branch_id: number;
  branch_name: string;
  department: string; // Ayarlar / Personel tanımları
  meslek_kodu?: string;
  job_title: string; // SGK meslek adı
  sgk_workplace_no: string; // SGK İşyeri Sicil No
  contract_type: ContractType;
  wage_type: WageType;
  wage_calc_type: WageCalcType;
  wage_amount: number; // Ücret tutarı (TL)
  iban: string; // TR...
  bank_name: string;
  sgk_law_code: string; // "05510" (%5 teşvik), "06111", "00000" (teşviksiz)
  disabled_degree?: number; // Engellilik derecesi (1, 2, 3) veya 0
  emergency_contact?: {
    name: string;
    phone: string;
    relation: string;
  };
  audit_history: PersonelAuditItem[];
  created_at: string;
  updated_at: string;
}

export interface PuantajRecord {
  id: number;
  period: string; // "YYYY-MM", örn. "2026-03"
  personel_id: number;
  personel_name: string;
  department: string;
  total_days: number; // Yasal aylık takvim günü (30)
  worked_days: number; // Fiili çalışma günü
  weekly_rest_days: number; // Hafta tatili (4)
  holiday_days: number; // Ulusal bayram ve genel tatil günü
  paid_leave_days: number; // Ücretli izin günü
  unpaid_leave_days: number; // Ücretsiz izin günü
  sick_leave_days: number; // Raporlu / istirahat günü
  absent_days: number; // Mazeretsiz devamsızlık günü
  missing_day_code?: string | null; // SGK eksik gün kodu: "01", "12", "21"
  overtime_hours_150: number; // Normal fazla mesai saati (%50 zamlı)
  overtime_hours_200: number; // Tatil günü fazla mesai saati (%100 zamlı)
  night_hours: number; // Gece çalışma saati
  notes?: string;
  source: "MANUEL" | "EXCEL" | "CIHAZ";
  created_by: string;
  updated_by: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
}

export interface IzinRecord {
  id: number;
  personel_id: number;
  personel_name: string;
  leave_type: "YILLIK_UCRETLI" | "MAZERET" | "UCRETSIZ" | "RAPOR" | "EVLILIK" | "DOGUM" | "OLUM";
  start_date: string;
  end_date: string;
  days_count: number;
  description: string;
  status: "TASLAK" | "ONAYLANDI" | "REDDEDILDI";
  approved_by?: string;
}

export interface BordroRecord {
  id: number;
  period: string; // "2026-03"
  personel_id: number;
  personel_name: string;
  personel_tc: string; // Maskeli TCKN
  department: string;
  job_title: string;
  branch_name: string;
  wage_type: WageType;
  base_wage: number; // Esas ücret
  worked_days: number;
  worked_hours: number;
  normal_earning: number;
  overtime_earning: number;
  holiday_earning: number;
  bonus_earning: number; // Prim / ikramiye
  gross_total: number; // Toplam Brüt Ücret
  sgk_base: number; // SGK Matrahı (taban/tavan sınırlı)
  sgk_employee_share: number; // SGK İşçi Payı (%14)
  unemployment_employee_share: number; // İşsizlik İşçi Payı (%1)
  income_tax_base: number; // Gelir Vergisi Matrahı
  cumulative_income_tax_base: number; // Kümülatif Gelir Vergisi Matrahı
  applicable_tax_bracket_rate: number; // Uygulanan GV dilimi (%15, %20...)
  calculated_income_tax: number; // Hesaplanan Gelir Vergisi
  asgari_ucret_gv_istisnasi: number; // 7349 sayılı Kanun GV İstisnası
  payable_income_tax: number; // Ödenecek Gelir Vergisi
  calculated_stamp_tax: number; // Hesaplanan Damga Vergisi (Binde 7.59)
  asgari_ucret_dv_istisnasi: number; // 7349 sayılı Kanun DV İstisnası
  payable_stamp_tax: number; // Ödenecek Damga Vergisi
  deductions_total: number; // Avans, icra, nafaka, BES kesintisi
  net_payable: number; // Personele Ödenecek Net Ücret
  sgk_employer_share: number; // SGK İşveren Payı (%20.5 veya %15.5)
  unemployment_employer_share: number; // İşsizlik İşveren Payı (%2)
  sgk_incentive_discount: number; // 5510 Sayılı Kanun %5 Hazine Teşviki
  total_employer_cost: number; // Toplam İşveren Maliyeti
  status: "TASLAK" | "KESINLESTI" | "MUHASEBELESTI" | "IPTAL";
  revision_no: number;
  revisions?: Array<{
    date: string;
    revised_by: string;
    reason: string;
    old_net: number;
    new_net: number;
  }>;
  approved_by?: string;
  approved_at?: string;
  journal_voucher_id?: number;
  journal_voucher_no?: string;
}

export type SgkNotificationType = "ISE_GIRIS" | "ISTEN_AYRILIS" | "AYLIK_MUH_SGK";
export type SgkSubmissionStatus =
  | "TASLAK"
  | "DOGRULANDI"
  | "DOSYA_HAZIR"
  | "GONDERIM_BEKLIYOR"
  | "GONDERILDI"
  | "REDDEDILDI";

export interface SgkNotificationRecord {
  id: number;
  type: SgkNotificationType;
  personel_id: number;
  personel_name: string;
  tc_no: string;
  document_date: string; // İşlem tarihi
  event_date: string; // İşe başlama veya işten ayrılış tarihi
  legal_deadline: string; // Yasal son bildirim tarihi
  is_within_legal_period: boolean; // Yasal süresinde mi?
  reason_code?: string; // Ayrılış nedeni kodu (04, 03 vb.)
  workplace_sgk_no: string;
  submission_status: SgkSubmissionStatus;
  is_live_service_available: boolean; // Her zaman false (mock / açık uyarı)
  xml_payload: string;
  notes?: string;
  ilisik_durumu?: "YOK" | "HAZIR";
  ilisik_metin?: string;
  created_at: string;
  updated_at: string;
}

export interface TaxBracket {
  limit: number; // Dilim üst sınırı (TL). Infinity = son dilim
  rate: number; // Oran (0.15, 0.20, 0.27, 0.35, 0.40)
}

export interface PayrollParameterSet {
  period_year: number;
  valid_from: string;
  valid_to: string;
  source: string; // Yasal dayanak ve tebliğ
  asgari_ucret_brut: number;
  sgk_taban: number;
  sgk_tavan: number;
  sgk_isci_orani: number; // 0.14
  issizlik_isci_orani: number; // 0.01
  sgk_isveren_orani: number; // 0.205
  sgk_5510_tesvik_orani: number; // 0.05
  issizlik_isveren_orani: number; // 0.02
  damga_vergisi_orani: number; // 0.00759
  tax_brackets: TaxBracket[];
  asgari_ucret_istisnasi_var: boolean; // true (7349 Sayılı Kanun)
  /** Yıl tablosunda tutar girilmişse hesap bunu kullanır. Boşsa asgari ücretten türetilir. */
  gv_istisna_tutari?: number | null;
  dv_istisna_tutari?: number | null;
}

/**
 * Hassas kişisel verileri maskeleme yardımcıları
 */
export function maskTcKimlikNo(tc: string, hasFullAccess = false): string {
  if (hasFullAccess) return tc;
  if (!tc || tc.length < 11) return "***********";
  return `${tc.slice(0, 3)}*****${tc.slice(8)}`;
}

export function maskIban(iban: string, hasFullAccess = false): string {
  if (hasFullAccess) return iban;
  if (!iban || iban.length < 10) return "TR** **** ****";
  return `${iban.slice(0, 4)} **** **** **** **** ${iban.slice(-4)}`;
}

export function maskWage(amount: number, hasFullAccess = false): string {
  if (hasFullAccess) {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);
  }
  return "***.***,** ₺";
}
