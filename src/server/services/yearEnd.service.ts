import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { moneyNumber, money } from "../money";
import { PublicError } from "../security/publicError";
import {
  PARAMETER_VERSION,
  YEAR_END_OPERATIONS,
  type AccountBalance,
  type ChecklistItem,
  type DraftLine,
  type YearEndOperationKey,
  accountClass,
  applyLines,
  buildChecklist,
  buildClosingLines,
  buildOpeningLines,
  closingVoucherNo,
  fromKurus,
  kurus,
  netKurus,
  openingVoucherNo,
} from "./yearEnd.logic";

const OPS = new Set<string>(YEAR_END_OPERATIONS.map((op) => op.key));

function dec(value: unknown): number {
  return moneyNumber(value);
}

function yearStart(year: number): Date {
  return new Date(year, 0, 1, 0, 0, 0, 0);
}

function closingDate(year: number): Date {
  return new Date(year, 11, 31, 12, 0, 0, 0);
}

function openingDate(year: number): Date {
  return new Date(year + 1, 0, 1, 12, 0, 0, 0);
}

type Db = Prisma.TransactionClient | typeof prisma;

async function parameterVersion(companyId: number): Promise<string> {
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId } });
  return `${PARAMETER_VERSION}/${ayar?.maliyetYontemi || "7A"}`;
}

async function loadBalances(db: Db, companyId: number, year: number): Promise<{
  rows: AccountBalance[];
  unbalanced: string[];
}> {
  const start = yearStart(year);
  const end = yearStart(year + 1);
  // TODO(MEVZUAT-DOGRULA): 7/B'de 790-797 bakiyesi kapanıştan önce 798/799 ile stok ve satışların maliyetine bölünmeden 690'a gider. Yansıtma satırı uydurulmaz.
  const donem = { companyId, durum: "KESIN", tarih: { gte: start, lt: end } };
  const lines = await db.yevmiyeSatir.findMany({
    where: { yevmiyeKaydi: donem },
    select: { hesapKodu: true, borc: true, alacak: true },
  });
  const names = await db.hesapPlani.findMany({
    where: { companyId },
    select: { kod: true, ad: true },
  });
  const nameOf = new Map(names.map((n) => [n.kod, n.ad]));
  const map = new Map<string, AccountBalance>();
  for (const line of lines) {
    const code = line.hesapKodu.trim();
    const current = map.get(code) ?? { code, name: nameOf.get(code) || code, debit: 0, credit: 0 };
    current.debit = fromKurus(kurus(current.debit) + kurus(dec(line.borc)));
    current.credit = fromKurus(kurus(current.credit) + kurus(dec(line.alacak)));
    map.set(code, current);
  }
  for (const code of ["590", "591", "690"]) {
    if (!map.has(code)) {
      map.set(code, { code, name: nameOf.get(code) || fallbackName(code), debit: 0, credit: 0 });
    }
  }
  const vouchers = await db.yevmiyeKaydi.findMany({
    where: donem,
    select: { fisNo: true, toplamBorc: true, toplamAlacak: true },
  });
  const unbalanced = vouchers
    .filter((v) => kurus(dec(v.toplamBorc)) !== kurus(dec(v.toplamAlacak)))
    .map((v) => v.fisNo);
  return { rows: [...map.values()].sort((a, b) => a.code.localeCompare(b.code, "tr")), unbalanced };
}

function fallbackName(code: string): string {
  if (code === "590") return "Dönem Net Kârı";
  if (code === "591") return "Dönem Net Zararı";
  if (code === "690") return "Dönem Kârı veya Zararı";
  return code;
}

