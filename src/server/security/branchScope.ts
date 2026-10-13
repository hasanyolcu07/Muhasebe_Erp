import { PublicError } from "./publicError";

/** İstemcinin şube kimliği, oturum şirketinin şube listesinde yoksa reddedilir. */
export function branchWithinCompany(companyBranchIds: number[], requested: unknown): number {
  const fallback = companyBranchIds[0];
  if (requested === undefined || requested === null || requested === "") {
    if (!fallback) throw new PublicError("Şirketin şubesi yok.", 409);
    return fallback;
  }
  const id = Number(requested);
  if (!Number.isInteger(id) || !companyBranchIds.includes(id)) {
    throw new PublicError("Şube bu şirkete ait değil.", 403);
  }
  return id;
}
