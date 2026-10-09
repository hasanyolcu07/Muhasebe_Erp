/** Fiş türü tanımları — HTML #view-fis-girisi ile uyumlu */
export type FisTypeCode =
  | "TAH"
  | "ODM"
  | "NT"
  | "NO"
  | "AD"
  | "BD"
  | "KK"
  | "KI"
  | "IK"
  | "II"
  | "SK"
  | "VF"
  | "AF"
  | "OF"
  | "KF";

export type FisTypeDef = {
  code: FisTypeCode;
  pillLabel: string;
  fullName: string;
  icon: string;
  needsKasa?: boolean;
  needsPos?: boolean;
  needsKurFarki?: boolean;
  isCredit?: boolean;
};

export const FIS_TYPES: FisTypeDef[] = [
  { code: "TAH", pillLabel: "(TAH) Cari Tahsilat", fullName: "Cari Hesap Tahsilat", icon: "🟢", needsKasa: true },
  { code: "ODM", pillLabel: "(ODM) Cari Ödeme", fullName: "Cari Hesap Ödeme", icon: "🔴", needsKasa: true, isCredit: true },
  { code: "NT", pillLabel: "(NT) Nakit Tahsilat", fullName: "Nakit Tahsilat", icon: "🟢", needsKasa: true },
  { code: "NO", pillLabel: "(NÖ) Nakit Ödeme", fullName: "Nakit Ödeme", icon: "🔴", needsKasa: true, isCredit: true },
  { code: "AD", pillLabel: "(AD) Alacak Dekontu", fullName: "Alacak Dekontu", icon: "🟢" },
  { code: "BD", pillLabel: "(BD) Borç Dekontu", fullName: "Borç Dekontu", icon: "🔴", isCredit: true },
  { code: "KK", pillLabel: "(KK) Kredi Kartı Fişi", fullName: "Kredi Kartı Fişi", icon: "🟢", needsPos: true },
  { code: "KI", pillLabel: "(Kİ) KK İade Fişi", fullName: "Kredi Kartı İade Fişi", icon: "🔴", needsPos: true, isCredit: true },
  { code: "IK", pillLabel: "(İK) İş Yeri POS Fişi", fullName: "İş Yeri Kredi Kartı Fişi", icon: "🟢", needsPos: true },
  { code: "II", pillLabel: "(İİ) İş Yeri POS İade", fullName: "İş Yeri Kredi Kartı İade", icon: "🔴", needsPos: true, isCredit: true },
  { code: "SK", pillLabel: "(SK) Şirket KK Fişi", fullName: "Şirket Kredi Kartı Fişi", icon: "🔴", needsPos: true, isCredit: true },
  { code: "VF", pillLabel: "(VF) Virman Fişi", fullName: "Virman Fişi", icon: "🔄" },
  { code: "AF", pillLabel: "(AF) Açılış Fişi", fullName: "Açılış Fişi", icon: "✨" },
  { code: "OF", pillLabel: "(ÖF) Özel Fiş", fullName: "Özel Fiş", icon: "✨" },
  { code: "KF", pillLabel: "(KF) Kur Farkı Fişi", fullName: "Kur Farkı Fişi", icon: "💱", needsKurFarki: true },
];

export function getFisType(code: string): FisTypeDef | undefined {
  return FIS_TYPES.find((t) => t.code === code);
}

export function fisTypeDisplay(code: string): string {
  const t = getFisType(code);
  if (!t) return code;
  return `(${t.code}) ${t.fullName}`;
}

/** Cari Ödeme butonu — ODM ile aynı mantık, görünen ad farklı */
export const CARI_ODEME_TYPE: FisTypeCode = "ODM";
