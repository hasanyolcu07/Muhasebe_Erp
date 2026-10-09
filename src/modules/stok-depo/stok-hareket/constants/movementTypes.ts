export type MovementType = "GIRIS" | "CIKIS" | "TRANSFER" | "SAYIM" | "FIRE";

export const MOVEMENT_TYPE_PILLS: {
  id: string;
  type: MovementType;
  label: string;
  icon: string;
  variant: "green" | "red" | "amber" | "blue" | "default";
  defaultReason: string;
}[] = [
  { id: "giris", type: "GIRIS", label: "Stok Giriş", icon: "➕", variant: "green", defaultReason: "ALIS" },
  { id: "cikis", type: "CIKIS", label: "Stok Çıkış", icon: "➖", variant: "red", defaultReason: "SATIS" },
  { id: "transfer", type: "TRANSFER", label: "Depo Transfer", icon: "🔄", variant: "amber", defaultReason: "DEPOLAR_ARASI" },
  { id: "sayim", type: "SAYIM", label: "Sayım", icon: "📋", variant: "blue", defaultReason: "SAYIM" },
  { id: "fire", type: "FIRE", label: "Fire / Zayiat", icon: "🔥", variant: "red", defaultReason: "FIRE" },
];

export const REASON_OPTIONS: Record<MovementType, { value: string; label: string }[]> = {
  GIRIS: [
    { value: "ALIS", label: "Alış" },
    { value: "IADE", label: "İade" },
    { value: "URETIMDEN_GIRIS", label: "Üretimden Giriş" },
    { value: "SAYIM_FAZLASI", label: "Sayım Fazlası" },
    { value: "DIGER", label: "Diğer" },
  ],
  CIKIS: [
    { value: "SATIS", label: "Satış" },
    { value: "IADE", label: "İade" },
    { value: "FIRE", label: "Fire" },
    { value: "SAYIM_EKSIGI", label: "Sayım Eksiği" },
    { value: "SARF", label: "Sarf" },
    { value: "DIGER", label: "Diğer" },
  ],
  TRANSFER: [{ value: "DEPOLAR_ARASI", label: "Depolar Arası" }],
  SAYIM: [
    { value: "SAYIM", label: "Sayım" },
    { value: "SAYIM_FAZLASI", label: "Sayım Fazlası" },
    { value: "SAYIM_EKSIGI", label: "Sayım Eksiği" },
  ],
  FIRE: [
    { value: "FIRE", label: "Fire" },
    { value: "ZAYIAT", label: "Zayiat" },
  ],
};

export const STOK_DOC_TYPES: Record<MovementType, string> = {
  GIRIS: "STOK_GIRIS",
  CIKIS: "STOK_CIKIS",
  TRANSFER: "STOK_TRANSFER",
  SAYIM: "STOK_SAYIM",
  FIRE: "STOK_FIRE",
};