async function snapshot(companyId: number, year: number, rows: AccountBalance[], unbalanced: string[]) {
  const end = yearStart(year + 1);
  const invoicesWithoutVoucher = await prisma.fatura.count({
    where: {
      companyId,
      tarih: { gte: yearStart(year), lt: end },
      durum: { not: "TASLAK" },
      yevmiyeFisNo: null,
    },
  });
  const cards = await prisma.stokKart.findMany({
    where: { companyId },
    include: { hareketler: { select: { giris: true, cikis: true } } },
  });
  let stockMismatches = 0;
  let stockValue = 0;
  for (const card of cards) {
    const qty = card.hareketler.reduce((s, h) => s + dec(h.giris) - dec(h.cikis), 0);
    const cardQty = dec(card.mevcutMiktar);
    if (Math.round(qty * 10000) !== Math.round(cardQty * 10000)) stockMismatches += 1;
    stockValue += kurus(money(qty).mul(money(card.alisFiyati.toString())).toNumber());
  }
  let inventoryGl = 0;
  let class7 = 0;
  let tax = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const row of rows) {
    totalDebit += kurus(row.debit);
    totalCredit += kurus(row.credit);
    if (row.code.startsWith("15")) inventoryGl += netKurus(row);
    if (accountClass(row.code) === "7") class7 += Math.abs(netKurus(row));
    if (row.code === "691") tax = netKurus(row);
  }
  const checklist = buildChecklist({
    totalDebit: fromKurus(totalDebit),
    totalCredit: fromKurus(totalCredit),
    unbalancedVouchers: unbalanced,
    invoicesWithoutVoucher,
    stockMismatches,
    class7ResidualKurus: class7,
    stockValueKurus: stockValue,
    inventoryGlKurus: inventoryGl,
    taxProvisionKurus: tax,
  });
  return { checklist, stockMismatches, stockValue: fromKurus(stockValue), inventoryGl: fromKurus(inventoryGl) };
}

function aiText(mode: string, version: string, summary: string): Record<string, unknown> {
  if (mode !== "AI") return {};
  return {
    summary: `${summary} Bu metin öneridir; fiş ancak onayla kesinleşir. Parametre sürümü ${version}. Resmî beyanname üretilmez.`,
    parameter_version: version,
  };
}

function toClient(run: {
  id: number;
  operationKey: string;
  fiscalYear: number;
  status: string;
  preparationMode: string;
  previewData: Prisma.JsonValue;
  aiSuggestion: Prisma.JsonValue | null;
  voucherIds: Prisma.JsonValue;
  parameterVersion: string;
}) {
  const ids = Array.isArray(run.voucherIds) ? run.voucherIds.map((id) => Number(id)) : [];
  return {
    id: run.id,
    operation_key: run.operationKey,
    fiscal_year: run.fiscalYear,
    status: run.status,
    preparation_mode: run.preparationMode,
    preview_data: run.previewData,
    ai_suggestion: run.aiSuggestion ?? {},
    journal_voucher_ids: ids,
    parameter_version: run.parameterVersion,
  };
}

async function saveRun(input: {
  companyId: number;
  year: number;
  key: string;
  mode: string;
  status: string;
  version: string;
  preview: Record<string, unknown>;
  ai: Record<string, unknown>;
  voucherIds?: number[];
}) {
  const run = await prisma.yearEndRun.create({
    data: {
      companyId: input.companyId,
      fiscalYear: input.year,
      operationKey: input.key,
      status: input.status,
      preparationMode: input.mode,
      parameterVersion: input.version,
      previewData: input.preview as Prisma.InputJsonValue,
      aiSuggestion: input.ai as Prisma.InputJsonValue,
      voucherIds: (input.voucherIds ?? []) as Prisma.InputJsonValue,
    },
  });
  return toClient(run);
}

export async function listYearEndOperations() {
  return { items: YEAR_END_OPERATIONS.map((op) => ({ key: op.key, label: op.label })) };
}

