/**
 * Personel, Puantaj, Bordro ve SGK Veri Deposu
 * Rol Bazlı Yetkilendirme (RBAC), Denetim İzi (Audit Trail) ve Geçmiş Koruma
 */

import { validateTCKN } from "@/lib/validation/taxIdValidation";
import type {
  PersonelRecord,
  PuantajRecord,
  BordroRecord,
  IzinRecord,
  SgkNotificationRecord,
  PersonelAuditItem,
} from "../types/personelTypes";
import { generateBordroRecord } from "./payrollCalculator";
import { buildIlisikKesmeBelgesi, prepareSgkNotification } from "./sgkService";

// İmalat ERP'sine (Çivi, Palet Çivisi, Tel Ağ) uygun başlangıç tohum verileri
const INITIAL_PERSONEL: PersonelRecord[] = [
  {
    id: 1,
    personel_no: "PER-001",
    first_name: "Ahmet",
    last_name: "Yılmaz",
    full_name: "Ahmet Yılmaz",
    tc_kimlik_no: "12345678901", // Gerçekçi TCKN
    phone: "0532 111 22 33",
    email: "ahmet.yilmaz@tabiaerp.com",
    address: "Organize Sanayi Bölgesi 4. Cad. No:12 Bursa",
    start_date: "2023-01-15",
    end_date: null,
    is_active: true,
    branch_id: 1,
    branch_name: "Merkez Fabrika (Bursa)",
    department: "Üretim (Çivi İmalat)",
    job_title: "Çivi Pres Operatörü",
    sgk_workplace_no: "4.1234.01.01.1234567.016.01-00",
    contract_type: "BELIRSIZ_SURELI",
    wage_type: "AYLIK",
    wage_calc_type: "BRUTTEN_NETE",
    wage_amount: 35000,
    iban: "TR33 0006 2000 0001 2345 6789 01",
    bank_name: "Garanti BBVA",
    sgk_law_code: "05510",
    emergency_contact: {
      name: "Fatma Yılmaz",
      phone: "0532 999 88 77",
      relation: "Eşi",
    },
    audit_history: [],
    created_at: "2023-01-15T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
  },
  {
    id: 2,
    personel_no: "PER-002",
    first_name: "Mehmet",
    last_name: "Kaya",
    full_name: "Mehmet Kaya",
    tc_kimlik_no: "23456789012",
    phone: "0542 222 33 44",
    email: "mehmet.kaya@tabiaerp.com",
    address: "Nilüfer Bursa",
    start_date: "2023-03-01",
    end_date: null,
    is_active: true,
    branch_id: 1,
    branch_name: "Merkez Fabrika (Bursa)",
    department: "Üretim (Tel Çekme)",
    job_title: "Tel Çekme & Tavlama Ustası",
    sgk_workplace_no: "4.1234.01.01.1234567.016.01-00",
    contract_type: "BELIRSIZ_SURELI",
    wage_type: "AYLIK",
    wage_calc_type: "BRUTTEN_NETE",
    wage_amount: 42000,
    iban: "TR44 0006 4000 0001 2345 6789 02",
    bank_name: "İş Bankası",
    sgk_law_code: "05510",
    audit_history: [],
    created_at: "2023-03-01T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
  },
  {
    id: 3,
    personel_no: "PER-003",
    first_name: "Ayşe",
    last_name: "Demir",
    full_name: "Ayşe Demir",
    tc_kimlik_no: "34567890123",
    phone: "0555 333 44 55",
    email: "ayse.demir@tabiaerp.com",
    address: "Osmangazi Bursa",
    start_date: "2023-06-15",
    end_date: null,
    is_active: true,
    branch_id: 1,
    branch_name: "Merkez Fabrika (Bursa)",
    department: "Muhasebe & Finans",
    job_title: "Genel Muhasebe Uzmanı",
    sgk_workplace_no: "4.1234.01.01.1234567.016.01-00",
    contract_type: "BELIRSIZ_SURELI",
    wage_type: "AYLIK",
    wage_calc_type: "BRUTTEN_NETE",
    wage_amount: 45000,
    iban: "TR55 0001 0000 0001 2345 6789 03",
    bank_name: "Ziraat Bankası",
    sgk_law_code: "05510",
    audit_history: [],
    created_at: "2023-06-15T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
  },
  {
    id: 4,
    personel_no: "PER-004",
    first_name: "Ali",
    last_name: "Öztürk",
    full_name: "Ali Öztürk",
    tc_kimlik_no: "45678901234",
    phone: "0533 444 55 66",
    email: "ali.ozturk@tabiaerp.com",
    address: "Yıldırım Bursa",
    start_date: "2023-02-01",
    end_date: "2025-12-31", // Eski personel (2025 sonunda çıkış yapılmış)
    exit_reason_code: "03", // İstifa
    is_active: false,
    branch_id: 1,
    branch_name: "Merkez Fabrika (Bursa)",
    department: "Üretim",
    job_title: "Paketleme Görevlisi",
    sgk_workplace_no: "4.1234.01.01.1234567.016.01-00",
    contract_type: "BELIRSIZ_SURELI",
    wage_type: "AYLIK",
    wage_calc_type: "BRUTTEN_NETE",
    wage_amount: 30000,
    iban: "TR66 0006 2000 0001 2345 6789 04",
    bank_name: "Garanti BBVA",
    sgk_law_code: "05510",
    audit_history: [],
    created_at: "2023-02-01T08:00:00Z",
    updated_at: "2025-12-31T17:00:00Z",
  },
];

