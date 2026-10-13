/**
 * Dönem kilidi, belge zinciri, personel tanımları, SGK, hesap planı 7/A-7/B,
 * cari ekstre ve yedekleme.
 */
import { Router, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { authorize } from "../middleware/auth.middleware";
import { PublicError, toPublicMessage } from "../security/publicError";
import { branchWithinCompany } from "../security/branchScope";
import { assertPeriodOpen } from "../services/period.service";
import { seedChart } from "../../../prisma/seed";
import { altHesapAnaKodu, kilitliSeviye } from "../muhasebe/thpKilit.logic";
import { Decimal } from "../../lib/financialMath";
import { addMoney, money } from "../money";

export const uyarlamaRouter = Router();

const GIB_KILIT = new Set(["GONDERILDI", "ONAYLI"]);
const YEDI_B: Array<[string, string]> = [
  ["790", "İlk Madde ve Malzeme Giderleri"],
  ["791", "İşçi Ücret ve Giderleri"],
  ["792", "Memur Ücret ve Giderleri"],
  ["793", "Dışarıdan Sağlanan Fayda ve Hizmetler"],
  ["794", "Çeşitli Giderler"],
  ["795", "Vergi, Resim ve Harçlar"],
  ["796", "Amortisman ve Tükenme Payları"],
  ["797", "Finansman Giderleri"],
  ["798", "Gider Çeşitleri Yansıtma Hesabı"],
  ["799", "Üretim Maliyet Hesabı"],
];

const MESLEKLER: Array<[string, string]> = [
  ["1211", "Finans müdürleri"],
  ["1212", "İnsan kaynakları müdürleri"],
  ["1219", "Başka yerde sınıflandırılmamış işletme hizmetleri ve idare müdürleri"],
  ["1321", "İmalat müdürleri"],
  ["1346", "Finansal ve sigorta hizmetleri şube müdürleri"],
  ["2141", "Endüstri ve üretim mühendisleri"],
  ["2411", "Muhasebeciler"],
  ["2412", "Finansal ve yatırım danışmanları"],
  ["3313", "Muhasebe yardımcı meslek mensupları"],
  ["3341", "Ofis şefleri"],
  ["4110", "Genel büro elemanları"],
  ["4120", "Sekreterler (genel)"],
  ["4311", "Muhasebe ve defter tutma elemanları"],
  ["4312", "İstatistik, finans ve sigorta elemanları"],
  ["4321", "Stok memurları"],
  ["4322", "Üretim memurları"],
  ["4323", "Ulaştırma memurları"],
  ["7211", "Metal kalıpçılar ve maça hazırlayıcılar"],
  ["7212", "Kaynakçılar ve kesiciler"],
  ["7213", "Sac metal işçileri"],
  ["7214", "Yapısal metal hazırlayıcıları ve montajcıları"],
  ["7222", "Alet yapımcıları ve ilgili işler"],
  ["7223", "Metal işleme takım tezgahı kurucuları ve operatörleri"],
  ["7224", "Metal cilalayıcılar, taşlayıcılar ve alet bileyicileri"],
  ["8121", "Metal işleme tesisi operatörleri"],
  ["8122", "Metal tesviye, kaplama ve perdahlama makinesi operatörleri"],
  ["8211", "Mekanik makine montajcıları"],
  ["8219", "Başka yerde sınıflandırılmamış montajcılar"],
  ["9329", "Başka yerde sınıflandırılmamış imalat işçileri"],
  ["9333", "Yük taşıyıcılar"],
  ["9621", "Kuryeler, paket taşıyıcılar ve bagaj hamalları"],
];

const VARSAYILAN_DEPARTMAN = [
  ["URETIM", "Üretim"],
  ["MUHASEBE", "Muhasebe"],
  ["DEPO", "Depo"],
  ["SATIS", "Satış"],
  ["YONETIM", "Yönetim"],
];

const KVKK_VARSAYILAN =
  "Personel ve cari kişisel verileri, 6698 sayılı KVKK ve iş mevzuatı kapsamında iş sözleşmesi, bordro, SGK bildirimi ve yasal saklama yükümlülüğü için işlenir. " +
  "Muhasebe belgelerinde VUK saklama süresi esastır. Süre dolunca kimlik verisi silinir veya anonimleştirilir; yasal defterler bu süreden etkilenmez.";

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
      const pub = toPublicMessage(error, "İşlem tamamlanamadı.");
      const body = error instanceof PublicError && (error as PublicError & { extra?: object }).extra
        ? (error as PublicError & { extra?: object }).extra
        : {};
      res.status(pub.status).json({ success: false, error: pub.message, message: pub.message, ...body });
    });
  };
}

