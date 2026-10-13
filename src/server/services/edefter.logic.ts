import { createHash } from "node:crypto";

export type EdefterLine = { hesapKodu: string; borc: number; alacak: number; aciklama: string };
export type EdefterVoucher = {
  fisNo: string;
  tarih: string;
  aciklama: string;
  toplamBorc: number;
  toplamAlacak: number;
  lines: EdefterLine[];
};

import { kurusOf } from "../money";

function kurus(value: number): number {
  return kurusOf(value);
}

export function validateEdefter(vouchers: EdefterVoucher[], periodClosed: boolean): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (vouchers.length === 0) errors.push("Bu dönemde yevmiye fişi yok. Boş dönem paketi üretilmedi.");
  let debit = 0;
  let credit = 0;
  for (const voucher of vouchers) {
    debit += kurus(voucher.toplamBorc);
    credit += kurus(voucher.toplamAlacak);
    if (kurus(voucher.toplamBorc) !== kurus(voucher.toplamAlacak)) {
      errors.push(`${voucher.fisNo} fişi borç ve alacak olarak denk değil.`);
    }
    if (voucher.lines.length === 0) errors.push(`${voucher.fisNo} fişinde satır yok.`);
    for (const line of voucher.lines) {
      if (!String(line.hesapKodu || "").trim()) errors.push(`${voucher.fisNo} satırında hesap kodu eksik.`);
    }
  }
  if (vouchers.length > 0 && debit !== credit) errors.push("Dönem yevmiye toplamı denk değil.");
  if (periodClosed) warnings.push("Dönem kilitli. Paket mevcut fişlerden okundu; yeni fiş eklenemez.");
  warnings.push("Bu çıktı resmî GİB XBRL beratı değildir. Berat onayı yazılmaz.");
  return { ok: errors.length === 0, errors, warnings };
}

export function journalHash(vouchers: EdefterVoucher[]): string {
  const canonical = JSON.stringify(vouchers);
  return createHash("sha256").update(canonical).digest("hex");
}

export function shouldRevise(existingCount: number, rebuild: boolean): { create: boolean; error: string | null } {
  if (existingCount === 0) return { create: true, error: null };
  if (!rebuild) {
    return {
      create: false,
      error: "Bu dönem daha önce hazırlandı. Mevcut paket ezilmez. Yeni revizyon için yeniden oluşturmayı onaylayın.",
    };
  }
  return { create: true, error: null };
}