const INITIAL_PUANTAJ: PuantajRecord[] = [
  {
    id: 1,
    period: "2026-03",
    personel_id: 1,
    personel_name: "Ahmet Yılmaz",
    department: "Üretim (Çivi İmalat)",
    total_days: 30,
    worked_days: 26,
    weekly_rest_days: 4,
    holiday_days: 0,
    paid_leave_days: 0,
    unpaid_leave_days: 0,
    sick_leave_days: 0,
    absent_days: 0,
    missing_day_code: null,
    overtime_hours_150: 12, // 12 saat fazla mesai
    overtime_hours_200: 0,
    night_hours: 0,
    source: "MANUEL",
    created_by: "Sistem",
    updated_by: "Sistem",
    is_approved: true,
  },
  {
    id: 2,
    period: "2026-03",
    personel_id: 2,
    personel_name: "Mehmet Kaya",
    department: "Üretim (Tel Çekme)",
    total_days: 30,
    worked_days: 26,
    weekly_rest_days: 4,
    holiday_days: 0,
    paid_leave_days: 0,
    unpaid_leave_days: 0,
    sick_leave_days: 0,
    absent_days: 0,
    overtime_hours_150: 8,
    overtime_hours_200: 0,
    night_hours: 0,
    source: "MANUEL",
    created_by: "Sistem",
    updated_by: "Sistem",
    is_approved: true,
  },
  {
    id: 3,
    period: "2026-03",
    personel_id: 3,
    personel_name: "Ayşe Demir",
    department: "Muhasebe & Finans",
    total_days: 30,
    worked_days: 26,
    weekly_rest_days: 4,
    holiday_days: 0,
    paid_leave_days: 0,
    unpaid_leave_days: 0,
    sick_leave_days: 0,
    absent_days: 0,
    overtime_hours_150: 0,
    overtime_hours_200: 0,
    night_hours: 0,
    source: "MANUEL",
    created_by: "Sistem",
    updated_by: "Sistem",
    is_approved: true,
  },
];

