import { createHash } from "node:crypto";
import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authorize } from "../middleware/auth.middleware";
import { PublicError, toPublicMessage } from "../security/publicError";
import { prisma } from "../prisma";
import { journalHash, shouldRevise, validateEdefter, type EdefterVoucher } from "../services/edefter.logic";

export const edefterRouter = Router();

function companyIdOf(req: Request): number {
  const id = req.user?.companyId;
  if (!id) throw new PublicError("Şirket kapsamı bulunamadı.", 401);
  return id;
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((error: unknown) => {
      if (res.headersSent) return;
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: "Girdi doğrulama hatası", message: "Girdi doğrulama hatası" });
        return;
      }
      const pub = toPublicMessage(error, "e-Defter işlemi tamamlanamadı.");
      res.status(pub.status).json({ success: false, error: pub.message, message: pub.message });
    });
  };
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

async function loadVouchers(companyId: number, year: number, month: number): Promise<EdefterVoucher[]> {
  const { start, end } = monthRange(year, month);
  const rows = await prisma.yevmiyeKaydi.findMany({
    where: { companyId, tarih: { gte: start, lt: end } },
    include: { satirlar: { orderBy: { satirNo: "asc" } } },
    orderBy: [{ tarih: "asc" }, { id: "asc" }],
  });
  return rows.map((row) => ({
    fisNo: row.fisNo,
    tarih: row.tarih.toISOString().slice(0, 10),
    aciklama: row.aciklama,
    toplamBorc: Number(row.toplamBorc),
    toplamAlacak: Number(row.toplamAlacak),
    lines: row.satirlar.map((line) => ({
      hesapKodu: line.hesapKodu,
      borc: Number(line.borc),
      alacak: Number(line.alacak),
      aciklama: line.aciklama,
    })),
  }));
}

function toPeriod(row: {
  id: number;
  year: number;
  month: number;
  revision: number;
  status: string;
  fileHash: string | null;
  validation: Prisma.JsonValue;
  payload: Prisma.JsonValue;
  branchCode: string | null;
  defterTuru: string;
  beratTuru: string;
  createdAt: Date;
  attempts: Prisma.JsonValue;
}) {
  const validation = (row.validation && typeof row.validation === "object" ? row.validation : {}) as {
    errors?: string[];
    warnings?: string[];
    journal_count?: number;
    line_count?: number;
    total_debit?: number;
    total_credit?: number;
    notes?: string;
  };
  const ready = row.status !== "HATA";
  return {
    id: row.id,
    period_year: row.year,
    period_month: row.month,
    revision: row.revision,
    status: row.status,
    journal_count: validation.journal_count ?? 0,
    line_count: validation.line_count ?? 0,
    total_debit: validation.total_debit ?? 0,
    total_credit: validation.total_credit ?? 0,
    file_hash: row.fileHash,
    berat_path: ready ? "kontrol-raporu" : null,
    defter_path: ready ? "yevmiye-dokumu" : null,
    archive_path: ready ? "paket" : null,
    gib_ref: null,
    error_message: validation.errors?.join(" ") || null,
    branch_id: null,
    branch_code: row.branchCode,
    defter_turu: row.defterTuru,
    berat_turu: row.beratTuru,
    prepared_at: row.createdAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    notes: validation.notes ?? null,
    attempts: row.attempts,
    official_gib_xml: false,
    message: validation.errors?.length
      ? validation.errors.join(" ")
      : "Paket yevmiye kayıtlarından hazırlandı. Resmî GİB beratı üretilmedi.",
  };
}

edefterRouter.get("/edefter/periods", asyncRoute(async (req, res) => {
  const rows = await prisma.edefterPaket.findMany({
    where: { companyId: companyIdOf(req) },
    orderBy: [{ year: "desc" }, { month: "desc" }, { revision: "desc" }],
    take: 100,
  });
  res.json({ items: rows.map(toPeriod), total: rows.length });
}));

