/**
 * Yevmiye Otomatik Kayıt ve Öneri Servisi
 * Kaynak Belgeler (Fatura, Banka, Bordro, OCR) ➔ Yapay Zeka / Kural Tabanlı Fiş Önerisi
 *
 * KRİTİK İLKELER:
 * 1. AI/Kural önerisi bir muhasebe kararı değildir; kullanıcı onayı olmadan ASLA kesinleşmez.
 * 2. Öneri kabulü kesinlikle tek seferlik ve IDEMPOTENT olmalıdır; mükerrer yevmiye fişi üretilemez.
 * 3. Her öneri gerekçe, güven puanı ve kaynak belge referansı içermelidir.
 */

import { mockStore } from "@/services/mockDataStore";
import { roundMoney, toDecimal } from "@/lib/financialMath";

export type SuggestionStatus = "BEKLIYOR" | "KABUL_EDILDI" | "REDDEDILDI";

export interface SuggestionLine {
  line_no: number;
  coa_id?: number;
  coa_code: string;
  coa_name: string;
  debit: number;
  credit: number;
  description: string;
}

export interface YevmiyeSuggestion {
  id: number;
  source_type: "FATURA" | "BANKA" | "KASA" | "BORDRO" | "OCR";
  source_id: number;
  source_document_no: string;
  source_date: string;
  amount: number;
  currency: string;
  party_title?: string;
  party_vkn?: string;
  rule_source: string; // örn. "Kural: Alış Faturası Ticari Mal & %20 KDV", "Bordro Tahakkuk Motoru"
  confidence_score: number; // 0.00 - 1.00 (örn. 0.95 = %95)
  justification: string; // Muhasebesel gerekçe açıklaması
  proposed_description: string;
  proposed_lines: SuggestionLine[];
  status: SuggestionStatus;
  created_at: string;
  decision_date?: string;
  decision_user?: string;
  rejection_reason?: string;
  generated_voucher_id?: number;
  generated_voucher_no?: string;
  idempotency_token: string;
}

const INITIAL_SUGGESTIONS: YevmiyeSuggestion[] = [
  {
    id: 1,
    source_type: "FATURA",
    source_id: 101,
    source_document_no: "GIB202600000045",
    source_date: "2026-03-10",
    amount: 120000,
    currency: "TRY",
    party_title: "Yıldız Çelik Haddesi San. Ltd.",
    party_vkn: "1234567890",
    rule_source: "Kural: İmalat Hammadde (150) & İndirilecek KDV (191)",
    confidence_score: 0.98,
    justification: "Satıcı VKN tanımlı ve ürün çivi imalat filmaşin teli olduğundan 150.01 İlk Madde ve 191.01 %20 İndirilecek KDV hesaplarına atanmıştır.",
    proposed_description: "GIB202600000045 Nolu Filmaşin Teli Alış Faturası",
    proposed_lines: [
      {
        line_no: 1,
        coa_code: "150.01.001",
        coa_name: "İlk Madde ve Malzeme (Filmaşin Tel)",
        debit: 100000,
        credit: 0,
        description: "Hammadde girişi matrahı",
      },
      {
        line_no: 2,
        coa_code: "191.01.001",
        coa_name: "İndirilecek KDV (%20)",
        debit: 20000,
        credit: 0,
        description: "%20 KDV tahakkuku",
      },
      {
        line_no: 3,
        coa_code: "320.01.002",
        coa_name: "Yıldız Çelik Haddesi San. Ltd.",
        debit: 0,
        credit: 120000,
        description: "Tedarikçi borç kaydı",
      },
    ],
    status: "BEKLIYOR",
    created_at: "2026-03-10T11:00:00Z",
    idempotency_token: "sug-fat-101-20260310",
  },
  {
    id: 2,
    source_type: "BANKA",
    source_id: 204,
    source_document_no: "BNK-2026-00891",
    source_date: "2026-03-12",
    amount: 72000,
    currency: "TRY",
    party_title: "Anadolu Palet ve Ambalaj Ltd. Şti.",
    party_vkn: "9876543210",
    rule_source: "Kural: Müşteri Havale Tahsilatı (102 ➔ 120)",
    confidence_score: 0.94,
    justification: "Banka ekstresi açıklamasındaki 'Anadolu Palet FAT-0001 Tahsilatı' ifadesi müşteri cari kartı ile tam eşleşti.",
    proposed_description: "Anadolu Palet Havale Tahsilat Dekontu",
    proposed_lines: [
      {
        line_no: 1,
        coa_code: "102.01.001",
        coa_name: "Garanti BBVA Ticari TL",
        debit: 72000,
        credit: 0,
        description: "Gelen havale tahsilatı",
      },
      {
        line_no: 2,
        coa_code: "120.01.001",
        coa_name: "Anadolu Palet ve Ambalaj Ltd. Şti.",
        debit: 0,
        credit: 72000,
        description: "Müşteri alacak kapatma",
      },
    ],
    status: "BEKLIYOR",
    created_at: "2026-03-12T14:30:00Z",
    idempotency_token: "sug-bnk-204-20260312",
  },
  {
    id: 3,
    source_type: "OCR",
    source_id: 301,
    source_document_no: "YKT-2026-4412",
    source_date: "2026-03-14",
    amount: 3600,
    currency: "TRY",
    party_title: "Opet Akaryakıt İstasyonu A.Ş.",
    party_vkn: "5551239988",
    rule_source: "AI OCR: Akaryakıt Fişi Çıkarımı",
    confidence_score: 0.88,
    justification: "OCR ile okunan plaka ve akaryakıt kalemi 770 Taşıt Yakıt Gideri ve 191 KDV hesaplarıyla eşleştirildi.",
    proposed_description: "34 ABC 123 Servis Aracı Mazot Alım Fişi",
    proposed_lines: [
      {
        line_no: 1,
        coa_code: "770.05.001",
        coa_name: "Genel Yönetim Taşıt Yakıt Giderleri",
        debit: 3000,
        credit: 0,
        description: "Akaryakıt matrahı (Motorin)",
      },
      {
        line_no: 2,
        coa_code: "191.01.001",
        coa_name: "İndirilecek KDV (%20)",
        debit: 600,
        credit: 0,
        description: "%20 Akaryakıt KDV",
      },
      {
        line_no: 3,
        coa_code: "100.01.001",
        coa_name: "Merkez Kasa",
        debit: 0,
        credit: 3600,
        description: "Nakit kasa ödemesi",
      },
    ],
    status: "BEKLIYOR",
    created_at: "2026-03-14T09:15:00Z",
    idempotency_token: "sug-ocr-301-20260314",
  },
];

