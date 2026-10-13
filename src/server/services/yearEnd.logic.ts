/** VUK tek düzen hesap planına göre yıl sonu kapanış ve açılış satırları. Saf hesap; veritabanı yok. */

export const PARAMETER_VERSION = "VUK-TDHP-KAPANIS-1";

export const YEAR_END_OPERATIONS = [
  { key: "kontrol-listesi", label: "Dönem sonu kontrol listesi" },
  { key: "kapanis-fisi", label: "Kapanış fişi" },
  { key: "acilis-fisi", label: "Açılış ve devir fişi" },
  { key: "stok-devir", label: "Stok, amortisman ve maliyet mutabakatı" },
  { key: "yeniden-ac", label: "Önceki dönemi yeniden aç" },
] as const;

export type YearEndOperationKey = (typeof YEAR_END_OPERATIONS)[number]["key"];

export type AccountBalance = {
  code: string;
  name: string;
  debit: number;
  credit: number;
};

export type DraftLine = {
  code: string;
  name: string;
  debit: number;
  credit: number;
  reason: string;
};

export type ChecklistItem = {
  level: "ok" | "uyari" | "hata";
  code: string;
  text: string;
};

import { Decimal } from "../../lib/financialMath";
import { kurusOf, moneyNumber } from "../money";

export function kurus(value: number): number {
  return kurusOf(value);
}

export function fromKurus(value: number): number {
  return moneyNumber(new Decimal(value).div(100));
}

export function netKurus(row: AccountBalance): number {
  return kurus(row.debit) - kurus(row.credit);
}

export function accountClass(code: string): string {
  return String(code || "").trim().charAt(0);
}

export function isBalanceSheet(code: string): boolean {
  const c = accountClass(code);
  return c === "1" || c === "2" || c === "3" || c === "4" || c === "5";
}

export function closingVoucherNo(year: number): string {
  return `KAPANIS-${year}`;
}

export function openingVoucherNo(year: number): string {
  return `ACILIS-${year + 1}`;
}

function line(code: string, name: string, debitKurus: number, creditKurus: number, reason: string): DraftLine {
  return {
    code,
    name,
    debit: fromKurus(debitKurus),
    credit: fromKurus(creditKurus),
    reason,
  };
}

export function booksBalanced(rows: AccountBalance[]): boolean {
  const debit = rows.reduce((s, r) => s + kurus(r.debit), 0);
  const credit = rows.reduce((s, r) => s + kurus(r.credit), 0);
  return debit === credit;
}

/**
 * Gelir tablosu (6) ve maliyet (7) hesaplarını kapatır.
 * 690 ve 692 ara hesaptır; net kâr 590'a, net zarar 591'e devredilir.
 * 1–5 bilanço hesaplarına dokunulmaz.
 */
export function buildClosingLines(rows: AccountBalance[]): { lines: DraftLine[]; error: string | null } {
  if (!booksBalanced(rows)) {
    return { lines: [], error: "Yevmiye borç ve alacak toplamı denk değil. Kapanış fişi üretilmedi." };
  }

  const lines: DraftLine[] = [];
  let expense = 0;
  let revenue = 0;

  for (const row of rows) {
    const cls = accountClass(row.code);
    if (cls !== "6" && cls !== "7") continue;
    if (row.code === "690" || row.code === "692") continue;
    const net = netKurus(row);
    if (net > 0) {
      expense += net;
      lines.push(line(row.code, row.name, 0, net, "Gider veya maliyet hesabı kapanışı"));
    } else if (net < 0) {
      revenue += -net;
      lines.push(line(row.code, row.name, -net, 0, "Gelir hesabı kapanışı"));
    }
  }

  const profit = revenue - expense;
  if (profit > 0) lines.push(line("690", "Dönem Kârı veya Zararı", 0, profit, "Dönem kârı"));
  else if (profit < 0) lines.push(line("690", "Dönem Kârı veya Zararı", -profit, 0, "Dönem zararı"));

  const after = applyLines(rows, lines);
  const net690 = netKurus(after.find((row) => row.code === "690") ?? { code: "690", name: "", debit: 0, credit: 0 });
  const net692 = netKurus(after.find((row) => row.code === "692") ?? { code: "692", name: "", debit: 0, credit: 0 });
  const equityNet = net690 + net692;
  if (net690 > 0) lines.push(line("690", "Dönem Kârı veya Zararı", 0, net690, "690 hesabının kapanışı"));
  else if (net690 < 0) lines.push(line("690", "Dönem Kârı veya Zararı", -net690, 0, "690 hesabının kapanışı"));
  if (net692 > 0) lines.push(line("692", "Dönem Net Kârı veya Zararı", 0, net692, "692 hesabının kapanışı"));
  else if (net692 < 0) lines.push(line("692", "Dönem Net Kârı veya Zararı", -net692, 0, "692 hesabının kapanışı"));
  if (equityNet < 0) lines.push(line("590", "Dönem Net Kârı", 0, -equityNet, "Bilanço kâr hesabına devir"));
  else if (equityNet > 0) lines.push(line("591", "Dönem Net Zararı", equityNet, 0, "Bilanço zarar hesabına devir"));

  if (lines.length === 0) return { lines: [], error: null };

  const debit = lines.reduce((s, l) => s + kurus(l.debit), 0);
  const credit = lines.reduce((s, l) => s + kurus(l.credit), 0);
  if (debit !== credit) {
    return { lines: [], error: "Kapanış fişi kendi içinde denk değil. Kayıt yazılmadı." };
  }
  return { lines, error: null };
}