edefterRouter.get("/edefter/preview", asyncRoute(async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || month < 1 || month > 12) throw new PublicError("Dönem geçersiz.", 400);
  const companyId = companyIdOf(req);
  const vouchers = await loadVouchers(companyId, year, month);
  const existing = await prisma.edefterPaket.findFirst({
    where: { companyId, year, month },
    orderBy: { revision: "desc" },
  });
  const lineCount = vouchers.reduce((sum, row) => sum + row.lines.length, 0);
  res.json({
    year,
    month,
    journal_count: vouchers.length,
    line_count: lineCount,
    total_debit: vouchers.reduce((sum, row) => sum + row.toplamBorc, 0),
    total_credit: vouchers.reduce((sum, row) => sum + row.toplamAlacak, 0),
    items: vouchers.slice(0, 50).map((row) => ({
      id: 0,
      voucher_no: row.fisNo,
      voucher_date: row.tarih,
      description: row.aciklama,
      total_debit: row.toplamBorc,
      total_credit: row.toplamAlacak,
      status: "OKUNDU",
      line_count: row.lines.length,
    })),
    existing_period_id: existing?.id ?? null,
    existing_period_status: existing?.status ?? null,
  });
}));

edefterRouter.post(
  "/edefter/periods/prepare",
  authorize(["ADMIN", "MUHASEBE_UZMANI"]),
  asyncRoute(async (req, res) => {
    const year = Number(req.body?.year);
    const month = Number(req.body?.month);
    const rebuild = Boolean(req.body?.rebuild);
    if (!year || month < 1 || month > 12) throw new PublicError("Dönem geçersiz.", 400);
    const companyId = companyIdOf(req);
    const previous = await prisma.edefterPaket.count({ where: { companyId, year, month } });
    const decision = shouldRevise(previous, rebuild);
    if (!decision.create) throw new PublicError(decision.error || "Yeniden oluşturma onayı gerekli.", 409);
    const vouchers = await loadVouchers(companyId, year, month);
    const period = await prisma.fiscalPeriod.findUnique({ where: { companyId_year: { companyId, year } } });
    const validation = validateEdefter(vouchers, Boolean(period?.isClosed));
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const branch = await prisma.branch.findFirst({ where: { companyId, isActive: true }, orderBy: { id: "asc" } });
    const hash = journalHash(vouchers);
    const lineCount = vouchers.reduce((sum, row) => sum + row.lines.length, 0);
    const created = await prisma.edefterPaket.create({
      data: {
        companyId,
        year,
        month,
        revision: previous + 1,
        status: validation.ok ? "HAZIR" : "HATA",
        fileHash: validation.ok ? hash : null,
        branchCode: branch?.code || null,
        preparedById: req.user?.userId ?? null,
        validation: {
          errors: validation.errors,
          warnings: validation.warnings,
          journal_count: vouchers.length,
          line_count: lineCount,
          total_debit: vouchers.reduce((sum, row) => sum + row.toplamBorc, 0),
          total_credit: vouchers.reduce((sum, row) => sum + row.toplamAlacak, 0),
          notes: String(req.body?.notes || ""),
          prepared_by: req.user?.username || String(req.user?.userId || ""),
          company_name: company?.name || "",
          schema_note: "Resmî GİB e-Defter XBRL şeması bu pakette üretilmez.",
        },
        payload: {
          defter_turu: "YEVMIYE",
          berat_turu: "YEVMIYE_BERAT",
          official_gib_xml: false,
          vouchers,
        } as Prisma.InputJsonValue,
      },
    });
    const body = toPeriod(created);
    res.status(201).json({
      ...body,
      message: validation.ok
        ? `${year}/${String(month).padStart(2, "0")} revizyon ${created.revision} hazır. Gönderim henüz yapılmadı.`
        : validation.errors.join(" "),
    });
  })
);

edefterRouter.post("/edefter/periods/:id/archive", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const row = await prisma.edefterPaket.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!row) throw new PublicError("Paket bulunamadı.", 404);
  if (row.status === "HATA") throw new PublicError("Hatalı paket arşivlenemez.", 409);
  const updated = await prisma.edefterPaket.update({ where: { id: row.id }, data: { status: "ARSIVLENDI" } });
  res.json({ ok: true, message: "Paket yerelde arşivlendi. Bu işlem GİB gönderimi değildir.", period_id: updated.id, status: updated.status });
}));

