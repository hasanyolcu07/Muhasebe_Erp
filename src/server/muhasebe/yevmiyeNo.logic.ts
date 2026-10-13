/** Şirket ve yıl içinde boşluksuz YEV fiş numarası ve tarih sırası. */

export function tarihGun(value: Date): string {
  const yil = value.getFullYear();
  const ay = String(value.getMonth() + 1).padStart(2, "0");
  const gun = String(value.getDate()).padStart(2, "0");
  return `${yil}-${String(ay)}-${gun}`;
}

export function sonrakiFisNo(yil: number, mevcut: string[]): string {
  const desen = new RegExp(`^YEV-${yil}-(\\d+)$`);
  let enBuyuk = 0;
  for (const no of mevcut) {
    const eslesme = desen.exec(no.trim());
    if (!eslesme) continue;
    const sira = Number(eslesme[1]);
    if (Number.isInteger(sira) && sira > enBuyuk) enBuyuk = sira;
  }
  return `YEV-${yil}-${String(enBuyuk + 1).padStart(5, "0")}`;
}

export function fisTarihiUygun(sonKesin: Date | null, aday: Date): boolean {
  if (!sonKesin) return true;
  return tarihGun(aday) >= tarihGun(sonKesin);
}

/**
 * Kaynak dönem kapalıysa null.
 * Sonraki kesin fiş yoksa kaynak tarihi.
 * Varsa son kesin fişin tarihi; daha eskiye yazılmaz.
 */
export function tersKayitTarihi(kaynak: Date, sonKesin: Date | null, donemAcik: boolean): Date | null {
  if (!donemAcik) return null;
  if (!sonKesin || tarihGun(kaynak) >= tarihGun(sonKesin)) return kaynak;
  return sonKesin;
}