function fail(message: string, status: number, extra?: Record<string, unknown>): never {
  const err = new PublicError(message, status) as PublicError & { extra?: Record<string, unknown> };
  err.extra = extra;
  throw err;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function secretKey(): Buffer {
  const raw = process.env.JWT_SECRET || "";
  if (raw.length < 32) throw new PublicError("Şifreleme anahtarı tanımlı değil.", 500);
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptText(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

async function ayarOf(companyId: number) {
  return prisma.companyAyar.upsert({
    where: { companyId },
    update: {},
    create: { companyId, kvkkMetin: KVKK_VARSAYILAN },
  });
}

async function ensureDepartman(companyId: number) {
  const count = await prisma.departman.count({ where: { companyId } });
  if (count > 0) return;
  await prisma.departman.createMany({
    data: VARSAYILAN_DEPARTMAN.map(([code, name]) => ({ companyId, code, name })),
    skipDuplicates: true,
  });
}

async function ensureMeslek(companyId: number) {
  const count = await prisma.sgkMeslek.count({ where: { companyId } });
  if (count > 0) return;
  await prisma.sgkMeslek.createMany({
    data: MESLEKLER.map(([kod, ad]) => ({ companyId, kod, ad, kaynak: "ISCO-08" })),
    skipDuplicates: true,
  });
}

async function ensure7B(companyId: number) {
  await prisma.hesapPlani.createMany({
    data: YEDI_B.map(([kod, ad]) => ({
      companyId,
      kod,
      ad,
      seviye: "ANA",
      planTipi: "7B",
      isPostable: true,
      kilitli: true,
    })),
    skipDuplicates: true,
  });
  await prisma.hesapPlani.updateMany({
    where: { companyId, kod: { in: YEDI_B.map((row) => row[0]) } },
    data: { planTipi: "7B", kilitli: true, seviye: "ANA" },
  });
}

function planFilter(yontem: string): Prisma.HesapPlaniWhereInput {
  return { planTipi: { in: yontem === "7B" ? ["ORTAK", "7B"] : ["ORTAK", "7A"] } };
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    OPEN: "Açık",
    CONFIRMED: "Onaylandı",
    PARTIAL_DELIVERY: "Kısmi Teslim",
    DELIVERED: "Teslim Edildi",
    INVOICED: "Faturalandı",
    CLOSED: "Kapandı",
    CANCELLED: "İptal",
    TASLAK: "Taslak",
  };
  return map[status] || status;
}

function toOrder(row: {
  id: number;
  belgeNo: string;
  tarih: Date;
  yon: string;
  tur: string;
  cariId: number | null;
  tutar: Prisma.Decimal;
  durum: string;
  gibDurum: string;
  kaynakId: number | null;
  profil: Prisma.JsonValue;
}, cari?: { kod: string; ad: string } | null) {
  const profil = (row.profil || {}) as Record<string, unknown>;
  return {
    id: row.id,
    order_no: row.belgeNo,
    order_date: row.tarih.toISOString().slice(0, 10),
    direction: row.yon,
    doc_kind: row.tur,
    account_id: row.cariId || 0,
    account_code: cari?.kod || null,
    account_title: cari?.ad || null,
    grand_total: Number(row.tutar),
    subtotal: Number(row.tutar),
    discount_total: 0,
    tax_total: num(profil.tax_total),
    vat_included: false,
    footer_discount_pct: 0,
    footer_discount_pct_2: 0,
    footer_discount_pct_3: 0,
    status: row.durum,
    status_label: statusLabel(row.durum),
    delivery_status: String(profil.delivery_status || "NONE"),
    delivery_status_label: "Bekliyor",
    invoice_status: String(profil.invoice_status || "NONE"),
    invoice_status_label: row.gibDurum === "YOK" ? "Faturasız" : row.gibDurum,
    collection_status: "NONE",
    collection_status_label: "Tahsil edilmedi",
    delivery_date: (profil.delivery_date as string) || null,
    invoiced_total: num(profil.invoiced_total),
    collected_total: 0,
    branch_id: num(profil.branch_id, 1),
    record_type_id: num(profil.record_type_id, 1),
    notes: (profil.notes as string) || null,
    linked_order_id: row.tur === "SIPARIS" ? row.id : row.kaynakId,
    gib_durum: row.gibDurum,
    lines: [],
    document_links: [],
  };
}

async function descendants(companyId: number, rootId: number) {
  const all = await prisma.ticariBelge.findMany({ where: { companyId } });
  const out: typeof all = [];
  const walk = (id: number) => {
    for (const row of all) {
      if (row.kaynakId === id) {
        out.push(row);
        walk(row.id);
      }
    }
  };
  walk(rootId);
  return out;
}

async function assertChainWritable(companyId: number, rowId: number, onay: boolean, action: "silme" | "değiştirme") {
  const self = await prisma.ticariBelge.findFirst({ where: { id: rowId, companyId } });
  if (!self) fail("Belge bulunamadı.", 404);
  const kids = await descendants(companyId, rowId);
  const locked = [self, ...kids].filter((row) => GIB_KILIT.has(row.gibDurum));
  if (locked.length) {
    const names = locked.map((row) => `${row.tur} ${row.belgeNo}`).join(", ");
    fail(`İrsaliye veya fatura GİB onayı aldığı için bu kayıtta ${action} yapılamaz. Kilitli belgeler: ${names}.`, 409);
  }
  if (kids.length && !onay) {
    const list = kids.map((row) => `${row.tur} ${row.belgeNo}`).join(", ");
    fail(
      `Bu belgede ${action} yapılırsa bağlı kayıtlar da silinecektir: ${list}. Onaylarsanız silme en son belgeden geriye doğru yapılır.`,
      409,
      { requires_confirm: true, will_delete: kids.map((row) => ({ id: row.id, tur: row.tur, no: row.belgeNo })) }
    );
  }
  return { self, kids };
}

async function removeBelgeTree(companyId: number, rowId: number) {
  const kids = await descendants(companyId, rowId);
  const ordered = [...kids].reverse();
  for (const row of ordered) {
    await removeOneBelge(companyId, row.id);
  }
  await removeOneBelge(companyId, rowId);
}

async function removeOneBelge(companyId: number, id: number) {
  const row = await prisma.ticariBelge.findFirst({ where: { id, companyId } });
  if (!row) return;
  if (GIB_KILIT.has(row.gibDurum)) fail("GİB onaylı belge silinemez.", 409);
  if (row.tur === "FATURA") {
    const fatura = await prisma.fatura.findFirst({ where: { companyId, belgeNo: row.belgeNo } });
    if (fatura && GIB_KILIT.has(fatura.gibDurum)) fail("GİB onaylı fatura silinemez.", 409);
    if (fatura) {
      await prisma.faturaSatir.deleteMany({ where: { faturaId: fatura.id } });
      await prisma.fatura.delete({ where: { id: fatura.id } });
    }
  }
  await prisma.cariHareket.deleteMany({ where: { companyId, kaynakTip: "TICARI", kaynakId: id } });
  await prisma.ticariBelgeSatir.deleteMany({ where: { belgeId: id } });
  await prisma.ticariBelge.delete({ where: { id } });
}

async function assertHareketEditable(companyId: number, hareket: { kaynakTip: string | null; kaynakId: number | null; belgeNo: string | null }) {
  if (hareket.kaynakTip === "CEK" && hareket.kaynakId) {
    const cek = await prisma.cekSenet.findFirst({ where: { id: hareket.kaynakId, companyId } });
    if (cek?.ciroEdildi || cek?.durum === "CIRO") {
      fail("Ciro edilmiş çek veya senet düzeltilemez ve silinemez.", 409);
    }
  }
  if ((hareket.kaynakTip === "TICARI" || hareket.kaynakTip === "FATURA") && hareket.kaynakId) {
    const belge = await prisma.ticariBelge.findFirst({ where: { id: hareket.kaynakId, companyId } });
    if (belge && GIB_KILIT.has(belge.gibDurum)) fail("GİB'e gönderilmiş veya onaylanmış belgenin ekstresi düzeltilemez.", 409);
  }
  if (hareket.belgeNo) {
    const fatura = await prisma.fatura.findFirst({ where: { companyId, belgeNo: hareket.belgeNo } });
    if (fatura && GIB_KILIT.has(fatura.gibDurum)) fail("GİB onaylı faturanın cari hareketi düzeltilemez veya silinemez.", 409);
  }
}

async function recomputeCari(cariId: number, companyId: number) {
  const agg = await prisma.cariHareket.aggregate({
    where: { cariId, companyId },
    _sum: { borc: true, alacak: true },
  });
  const bakiye = money(agg._sum.borc).minus(money(agg._sum.alacak));
  const updated = await prisma.cariKart.updateMany({
    where: { id: cariId, companyId },
    data: { bakiye: new Prisma.Decimal(bakiye.toFixed(2)) },
  });
  if (updated.count !== 1) fail("Cari kart bulunamadı.", 404);
  return bakiye.toNumber();
}

async function syncLinked(companyId: number, hareket: { kaynakTip: string | null; kaynakId: number | null; belgeNo: string | null; borc: Prisma.Decimal; alacak: Prisma.Decimal; aciklama: string }) {
  const tutar = Math.max(Number(hareket.borc), Number(hareket.alacak));
  const updated: string[] = ["cari bakiye"];
  if (hareket.kaynakTip === "TICARI" && hareket.kaynakId) {
    await prisma.ticariBelge.updateMany({
      where: { id: hareket.kaynakId, companyId },
      data: { tutar: new Prisma.Decimal(tutar.toFixed(2)) },
    });
    updated.push("ticari belge");
  }
  if (hareket.belgeNo) {
    const fatura = await prisma.fatura.findFirst({ where: { companyId, belgeNo: hareket.belgeNo } });
    if (fatura && !GIB_KILIT.has(fatura.gibDurum)) {
      await prisma.fatura.update({
        where: { id: fatura.id },
        data: { genelToplam: new Prisma.Decimal(tutar.toFixed(2)) },
      });
      updated.push("fatura");
    }
  }
  return updated;
}

async function linkedVoucher(companyId: number, hareket: { yevmiyeKaydiId: number | null; belgeNo: string | null }) {
  if (hareket.yevmiyeKaydiId) {
    return prisma.yevmiyeKaydi.findFirst({
      where: { id: hareket.yevmiyeKaydiId, companyId },
      include: { satirlar: true },
    });
  }
  const belge = hareket.belgeNo?.trim();
  if (!belge) return null;
  return prisma.yevmiyeKaydi.findFirst({
    where: {
      companyId,
      NOT: { fisNo: { startsWith: "TRS-" } },
      OR: [
        { aciklama: { contains: belge } },
        { satirlar: { some: { aciklama: { contains: belge } } } },
      ],
    },
    include: { satirlar: true },
    orderBy: { id: "desc" },
  });
}

async function tersKayitIfLocked(
  companyId: number,
  hareket: { yevmiyeKaydiId: number | null; belgeNo: string | null; tarih: Date; aciklama: string }
) {
  const fis = await linkedVoucher(companyId, hareket);
  if (!fis || (!fis.isLocked && fis.durum !== "KESIN")) return null;
  const mevcut = await prisma.yevmiyeKaydi.findFirst({
    where: { companyId, fisNo: { startsWith: `TRS-${fis.id}-` } },
  });
  if (mevcut) return mevcut.fisNo;
  await assertPeriodOpen(companyId, hareket.tarih);
  const fisNo = `TRS-${fis.id}-${Date.now().toString().slice(-6)}`;
  await prisma.yevmiyeKaydi.create({
    data: {
      companyId,
      fisNo,
      tarih: hareket.tarih,
      aciklama: `Ters kayıt: ${hareket.aciklama || fis.aciklama}`,
      toplamBorc: fis.toplamAlacak,
      toplamAlacak: fis.toplamBorc,
      durum: "KESIN",
      isLocked: true,
      satirlar: {
        create: fis.satirlar.map((satir, index) => ({
          satirNo: index + 1,
          hesapKodu: satir.hesapKodu,
          aciklama: `Ters: ${satir.aciklama}`,
          borc: satir.alacak,
          alacak: satir.borc,
        })),
      },
    },
  });
  if (!hareket.yevmiyeKaydiId) {
    await prisma.cariHareket.updateMany({
      where: { companyId, belgeNo: hareket.belgeNo, yevmiyeKaydiId: null },
      data: { yevmiyeKaydiId: fis.id },
    });
  }
  return fisNo;
}

function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function dbIdentity() {
  const url = new URL(process.env.DATABASE_URL || "postgresql://tabia:x@127.0.0.1:5434/tabiaerp");
  return {
    user: decodeURIComponent(url.username || "tabia"),
    name: decodeURIComponent(url.pathname.replace(/^\//, "") || "tabiaerp"),
  };
}

function backupDir(): string {
  const dir = path.resolve(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runCmd(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let err = "";
    child.stderr.on("data", (buf) => {
      err += buf.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new PublicError((err || `${cmd} başarısız`).slice(0, 500), 500));
    });
  });
}

export async function runCompanyBackup(companyId: number) {
  const ident = dbIdentity();
  const container = process.env.POSTGRES_DOCKER_CONTAINER || "tabiaerp-pg";
  const file = path.join(backupDir(), `tabiaerp-${companyId}-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "docker",
      ["exec", container, "pg_dump", "-U", ident.user, "--no-owner", "--no-acl", ident.name],
      { windowsHide: true }
    );
    const out = fs.createWriteStream(file);
    child.stdout.pipe(out);
    let err = "";
    child.stderr.on("data", (buf) => {
      err += buf.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      out.close();
      if (code === 0) resolve();
      else {
        fs.rmSync(file, { force: true });
        reject(new PublicError((err || "pg_dump başarısız").slice(0, 500), 500));
      }
    });
  });
  const size = fs.statSync(file).size;
  return prisma.backupRun.create({
    data: {
      companyId,
      runType: "MANUAL",
      status: "OK",
      filePath: file,
      fileSize: size,
      message: "PostgreSQL yedeği alındı.",
    },
  });
}

export function startBackupScheduler() {
  setInterval(() => {
    void (async () => {
      const rows = await prisma.companyAyar.findMany({ where: { backupActive: true } });
      const hour = new Date().getHours();
      for (const row of rows) {
        const slots = Array.isArray(row.schedule) ? (row.schedule as Array<{ hour?: number; is_active?: boolean }>) : [];
        if (!slots.some((slot) => slot.is_active && Number(slot.hour) === hour)) continue;
        const recent = await prisma.backupRun.findFirst({
          where: { companyId: row.companyId, createdAt: { gt: new Date(Date.now() - 50 * 60 * 1000) } },
        });
        if (recent) continue;
        try {
          await runCompanyBackup(row.companyId);
        } catch (error) {
          console.error("[Yedek]", error);
        }
      }
    })();
  }, 60 * 60 * 1000).unref?.();
}

function toBackupLog(row: { id: number; runType: string; status: string; filePath: string | null; fileSize: number | null; message: string | null; createdAt: Date }) {
  return {
    id: row.id,
    run_type: row.runType,
    status: row.status,
    file_path: row.filePath,
    file_size: row.fileSize,
    message: row.message,
    created_at: row.createdAt.toISOString(),
  };
}

uyarlamaRouter.get("/tanim/departman", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  await ensureDepartman(companyId);
  const items = await prisma.departman.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  res.json({ items });
}));

uyarlamaRouter.post("/tanim/departman", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const code = String(req.body?.code || "").trim();
  const name = String(req.body?.name || "").trim();
  if (!code || !name) fail("Departman kodu ve adı zorunludur.", 400);
  const created = await prisma.departman.create({ data: { companyId, code, name, isActive: req.body?.is_active !== false } });
  res.status(201).json(created);
}));

uyarlamaRouter.put("/tanim/departman/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const existing = await prisma.departman.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!existing) fail("Departman bulunamadı.", 404);
  const updated = await prisma.departman.update({
    where: { id: existing.id },
    data: {
      code: req.body?.code ? String(req.body.code) : existing.code,
      name: req.body?.name ? String(req.body.name) : existing.name,
      isActive: req.body?.is_active === undefined ? existing.isActive : Boolean(req.body.is_active),
    },
  });
  res.json(updated);
}));

uyarlamaRouter.delete("/tanim/departman/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const existing = await prisma.departman.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!existing) fail("Departman bulunamadı.", 404);
  await prisma.departman.delete({ where: { id: existing.id } });
  res.json({ ok: true });
}));

uyarlamaRouter.get("/tanim/meslek", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  await ensureMeslek(companyId);
  const q = String(req.query.q || "").trim();
  const items = await prisma.sgkMeslek.findMany({
    where: {
      companyId,
      ...(q ? { OR: [{ kod: { contains: q } }, { ad: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { kod: "asc" },
    take: 500,
  });
  res.json({ items, kaynak: "ISCO-08 / SGK meslek kodu" });
}));

uyarlamaRouter.post("/tanim/meslek/guncelle", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const urlText = String(req.body?.url || process.env.SGK_MESLEK_URL || "").trim();
  if (!urlText) fail("Güncelleme adresi yok. Personel tanımlarında JSON adresini girin veya SGK_MESLEK_URL tanımlayın.", 400);
  let parsed: URL;
  try {
    parsed = new URL(urlText);
  } catch {
    fail("Meslek listesi adresi geçersiz.", 400);
  }
  if (parsed.protocol !== "https:") fail("Meslek listesi yalnız https adresinden alınır.", 400);
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) {
    fail("İç ağ adresinden liste alınmaz.", 400);
  }
  const response = await fetch(parsed, { redirect: "error" });
  if (!response.ok) fail("Meslek listesi kaynağı yanıt vermedi.", 502);
  const data = (await response.json()) as Array<{ kod?: string; code?: string; ad?: string; name?: string }>;
  if (!Array.isArray(data) || data.length === 0) fail("Kaynakta meslek satırı yok.", 400);
  const rows = data
    .map((row) => ({ kod: String(row.kod || row.code || "").trim(), ad: String(row.ad || row.name || "").trim() }))
    .filter((row) => row.kod && row.ad);
  await prisma.sgkMeslek.deleteMany({ where: { companyId } });
  await prisma.sgkMeslek.createMany({
    data: rows.map((row) => ({ companyId, kod: row.kod, ad: row.ad, kaynak: parsed.hostname })),
  });
  res.json({ ok: true, count: rows.length, kaynak: parsed.hostname });
}));

uyarlamaRouter.get("/tanim/sgk-isyeri", asyncRoute(async (req, res) => {
  const items = await prisma.sgkIsyeri.findMany({ where: { companyId: companyIdOf(req) }, orderBy: { id: "asc" } });
  res.json({
    items: items.map((row) => ({
      id: row.id,
      tip: row.tip,
      branch_id: row.branchId,
      isyeri_kodu: row.isyeriKodu,
      kullanici_adi: row.kullaniciAdi,
      unvan: row.unvan,
      is_active: row.isActive,
      sifre_var: Boolean(row.sifreSifreli),
    })),
  });
}));

uyarlamaRouter.post("/tanim/sgk-isyeri", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const tip = String(req.body?.tip || "").toUpperCase();
  if (tip !== "MERKEZ" && tip !== "SUBE") fail("İşyeri tipi MERKEZ veya SUBE olmalıdır.", 400);
  const isyeriKodu = String(req.body?.isyeri_kodu || "").trim();
  if (!isyeriKodu) fail("İşyeri kodu zorunludur.", 400);
  const created = await prisma.sgkIsyeri.create({
    data: {
      companyId,
      tip,
      branchId: req.body?.branch_id
        ? branchWithinCompany(
            (await prisma.branch.findMany({ where: { companyId, isActive: true }, select: { id: true } })).map((row) => row.id),
            req.body.branch_id,
          )
        : null,
      isyeriKodu,
      kullaniciAdi: String(req.body?.kullanici_adi || ""),
      sifreSifreli: req.body?.sifre ? encryptText(String(req.body.sifre)) : "",
      unvan: String(req.body?.unvan || ""),
    },
  });
  res.status(201).json({ id: created.id, sifre_var: Boolean(created.sifreSifreli) });
}));

uyarlamaRouter.put("/tanim/sgk-isyeri/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const existing = await prisma.sgkIsyeri.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!existing) fail("SGK işyeri bulunamadı.", 404);
  const updated = await prisma.sgkIsyeri.update({
    where: { id: existing.id },
    data: {
      tip: req.body?.tip ? String(req.body.tip).toUpperCase() : existing.tip,
      isyeriKodu: req.body?.isyeri_kodu ? String(req.body.isyeri_kodu) : existing.isyeriKodu,
      kullaniciAdi: req.body?.kullanici_adi === undefined ? existing.kullaniciAdi : String(req.body.kullanici_adi),
      unvan: req.body?.unvan === undefined ? existing.unvan : String(req.body.unvan),
      branchId: req.body?.branch_id === undefined
        ? existing.branchId
        : req.body.branch_id
          ? branchWithinCompany(
              (await prisma.branch.findMany({ where: { companyId, isActive: true }, select: { id: true } })).map((row) => row.id),
              req.body.branch_id,
            )
          : null,
      sifreSifreli: req.body?.sifre ? encryptText(String(req.body.sifre)) : existing.sifreSifreli,
      isActive: req.body?.is_active === undefined ? existing.isActive : Boolean(req.body.is_active),
    },
  });
  res.json({ id: updated.id, sifre_var: Boolean(updated.sifreSifreli) });
}));

uyarlamaRouter.delete("/tanim/sgk-isyeri/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const existing = await prisma.sgkIsyeri.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!existing) fail("SGK işyeri bulunamadı.", 404);
  await prisma.sgkIsyeri.delete({ where: { id: existing.id } });
  res.json({ ok: true });
}));

uyarlamaRouter.get("/sistem/kvkk", asyncRoute(async (req, res) => {
  const row = await ayarOf(companyIdOf(req));
  res.json({
    kvkk_metin: row.kvkkMetin || KVKK_VARSAYILAN,
    personel_saklama_yil: row.personelSaklamaYil,
    cari_saklama_yil: row.cariSaklamaYil,
    gorev_ayrimi: row.gorevAyrimi,
  });
}));

uyarlamaRouter.put("/sistem/kvkk", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  await ayarOf(companyId);
  const row = await prisma.companyAyar.update({
    where: { companyId },
    data: {
      kvkkMetin: String(req.body?.kvkk_metin || KVKK_VARSAYILAN),
      personelSaklamaYil: Math.max(1, num(req.body?.personel_saklama_yil, 10)),
      cariSaklamaYil: Math.max(1, num(req.body?.cari_saklama_yil, 10)),
      gorevAyrimi: req.body?.gorev_ayrimi !== false,
    },
  });
  res.json({ ok: true, personel_saklama_yil: row.personelSaklamaYil, cari_saklama_yil: row.cariSaklamaYil });
}));

uyarlamaRouter.get("/sistem/donem", asyncRoute(async (req, res) => {
  const items = await prisma.fiscalPeriod.findMany({ where: { companyId: companyIdOf(req) }, orderBy: { year: "desc" } });
  res.json({
    items: items.map((row) => ({ id: row.id, year: row.year, is_closed: row.isClosed, closed_at: row.closedAt })),
  });
}));

uyarlamaRouter.post("/sistem/donem/:id/kilitle", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const row = await prisma.fiscalPeriod.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!row) fail("Dönem bulunamadı.", 404);
  const closed = req.body?.is_closed !== false;
  const updated = await prisma.fiscalPeriod.update({
    where: { id: row.id },
    data: { isClosed: closed, closedAt: closed ? new Date() : null },
  });
  res.json({ id: updated.id, year: updated.year, is_closed: updated.isClosed });
}));

uyarlamaRouter.get("/sistem/hesap-plani/yontem", asyncRoute(async (req, res) => {
  const row = await ayarOf(companyIdOf(req));
  res.json({ maliyet_yontemi: row.maliyetYontemi === "7B" ? "7B" : "7A" });
}));

uyarlamaRouter.put("/sistem/hesap-plani/yontem", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const yontem = String(req.body?.maliyet_yontemi || "7A").toUpperCase() === "7B" ? "7B" : "7A";
  await ayarOf(companyId);
  if (yontem === "7B") await ensure7B(companyId);
  await prisma.companyAyar.update({ where: { companyId }, data: { maliyetYontemi: yontem } });
  res.json({ maliyet_yontemi: yontem });
}));

uyarlamaRouter.get("/sistem/hesap-plani", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const ayar = await ayarOf(companyId);
  const q = String(req.query.q || "").trim();
  const rows = await prisma.hesapPlani.findMany({
    where: {
      companyId,
      ...planFilter(ayar.maliyetYontemi),
      ...(q ? { OR: [{ kod: { contains: q } }, { ad: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { kod: "asc" },
    take: 2000,
  });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      code: row.kod,
      name: row.ad,
      is_postable: row.isPostable,
      kilitli: row.kilitli,
      account_level: row.seviye,
      account_nature: "BORC_ALACAK",
      plan_tipi: row.planTipi,
      debit: 0,
      credit: 0,
      balance: 0,
    })),
    maliyet_yontemi: ayar.maliyetYontemi,
  });
}));

uyarlamaRouter.post("/sistem/hesap-plani/seed-tdhp", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  await seedChart(companyId);
  await prisma.hesapPlani.updateMany({
    where: { companyId, kod: { startsWith: "7" }, NOT: { kod: { startsWith: "79" } } },
    data: { planTipi: "7A" },
  });
  await ensure7B(companyId);
  const count = await prisma.hesapPlani.count({ where: { companyId } });
  res.json({ seeded: count, skipped: false });
}));

function hesapCevap(row: { id: number; kod: string; ad: string; seviye: string; isPostable: boolean; kilitli: boolean; planTipi: string }) {
  return {
    id: row.id,
    code: row.kod,
    name: row.ad,
    is_postable: row.isPostable,
    kilitli: row.kilitli,
    account_level: row.seviye,
    plan_tipi: row.planTipi,
  };
}

uyarlamaRouter.post("/sistem/hesap-plani", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const govde = z.object({
    code: z.string().trim().min(1).max(32),
    name: z.string().trim().min(2).max(200),
    account_level: z.string().optional(),
  }).parse(req.body);
  const kod = govde.code;
  const ad = govde.name;
  const seviye = govde.account_level || "MUAVIN";
  if (kilitliSeviye(seviye)) {
    throw new PublicError("Sınıf, alt sınıf ve ana hesap kilitlidir. Yalnız alt hesap eklenebilir.", 409);
  }
  const ana = altHesapAnaKodu(kod);
  if (!ana) throw new PublicError("Alt hesap, kilitli ana hesabın altında noktalı kod olmalıdır. Örnek: 100.01.", 400);
  const ayar = await ayarOf(companyId);
  if (ayar.maliyetYontemi === "7B" && /^7[1-8]/.test(ana)) {
    throw new PublicError("7/B şirkette 710-789 alt hesabı açılamaz.", 409);
  }
  const parent = await prisma.hesapPlani.findFirst({ where: { companyId, kod: ana } });
  if (!parent || !parent.kilitli) throw new PublicError("Alt hesabın bağlı olduğu ana hesap planda yok veya kilitli değil.", 409);
  const created = await prisma.$transaction(async (tx) => {
    const varOlan = await tx.hesapPlani.findFirst({ where: { companyId, kod } });
    if (varOlan) throw new PublicError("Bu hesap kodu zaten var.", 409);
    const row = await tx.hesapPlani.create({
      data: {
        companyId,
        kod,
        ad,
        seviye: "MUAVIN",
        isPostable: true,
        kilitli: false,
        planTipi: parent.planTipi,
      },
    });
    await tx.auditLog.create({
      data: {
        tabloAdi: "hesap_plani",
        islemTipi: "INSERT",
        kullaniciId: req.user?.userId ?? null,
        ipAdresi: req.ip || null,
        yeniVeri: { kod, ad },
      },
    });
    return row;
  });
  res.status(201).json(hesapCevap(created));
}));

uyarlamaRouter.put("/sistem/hesap-plani/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const ad = z.object({ name: z.string().trim().min(2).max(200) }).parse(req.body).name;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.hesapPlani.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!row) throw new PublicError("Hesap bulunamadı.", 404);
    if (row.kilitli || kilitliSeviye(row.seviye)) {
      throw new PublicError("Kilitli ana hesap değiştirilemez.", 409);
    }
    const sonuc = await tx.hesapPlani.update({ where: { id: row.id }, data: { ad } });
    await tx.auditLog.create({
      data: {
        tabloAdi: "hesap_plani",
        islemTipi: "UPDATE",
        kullaniciId: req.user?.userId ?? null,
        ipAdresi: req.ip || null,
        eskiVeri: { kod: row.kod, ad: row.ad },
        yeniVeri: { kod: row.kod, ad },
      },
    });
    return sonuc;
  });
  res.json(hesapCevap(updated));
}));

uyarlamaRouter.delete("/sistem/hesap-plani/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const silinen = await prisma.$transaction(async (tx) => {
    const row = await tx.hesapPlani.findFirst({ where: { id: Number(req.params.id), companyId } });
    if (!row) throw new PublicError("Hesap bulunamadı.", 404);
    if (row.kilitli || kilitliSeviye(row.seviye)) {
      throw new PublicError("Kilitli ana hesap silinemez.", 409);
    }
    const hareket = await tx.yevmiyeSatir.count({
      where: { hesapKodu: row.kod, yevmiyeKaydi: { companyId } },
    });
    if (hareket > 0) throw new PublicError("Fişi olan alt hesap silinemez.", 409);
    await tx.hesapPlani.deleteMany({ where: { id: row.id, companyId } });
    await tx.auditLog.create({
      data: {
        tabloAdi: "hesap_plani",
        islemTipi: "DELETE",
        kullaniciId: req.user?.userId ?? null,
        ipAdresi: req.ip || null,
        eskiVeri: { kod: row.kod, ad: row.ad },
      },
    });
    return row;
  });
  res.json({ ok: true, id: silinen.id, code: silinen.kod });
}));

uyarlamaRouter.get("/sistem/backup/settings", asyncRoute(async (req, res) => {
  const row = await ayarOf(companyIdOf(req));
  const slots = Array.isArray(row.schedule) ? row.schedule : [
    { hour: 2, minute: 0, is_active: false },
    { hour: 12, minute: 0, is_active: false },
    { hour: 22, minute: 0, is_active: false },
  ];
  res.json({
    company_id: row.companyId,
    backup_folder: row.backupFolder,
    backup_format: "plain",
    max_backups: row.backupMax,
    auto_delete_days: row.autoDeleteDays,
    is_active: row.backupActive,
    schedule_slots: slots,
  });
}));

uyarlamaRouter.put("/sistem/backup/settings", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  await ayarOf(companyId);
  const row = await prisma.companyAyar.update({
    where: { companyId },
    data: {
      backupFolder: "backups",
      backupMax: Math.max(1, num(req.body?.max_backups, 14)),
      autoDeleteDays: Math.max(0, num(req.body?.auto_delete_days, 0)),
      backupActive: Boolean(req.body?.is_active),
      schedule: Array.isArray(req.body?.schedule_slots) ? req.body.schedule_slots : undefined,
    },
  });
  res.json({
    company_id: row.companyId,
    backup_folder: row.backupFolder,
    backup_format: "plain",
    max_backups: row.backupMax,
    auto_delete_days: row.autoDeleteDays,
    is_active: row.backupActive,
    schedule_slots: row.schedule,
  });
}));

uyarlamaRouter.get("/sistem/backup/logs", asyncRoute(async (req, res) => {
  const items = await prisma.backupRun.findMany({
    where: { companyId: companyIdOf(req) },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  res.json({ items: items.map(toBackupLog) });
}));

uyarlamaRouter.post("/sistem/backup/run", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  try {
    const row = await runCompanyBackup(companyIdOf(req));
    res.status(201).json(toBackupLog(row));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yedek alınamadı";
    const log = await prisma.backupRun.create({
      data: { companyId: companyIdOf(req), runType: "MANUAL", status: "HATA", message: message.slice(0, 500) },
    });
    res.status(500).json({ ...toBackupLog(log), message });
  }
}));

uyarlamaRouter.post("/sistem/backup/restore", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  if (req.body?.confirm_phrase !== "GERI_YUKLE") fail('Onay metni "GERI_YUKLE" olmalıdır.', 400);
  const companyId = companyIdOf(req);
  const row = await prisma.backupRun.findFirst({ where: { id: Number(req.body?.backup_id), companyId } });
  if (!row?.filePath || !fs.existsSync(row.filePath)) fail("Yedek dosyası bulunamadı.", 404);
  const root = backupDir();
  const real = path.resolve(row.filePath);
  if (!real.startsWith(root)) fail("Yedek yolu geçersiz.", 400);
  const ident = dbIdentity();
  const container = process.env.POSTGRES_DOCKER_CONTAINER || "tabiaerp-pg";
  await runCmd("docker", ["cp", real, `${container}:/tmp/tabia-restore.sql`]);
  await runCmd("docker", ["exec", container, "psql", "-U", ident.user, "-d", ident.name, "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"]);
  await runCmd("docker", ["exec", container, "psql", "-U", ident.user, "-d", ident.name, "-f", "/tmp/tabia-restore.sql"]);
  const log = await prisma.backupRun.create({
    data: { companyId, runType: "RESTORE", status: "OK", filePath: real, message: "Yedek geri yüklendi." },
  });
  res.json(toBackupLog(log));
}));

uyarlamaRouter.get("/sistem/entegrator", asyncRoute(async (req, res) => {
  const row = await ayarOf(companyIdOf(req));
  res.json({
    url: row.integratorUrl || "",
    username: row.integratorUser || "",
    environment: row.integratorEnv,
    sifre_var: Boolean(row.integratorSecret),
  });
}));

uyarlamaRouter.put("/sistem/entegrator", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  await ayarOf(companyId);
  const url = String(req.body?.url || "");
  if (url && !url.startsWith("https://")) fail("Entegratör adresi https olmalıdır.", 400);
  await prisma.companyAyar.update({
    where: { companyId },
    data: {
      integratorUrl: url || null,
      integratorUser: String(req.body?.username || ""),
      integratorEnv: req.body?.environment === "live" ? "live" : "test",
      integratorSecret: req.body?.password ? encryptText(String(req.body.password)) : undefined,
    },
  });
  res.json({ ok: true });
}));

uyarlamaRouter.get("/stok/hareket-defteri", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const rows = await prisma.stokHareket.findMany({
    where: { companyId },
    include: { stok: true },
    orderBy: { tarih: "desc" },
    take: 300,
  });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      tarih: row.tarih.toISOString().slice(0, 10),
      stok_kodu: row.stok.stokKodu,
      stok_adi: row.stok.stokAdi,
      giris: Number(row.giris),
      cikis: Number(row.cikis),
      aciklama: row.aciklama,
      belge_no: row.belgeNo,
    })),
  });
}));

uyarlamaRouter.get("/cari-islemleri", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const q = String(req.query.q || "").trim();
  const rows = await prisma.cariKart.findMany({
    where: {
      companyId,
      ...(q ? { OR: [{ kod: { contains: q, mode: "insensitive" } }, { ad: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { kod: "asc" },
    take: 300,
  });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      code: row.kod,
      title: row.ad,
      tax_number: row.vergiNo,
      balance: Number(row.bakiye),
      is_active: row.isActive,
    })),
  });
}));

uyarlamaRouter.get("/cari-islemleri/:id/ekstre", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const cari = await prisma.cariKart.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!cari) fail("Cari bulunamadı.", 404);
  const rows = await prisma.cariHareket.findMany({
    where: { companyId, cariId: cari.id },
    orderBy: [{ tarih: "asc" }, { id: "asc" }],
  });
  let running = 0;
  const items = rows.map((row) => {
    running += Number(row.borc) - Number(row.alacak);
    return {
      id: row.id,
      tarih: row.tarih.toISOString().slice(0, 10),
      aciklama: row.aciklama,
      belge_no: row.belgeNo,
      borc: Number(row.borc),
      alacak: Number(row.alacak),
      bakiye: running,
      kaynak_tip: row.kaynakTip,
      kaynak_id: row.kaynakId,
    };
  });
  res.json({
    cari: { id: cari.id, code: cari.kod, title: cari.ad, balance: Number(cari.bakiye) },
    items,
    csv: ["tarih,belge,aciklama,borc,alacak,bakiye", ...items.map((row) => [row.tarih, row.belge_no, row.aciklama, row.borc, row.alacak, row.bakiye].map(csvCell).join(","))].join("\n"),
  });
}));

uyarlamaRouter.put("/cari-islemleri/hareket/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const row = await prisma.cariHareket.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!row) fail("Hareket bulunamadı.", 404);
  await assertPeriodOpen(companyId, row.tarih);
  await assertHareketEditable(companyId, row);
  const borc = req.body?.borc === undefined ? Number(row.borc) : num(req.body.borc);
  const alacak = req.body?.alacak === undefined ? Number(row.alacak) : num(req.body.alacak);
  if (borc > 0 && alacak > 0) fail("Ekstre satırında hem borç hem alacak olamaz.", 400);
  if (borc < 0 || alacak < 0) fail("Borç ve alacak negatif olamaz.", 400);
  const tersFisNo = await tersKayitIfLocked(companyId, row);
  const updated = await prisma.cariHareket.update({
    where: { id: row.id },
    data: {
      aciklama: req.body?.aciklama === undefined ? row.aciklama : String(req.body.aciklama),
      borc: new Prisma.Decimal(borc.toFixed(2)),
      alacak: new Prisma.Decimal(alacak.toFixed(2)),
      belgeNo: req.body?.belge_no === undefined ? row.belgeNo : String(req.body.belge_no),
    },
  });
  const bakiye = await recomputeCari(row.cariId, companyId);
  const linked = await syncLinked(companyId, updated);
  res.json({
    ok: true,
    bakiye,
    ters_fis_no: tersFisNo,
    guncellenen: linked,
    message: tersFisNo
      ? `Ekstre güncellendi. Kesin yevmiye için önce ${tersFisNo} ters fişi açıldı. Bakiye ve bağlı fatura yenilendi.`
      : "Ekstre güncellendi. Bakiye ve bağlı fatura yenilendi.",
  });
}));

uyarlamaRouter.delete("/cari-islemleri/hareket/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const row = await prisma.cariHareket.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!row) fail("Hareket bulunamadı.", 404);
  await assertPeriodOpen(companyId, row.tarih);
  await assertHareketEditable(companyId, row);
  const tersFisNo = await tersKayitIfLocked(companyId, row);
  await prisma.cariHareket.delete({ where: { id: row.id } });
  const bakiye = await recomputeCari(row.cariId, companyId);
  res.json({
    ok: true,
    bakiye,
    ters_fis_no: tersFisNo,
    message: tersFisNo
      ? `Satır silindi. Kesin yevmiye için ${tersFisNo} ters fişi açıldı. Bakiye yeniden hesaplandı. Fatura belgesi silinmedi.`
      : "Satır silindi. Bakiye yeniden hesaplandı. Fatura belgesi silinmedi.",
  });
}));

uyarlamaRouter.post("/cari-islemleri/cek", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const belgeNo = String(req.body?.belge_no || "").trim();
  if (!belgeNo) fail("Çek veya senet numarası zorunludur.", 400);
  const created = await prisma.cekSenet.create({
    data: {
      companyId,
      cariId: req.body?.cari_id ? Number(req.body.cari_id) : null,
      tur: String(req.body?.tur || "CEK"),
      belgeNo,
      tutar: new Prisma.Decimal(num(req.body?.tutar).toFixed(2)),
      vade: new Date(String(req.body?.vade || new Date().toISOString())),
      durum: req.body?.ciro_edildi ? "CIRO" : "PORTFOY",
      ciroEdildi: Boolean(req.body?.ciro_edildi),
    },
  });
  res.status(201).json({ id: created.id, ciro_edildi: created.ciroEdildi });
}));

function lineTotal(line: { qty?: number; unit_price?: number; tax_rate?: number | null }) {
  const net = money(new Decimal(String(num(line.qty, 1))).times(String(num(line.unit_price))));
  const tax = money(net.times(num(line.tax_rate, 20)).div(100));
  return { net: net.toNumber(), tax: tax.toNumber(), total: net.plus(tax).toNumber() };
}

uyarlamaRouter.get("/siparis", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const tur = String(req.query.doc_kind || "SIPARIS");
  const yon = String(req.query.direction || "");
  const q = String(req.query.q || "").trim();
  const rows = await prisma.ticariBelge.findMany({
    where: {
      companyId,
      tur,
      ...(yon ? { yon } : {}),
    },
    orderBy: { tarih: "desc" },
    take: 100,
  });
  const cariIds = rows.map((row) => row.cariId).filter((id): id is number => Boolean(id));
  const cariler = await prisma.cariKart.findMany({ where: { id: { in: cariIds }, companyId } });
  const byId = new Map(cariler.map((row) => [row.id, row]));
  const items = rows
    .map((row) => toOrder(row, row.cariId ? byId.get(row.cariId) : null))
    .filter((row) => !q || `${row.order_no} ${row.account_title || ""}`.toLowerCase().includes(q.toLowerCase()));
  res.json({ items, total: items.length, page: 1, page_size: items.length });
}));

uyarlamaRouter.get("/siparis/:id", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const row = await prisma.ticariBelge.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { satirlar: { orderBy: { satirNo: "asc" } }, cari: true },
  });
  if (!row) fail("Belge bulunamadı.", 404);
  const base = toOrder(row, row.cari);
  res.json({
    ...base,
    lines: row.satirlar.map((line) => ({
      id: line.id,
      line_no: line.satirNo,
      description: line.aciklama,
      qty: Number(line.miktar),
      unit_price: Number(line.birimFiyat),
      tax_rate: Number(line.kdvOran),
      line_total: Number(line.tutar),
    })),
  });
}));

uyarlamaRouter.post("/siparis", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const body = req.body || {};
  await assertPeriodOpen(companyId, new Date(String(body.order_date || new Date().toISOString())));
  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (body.account_id) {
    const cari = await prisma.cariKart.findFirst({ where: { id: Number(body.account_id), companyId } });
    if (!cari) fail("Cari bulunamadı.", 404);
  }
  const totals = lines.map(lineTotal);
  const tutar = addMoney(totals.map((row: { total: number }) => row.total));
  const tur = String(body.doc_kind || "SIPARIS");
  const count = await prisma.ticariBelge.count({ where: { companyId, tur } });
  const belgeNo = `${tur.slice(0, 3)}-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const created = await prisma.ticariBelge.create({
    data: {
      companyId,
      tur,
      yon: String(body.direction || "ALINAN"),
      belgeNo,
      cariId: Number(body.account_id),
      tarih: new Date(String(body.order_date || new Date().toISOString())),
      tutar: new Prisma.Decimal(tutar.toFixed(2)),
      durum: String(body.status || "OPEN"),
      olusturanId: req.user?.userId,
      profil: body,
      satirlar: {
        create: lines.map((line: { description?: string; qty?: number; unit_price?: number; tax_rate?: number | null }, index: number) => {
          const calc = lineTotal(line);
          return {
            satirNo: index + 1,
            aciklama: String(line.description || "Satır"),
            miktar: new Prisma.Decimal(num(line.qty, 1)),
            birimFiyat: new Prisma.Decimal(money(line.unit_price).toFixed(2)),
            kdvOran: new Prisma.Decimal(num(line.tax_rate, 20)),
            tutar: new Prisma.Decimal(calc.total.toFixed(2)),
          };
        }),
      },
    },
    include: { cari: true, satirlar: true },
  });
  const base = toOrder(created, created.cari);
  res.status(201).json({ ...base, lines: created.satirlar });
}));

uyarlamaRouter.put("/siparis/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const onay = String(req.query.onay || "") === "1";
  const { self, kids } = await assertChainWritable(companyId, Number(req.params.id), onay, "değiştirme");
  if (onay) {
    for (const kid of [...kids].reverse()) {
      await removeOneBelge(companyId, kid.id);
    }
  }
  if (GIB_KILIT.has(self.gibDurum)) fail("GİB onaylı belge değiştirilemez.", 409);
  if (String(req.body?.status || "") === "CONFIRMED") {
    const ayar = await ayarOf(companyId);
    const users = await prisma.user.count({ where: { companyId, isActive: true } });
    if (ayar.gorevAyrimi && users > 1 && self.olusturanId && self.olusturanId === req.user?.userId) {
      fail("Kaydı oluşturan kullanıcı aynı belgeyi onaylayamaz.", 403);
    }
  }
  const lines = Array.isArray(req.body?.lines) ? req.body.lines : null;
  if (lines) {
    await prisma.ticariBelgeSatir.deleteMany({ where: { belgeId: self.id } });
    const totals = lines.map(lineTotal);
    const tutar = addMoney(totals.map((row: { total: number }) => row.total));
    await prisma.ticariBelge.update({
      where: { id: self.id },
      data: {
        tutar: new Prisma.Decimal(tutar.toFixed(2)),
        durum: String(req.body?.status || self.durum),
        onaylayanId: req.body?.status === "CONFIRMED" ? req.user?.userId : self.onaylayanId,
        satirlar: {
          create: lines.map((line: { description?: string; qty?: number; unit_price?: number; tax_rate?: number | null }, index: number) => ({
            satirNo: index + 1,
            aciklama: String(line.description || "Satır"),
            miktar: new Prisma.Decimal(num(line.qty, 1)),
            birimFiyat: new Prisma.Decimal(money(line.unit_price).toFixed(2)),
            kdvOran: new Prisma.Decimal(num(line.tax_rate, 20)),
            tutar: new Prisma.Decimal(lineTotal(line).total.toFixed(2)),
          })),
        },
      },
    });
  } else {
    await prisma.ticariBelge.update({
      where: { id: self.id },
      data: { durum: String(req.body?.status || self.durum) },
    });
  }
  const fresh = await prisma.ticariBelge.findFirstOrThrow({ where: { id: self.id }, include: { cari: true } });
  res.json(toOrder(fresh, fresh.cari));
}));