edefterRouter.post("/edefter/periods/:id/upload", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const row = await prisma.edefterPaket.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!row) throw new PublicError("Paket bulunamadı.", 404);
  if (row.status === "HATA" || !row.fileHash) throw new PublicError("Hatalı veya hash'siz paket gönderilmez.", 409);
  if (row.status === "GONDERILDI") {
    res.json({ ok: true, message: "Bu revizyon daha önce entegratörden 2xx almıştı. Yeni gönderim yapılmadı.", period_id: row.id, status: row.status, gib_ref: null });
    return;
  }
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId } });
  const attempts = Array.isArray(row.attempts) ? [...row.attempts] : [];
  const url = ayar?.integratorUrl || "";
  let host = "";
  try {
    host = url ? new URL(url).hostname : "";
  } catch {
    host = "";
  }
  const blocked = !url.startsWith("https://") || host === "localhost" || host.endsWith(".local") || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
  if (blocked || !ayar?.integratorSecret) {
    attempts.push({ at: new Date().toISOString(), result: "MANUEL", detail: "entegrator-yok" });
    await prisma.edefterPaket.update({
      where: { id: row.id },
      data: { status: "GONDERIM_BEKLIYOR", attempts: attempts as Prisma.InputJsonValue },
    });
    res.status(409).json({
      ok: false,
      message: "Gerçek entegratör tanımlı değil. Durum: gönderim bekliyor, manuel gönderim gerekli. GİB'e yüklendi veya berat onaylandı yazılmadı.",
      period_id: row.id,
      status: "GONDERIM_BEKLIYOR",
      gib_ref: null,
    });
    return;
  }
  let status = "GONDERIM_BEKLIYOR";
  let message = "Entegratör yanıtı gönderim sayılmadı.";
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hash: row.fileHash, year: row.year, month: row.month, revision: row.revision }),
    });
    attempts.push({ at: new Date().toISOString(), result: response.ok ? "2XX" : "RED", http_status: response.status });
    if (response.ok) {
      status = "GONDERILDI";
      message = "Entegratör 2xx döndü. Bu yanıt berat onayı değildir; GİB onaylandı yazılmadı.";
    } else {
      message = `Entegratör ${response.status} döndü. Paket gönderilmiş sayılmadı.`;
    }
  } catch {
    attempts.push({ at: new Date().toISOString(), result: "ULASILAMADI" });
    message = "Entegratöre ulaşılamadı. Gönderim bekliyor. Kimlik bilgisi yanıtta gösterilmez.";
  }
  await prisma.edefterPaket.update({
    where: { id: row.id },
    data: { status, attempts: attempts as Prisma.InputJsonValue },
  });
  res.status(status === "GONDERILDI" ? 200 : 502).json({ ok: status === "GONDERILDI", message, period_id: row.id, status, gib_ref: null });
}));

function zipStore(files: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    parts.push(local, name, file.data);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(file.data.length, 20);
    cen.writeUInt32LE(file.data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += local.length + name.length + file.data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, end]);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

async function packageFiles(id: number, companyId: number) {
  const row = await prisma.edefterPaket.findFirst({ where: { id, companyId } });
  if (!row || row.status === "HATA") throw new PublicError("İndirilecek sağlam paket yok.", 404);
  const payload = row.payload as { vouchers?: unknown };
  const report = {
    resmi_gib_xml: false,
    aciklama: "Bu dosya yevmiye dökümü ve kontrol raporudur. GİB berat şeması değildir.",
    file_hash: row.fileHash,
    validation: row.validation,
    defter_turu: row.defterTuru,
    berat_turu: row.beratTuru,
    donem: `${row.year}-${String(row.month).padStart(2, "0")}`,
    revizyon: row.revision,
  };
  const reportBuf = Buffer.from(JSON.stringify(report, null, 2));
  const journalBuf = Buffer.from(JSON.stringify(payload, null, 2));
  const zip = zipStore([
    { name: "KONTROL-RAPORU.json", data: reportBuf },
    { name: "YEVMIYE-DOKUMU.json", data: journalBuf },
  ]);
  const zipHash = createHash("sha256").update(zip).digest("hex");
  return { row, reportBuf, journalBuf, zip, zipHash };
}

edefterRouter.get("/edefter/periods/:id/berat", asyncRoute(async (req, res) => {
  const pack = await packageFiles(Number(req.params.id), companyIdOf(req));
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("x-content-sha256", pack.row.fileHash || "");
  res.send(pack.reportBuf);
}));

edefterRouter.get("/edefter/periods/:id/defter", asyncRoute(async (req, res) => {
  const pack = await packageFiles(Number(req.params.id), companyIdOf(req));
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("x-content-sha256", pack.row.fileHash || "");
  res.send(pack.journalBuf);
}));

edefterRouter.get("/edefter/periods/:id/archive", asyncRoute(async (req, res) => {
  const pack = await packageFiles(Number(req.params.id), companyIdOf(req));
  res.setHeader("content-type", "application/zip");
  res.setHeader("x-content-sha256", pack.zipHash);
  res.send(pack.zip);
}));