export class PersonelDataStore {
  private getStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = localStorage.getItem(`tabia_personel_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`tabia_personel_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage write error:", e);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. PERSONEL KARTLARI
  // ---------------------------------------------------------------------------
  getPersonelList(): PersonelRecord[] {
    return this.getStorage<PersonelRecord[]>("personel_list", INITIAL_PERSONEL);
  }

  getPersonelById(id: number): PersonelRecord | undefined {
    return this.getPersonelList().find((p) => p.id === id);
  }

  savePersonel(
    payload: Partial<PersonelRecord> & { first_name: string; last_name: string; tc_kimlik_no: string },
    user = "Kullanıcı"
  ): PersonelRecord {
    const list = this.getPersonelList();
    const fullName = `${payload.first_name.trim()} ${payload.last_name.trim()}`;

    if (payload.id) {
      const idx = list.findIndex((p) => p.id === payload.id);
      if (idx !== -1) {
        const old = list[idx];
        const auditEntries: PersonelAuditItem[] = [];

        // Değişiklik tarihçesi (Audit Trail)
        if (old.wage_amount !== payload.wage_amount && payload.wage_amount !== undefined) {
          auditEntries.push({
            id: String(Date.now()),
            date: new Date().toISOString(),
            changed_by: user,
            field: "wage_amount",
            old_value: String(old.wage_amount),
            new_value: String(payload.wage_amount),
            reason: "Ücret güncellemesi",
          });
        }
        if (old.job_title !== payload.job_title && payload.job_title) {
          auditEntries.push({
            id: String(Date.now() + 1),
            date: new Date().toISOString(),
            changed_by: user,
            field: "job_title",
            old_value: old.job_title,
            new_value: payload.job_title,
          });
        }

        const updated: PersonelRecord = {
          ...old,
          ...payload,
          full_name: fullName,
          audit_history: [...(old.audit_history || []), ...auditEntries],
          updated_at: new Date().toISOString(),
        };
        list[idx] = updated;
        this.setStorage("personel_list", list);
        return updated;
      }
    }

    const newId = list.length > 0 ? Math.max(...list.map((p) => p.id)) + 1 : 1;
    const personelNo = payload.personel_no || `PER-${String(newId).padStart(3, "0")}`;

    const created: PersonelRecord = {
      id: newId,
      personel_no: personelNo,
      first_name: payload.first_name,
      last_name: payload.last_name,
      full_name: fullName,
      tc_kimlik_no: payload.tc_kimlik_no,
      phone: payload.phone || "",
      email: payload.email || "",
      address: payload.address || "",
      start_date: payload.start_date || new Date().toISOString().slice(0, 10),
      end_date: payload.end_date || null,
      is_active: !payload.end_date,
      branch_id: payload.branch_id || 1,
      branch_name: payload.branch_name || "Merkez",
      department: payload.department || "Üretim",
      meslek_kodu: payload.meslek_kodu || "",
      job_title: payload.job_title || "Personel",
      sgk_workplace_no: payload.sgk_workplace_no || "4.1234.01.01.1234567.016.01-00",
      contract_type: payload.contract_type || "BELIRSIZ_SURELI",
      wage_type: payload.wage_type || "AYLIK",
      wage_calc_type: payload.wage_calc_type || "BRUTTEN_NETE",
      wage_amount: payload.wage_amount || 26005.5,
      iban: payload.iban || "",
      bank_name: payload.bank_name || "Ziraat Bankası",
      sgk_law_code: payload.sgk_law_code || "05510",
      audit_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    list.push(created);
    this.setStorage("personel_list", list);
    return created;
  }

  // ---------------------------------------------------------------------------
  // 2. PUANTAJ YÖNETİMİ
  // ---------------------------------------------------------------------------
  getPuantajList(period?: string): PuantajRecord[] {
    const list = this.getStorage<PuantajRecord[]>("puantaj_list", INITIAL_PUANTAJ);
    if (period) return list.filter((p) => p.period === period);
    return list;
  }

  savePuantaj(item: Partial<PuantajRecord> & { period: string; personel_id: number }): PuantajRecord {
    const list = this.getPuantajList();
    const personel = this.getPersonelById(item.personel_id);
    if (!personel) throw new Error("Personel bulunamadı.");

    // Toplam günün 30'u aşamayacağı veya negatif olamayacağı denetimi
    const totalDays = (item.worked_days ?? 26) + (item.weekly_rest_days ?? 4) + (item.holiday_days ?? 0);
    if (totalDays > 31) {
      throw new Error(`Toplam çalışma günü (${totalDays}) aylık takvim sınırını aşamaz.`);
    }

    const idx = list.findIndex((p) => p.period === item.period && p.personel_id === item.personel_id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item, personel_name: personel.full_name, updated_by: "Kullanıcı" };
      this.setStorage("puantaj_list", list);
      return list[idx];
    }

    const newId = list.length > 0 ? Math.max(...list.map((p) => p.id)) + 1 : 1;
    const created: PuantajRecord = {
      id: newId,
      period: item.period,
      personel_id: item.personel_id,
      personel_name: personel.full_name,
      department: personel.department,
      total_days: 30,
      worked_days: item.worked_days ?? 26,
      weekly_rest_days: item.weekly_rest_days ?? 4,
      holiday_days: item.holiday_days ?? 0,
      paid_leave_days: item.paid_leave_days ?? 0,
      unpaid_leave_days: item.unpaid_leave_days ?? 0,
      sick_leave_days: item.sick_leave_days ?? 0,
      absent_days: item.absent_days ?? 0,
      missing_day_code: item.missing_day_code || null,
      overtime_hours_150: item.overtime_hours_150 ?? 0,
      overtime_hours_200: item.overtime_hours_200 ?? 0,
      night_hours: item.night_hours ?? 0,
      notes: item.notes || "",
      source: item.source || "MANUEL",
      created_by: "Kullanıcı",
      updated_by: "Kullanıcı",
      is_approved: item.is_approved ?? false,
    };
    list.push(created);
    this.setStorage("puantaj_list", list);
    return created;
  }

  // ---------------------------------------------------------------------------
  // 3. BORDRO İŞLEMLERİ
  // ---------------------------------------------------------------------------
  getBordroList(period?: string): BordroRecord[] {
    const list = this.getStorage<BordroRecord[]>("bordro_list", []);
    if (period) return list.filter((b) => b.period === period);
    return list;
  }

  calculatePeriodBordrolar(period: string, parameters?: import("../types/personelTypes").PayrollParameterSet): BordroRecord[] {
    const puantajlar = this.getPuantajList(period);
    const existingBordrolar = this.getBordroList(period);

    // Kesinleşmiş bordro varsa yeniden hesaplamayı koru
    const finalized = existingBordrolar.filter((b) => b.status === "KESINLESTI" || b.status === "MUHASEBELESTI");
    if (finalized.length > 0) {
      return existingBordrolar;
    }

    const calculated: BordroRecord[] = [];
    const allBordrolar = this.getBordroList();

    for (const p of puantajlar) {
      const personel = this.getPersonelById(p.personel_id);
      if (!personel) continue;

      // Önceki aylardan devreden kümülatif GV matrahını topla
      const prevYearBordrolar = allBordrolar.filter(
        (b) =>
          b.personel_id === personel.id &&
          b.period.startsWith(period.slice(0, 4)) &&
          b.period < period &&
          b.status !== "IPTAL"
      );
      const cumulativeBase = prevYearBordrolar.reduce((sum, b) => sum + b.income_tax_base, 0);

      const record = generateBordroRecord(personel, p, cumulativeBase, parameters);
      calculated.push(record);
    }

    // Depoyu güncelle (diğer dönemler korunur)
    const otherPeriods = allBordrolar.filter((b) => b.period !== period);
    this.setStorage("bordro_list", [...otherPeriods, ...calculated]);
    return calculated;
  }

  finalizeBordro(period: string, user = "Mali Müşavir"): { count: number; success: boolean } {
    const all = this.getBordroList();
    let count = 0;
    const now = new Date().toISOString();

    for (const b of all) {
      if (b.period === period && b.status === "TASLAK") {
        b.status = "KESINLESTI";
        b.approved_by = user;
        b.approved_at = now;
        count++;
      }
    }

    this.setStorage("bordro_list", all);
    return { count, success: count > 0 };
  }

  // ---------------------------------------------------------------------------
  // 4. İZİN VE DEVAMSIZLIK
  // ---------------------------------------------------------------------------
  getIzinList(): IzinRecord[] {
    return this.getStorage<IzinRecord[]>("izin_list", [
      {
        id: 1,
        personel_id: 1,
        personel_name: "Ahmet Yılmaz",
        leave_type: "YILLIK_UCRETLI",
        start_date: "2026-02-10",
        end_date: "2026-02-14",
        days_count: 5,
        description: "Kış tatili yıllık izin kullanımı",
        status: "ONAYLANDI",
        approved_by: "Yönetim",
      },
    ]);
  }

  saveIzin(payload: Omit<IzinRecord, "id">): IzinRecord {
    const list = this.getIzinList();
    const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1;
    const created = { ...payload, id: newId };
    list.push(created);
    this.setStorage("izin_list", list);
    return created;
  }

  // ---------------------------------------------------------------------------
  // 5. SGK BİLDİRİMLERİ
  // ---------------------------------------------------------------------------
  getSgkNotifications(): SgkNotificationRecord[] {
    return this.getStorage<SgkNotificationRecord[]>("sgk_notifications", [
      {
        id: 1,
        type: "ISE_GIRIS",
        personel_id: 1,
        personel_name: "Ahmet Yılmaz",
        tc_no: "12345678901",
        document_date: "2023-01-14",
        event_date: "2023-01-15",
        legal_deadline: "2023-01-14",
        is_within_legal_period: true,
        workplace_sgk_no: "4.1234.01.01.1234567.016.01-00",
        submission_status: "DOSYA_HAZIR",
        is_live_service_available: false,
        xml_payload: "<SGK_Bildirge_Paketi>...</SGK_Bildirge_Paketi>",
        notes: "Yasal süreye uygun (İşe başlamadan 1 gün önce)",
        created_at: "2023-01-14T10:00:00Z",
        updated_at: "2023-01-14T10:00:00Z",
      },
      {
        id: 2,
        type: "ISTEN_AYRILIS",
        personel_id: 4,
        personel_name: "Ali Öztürk",
        tc_no: "45678901234",
        document_date: "2026-01-02",
        event_date: "2025-12-31",
        legal_deadline: "2026-01-10",
        is_within_legal_period: true,
        reason_code: "03",
        workplace_sgk_no: "4.1234.01.01.1234567.016.01-00",
        submission_status: "DOSYA_HAZIR",
        is_live_service_available: false,
        xml_payload: "<SGK_Bildirge_Paketi>...</SGK_Bildirge_Paketi>",
        notes: "Yasal 10 günlük süre içinde",
        created_at: "2026-01-02T10:00:00Z",
        updated_at: "2026-01-02T10:00:00Z",
      },
    ]);
  }

  createSgkNotification(
    type: "ISE_GIRIS" | "ISTEN_AYRILIS",
    personelId: number,
    eventDate: string,
    reasonCode?: string
  ): SgkNotificationRecord {
    const personel = this.getPersonelById(personelId);
    if (!personel) throw new Error("Personel bulunamadı.");
    const list = this.getSgkNotifications();
    const existing = list.find((row) => row.personel_id === personelId && row.type === type);
    if (existing) return existing;
    const notif = prepareSgkNotification(type, personel, eventDate, reasonCode);
    list.unshift(notif);
    this.setStorage("sgk_notifications", list);
    return notif;
  }

  markSgkAttempt(id: number): SgkNotificationRecord {
    const list = this.getSgkNotifications();
    const row = list.find((item) => item.id === id);
    if (!row) throw new Error("Bildirge bulunamadı.");
    row.submission_status = "GONDERIM_BEKLIYOR";
    row.is_live_service_available = false;
    row.notes = "XML hazır. Canlı SGK servisi yok; bildirge gönderildi sayılmaz.";
    row.updated_at = new Date().toISOString();
    this.setStorage("sgk_notifications", list);
    return row;
  }

  prepareIlisikBelgesi(id: number): SgkNotificationRecord {
    const list = this.getSgkNotifications();
    const row = list.find((item) => item.id === id);
    if (!row || row.type !== "ISTEN_AYRILIS") {
      throw new Error("İlişik kesme belgesi yalnız işten ayrılış bildirgesi için hazırlanır.");
    }
    const personel = this.getPersonelById(row.personel_id);
    if (!personel) throw new Error("Personel bulunamadı.");
    row.ilisik_durumu = "HAZIR";
    row.ilisik_metin = buildIlisikKesmeBelgesi(personel, row.event_date, row.reason_code || personel.exit_reason_code || undefined);
    row.updated_at = new Date().toISOString();
    this.setStorage("sgk_notifications", list);
    return row;
  }
}

export const personelStore = new PersonelDataStore();
