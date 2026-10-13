export type PayrollAmounts = {
  brut: number;
  sgkIsci: number;
  issizlik: number;
  sgkIsveren: number;
  gelirVergisi: number;
  damga: number;
  net: number;
};

export type PayrollLine = { code: string; name: string; debit: number; credit: number; reason: string };

import { Decimal } from "../../lib/financialMath";
import { kurusOf, moneyNumber } from "../money";

function kurus(value: number): number {
  return kurusOf(value);
}

function lira(value: number): number {
  return moneyNumber(new Decimal(value).div(100));
}

export function uretimPersonel(profil: unknown, birim: unknown): boolean {
  const kayit = profil && typeof profil === "object" && !Array.isArray(profil) ? (profil as Record<string, unknown>) : {};
  const ham = String(birim || kayit.departman || kayit.department_code || kayit.gorev || "").trim();
  const kod = ham.toLocaleUpperCase("tr-TR").replaceAll("İ", "I").replaceAll("Ü", "U");
  return kod === "URETIM";
}

/** Bordro taslak fişi. Kesinleşmez. Satırlar kuruşta denktir. */
export function bordroGiderHesabi(uretim: boolean, maliyetYontemi: string): "770" | "720" | "791" {
  // TODO(MEVZUAT-DOGRULA): 7/B şirkette üretim dışı ücretin 770'de kalması mı, 791/792'ye alınıp yansıtılması mı gerektiği.
  if (!uretim) return "770";
  return maliyetYontemi === "7B" ? "791" : "720";
}

export function buildPayrollDraftLines(
  amounts: PayrollAmounts,
  giderHesabi: "770" | "720" | "791" = "770",
): PayrollLine[] {
  const expense = kurus(amounts.brut) + kurus(amounts.sgkIsveren);
  let net = kurus(amounts.net);
  const sgk = kurus(amounts.sgkIsci) + kurus(amounts.issizlik) + kurus(amounts.sgkIsveren);
  let tax = kurus(amounts.gelirVergisi) + kurus(amounts.damga);
  const gap = expense - (net + sgk + tax);
  if (tax + gap >= 0) tax += gap;
  else net += gap;
  const giderAdi =
    giderHesabi === "720" ? "Direkt İşçilik Giderleri" : giderHesabi === "791" ? "İşçi Ücret ve Giderleri" : "Genel Yönetim Giderleri";
  const lines: PayrollLine[] = [
    { code: giderHesabi, name: giderAdi, debit: lira(expense), credit: 0, reason: "Brüt ücret ve işveren SGK" },
    { code: "335", name: "Personele Borçlar", debit: 0, credit: lira(net), reason: "Net ücret" },
    { code: "361", name: "Ödenecek Sosyal Güvenlik Kesintileri", debit: 0, credit: lira(sgk), reason: "SGK işçi, işsizlik ve işveren payı" },
    { code: "360", name: "Ödenecek Vergi ve Fonlar", debit: 0, credit: lira(tax), reason: "Gelir vergisi ve damga vergisi. 360.01 KDV tevkifatından ayrıdır." },
  ];
  return lines.filter((line) => kurus(line.debit) !== 0 || kurus(line.credit) !== 0);
}