export function applyLines(rows: AccountBalance[], lines: DraftLine[]): AccountBalance[] {
  const map = new Map<string, AccountBalance>();
  for (const row of rows) {
    map.set(row.code, { ...row, debit: fromKurus(kurus(row.debit)), credit: fromKurus(kurus(row.credit)) });
  }
  for (const item of lines) {
    const current = map.get(item.code) ?? { code: item.code, name: item.name, debit: 0, credit: 0 };
    current.debit = fromKurus(kurus(current.debit) + kurus(item.debit));
    current.credit = fromKurus(kurus(current.credit) + kurus(item.credit));
    if (!current.name) current.name = item.name;
    map.set(item.code, current);
  }
  return [...map.values()];
}

/** Açılış fişi yalnızca 1–5 bilanço hesaplarını, kapanış sonrası bakiyesiyle taşır. */
export function buildOpeningLines(rows: AccountBalance[]): { lines: DraftLine[]; error: string | null } {
  const lines: DraftLine[] = [];
  for (const row of rows) {
    if (!isBalanceSheet(row.code)) continue;
    const net = netKurus(row);
    if (net > 0) lines.push(line(row.code, row.name, net, 0, "Bilanço hesabı açılış devri"));
    else if (net < 0) lines.push(line(row.code, row.name, 0, -net, "Bilanço hesabı açılış devri"));
  }
  const debit = lines.reduce((s, l) => s + kurus(l.debit), 0);
  const credit = lines.reduce((s, l) => s + kurus(l.credit), 0);
  if (debit !== credit) {
    return { lines: [], error: "Bilanço hesapları denk değil. Açılış fişi üretilmedi." };
  }
  const leaked = lines.filter((l) => !isBalanceSheet(l.code));
  if (leaked.length) {
    return { lines: [], error: "Açılış fişine gelir veya maliyet hesabı giremez." };
  }
  return { lines, error: null };
}

export type ChecklistSnapshot = {
  totalDebit: number;
  totalCredit: number;
  unbalancedVouchers: string[];
  invoicesWithoutVoucher: number;
  stockMismatches: number;
  class7ResidualKurus: number;
  stockValueKurus: number;
  inventoryGlKurus: number;
  taxProvisionKurus: number;
};

export function buildChecklist(input: ChecklistSnapshot): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const debit = kurus(input.totalDebit);
  const credit = kurus(input.totalCredit);
  items.push(
    debit === credit
      ? { level: "ok", code: "mizan", text: "Borç ve alacak toplamı denk." }
      : { level: "hata", code: "mizan", text: "Borç ve alacak toplamı denk değil." }
  );
  items.push(
    input.unbalancedVouchers.length === 0
      ? { level: "ok", code: "fis-denge", text: "Dengesiz fiş yok." }
      : {
          level: "hata",
          code: "fis-denge",
          text: `Dengesiz fişler: ${input.unbalancedVouchers.join(", ")}`,
        }
  );
  items.push(
    input.invoicesWithoutVoucher === 0
      ? { level: "ok", code: "belge", text: "Fiş bekleyen kesin fatura yok." }
      : {
          level: "uyari",
          code: "belge",
          text: `${input.invoicesWithoutVoucher} faturada yevmiye fiş numarası yok.`,
        }
  );
  items.push(
    input.stockMismatches === 0
      ? { level: "ok", code: "stok-sayim", text: "Stok kartı miktarı hareket toplamı ile aynı." }
      : {
          level: "uyari",
          code: "stok-sayim",
          text: `${input.stockMismatches} stok kartında miktar farkı var. Kartlar sessizce düzeltilmez.`,
        }
  );
  const stockDiff = input.inventoryGlKurus - input.stockValueKurus;
  items.push(
    stockDiff === 0
      ? { level: "ok", code: "stok-deger", text: "15'li stok hesapları ile stok maliyeti mutabık." }
      : {
          level: "uyari",
          code: "stok-deger",
          text: `Stok hesapları ile kart maliyeti arasında ${fromKurus(stockDiff).toFixed(2)} TL fark var.`,
        }
  );
  items.push(
    input.class7ResidualKurus === 0
      ? { level: "ok", code: "maliyet", text: "7'li maliyet hesaplarında kapanmamış bakiye yok." }
      : {
          level: "uyari",
          code: "maliyet",
          text: "7'li hesaplarda bakiye var. Kapanış fişi bu bakiyeyi 690 üzerinden kapatır; kart miktarı değişmez.",
        }
  );
  items.push({
    level: "uyari",
    code: "amortisman",
    text: "Sabit kıymet defteri bu sürümde yok. Amortisman fişi üretilmedi; kaynak parametresi saklanır.",
  });
  items.push({
    level: "uyari",
    code: "kur",
    text: "Kur değerleme tablosu yok. Kur fişi üretilmedi.",
  });
  items.push(
    input.taxProvisionKurus !== 0
      ? { level: "ok", code: "vergi", text: "691 vergi karşılığı bakiyesi kapanışa dahil edilir." }
      : {
          level: "uyari",
          code: "vergi",
          text: "691 vergi karşılığı yok. Karşılık fişi uydurulmaz; beyanname verilmiş sayılmaz.",
        }
  );
  items.push({
    level: "ok",
    code: "beyanname",
    text: "Resmî beyanname durumu üretilmedi.",
  });
  return items;
}
