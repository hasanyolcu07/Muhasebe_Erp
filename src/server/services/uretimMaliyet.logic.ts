import { PublicError } from "../security/publicError";
import { buildProductionCostJournalVoucher, type YevmiyeFisi } from "../../lib/validation/accountingValidation";

/** Kullanıcının girdiği tutarlardan 7/A yansıtma taslağı. Tutar uydurulmaz. */
export function productionCostDraft(input: {
  fisNo: string;
  tarih: string;
  mamulKodu: string;
  mamulAdi: string;
  hammadde: number;
  iscilik: number;
  genelUretim: number;
  chart: "7A" | "7B";
}): YevmiyeFisi {
  if (input.chart === "7B") {
    throw new PublicError("Şirket hesap planı 7/B. Bu fiş 7/A yansıtma hesaplarını kullanır ve yazılmadı.", 409);
  }
  const amounts = [input.hammadde, input.iscilik, input.genelUretim];
  if (amounts.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new PublicError("Hammadde, işçilik ve genel üretim tutarları sıfır veya pozitif olmalıdır.", 400);
  }
  if (amounts.reduce((sum, value) => sum + value, 0) <= 0) {
    throw new PublicError("Maliyet tutarı girilmeden fiş yazılmaz.", 400);
  }
  const voucher = buildProductionCostJournalVoucher({
    fisNo: input.fisNo,
    tarih: input.tarih,
    mamulKodu: input.mamulKodu,
    mamulAdi: input.mamulAdi,
    hammaddeTutari: input.hammadde,
    iscilikTutari: input.iscilik,
    genelUretimTutari: input.genelUretim,
  });
  const debit = voucher.satirlar.reduce((sum, line) => sum + Math.round(line.borc * 100), 0);
  const credit = voucher.satirlar.reduce((sum, line) => sum + Math.round(line.alacak * 100), 0);
  if (debit !== credit) throw new PublicError("Maliyet fişi denk değil. Kayıt yazılmadı.", 422);
  return voucher;
}