uyarlamaRouter.delete("/siparis/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const onay = String(req.query.onay || "") === "1";
  await assertChainWritable(companyId, Number(req.params.id), onay, "silme");
  await removeBelgeTree(companyId, Number(req.params.id));
  res.json({ ok: true, message: "Belge ve bağlı kayıtlar silindi." });
}));

async function convertFrom(req: Request, targetTur: "SIPARIS" | "IRSALIYE" | "FATURA") {
  const companyId = companyIdOf(req);
  const source = await prisma.ticariBelge.findFirst({
    where: { id: Number(req.params.id), companyId },
    include: { satirlar: true },
  });
  if (!source) fail("Kaynak belge bulunamadı.", 404);
  if (GIB_KILIT.has(source.gibDurum)) fail("GİB onaylı belgeden yeni belge üretilemez.", 409);
  const existing = await prisma.ticariBelge.findFirst({ where: { companyId, kaynakId: source.id, tur: targetTur } });
  if (existing) fail(`Bu belgenin ${targetTur} kaydı zaten var: ${existing.belgeNo}`, 409);
  await assertPeriodOpen(companyId, new Date());
  const count = await prisma.ticariBelge.count({ where: { companyId, tur: targetTur } });
  const belgeNo = `${targetTur.slice(0, 3)}-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const created = await prisma.ticariBelge.create({
    data: {
      companyId,
      tur: targetTur,
      yon: source.yon,
      belgeNo,
      cariId: source.cariId,
      tarih: new Date(),
      tutar: source.tutar,
      durum: "OPEN",
      kaynakId: source.id,
      olusturanId: req.user?.userId,
      profil: { source_id: source.id, source_no: source.belgeNo },
      satirlar: {
        create: source.satirlar.map((line) => ({
          satirNo: line.satirNo,
          aciklama: line.aciklama,
          miktar: line.miktar,
          birimFiyat: line.birimFiyat,
          kdvOran: line.kdvOran,
          tutar: line.tutar,
        })),
      },
    },
  });
  if (targetTur === "FATURA") {
    await prisma.fatura.create({
      data: {
        companyId,
        belgeNo,
        tarih: new Date(),
        yon: source.yon === "VERILEN" ? "ALIS" : "SATIS",
        cariId: source.cariId,
        genelToplam: source.tutar,
        durum: "TASLAK",
        gibDurum: "YOK",
        olusturanId: req.user?.userId,
      },
    });
    if (source.cariId) {
      const borc = source.yon === "ALINAN" ? source.tutar : new Prisma.Decimal(0);
      const alacak = source.yon === "VERILEN" ? source.tutar : new Prisma.Decimal(0);
      await prisma.cariHareket.create({
        data: {
          companyId,
          cariId: source.cariId,
          tarih: new Date(),
          borc,
          alacak,
          aciklama: `Fatura ${belgeNo}`,
          belgeNo,
          kaynakTip: "TICARI",
          kaynakId: created.id,
        },
      });
      await recomputeCari(source.cariId, companyId);
    }
  }
  await prisma.ticariBelge.update({
    where: { id: source.id },
    data: { durum: targetTur === "FATURA" ? "INVOICED" : targetTur === "IRSALIYE" ? "DELIVERED" : "CONFIRMED" },
  });
  return created;
}

uyarlamaRouter.post("/siparis/:id/convert/order", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const created = await convertFrom(req, "SIPARIS");
  res.status(201).json({ ok: true, message: `Sipariş oluşturuldu: ${created.belgeNo}`, target_id: created.id, target_no: created.belgeNo });
}));

uyarlamaRouter.post("/siparis/:id/convert/waybill", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const created = await convertFrom(req, "IRSALIYE");
  res.status(201).json({ ok: true, message: `İrsaliye oluşturuldu: ${created.belgeNo}`, target_id: created.id, target_no: created.belgeNo });
}));

uyarlamaRouter.post("/siparis/:id/convert/invoice", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const created = await convertFrom(req, "FATURA");
  res.status(201).json({ ok: true, message: `Fatura oluşturuldu: ${created.belgeNo}`, target_id: created.id, target_no: created.belgeNo });
}));

uyarlamaRouter.post("/fatura/:id/send-efatura", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const ayar = await ayarOf(companyId);
  if (!ayar.integratorUrl || !ayar.integratorSecret) {
    fail("e-Fatura entegratörü tanımlı değil. Sistem ayarlarındaki entegratör kaydı olmadan belge GİB'e gönderilmiş sayılmaz.", 400);
  }
  const belge = await prisma.ticariBelge.findFirst({ where: { id: Number(req.params.id), companyId, tur: "FATURA" } });
  const fatura = belge
    ? await prisma.fatura.findFirst({ where: { companyId, belgeNo: belge.belgeNo } })
    : await prisma.fatura.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!fatura && !belge) fail("Fatura bulunamadı.", 404);
  let remoteOk = false;
  let approved = false;
  try {
    const response = await fetch(ayar.integratorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: ayar.integratorUser, document_no: fatura?.belgeNo || belge?.belgeNo, environment: ayar.integratorEnv }),
    });
    remoteOk = response.ok;
    if (remoteOk) {
      const payload = (await response.json().catch(() => ({}))) as { approved?: boolean };
      approved = Boolean(payload.approved);
    }
  } catch {
    remoteOk = false;
  }
  if (!remoteOk) fail("Entegratör belgeyi kabul etmedi. Durum GİB onaylı yapılmadı.", 502);
  const gibDurum = approved ? "ONAYLI" : "GONDERILDI";
  if (fatura) await prisma.fatura.update({ where: { id: fatura.id }, data: { gibDurum } });
  if (belge) await prisma.ticariBelge.update({ where: { id: belge.id }, data: { gibDurum } });
  res.json({ ok: true, message: approved ? "Entegratör belgeyi onayladı." : "Entegratör belgeyi aldı. Onay bekleniyor.", gib_status: gibDurum });
}));

uyarlamaRouter.delete("/fatura/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const fatura = await prisma.fatura.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!fatura) fail("Fatura bulunamadı.", 404);
  if (GIB_KILIT.has(fatura.gibDurum)) fail("GİB'e gönderilmiş veya onaylanmış fatura silinemez.", 409);
  if (fatura.durum === "ONAYLI" || fatura.yevmiyeFisNo) {
    fail("Onaylı faturanın yevmiye fişi vardır. Silinmez; iade belgesi veya ters fiş açılır.", 409);
  }
  const belge = await prisma.ticariBelge.findFirst({ where: { companyId, tur: "FATURA", belgeNo: fatura.belgeNo } });
  if (belge) {
    await assertChainWritable(companyId, belge.id, String(req.query.onay || "") === "1", "silme");
    await removeBelgeTree(companyId, belge.id);
  } else {
    await prisma.faturaSatir.deleteMany({ where: { faturaId: fatura.id } });
    await prisma.fatura.delete({ where: { id: fatura.id } });
  }
  res.json({ ok: true });
}));

uyarlamaRouter.put("/fatura/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const fatura = await prisma.fatura.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!fatura) fail("Fatura bulunamadı.", 404);
  if (GIB_KILIT.has(fatura.gibDurum)) fail("GİB onaylı fatura değiştirilemez.", 409);
  res.status(409).json({
    success: false,
    message: "Fatura değişikliği cari ekstre ve bağlı belgelerle birlikte yapılır. GİB onaylı belgede değişiklik kapalıdır.",
  });
}));