export class YevmiyeSuggestionService {
  private getStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = localStorage.getItem(`tabia_yevmiye_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`tabia_yevmiye_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage write error:", e);
    }
  }

  getSuggestions(): YevmiyeSuggestion[] {
    return this.getStorage<YevmiyeSuggestion[]>("suggestions", INITIAL_SUGGESTIONS);
  }

  getSuggestionById(id: number): YevmiyeSuggestion | undefined {
    return this.getSuggestions().find((s) => s.id === id);
  }

  addSuggestion(suggestion: Omit<YevmiyeSuggestion, "id" | "status" | "created_at">): YevmiyeSuggestion {
    const list = this.getSuggestions();
    // Mükerrer token denetimi
    const existing = list.find((s) => s.idempotency_token === suggestion.idempotency_token);
    if (existing) {
      return existing;
    }

    const newId = list.length > 0 ? Math.max(...list.map((s) => s.id)) + 1 : 1;
    const created: YevmiyeSuggestion = {
      ...suggestion,
      id: newId,
      status: "BEKLIYOR",
      created_at: new Date().toISOString(),
    };
    list.unshift(created);
    this.setStorage("suggestions", list);
    return created;
  }

  /**
   * Öneriyi Aynen veya Düzenleyerek Kabul Etme (IDEMPOTENT)
   */
  acceptSuggestion(
    id: number,
    customLines?: SuggestionLine[],
    user = "Kullanıcı"
  ): { success: boolean; voucher: any; suggestion: YevmiyeSuggestion } {
    const list = this.getSuggestions();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Öneri #${id} bulunamadı.`);
    }

    const sug = list[idx];
    if (sug.status === "KABUL_EDILDI") {
      // Çift işlem engeli (idempotency)
      if (sug.generated_voucher_id) {
        const existingVoucher = mockStore.getVoucher(sug.generated_voucher_id);
        if (existingVoucher) {
          return { success: true, voucher: existingVoucher, suggestion: sug };
        }
      }
      throw new Error(`Öneri #${id} daha önceden kabul edilmiş ve fiş oluşturulmuştur. Mükerrer kayıt oluşturulamaz.`);
    }

    if (sug.status === "REDDEDILDI") {
      throw new Error(`Öneri #${id} reddedilmiştir. Yeniden oluşturulmadan kabul edilemez.`);
    }

    const linesToPost = customLines && customLines.length >= 2 ? customLines : sug.proposed_lines;

    // Çift kayıt (Borç = Alacak) denetimi
    const totalDebit = linesToPost.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = linesToPost.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      throw new Error(
        `Önerilen fişte Borç (${roundMoney(totalDebit)} TL) ve Alacak (${roundMoney(totalCredit)} TL) tutarları eşit değildir!`
      );
    }

    // Yevmiye fişini kesin olarak kaydet
    const createdVoucher = mockStore.saveVoucher({
      voucher_date: sug.source_date || new Date().toISOString().slice(0, 10),
      description: sug.proposed_description,
      status: "POSTED",
      lines: linesToPost.map((l, i) => ({
        line_no: i + 1,
        coa_code: l.coa_code,
        coa_name: l.coa_name,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || sug.proposed_description,
      })),
    });

    // Öneri durumunu güncelle
    sug.status = "KABUL_EDILDI";
    sug.decision_date = new Date().toISOString();
    sug.decision_user = user;
    sug.generated_voucher_id = createdVoucher.id;
    sug.generated_voucher_no = createdVoucher.voucher_no;
    sug.proposed_lines = linesToPost;

    list[idx] = sug;
    this.setStorage("suggestions", list);

    return {
      success: true,
      voucher: createdVoucher,
      suggestion: sug,
    };
  }

  /**
   * Öneriyi Reddetme
   */
  rejectSuggestion(id: number, reason: string, user = "Kullanıcı"): YevmiyeSuggestion {
    const list = this.getSuggestions();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Öneri #${id} bulunamadı.`);
    }

    const sug = list[idx];
    if (sug.status === "KABUL_EDILDI") {
      throw new Error(`Kabul edilmiş öneri reddedilemez. Lütfen yevmiye fişini inceleyin.`);
    }

    sug.status = "REDDEDILDI";
    sug.rejection_reason = reason || "Kullanıcı tarafından reddedildi.";
    sug.decision_date = new Date().toISOString();
    sug.decision_user = user;

    list[idx] = sug;
    this.setStorage("suggestions", list);
    return sug;
  }
}

export const yevmiyeSuggestionService = new YevmiyeSuggestionService();
