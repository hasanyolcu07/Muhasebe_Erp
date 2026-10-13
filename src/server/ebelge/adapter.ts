export type UblTrSatir = {
  id: string;
  name: string;
  quantity: string;
  unitCode: string;
  priceAmount: string;
  lineExtensionAmount: string;
  taxPercent: string;
  taxAmount: string;
};

/** GİB UBL-TR fatura alanları. Bu yapı gönderim onayı değildir. */
export type UblTrFatura = {
  uuid: string;
  id: string;
  issueDate: string;
  invoiceTypeCode: "SATIS" | "IADE";
  profileId: "TEMELFATURA";
  documentCurrencyCode: "TRY";
  supplierVkn: string;
  customerVkn: string;
  taxExclusiveAmount: string;
  taxAmount: string;
  payableAmount: string;
  lines: UblTrSatir[];
};

export type EBelgeSonuc = {
  durum: "GONDERIM_BEKLIYOR";
  uuid: string;
  mesaj: string;
};

export interface EBelgeAdapter {
  gonder(belge: UblTrFatura): Promise<EBelgeSonuc>;
}

/** Gerçek entegratör yok. Sonuç hiçbir zaman GİB onayı taşımaz. */
export class MockEBelgeAdapter implements EBelgeAdapter {
  async gonder(belge: UblTrFatura): Promise<EBelgeSonuc> {
    if (!belge.uuid || !belge.id || !belge.issueDate || belge.lines.length === 0) {
      throw new Error("UBL-TR alanları eksik. Belge gönderilmedi.");
    }
    return {
      durum: "GONDERIM_BEKLIYOR",
      uuid: belge.uuid,
      mesaj: "Mock e-belge adaptörü. GİB onayı yok.",
    };
  }
}

export function ublBirimKodu(birim: string): string {
  const kod = birim.trim().toUpperCase();
  if (kod === "ADET") return "C62";
  if (kod === "KG") return "KGM";
  if (kod === "TON") return "TNE";
  // TODO(MEVZUAT-DOGRULA): Bobin için UN/ECE birim kodu doğrulanacak. Kod uydurulmadı.
  if (kod === "BOBIN") return "BOBIN";
  return kod;
}