export async function previewYearEnd(
  companyId: number,
  body: {
    fiscal_year?: number;
    operation_key?: string;
    preparation_mode?: string;
  }
) {
  const year = Number(body.fiscal_year);
  const key = String(body.operation_key || "kapanis-fisi");
  const mode = body.preparation_mode === "AI" ? "AI" : "MANUAL";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new PublicError("Mali yıl geçersiz.", 400);
  }
  if (!OPS.has(key)) throw new PublicError("Yıl sonu işlemi tanınmıyor.", 400);

  const version = await parameterVersion(companyId);
  const { rows, unbalanced } = await loadBalances(prisma, companyId, year);
  const snap = await snapshot(companyId, year, rows, unbalanced);
  const blocking = snap.checklist.some((item) => item.level === "hata");

  if (key === "kontrol-listesi") {
    return saveRun({
      companyId,
      year,
      key,
      mode,
      status: blocking ? "HATA" : "KONTROL_EDILDI",
      version,
      preview: {
        checklist: snap.checklist,
        parameter_version: version,
        beyanname_durumu: "URETILMEDI",
        kaynak: "yevmiye_satirlari",
      },
      ai: aiText(mode, version, "Kontrol listesi yevmiye, fatura ve stok kartlarından üretildi."),
    });
  }

  if (key === "kapanis-fisi") {
    const existing = await prisma.yevmiyeKaydi.findUnique({
      where: { companyId_fisNo: { companyId, fisNo: closingVoucherNo(year) } },
    });
    if (existing) {
      return saveRun({
        companyId,
        year,
        key,
        mode,
        status: "KAPANDI",
        version,
        voucherIds: [existing.id],
        preview: {
          idempotent: true,
          checklist: snap.checklist,
          lines: [],
          parameter_version: version,
          beyanname_durumu: "URETILMEDI",
          message: `${closingVoucherNo(year)} zaten var. İkinci kapanış fişi yazılmadı. Düzeltme ters kayıt ile yapılır; fiş silinmez.`,
        },
        ai: aiText(mode, version, "Kapanış daha önce kesinleşmiş."),
      });
    }
    const built = buildClosingLines(rows);
    const status = built.error || blocking ? "HATA" : "ONAY_BEKLIYOR";
    return saveRun({
      companyId,
      year,
      key,
      mode,
      status,
      version,
      preview: {
        idempotent: false,
        checklist: snap.checklist,
        lines: built.lines,
        affected_accounts: [...new Set(built.lines.map((l) => l.code))],
        parameter_version: version,
        beyanname_durumu: "URETILMEDI",
        hesaplama_gerekcesi:
          "6 ve 7 grubu bakiyeler 690'a kapanır. Net kâr 590'a, net zarar 591'e yazılır. 1–5 grubu bu fişte kapanmaz. Vergi karşılığı yoksa 691 uydurulmaz.",
        error: built.error,
      },
      ai: aiText(mode, version, built.error || "Kapanış taslağı bakiyelerden hazırlandı."),
    });
  }

  if (key === "acilis-fisi") {
    const existing = await prisma.yevmiyeKaydi.findUnique({
      where: { companyId_fisNo: { companyId, fisNo: openingVoucherNo(year) } },
    });
    if (existing) {
      return saveRun({
        companyId,
        year,
        key,
        mode,
        status: "KAPANDI",
        version,
        voucherIds: [existing.id],
        preview: {
          idempotent: true,
          lines: [],
          parameter_version: version,
          beyanname_durumu: "URETILMEDI",
          message: `${openingVoucherNo(year)} zaten var. İkinci açılış fişi yazılmadı.`,
        },
        ai: {},
      });
    }
    const closing = await prisma.yevmiyeKaydi.findUnique({
      where: { companyId_fisNo: { companyId, fisNo: closingVoucherNo(year) } },
    });
    const closedRows = closing ? rows : applyLines(rows, buildClosingLines(rows).lines);
    const built = buildOpeningLines(closedRows);
    const status = !closing ? "TASLAK" : built.error ? "HATA" : "ONAY_BEKLIYOR";
    return saveRun({
      companyId,
      year,
      key,
      mode,
      status,
      version,
      preview: {
        idempotent: false,
        simulated: !closing,
        lines: built.lines,
        affected_accounts: built.lines.map((l) => l.code),
        parameter_version: version,
        beyanname_durumu: "URETILMEDI",
        hesaplama_gerekcesi:
          "Açılış fişi yalnızca 1–5 bilanço hesaplarını taşır. Gelir tablosu ve 7'li maliyet hesapları devredilmez.",
        message: closing
          ? "Kapanış fişi var. Onay, yeni yıl açılış fişini keser."
          : "Önizleme kapanış henüz yokken simülasyondur. Onay, kapanış fişi kesinleşmeden açılış yazmaz.",
        error: built.error,
      },
      ai: aiText(mode, version, "Açılış taslağı bilanço hesaplarıyla sınırlıdır."),
    });
  }

  if (key === "stok-devir") {
    return saveRun({
      companyId,
      year,
      key,
      mode,
      status: blocking ? "HATA" : "ONAY_BEKLIYOR",
      version,
      preview: {
        checklist: snap.checklist,
        stock_value: snap.stockValue,
        inventory_gl: snap.inventoryGl,
        parameter_version: version,
        beyanname_durumu: "URETILMEDI",
        message:
          "Onay stok kartını, miktarı ve yevmiyeyi değiştirmez. Fark varsa kullanıcı ters kayıt veya sayım fişi keser.",
      },
      ai: aiText(mode, version, "Stok mutabakatı kart hareketi ile 15'li hesaplardan okundu."),
    });
  }

  const period = await prisma.fiscalPeriod.findUnique({
    where: { companyId_year: { companyId, year } },
  });
  const closing = await prisma.yevmiyeKaydi.findUnique({
    where: { companyId_fisNo: { companyId, fisNo: closingVoucherNo(year) } },
  });
  if (!period?.isClosed) {
    return saveRun({
      companyId,
      year,
      key,
      mode,
      status: "HATA",
      version,
      preview: {
        checklist: snap.checklist,
        parameter_version: version,
        error: "Dönem zaten açık.",
      },
      ai: {},
    });
  }
  return saveRun({
    companyId,
    year,
    key,
    mode,
    status: "ONAY_BEKLIYOR",
    version,
    preview: {
      checklist: snap.checklist,
      parameter_version: version,
      beyanname_durumu: "URETILMEDI",
      kapanis_fis_no: closing?.fisNo ?? null,
      impact:
        "Dönem açılır. Kapanış fişi ve eski yevmiye silinmez, yeniden yazılmaz. Aynı yıl için ikinci kapanış fişi üretilmez. Düzeltme ters kayıt ister. Onay gerekçesi zorunludur.",
    },
    ai: aiText(mode, version, "Yeniden açma kayıt silmez."),
  });
}

