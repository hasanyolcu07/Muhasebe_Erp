import { prisma } from "../prisma";
import { PublicError } from "../security/publicError";

/** Kapalı mali yılda fiş yazılmasını ve silinmesini engeller. Kayıt yoksa dönemi açık kabul eder. */
export async function assertPeriodOpen(companyId: number, date: Date): Promise<void> {
  const year = date.getFullYear();
  const period = await prisma.fiscalPeriod.findUnique({
    where: { companyId_year: { companyId, year } },
  });
  if (period?.isClosed) {
    throw new PublicError(`${year} mali dönemi kilitli. Bu tarihe kayıt yapılamaz.`, 409);
  }
}
