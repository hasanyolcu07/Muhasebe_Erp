import { Prisma } from "@prisma/client";
import { Decimal, toDecimal } from "../../lib/financialMath";
import { prisma } from "../prisma";
import { PublicError } from "../security/publicError";

const TARIH = /^\d{4}-\d{2}-\d{2}$/;

export type ParametreSatir = {
  anahtar: string;
  deger: Prisma.Decimal | Decimal | string | number;
  gecerlilikBaslangic: string;
  gecerlilikBitis: string | null;
};

function assertTarih(tarih: string): void {
  if (!TARIH.test(tarih)) {
    throw new PublicError("Parametre tarihi YYYY-AA-GG olmalıdır.", 400);
  }
}

/** Geçerli tek satırı seçer. Kayıt yoksa veya aralık çakışırsa hata verir. */
export function parametreSec(satirlar: ParametreSatir[], anahtar: string, tarih: string): Decimal {
  assertTarih(tarih);
  const bulunan = satirlar.filter((satir) => {
    if (satir.anahtar !== anahtar) return false;
    if (satir.gecerlilikBaslangic > tarih) return false;
    if (satir.gecerlilikBitis != null && satir.gecerlilikBitis < tarih) return false;
    return true;
  });
  if (bulunan.length === 0) {
    throw new PublicError(`${anahtar} için ${tarih} tarihinde geçerli mevzuat parametresi yok.`, 422);
  }
  if (bulunan.length > 1) {
    throw new PublicError(`${anahtar} için ${tarih} tarihinde birden fazla mevzuat parametresi var.`, 422);
  }
  return toDecimal(String(bulunan[0].deger));
}

function gun(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getMevzuatParametre(anahtar: string, tarih: string): Promise<Decimal> {
  assertTarih(tarih);
  const gunTarih = new Date(`${tarih}T00:00:00.000Z`);
  const rows = await prisma.mevzuatParametre.findMany({
    where: {
      anahtar,
      gecerlilikBaslangic: { lte: gunTarih },
      OR: [{ gecerlilikBitis: null }, { gecerlilikBitis: { gte: gunTarih } }],
    },
  });
  return parametreSec(
    rows.map((row) => ({
      anahtar: row.anahtar,
      deger: row.deger,
      gecerlilikBaslangic: gun(row.gecerlilikBaslangic),
      gecerlilikBitis: row.gecerlilikBitis ? gun(row.gecerlilikBitis) : null,
    })),
    anahtar,
    tarih,
  );
}