async function markError(id: number, preview: Prisma.JsonValue, message: string) {
  const base = preview && typeof preview === "object" && !Array.isArray(preview) ? preview : {};
  await prisma.yearEndRun.update({
    where: { id },
    data: {
      status: "HATA",
      previewData: { ...base, error: message } as Prisma.InputJsonValue,
    },
  });
}

async function writeVoucher(
  tx: Prisma.TransactionClient,
  companyId: number,
  fisNo: string,
  tarih: Date,
  aciklama: string,
  lines: DraftLine[]
) {
  const toplamBorc = fromKurus(lines.reduce((s, l) => s + kurus(l.debit), 0));
  const toplamAlacak = fromKurus(lines.reduce((s, l) => s + kurus(l.credit), 0));
  if (kurus(toplamBorc) !== kurus(toplamAlacak) || lines.length === 0) {
    throw new PublicError("Fiş satırları denk değil veya boş. Kayıt yazılmadı.", 409);
  }
  return tx.yevmiyeKaydi.create({
    data: {
      companyId,
      fisNo,
      tarih,
      aciklama,
      toplamBorc,
      toplamAlacak,
      durum: "KESIN",
      isLocked: true,
      satirlar: {
        create: lines.map((l, index) => ({
          satirNo: index + 1,
          hesapKodu: l.code,
          aciklama: `${l.name} — ${l.reason}`.slice(0, 500),
          borc: l.debit,
          alacak: l.credit,
        })),
      },
    },
  });
}

