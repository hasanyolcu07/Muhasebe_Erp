export type TaxRateItem = { id: number; code: string; name: string; rate: number };
export type TevkifatItem = { id: number; code: string; name: string; rate: number };

export const TAX_RATES: TaxRateItem[] = [
  { id: 1, code: "KDV0", name: "KDV %0", rate: 0 },
  { id: 2, code: "KDV1", name: "KDV %1", rate: 1 },
  { id: 3, code: "KDV10", name: "KDV %10", rate: 10 },
  { id: 4, code: "KDV20", name: "KDV %20", rate: 20 },
];

/** GİB tevkifat kodları. Oran, tevkif edilen KDV payıdır. */
export const TEVKIFAT_CODES: TevkifatItem[] = [
  { id: 1, code: "601", name: "Yapım işleri", rate: 0.4 },
  { id: 2, code: "602", name: "Etüt, plan-proje", rate: 0.9 },
  { id: 3, code: "603", name: "Makine, teçhizat tadil, bakım, onarım", rate: 0.7 },
  { id: 4, code: "604", name: "Yemek servis", rate: 0.5 },
  { id: 5, code: "605", name: "Organizasyon", rate: 0.5 },
  { id: 6, code: "606", name: "İşgücü temin", rate: 0.9 },
  { id: 7, code: "607", name: "Özel güvenlik", rate: 0.9 },
  { id: 8, code: "608", name: "Yapı denetim", rate: 0.9 },
  { id: 9, code: "609", name: "Fason tekstil", rate: 0.7 },
  { id: 10, code: "610", name: "Turistik mağaza müşteri bulma", rate: 0.9 },
  { id: 11, code: "611", name: "Spor kulübü yayın", rate: 0.9 },
  { id: 12, code: "612", name: "Demir-çelik ürünleri", rate: 0.4 },
  { id: 13, code: "613", name: "Bakır, çinko, alüminyum", rate: 0.7 },
  { id: 14, code: "614", name: "Hurda ve atık", rate: 0.7 },
  { id: 15, code: "615", name: "Hurda metal dışı", rate: 0.7 },
];

export const STOCK_UNITS = [
  { id: 1, code: "ADET", name: "Adet" },
  { id: 2, code: "KG", name: "Kilogram" },
  { id: 3, code: "TON", name: "Ton" },
  { id: 4, code: "M", name: "Metre" },
  { id: 5, code: "M2", name: "Metrekare" },
  { id: 6, code: "LT", name: "Litre" },
];

export const RECORD_TYPES = [
  { id: 1, code: "RESMI", name: "Resmi", muhasebelessin_mi: true, raporda_gorunsun_mu: true },
  { id: 2, code: "GAYRI", name: "Gayriresmi", muhasebelessin_mi: false, raporda_gorunsun_mu: true },
];