export async function approveYearEnd(companyId: number, userId: number, runId: number, reason?: string) {
  const run = await prisma.yearEndRun.findFirst({ where: { id: runId, companyId } });
  if (!run) throw new PublicError("Yıl sonu taslağı bulunamadı.", 404);
  if (run.status === "KAPANDI" || run.status === "KONTROL_EDILDI") return toClient(run);
  if (run.status === "HATA") {
    throw new PublicError("Hatalı taslak onaylanamaz. Önizlemeyi yenileyin.", 409);
  }
  if (run.status === "TASLAK") {
    throw new PublicError("Kapanış fişi kesinleşmeden açılış onaylanamaz.", 409);
  }
  if (run.status !== "ONAY_BEKLIYOR") {
    throw new PublicError("Bu taslak onay beklemiyor.", 409);
  }

  const year = run.fiscalYear;
  const key = run.operationKey as YearEndOperationKey;

  try {
    if (key === "kapanis-fisi") {
      await prisma.$transaction(async (tx) => {
        const fisNo = closingVoucherNo(year);
        const existing = await tx.yevmiyeKaydi.findUnique({
          where: { companyId_fisNo: { companyId, fisNo } },
        });
        let voucherId = existing?.id ?? null;
        if (!existing) {
          const { rows, unbalanced } = await loadBalances(tx, companyId, year);
          if (unbalanced.length) {
            throw new PublicError("Dengesiz fiş varken kapanış yazılmaz.", 409);
          }
          const built = buildClosingLines(rows);
          if (built.error) throw new PublicError(built.error, 409);
          if (built.lines.length) {
            const created = await writeVoucher(
              tx,
              companyId,
              fisNo,
              closingDate(year),
              `${year} yıl sonu kapanış fişi. Parametre ${run.parameterVersion}`,
              built.lines
            );
            voucherId = created.id;
          }
        }
        await tx.fiscalPeriod.upsert({
          where: { companyId_year: { companyId, year } },
          create: { companyId, year, isClosed: true, closedAt: new Date() },
          update: { isClosed: true, closedAt: new Date() },
        });
        await tx.yearEndRun.update({
          where: { id: run.id },
          data: {
            status: "KAPANDI",
            approvedById: userId,
            approvedAt: new Date(),
            voucherIds: voucherId ? [voucherId] : [],
          },
        });
        await tx.auditLog.create({
          data: {
            tabloAdi: "year_end_runs",
            islemTipi: "INSERT",
            kullaniciId: userId,
            yeniVeri: {
              islem: "KAPANIS",
              year,
              fisNo,
              parameter_version: run.parameterVersion,
              kayit_silinmedi: true,
            },
          },
        });
      });
    } else if (key === "acilis-fisi") {
      const closing = await prisma.yevmiyeKaydi.findUnique({
        where: { companyId_fisNo: { companyId, fisNo: closingVoucherNo(year) } },
      });
      if (!closing) throw new PublicError("Önce kapanış fişi onaylanmalı.", 409);
      const next = await prisma.fiscalPeriod.findUnique({
        where: { companyId_year: { companyId, year: year + 1 } },
      });
      if (next?.isClosed) {
        throw new PublicError(`${year + 1} dönemi kilitli. Açılış fişi yazılamaz.`, 409);
      }
      await prisma.$transaction(async (tx) => {
        const fisNo = openingVoucherNo(year);
        const existing = await tx.yevmiyeKaydi.findUnique({
          where: { companyId_fisNo: { companyId, fisNo } },
        });
        let voucherId = existing?.id ?? null;
        if (!existing) {
          const { rows } = await loadBalances(tx, companyId, year);
          const built = buildOpeningLines(rows);
          if (built.error) throw new PublicError(built.error, 409);
          if (built.lines.length) {
            const created = await writeVoucher(
              tx,
              companyId,
              fisNo,
              openingDate(year),
              `${year + 1} açılış devir fişi. Yalnızca bilanço hesapları. Parametre ${run.parameterVersion}`,
              built.lines
            );
            voucherId = created.id;
          }
        }
        await tx.fiscalPeriod.upsert({
          where: { companyId_year: { companyId, year: year + 1 } },
          create: { companyId, year: year + 1, isClosed: false },
          update: {},
        });
        await tx.yearEndRun.update({
          where: { id: run.id },
          data: {
            status: "KAPANDI",
            approvedById: userId,
            approvedAt: new Date(),
            voucherIds: voucherId ? [voucherId] : [],
          },
        });
        await tx.auditLog.create({
          data: {
            tabloAdi: "year_end_runs",
            islemTipi: "INSERT",
            kullaniciId: userId,
            yeniVeri: { islem: "ACILIS", year, fisNo, parameter_version: run.parameterVersion },
          },
        });
      });
    } else if (key === "stok-devir") {
      await prisma.yearEndRun.update({
        where: { id: run.id },
        data: { status: "KAPANDI", approvedById: userId, approvedAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          tabloAdi: "year_end_runs",
          islemTipi: "INSERT",
          kullaniciId: userId,
          yeniVeri: {
            islem: "STOK_MUTABAKAT",
            year,
            stok_degismedi: true,
            parameter_version: run.parameterVersion,
          },
        },
      });
    } else if (key === "yeniden-ac") {
      const text = String(reason || "").trim();
      if (text.length < 10) {
        throw new PublicError("Yeniden açma gerekçesi en az 10 karakter olmalıdır.", 400);
      }
      await prisma.$transaction(async (tx) => {
        const period = await tx.fiscalPeriod.findUnique({
          where: { companyId_year: { companyId, year } },
        });
        if (!period?.isClosed) throw new PublicError("Dönem zaten açık.", 409);
        await tx.fiscalPeriod.update({
          where: { id: period.id },
          data: { isClosed: false, closedAt: null },
        });
        await tx.yearEndRun.update({
          where: { id: run.id },
          data: { status: "KAPANDI", approvedById: userId, approvedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            tabloAdi: "fiscal_periods",
            islemTipi: "UPDATE",
            kullaniciId: userId,
            eskiVeri: { year, isClosed: true },
            yeniVeri: {
              year,
              isClosed: false,
              gerekce: text,
              kapanis_fis_silinmedi: closingVoucherNo(year),
              parameter_version: run.parameterVersion,
            },
          },
        });
      });
    } else {
      throw new PublicError("Bu işlem fiş kesmez.", 409);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const fisNo = key === "acilis-fisi" ? openingVoucherNo(year) : closingVoucherNo(year);
      const existing = await prisma.yevmiyeKaydi.findUnique({
        where: { companyId_fisNo: { companyId, fisNo } },
      });
      const updated = await prisma.yearEndRun.update({
        where: { id: run.id },
        data: {
          status: "KAPANDI",
          approvedById: userId,
          approvedAt: new Date(),
          voucherIds: existing ? [existing.id] : [],
        },
      });
      return toClient(updated);
    }
    const message = error instanceof PublicError ? error.message : "Yıl sonu işlemi geri alındı. Yarım kapanış bırakılmadı.";
    if (!(error instanceof PublicError && error.status === 400)) {
      await markError(run.id, run.previewData, message);
    }
    if (error instanceof PublicError) throw error;
    throw new PublicError(message, 409);
  }

  const fresh = await prisma.yearEndRun.findFirst({ where: { id: run.id, companyId } });
  if (!fresh) throw new PublicError("Yıl sonu taslağı bulunamadı.", 404);
  return toClient(fresh);
}

export type { ChecklistItem };
