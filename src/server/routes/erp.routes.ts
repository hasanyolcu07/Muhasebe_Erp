/**
 * Şirket kapsamlı iş API'si.
 * Cari, stok, yevmiye, fatura, personel ve bordro PostgreSQL üzerindedir.
 * Tanımsız yollar bu yönlendiricide yoktur; istemci sahte başarı üretmez.
 */

import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { PublicError, toPublicMessage } from "../security/publicError";
import { branchWithinCompany } from "../security/branchScope";
import { comparePartners } from "../services/kobi.logic";
import { assertStrongPassword } from "../security/password";
import { assertPeriodOpen } from "../services/period.service";
import { RECORD_TYPES, STOCK_UNITS, TAX_RATES, TEVKIFAT_CODES } from "../../lib/referenceData";
import { seedChart } from "../../../prisma/seed";
import { uyarlamaRouter } from "./uyarlama.routes";
import { yearEndRouter } from "./yearEnd.routes";
import { edefterRouter } from "./edefter.routes";
import { finansRouter } from "./finans.routes";
import { getPermissionsForRole } from "../controllers/auth.controller";
import { actionForMethod, moduleForPath, roleAllows } from "../security/moduleAccess";
import { buildPayrollDraftLines, bordroGiderHesabi, uretimPersonel } from "../services/bordroFis.logic";
import { payrollDraftFromEngine } from "../services/bordroHesap.logic";
import { payrollSetForYear, mevzuatYiliKaydet, mevzuatYiliOku } from "../mevzuat/yilKayit";
import { getMevzuatParametre } from "../mevzuat/parametre";
import { bildirimUygun, hizmetGunu, ihbarTutari, kidemTutari, oncekiDonem, yillikIzinGunu } from "../services/bordroHak.logic";
import { maskTcKimlikNo, maskWage } from "../../modules/personel/types/personelTypes";
import { ebelgeTaslagi, kaydetFatura, kdvBeyanRaporu } from "../services/faturaKayit.service";
import type { FaturaYon } from "../services/faturaFis.logic";
import { productionCostDraft } from "../services/uretimMaliyet.logic";
import { Decimal } from "../../lib/financialMath";
import { addMoney, money, moneyNumber } from "../money";
import { hesapFiseUygun } from "../muhasebe/thpKilit.logic";
import { fisTarihiUygun, sonrakiFisNo, tarihGun, tersKayitTarihi } from "../muhasebe/yevmiyeNo.logic";
import { defterRaporu, type DefterHareket } from "../muhasebe/defterRapor.logic";

const router = Router();

const PUBLIC_PATH = /^\/setup(\/|$)/;
const API_PATH =
  /^\/(companies|tenant|dashboard|cari|stok|yevmiye|fatura|personel|bordro|workspace|myasistan|siparis|irsaliye|sistem|tanim|cari-islemleri|belge|edefter|kobi|kasa-banka|kasa-islemleri|banka-islemleri|cek-senet|demirbas|doviz|maliyet)(\/|$)/;

router.use((req, res, next) => {
  if (!API_PATH.test(req.path) && !PUBLIC_PATH.test(req.path)) {
    next("router");
    return;
  }
  if (PUBLIC_PATH.test(req.path)) {
    next();
    return;
  }
  void authenticate(req, res, next);
});

router.use((req, res, next) => {
  if (PUBLIC_PATH.test(req.path)) {
    next();
    return;
  }
  if (!req.user) {
    res.status(401).json({ success: false, error: "Şirket kapsamı bulunamadı.", message: "Oturum doğrulanamadı." });
    return;
  }
  const moduleName = moduleForPath(req.path);
  if (!moduleName) {
    res.status(403).json({
      success: false,
      error: "Yetersiz Yetki",
      message: "Bu yol için yetki tanımı yok.",
    });
    return;
  }
  const allowed = roleAllows(getPermissionsForRole(req.user.role), moduleName, actionForMethod(req.method));
  if (!allowed) {
    res.status(403).json({
      success: false,
      error: "Yetersiz Yetki",
      message: "Bu modül için yetkiniz yok.",
    });
    return;
  }
  next();
});

router.use(finansRouter);
router.use(uyarlamaRouter);
router.use(yearEndRouter);
router.use(edefterRouter);

function companyIdOf(req: Request): number {
  const id = req.user?.companyId;
  if (!id) throw new PublicError("Şirket kapsamı bulunamadı.", 401);
  return id;
}

async function branchIdOf(req: Request, requested: unknown): Promise<number> {
  const branches = await prisma.branch.findMany({
    where: { companyId: companyIdOf(req), isActive: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return branchWithinCompany(branches.map((row) => row.id), requested);
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((error: unknown) => {
      if (res.headersSent) return;
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: "Girdi doğrulama hatası" });
        return;
      }
      const pub = toPublicMessage(error, "İşlem tamamlanamadı.");
      res.status(pub.status).json({ success: false, error: pub.message, message: pub.message });
    });
  };
}

async function recomputeCariBalance(cariId: number, companyId: number) {
  const agg = await prisma.cariHareket.aggregate({
    where: { cariId, companyId },
    _sum: { borc: true, alacak: true },
  });
  const bakiye = money(agg._sum.borc).minus(money(agg._sum.alacak));
  const updated = await prisma.cariKart.updateMany({
    where: { id: cariId, companyId },
    data: { bakiye: new Prisma.Decimal(bakiye.toFixed(2)) },
  });
  if (updated.count !== 1) throw new PublicError("Cari kart bulunamadı.", 404);
  return bakiye.toNumber();
}

async function recomputeStokQty(stokId: number, companyId: number) {
  const agg = await prisma.stokHareket.aggregate({
    where: { stokId, companyId },
    _sum: { giris: true, cikis: true },
  });
  const qty = new Decimal(String(agg._sum.giris || 0)).minus(String(agg._sum.cikis || 0)).toDecimalPlaces(4);
  const updated = await prisma.stokKart.updateMany({
    where: { id: stokId, companyId },
    data: { mevcutMiktar: new Prisma.Decimal(qty.toFixed(4)) },
  });
  if (updated.count !== 1) throw new PublicError("Stok kartı bulunamadı.", 404);
  return qty.toNumber();
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

router.get("/setup/status", asyncRoute(async (_req, res) => {
  const count = await prisma.company.count();
  res.json({ is_configured: count > 0, step: count > 0 ? "complete" : "company", installed: count > 0 });
}));

router.post("/setup/test-pg", asyncRoute(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, message: "Uygulama veritabanı bağlantısı başarılı. Bağlantı .env içindeki DATABASE_URL ile kurulur." });
}));

router.post("/setup/run", asyncRoute(async (req, res) => {
  const companyIn = req.body?.company || {};
  const name = String(companyIn.name || "").trim();
  const code = String(companyIn.code || companyIn.db_name || "TABIA").trim().toUpperCase().slice(0, 32);
  const username = String(companyIn.admin_username || "").trim();
  const email = String(companyIn.admin_email || "").trim().toLowerCase();
  const password = String(companyIn.admin_password || "");
  const fullName = String(companyIn.admin_full_name || username).trim();
  if (!name || !code || !username || !email || !password) {
    throw new PublicError("Şirket adı, kod, yönetici kullanıcı adı, e-posta ve şifre zorunludur.", 400);
  }
  assertStrongPassword(password);
  const existing = await prisma.company.findUnique({ where: { code } });
  if (existing) throw new PublicError("Bu şirket kodu zaten kurulu.", 409);
  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.company.create({
    data: {
      code,
      name,
      vkn: companyIn.tax_number ? String(companyIn.tax_number) : null,
      branches: { create: { code: "MERKEZ", name: "Merkez" } },
      periods: { create: { year: new Date().getFullYear(), isClosed: false } },
      depolar: { create: { code: "MERKEZ", name: "Merkez Depo" } },
      fiyatlar: { create: { code: "STANDART", name: "Standart Liste" } },
    },
  });
  const user = await prisma.user.create({
    data: {
      companyId: created.id,
      username,
      email,
      fullName,
      passwordHash,
      role: "ADMIN",
      passwordChangedAt: new Date(),
    },
  });
  await prisma.userCompany.create({ data: { userId: user.id, companyId: created.id, role: "ADMIN" } });
  await seedChart(created.id);
  res.status(201).json({
    ok: true,
    message: "Kurulum tamamlandı. Şifre ekranda tekrar gösterilmez.",
    database: { name: "tabiaerp", seed: { company: code, username } },
    login: { username, api: "http://127.0.0.1:3000", frontend: "http://127.0.0.1:3000", login_url: "http://127.0.0.1:3000/login" },
  });
}));

router.get("/companies", asyncRoute(async (req, res) => {
  const rows = await prisma.userCompany.findMany({
    where: { userId: req.user!.userId },
    include: { company: true },
  });
  res.json({ items: rows.map((r) => ({ id: r.company.id, name: r.company.name, code: r.company.code })) });
}));

router.get("/tenant/context", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const branches = await prisma.branch.findMany({ where: { companyId, isActive: true }, orderBy: { id: "asc" } });
  res.json({
    branches: branches.map((b) => ({ id: b.id, code: b.code, name: b.name })),
    record_types: RECORD_TYPES,
  });
}));

router.get("/dashboard/kpi", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const canSeePayroll = roleAllows(getPermissionsForRole(req.user!.role), "personel", "view");
  const [cari, stok, fisler, faturalar, cariler, stoklar, cekler, bordrolar, kasaSatir] = await Promise.all([
    prisma.cariKart.count({ where: { companyId, isActive: true } }),
    prisma.stokKart.count({ where: { companyId, isActive: true } }),
    prisma.yevmiyeKaydi.findMany({ where: { companyId }, select: { id: true, fisNo: true, tarih: true, aciklama: true, toplamBorc: true, toplamAlacak: true, durum: true } }),
    prisma.fatura.findMany({ where: { companyId }, select: { yon: true, genelToplam: true, kdvTutari: true, tarih: true } }),
    prisma.cariKart.findMany({ where: { companyId, isActive: true }, select: { bakiye: true } }),
    prisma.stokKart.findMany({ where: { companyId, isActive: true }, select: { mevcutMiktar: true, alisFiyati: true } }),
    prisma.cekSenet.findMany({ where: { companyId, ciroEdildi: false }, select: { tutar: true } }),
    canSeePayroll ? prisma.bordro.findMany({ where: { companyId }, select: { brut: true } }) : Promise.resolve([]),
    prisma.yevmiyeSatir.findMany({
      where: { yevmiyeKaydi: { companyId }, OR: [{ hesapKodu: { startsWith: "100" } }, { hesapKodu: { startsWith: "102" } }] },
      select: { borc: true, alacak: true },
    }),
  ]);
  const balanced = fisler.filter((row) => money(row.toplamBorc).equals(money(row.toplamAlacak))).length;
  const pct = fisler.length === 0 ? 0 : Math.round((balanced / fisler.length) * 1000) / 10;
  const receivables = addMoney(cariler.map((row) => (money(row.bakiye).greaterThan(0) ? row.bakiye : 0)));
  const payables = addMoney(cariler.map((row) => (money(row.bakiye).lessThan(0) ? money(row.bakiye).abs() : 0)));
  const sales = addMoney(
    faturalar.filter((row) => row.yon === "SATIS" && row.tarih >= monthStart).map((row) => row.genelToplam),
  );
  const inventory = stoklar.reduce(
    (sum, row) => sum.plus(money(new Decimal(String(row.mevcutMiktar)).times(String(row.alisFiyati)))),
    new Decimal(0),
  );
  const checks = addMoney(cekler.map((row) => row.tutar));
  const staff = addMoney(bordrolar.map((row) => row.brut));
  const cash = kasaSatir.reduce((sum, row) => sum.plus(money(row.borc)).minus(money(row.alacak)), new Decimal(0));
  const monthLabels = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const incomeExpense = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const inMonth = faturalar.filter((row) => row.tarih >= start && row.tarih < end);
    const income = addMoney(inMonth.filter((row) => row.yon === "SATIS").map((row) => row.genelToplam));
    const expense = addMoney(inMonth.filter((row) => row.yon === "ALIS").map((row) => row.genelToplam));
    incomeExpense.push({
      label: monthLabels[start.getMonth()],
      income: income.toNumber(),
      expense: expense.toNumber(),
    });
  }
  const purchaseTotal = addMoney(faturalar.filter((row) => row.yon === "ALIS").map((row) => row.genelToplam));
  const expenseBreakdown = [
    { name: "Alış faturaları", value: purchaseTotal.toNumber() },
    { name: "Bordro brüt", value: staff.toNumber() },
  ].filter((row) => row.value > 0);
  const hesaplananKdv = addMoney(faturalar.filter((row) => row.yon === "SATIS").map((row) => row.kdvTutari));
  const indirilecekKdv = addMoney(faturalar.filter((row) => row.yon === "ALIS").map((row) => row.kdvTutari));
  const kdvFark = hesaplananKdv.minus(indirilecekKdv);
  const sonFisler = [...fisler].sort((a, b) => b.tarih.getTime() - a.tarih.getTime()).slice(0, 6);
  res.json({
    cards: [
      { key: "cari", label: "Cari kart", value: cari },
      { key: "stok", label: "Stok kart", value: stok },
      { key: "yevmiye_adet", label: "Yevmiye fişi", value: fisler.length },
      { key: "fatura", label: "Fatura", value: faturalar.length },
      { key: "cash", label: "Kasa", value: cash.toNumber() },
      { key: "receivables", label: "Alacak", value: receivables.toNumber() },
      { key: "payables", label: "Borç", value: payables.toNumber() },
      { key: "checks", label: "Çek", value: checks.toNumber() },
      { key: "sales", label: "Satış", value: sales.toNumber() },
      { key: "inventory", label: "Stok değeri", value: inventory.toNumber() },
      { key: "staff", label: "Bordro brüt", value: staff.toNumber() },
      { key: "yevmiye", label: "Denk fiş oranı", value: pct },
    ],
    sales_trend: [],
    alerts: [],
    gib_summary: {},
    recent_transactions: sonFisler.map((f) => ({
      id: String(f.id),
      when: f.tarih.toISOString(),
      doc_type: "Yevmiye",
      description: f.aciklama,
      amount: moneyNumber(f.toplamBorc),
      status: f.durum,
      doc_no: f.fisNo,
    })),
    yevmiye_success_pct: pct,
    data_source: "veritabani",
    ai_insights: [],
    income_expense: incomeExpense,
    expense_breakdown: expenseBreakdown,
    kdv: {
      hesaplanan: hesaplananKdv.toNumber(),
      indirilecek: indirilecekKdv.toNumber(),
      fark: kdvFark.toNumber(),
      durum: kdvFark.greaterThan(0) ? "Ödenecek" : kdvFark.lessThan(0) ? "Devreden" : "Dengede",
      not: "Satış ve alış faturalarındaki KDV tutarlarıdır. Beyanname yerine geçmez.",
    },
  });
}));

router.get("/dashboard/layout", asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  const widgets = Array.isArray(user?.dashboardLayout) ? user?.dashboardLayout : [];
  res.json({ layout_key: "main", widgets });
}));

router.put("/dashboard/layout", asyncRoute(async (req, res) => {
  const widgets = Array.isArray(req.body?.widgets) ? req.body.widgets : [];
  await prisma.user.update({ where: { id: req.user!.userId }, data: { dashboardLayout: widgets } });
  res.json({ layout_key: "main", widgets });
}));

const ortakBody = z.object({
  ad: z.string().trim().min(1).max(120),
  rol: z.string().trim().min(1).max(60),
  hisse_oran: z.number().min(0).max(100),
  sermaye: z.number().min(0),
});

const giderBody = z.object({
  tarih: z.string().min(8),
  aciklama: z.string().trim().min(1).max(200),
  kategori: z.string().trim().min(1).max(40).default("KURULUS"),
  tutar: z.number().positive(),
});

function mapPartner(row: { id: number; ad: string; rol: string; hisseOran: Prisma.Decimal; sermaye: Prisma.Decimal }) {
  return { id: row.id, ad: row.ad, rol: row.rol, hisseOran: moneyNumber(row.hisseOran), sermaye: moneyNumber(row.sermaye) };
}

router.get("/kobi/ozet", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const netKar = money(req.query.net_kar || 0);
  const [ortaklar, giderler] = await Promise.all([
    prisma.ortak.findMany({ where: { companyId }, orderBy: { id: "asc" } }),
    prisma.yatirimGider.findMany({ where: { companyId }, orderBy: { tarih: "desc" } }),
  ]);
  const giderToplam = addMoney(giderler.map((row) => row.tutar));
  const partners = ortaklar.map(mapPartner);
  const rows = comparePartners(partners, giderToplam.toNumber(), netKar.toNumber());
  const sermaye = addMoney(partners.map((row) => row.sermaye));
  const hisse = addMoney(partners.map((row) => row.hisseOran));
  res.json({
    ortaklar: rows,
    giderler: giderler.map((row) => ({
      id: row.id,
      tarih: row.tarih.toISOString().slice(0, 10),
      aciklama: row.aciklama,
      kategori: row.kategori,
      tutar: moneyNumber(row.tutar),
    })),
    gider_toplam: giderToplam.toNumber(),
    sermaye_toplam: sermaye.toNumber(),
    hisse_toplam: hisse.toNumber(),
    fark_toplam: sermaye.minus(giderToplam).toNumber(),
    not: "Gider payı, yatırım giderleri toplamının hisse oranıyla çarpımıdır. Fark, ortağın sermayesinden bu payın çıkarılmasıdır. Kümülatif net kâr ve geri dönüş süresi, kesinleşmiş dönem kârı olmadığı için üretilmez.",
  });
}));

router.post("/kobi/ortak", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const body = ortakBody.parse(req.body);
  const row = await prisma.ortak.create({
    data: {
      companyId: companyIdOf(req),
      ad: body.ad,
      rol: body.rol,
      hisseOran: money(body.hisse_oran).toFixed(2),
      sermaye: new Prisma.Decimal(money(body.sermaye).toFixed(2)),
    },
  });
  res.status(201).json(mapPartner(row));
}));

router.put("/kobi/ortak/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const companyId = companyIdOf(req);
  const existing = await prisma.ortak.findFirst({ where: { id, companyId } });
  if (!existing) throw new PublicError("Ortak bulunamadı.", 404);
  const body = ortakBody.parse(req.body);
  const updated = await prisma.ortak.updateMany({
    where: { id, companyId },
    data: {
      ad: body.ad,
      rol: body.rol,
      hisseOran: money(body.hisse_oran).toFixed(2),
      sermaye: new Prisma.Decimal(money(body.sermaye).toFixed(2)),
    },
  });
  if (updated.count !== 1) throw new PublicError("Ortak bulunamadı.", 404);
  const row = await prisma.ortak.findFirst({ where: { id, companyId } });
  if (!row) throw new PublicError("Ortak bulunamadı.", 404);
  res.json(mapPartner(row));
}));

router.delete("/kobi/ortak/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.ortak.findFirst({ where: { id, companyId: companyIdOf(req) } });
  if (!existing) throw new PublicError("Ortak bulunamadı.", 404);
  await prisma.ortak.deleteMany({ where: { id, companyId: companyIdOf(req) } });
  res.json({ success: true });
}));

router.post("/kobi/gider", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const body = giderBody.parse(req.body);
  const tarih = new Date(body.tarih);
  if (Number.isNaN(tarih.getTime())) throw new PublicError("Tarih geçersiz.", 400);
  const row = await prisma.yatirimGider.create({
    data: {
      companyId: companyIdOf(req),
      tarih,
      aciklama: body.aciklama,
      kategori: body.kategori,
      tutar: new Prisma.Decimal(money(body.tutar).toFixed(2)),
    },
  });
  res.status(201).json({ id: row.id, tutar: moneyNumber(row.tutar) });
}));

router.delete("/kobi/gider/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.yatirimGider.findFirst({ where: { id, companyId: companyIdOf(req) } });
  if (!existing) throw new PublicError("Gider kaydı bulunamadı.", 404);
  await prisma.yatirimGider.deleteMany({ where: { id, companyId: companyIdOf(req) } });
  res.json({ success: true });
}));

router.post("/kobi/dagitim", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const netKar = money(req.body?.net_kar);
  if (netKar.lessThan(0)) throw new PublicError("Dağıtılacak net kâr sıfır veya daha büyük olmalıdır.", 400);
  const row = await prisma.ortakDagitim.create({
    data: { companyId: companyIdOf(req), netKar: new Prisma.Decimal(netKar.toFixed(2)), stopajOran: 10, durum: "TASLAK" },
  });
  res.status(201).json({
    id: row.id,
    durum: row.durum,
    message: "Dağıtım taslak olarak kaydedildi. Yevmiye fişi ve resmi beyanname oluşturulmadı.",
  });
}));

router.get("/cari/lookups/chart-of-accounts", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const q = String(req.query.q || "").trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const items = await prisma.hesapPlani.findMany({
    where: {
      companyId,
      ...(q
        ? { OR: [{ kod: { contains: q, mode: "insensitive" } }, { ad: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { kod: "asc" },
    take: limit,
  });
  res.json({ items: items.map((h) => ({ id: h.id, code: h.kod, name: h.ad })) });
}));

router.get("/cari/lookups/price-lists", asyncRoute(async (req, res) => {
  const items = await prisma.fiyatListesi.findMany({ where: { companyId: companyIdOf(req), isActive: true } });
  res.json({ items: items.map((p) => ({ id: p.id, code: p.code, name: p.name })) });
}));

router.get("/cari", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const q = String(req.query.q || "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 50));
  const where: Prisma.CariKartWhereInput = {
    companyId,
    ...(q
      ? {
          OR: [
            { kod: { contains: q, mode: "insensitive" } },
            { ad: { contains: q, mode: "insensitive" } },
            { vergiNo: { contains: q } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.cariKart.count({ where }),
    prisma.cariKart.findMany({ where, orderBy: { kod: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({
    items: rows.map(toCariList),
    total,
    page,
    page_size: pageSize,
  });
}));

router.get("/cari/:id", asyncRoute(async (req, res) => {
  const row = await prisma.cariKart.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!row) throw new PublicError("Cari bulunamadı.", 404);
  res.json(toCariForm(row));
}));

router.post("/cari", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const body = req.body || {};
  const code = String(body.code || "").trim();
  const title = String(body.title || "").trim();
  if (!code || !title) throw new PublicError("Cari kodu ve ünvan zorunludur.", 400);
  const created = await prisma.cariKart.create({
    data: {
      companyId,
      branchId: await branchIdOf(req, body.branch_id),
      kod: code,
      ad: title,
      vergiNo: String(body.tax_number || ""),
      vergiDairesi: body.tax_office || null,
      telefon: body.phone || null,
      eposta: body.email || null,
      adres: body.address_line || null,
      hesapKodu: body.coa_code || null,
      bakiye: new Prisma.Decimal(0),
      isActive: !body.is_passive,
      profil: body,
    },
  });
  const opening = money(body.opening_balance);
  if (!opening.isZero()) {
    const side = body.opening_side === "ALACAK" ? "ALACAK" : "BORC";
    await prisma.cariHareket.create({
      data: {
        companyId,
        cariId: created.id,
        tarih: new Date(),
        borc: new Prisma.Decimal(side === "BORC" ? opening.toFixed(2) : "0.00"),
        alacak: new Prisma.Decimal(side === "ALACAK" ? opening.toFixed(2) : "0.00"),
        aciklama: "Açılış bakiyesi",
      },
    });
    await recomputeCariBalance(created.id, companyId);
  }
  const fresh = await prisma.cariKart.findUniqueOrThrow({ where: { id: created.id } });
  res.status(201).json(toCariForm(fresh));
}));

router.put("/cari/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const id = Number(req.params.id);
  const existing = await prisma.cariKart.findFirst({ where: { id, companyId } });
  if (!existing) throw new PublicError("Cari bulunamadı.", 404);
  const body = req.body || {};
  const updatedCount = await prisma.cariKart.updateMany({
    where: { id, companyId },
    data: {
      kod: String(body.code || existing.kod),
      ad: String(body.title || existing.ad),
      vergiNo: body.tax_number != null ? String(body.tax_number) : existing.vergiNo,
      vergiDairesi: body.tax_office ?? existing.vergiDairesi,
      telefon: body.phone ?? existing.telefon,
      eposta: body.email ?? existing.eposta,
      adres: body.address_line ?? existing.adres,
      isActive: body.is_passive != null ? !body.is_passive : existing.isActive,
      profil: body,
    },
  });
  if (updatedCount.count !== 1) throw new PublicError("Cari bulunamadı.", 404);
  const updated = await prisma.cariKart.findFirst({ where: { id, companyId } });
  if (!updated) throw new PublicError("Cari bulunamadı.", 404);
  res.json(toCariForm(updated));
}));

router.delete("/cari/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const id = Number(req.params.id);
  const existing = await prisma.cariKart.findFirst({ where: { id, companyId } });
  if (!existing) throw new PublicError("Cari bulunamadı.", 404);
  const moves = await prisma.cariHareket.count({ where: { cariId: id, companyId } });
  if (moves > 0) {
    await prisma.cariKart.updateMany({ where: { id, companyId }, data: { isActive: false } });
    res.json({ ok: true, message: "Hareketi olan cari silinmedi, pasife alındı." });
    return;
  }
  await prisma.cariKart.deleteMany({ where: { id, companyId } });
  res.json({ ok: true });
}));

router.get("/stok/lookups/units", (_req, res) => res.json({ items: STOCK_UNITS }));
router.get("/stok/lookups/tax-rates", (_req, res) => res.json({ items: TAX_RATES }));
router.get("/fatura/lookups/tax-rates", (_req, res) => res.json({ items: TAX_RATES }));
router.get("/fatura/lookups/tevkifat-codes", (_req, res) => res.json({ items: TEVKIFAT_CODES }));

router.get("/stok/lookups/warehouses", asyncRoute(async (req, res) => {
  const items = await prisma.depo.findMany({ where: { companyId: companyIdOf(req), isActive: true } });
  res.json({ items: items.map((d) => ({ id: d.id, code: d.code, name: d.name })) });
}));

router.get("/stok/lookups/suppliers", asyncRoute(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const rows = await prisma.cariKart.findMany({
    where: {
      companyId: companyIdOf(req),
      isActive: true,
      ...(q ? { OR: [{ kod: { contains: q, mode: "insensitive" } }, { ad: { contains: q, mode: "insensitive" } }] } : {}),
    },
    take: 50,
    orderBy: { kod: "asc" },
  });
  res.json({ items: rows.map((c) => ({ id: c.id, code: c.kod, name: c.ad })) });
}));

router.get("/stok/lookups/accounts", asyncRoute(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const rows = await prisma.hesapPlani.findMany({
    where: {
      companyId: companyIdOf(req),
      ...(q ? { OR: [{ kod: { contains: q } }, { ad: { contains: q, mode: "insensitive" } }] } : {}),
    },
    take: 50,
    orderBy: { kod: "asc" },
  });
  res.json({ items: rows.map((h) => ({ id: h.id, code: h.kod, name: h.ad })) });
}));

router.get("/stok/lookups/groups", asyncRoute(async (_req, res) => {
  res.json({ items: [] });
}));

router.get("/stok/lookups/users", asyncRoute(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const rows = await prisma.user.findMany({
    where: {
      isActive: true,
      memberships: { some: { companyId: companyIdOf(req) } },
      ...(q ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] } : {}),
    },
    take: 30,
  });
  res.json({ items: rows.map((u) => ({ id: u.id, username: u.username, full_name: u.fullName, email: u.email })) });
}));

router.get("/stok/lot-summary", asyncRoute(async (_req, res) => {
  res.json([]);
}));

router.get("/stok/price-lists", asyncRoute(async (req, res) => {
  const rows = await prisma.fiyatListesi.findMany({ where: { companyId: companyIdOf(req) }, orderBy: { code: "asc" } });
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      list_type: "SATIS",
      currency_code: "TRY",
      valid_from: null,
      valid_to: null,
      is_passive: !r.isActive,
      branch_id: 1,
    })),
    total: rows.length,
  });
}));

router.get("/stok/price-lists/:id", asyncRoute(async (req, res) => {
  const row = await prisma.fiyatListesi.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!row) throw new PublicError("Fiyat listesi bulunamadı.", 404);
  res.json({ id: row.id, code: row.code, name: row.name, list_type: "SATIS", currency_code: "TRY", is_passive: !row.isActive, branch_id: 1 });
}));

router.post("/stok/price-lists", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const body = req.body || {};
  if (!body.code || !body.name) throw new PublicError("Fiyat listesi kodu ve adı zorunludur.", 400);
  const created = await prisma.fiyatListesi.create({
    data: { companyId: companyIdOf(req), code: String(body.code), name: String(body.name), isActive: !body.is_passive },
  });
  res.status(201).json({ id: created.id, ...body });
}));

router.put("/stok/price-lists/:id", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const body = req.body || {};
  const existing = await prisma.fiyatListesi.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!existing) throw new PublicError("Fiyat listesi bulunamadı.", 404);
  const updated = await prisma.fiyatListesi.update({
    where: { id: existing.id },
    data: {
      code: body.code ? String(body.code) : existing.code,
      name: body.name ? String(body.name) : existing.name,
      isActive: body.is_passive === undefined ? existing.isActive : !body.is_passive,
    },
  });
  res.json({
    ...body,
    id: updated.id,
    code: updated.code,
    name: updated.name,
    is_passive: !updated.isActive,
  });
}));

router.delete("/stok/price-lists/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const existing = await prisma.fiyatListesi.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!existing) throw new PublicError("Fiyat listesi bulunamadı.", 404);
  await prisma.fiyatListesi.delete({ where: { id: existing.id } });
  res.status(204).end();
}));

router.get("/stok/lookups/stocks", asyncRoute(async (req, res) => {
  const items = await prisma.stokKart.findMany({ where: { companyId: companyIdOf(req), isActive: true }, take: 100 });
  res.json({ items: items.map((s) => ({ id: s.id, code: s.stokKodu, name: s.stokAdi })) });
}));

router.get("/fatura/lookups/stok", asyncRoute(async (req, res) => {
  const items = await prisma.stokKart.findMany({ where: { companyId: companyIdOf(req), isActive: true }, take: 100 });
  res.json({
    items: items.map((s) => ({
      id: s.id,
      code: s.stokKodu,
      name: s.stokAdi,
      sale_price: Number(s.satisFiyati),
    })),
  });
}));

router.get("/fatura/lookups/cari", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const q = String(req.query.q || "").trim();
  const rows = await prisma.cariKart.findMany({
    where: {
      companyId,
      isActive: true,
      ...(q
        ? { OR: [{ kod: { contains: q, mode: "insensitive" } }, { ad: { contains: q, mode: "insensitive" } }, { vergiNo: { contains: q } }] }
        : {}),
    },
    take: 50,
  });
  res.json({
    items: rows.map((c) => ({
      id: c.id,
      code: c.kod,
      title: c.ad,
      tax_number: c.vergiNo || null,
      is_efatura: Boolean((c.profil as { is_efatura?: boolean } | null)?.is_efatura),
    })),
  });
}));

router.get("/stok", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const q = String(req.query.q || "").trim();
  const where: Prisma.StokKartWhereInput = {
    companyId,
    ...(q ? { OR: [{ stokKodu: { contains: q, mode: "insensitive" } }, { stokAdi: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const rows = await prisma.stokKart.findMany({ where, orderBy: { stokKodu: "asc" }, take: 200 });
  res.json({
    items: rows.map((s) => ({
      id: s.id,
      code: s.stokKodu,
      name: s.stokAdi,
      stock_type: s.stokTipi,
      barcode: (s.profil as { barcode?: string } | null)?.barcode || null,
      unit_name: s.birim,
      purchase_price: Number(s.alisFiyati),
      sale_price: Number(s.satisFiyati),
      min_stock: Number(s.kritikMiktar || 0),
      max_stock: num((s.profil as { max_stock?: number } | null)?.max_stock, 0),
      critical_level: Number(s.kritikMiktar || 0),
      is_passive: !s.isActive,
      branch_id: s.branchId,
      record_type_id: num((s.profil as { record_type_id?: number } | null)?.record_type_id, 1),
    })),
    total: rows.length,
    page: 1,
    page_size: rows.length,
  });
}));

router.post("/stok", authorize(["ADMIN", "MUHASEBE_UZMANI", "DEPO_SORUMLUSU"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const body = req.body || {};
  if (!body.code || !body.name) throw new PublicError("Stok kodu ve adı zorunludur.", 400);
  const created = await prisma.stokKart.create({
    data: {
      companyId,
      branchId: await branchIdOf(req, body.branch_id),
      stokKodu: String(body.code),
      stokAdi: String(body.name),
      stokTipi: String(body.stock_type || "HAMMADDE"),
      tur: mapTur(String(body.stock_type || "")),
      birim: "ADET",
      alisFiyati: new Prisma.Decimal(money(body.purchase_price).toFixed(2)),
      satisFiyati: new Prisma.Decimal(money(body.sale_price).toFixed(2)),
      kritikMiktar: new Prisma.Decimal(num(body.critical_level ?? body.min_stock)),
      mevcutMiktar: new Prisma.Decimal(0),
      isActive: !body.is_passive,
      profil: body,
    },
  });
  res.status(201).json({ id: created.id, ...body });
}));

router.get("/stok/:id", asyncRoute(async (req, res) => {
  const row = await prisma.stokKart.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!row) throw new PublicError("Stok kartı bulunamadı.", 404);
  const profil = (row.profil || {}) as Record<string, unknown>;
  res.json({
    ...profil,
    id: row.id,
    code: row.stokKodu,
    name: row.stokAdi,
    stock_type: row.stokTipi,
    purchase_price: Number(row.alisFiyati),
    sale_price: Number(row.satisFiyati),
    critical_level: Number(row.kritikMiktar || 0),
    is_passive: !row.isActive,
    branch_id: row.branchId,
  });
}));

router.put("/stok/:id", authorize(["ADMIN", "MUHASEBE_UZMANI", "DEPO_SORUMLUSU"]), asyncRoute(async (req, res) => {
  const body = req.body || {};
  const existing = await prisma.stokKart.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!existing) throw new PublicError("Stok kartı bulunamadı.", 404);
  const updated = await prisma.stokKart.update({
    where: { id: existing.id },
    data: {
      stokKodu: body.code ? String(body.code) : existing.stokKodu,
      stokAdi: body.name ? String(body.name) : existing.stokAdi,
      stokTipi: body.stock_type ? String(body.stock_type) : existing.stokTipi,
      tur: body.stock_type ? mapTur(String(body.stock_type)) : existing.tur,
      alisFiyati: body.purchase_price === undefined ? existing.alisFiyati : new Prisma.Decimal(money(body.purchase_price).toFixed(2)),
      satisFiyati: body.sale_price === undefined ? existing.satisFiyati : new Prisma.Decimal(money(body.sale_price).toFixed(2)),
      kritikMiktar: body.critical_level === undefined && body.min_stock === undefined
        ? existing.kritikMiktar
        : new Prisma.Decimal(num(body.critical_level ?? body.min_stock)),
      isActive: body.is_passive === undefined ? existing.isActive : !body.is_passive,
      branchId: body.branch_id === undefined ? existing.branchId : await branchIdOf(req, body.branch_id),
      profil: { ...((existing.profil as object) || {}), ...body },
    },
  });
  res.json({ id: updated.id, ...body, code: updated.stokKodu, name: updated.stokAdi });
}));

router.delete("/stok/:id", authorize(["ADMIN"]), asyncRoute(async (req, res) => {
  const existing = await prisma.stokKart.findFirst({ where: { id: Number(req.params.id), companyId: companyIdOf(req) } });
  if (!existing) throw new PublicError("Stok kartı bulunamadı.", 404);
  const hareket = await prisma.stokHareket.count({ where: { stokId: existing.id, companyId: companyIdOf(req) } });
  if (hareket > 0) throw new PublicError("Hareketi olan stok kartı silinemez.", 409);
  await prisma.stokKart.delete({ where: { id: existing.id } });
  res.status(204).end();
}));

router.get("/yevmiye/fisler", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const rows = await prisma.yevmiyeKaydi.findMany({
    where: { companyId: companyIdOf(req) },
    orderBy: { tarih: "desc" },
    take: 200,
  });
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      voucher_no: r.fisNo,
      voucher_date: r.tarih.toISOString().slice(0, 10),
      description: r.aciklama,
      total_debit: Number(r.toplamBorc),
      total_credit: Number(r.toplamAlacak),
      status: r.durum,
      revision_no: 1,
      has_changes: false,
      madde_no: r.maddeNo,
    })),
    total: rows.length,
  });
}));

const JournalLine = z.object({
  line_no: z.number().int().positive().optional(),
  coa_code: z.string().optional().nullable(),
  coa_id: z.number().int().optional().nullable(),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  description: z.string().optional().nullable(),
});

router.get("/yevmiye/defter", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const turHam = String(req.query.tur || "mizan");
  const turler = ["yevmiye", "kebir", "mizan", "bilanco", "gelir"] as const;
  if (!turler.includes(turHam as (typeof turler)[number])) {
    throw new PublicError("Rapor türü yevmiye, kebir, mizan, bilanco veya gelir olmalıdır.", 400);
  }
  const yil = Number(req.query.yil);
  if (!Number.isInteger(yil) || yil < 1990 || yil > 2100) throw new PublicError("Yıl geçersiz.", 400);
  const companyId = companyIdOf(req);
  const baslangic = new Date(yil, 0, 1);
  const bitis = new Date(yil + 1, 0, 1);
  const fisler = await prisma.yevmiyeKaydi.findMany({
    where: { companyId, durum: "KESIN", tarih: { gte: baslangic, lt: bitis } },
    include: { satirlar: { orderBy: { satirNo: "asc" } } },
    orderBy: [{ tarih: "asc" }, { fisNo: "asc" }],
  });
  const hareketler: DefterHareket[] = [];
  for (const fis of fisler) {
    for (const satir of fis.satirlar) {
      hareketler.push({
        fisNo: fis.fisNo,
        tarih: tarihGun(fis.tarih),
        hesapKodu: satir.hesapKodu,
        aciklama: satir.aciklama,
        borc: money(satir.borc.toString()).toFixed(2),
        alacak: money(satir.alacak.toString()).toFixed(2),
      });
    }
  }
  const hesap = typeof req.query.hesap === "string" ? req.query.hesap : undefined;
  res.json(defterRaporu(turHam as (typeof turler)[number], hareketler, hesap));
}));

router.post("/yevmiye/fisler", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const linesRaw = Array.isArray(req.body?.lines) ? req.body.lines : [];
  const lines = z.array(JournalLine).min(2).parse(linesRaw);
  const tarih = new Date(String(req.body?.voucher_date || new Date().toISOString().slice(0, 10)));
  await assertPeriodOpen(companyId, tarih);
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId } });
  const yontem = ayar?.maliyetYontemi === "7B" ? "7B" : "7A";
  let borc = new Decimal(0);
  let alacak = new Decimal(0);
  const resolved: Array<{ satirNo: number; hesapKodu: string; aciklama: string; borc: string; alacak: string }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let kod = line.coa_code || "";
    if (!kod && line.coa_id) {
      const hesap = await prisma.hesapPlani.findFirst({ where: { id: line.coa_id, companyId } });
      kod = hesap?.kod || "";
    }
    if (!kod) throw new PublicError("Her satırda hesap kodu zorunludur.", 400);
    const red = hesapFiseUygun(kod, yontem);
    if (red) throw new PublicError(red, 422);
    const lineBorc = money(line.debit);
    const lineAlacak = money(line.credit);
    if (lineBorc.greaterThan(0) && lineAlacak.greaterThan(0)) {
      throw new PublicError("Aynı satırda hem borç hem alacak olamaz.", 422);
    }
    if (lineBorc.isZero() && lineAlacak.isZero()) {
      throw new PublicError("Satır tutarı sıfır olamaz.", 422);
    }
    borc = borc.plus(lineBorc);
    alacak = alacak.plus(lineAlacak);
    resolved.push({
      satirNo: line.line_no || i + 1,
      hesapKodu: kod.trim(),
      aciklama: (line.description || String(req.body?.description || "Yevmiye")).trim(),
      borc: lineBorc.toFixed(2),
      alacak: lineAlacak.toFixed(2),
    });
  }
  if (!borc.equals(alacak) || borc.lessThanOrEqualTo(0)) {
    throw new PublicError("VUK/TMS Çift Kayıt İlkesi İhlali", 422);
  }
  const hesapKodlari = [...new Set(resolved.map((satir) => satir.hesapKodu))];
  const plandakiler = await prisma.hesapPlani.findMany({
    where: { companyId, kod: { in: hesapKodlari } },
    select: { kod: true },
  });
  const planda = new Set(plandakiler.map((hesap) => hesap.kod));
  const yok = hesapKodlari.find((kod) => !planda.has(kod));
  if (yok) throw new PublicError(`${yok} hesap planında yok. Önce alt hesap açın veya THP ana hesabını kullanın.`, 422);
  const aciklama = String(req.body?.description || "Mahsup fişi").trim();
  if (aciklama.length < 3) throw new PublicError("Fiş açıklaması zorunludur.", 400);
  const user = await prisma.user.findFirst({
    where: { id: req.user!.userId, memberships: { some: { companyId } } },
  });
  if (user?.role !== "ADMIN" && user?.amountLimit != null && borc.greaterThan(money(user.amountLimit))) {
    throw new PublicError("Tutar limiti aşıldı. Bu fiş için yetkiniz yok.", 403);
  }
  const year = tarih.getFullYear();
  const baslangic = new Date(year, 0, 1);
  const bitis = new Date(year + 1, 0, 1);
  const created = await prisma.$transaction(async (tx) => {
    const period = await tx.fiscalPeriod.findUnique({ where: { companyId_year: { companyId, year } } });
    if (period?.isClosed) throw new PublicError(`${year} mali dönemi kilitli. Bu tarihe kayıt yapılamaz.`, 409);
    const kesinler = await tx.yevmiyeKaydi.findMany({
      where: { companyId, durum: "KESIN", tarih: { gte: baslangic, lt: bitis } },
      select: { fisNo: true, tarih: true },
    });
    const son = kesinler.reduce<Date | null>((en, fis) => (!en || fis.tarih > en ? fis.tarih : en), null);
    if (!fisTarihiUygun(son, tarih)) {
      throw new PublicError("Fiş tarihi, aynı yıldaki son kesin fişten önce olamaz.", 409);
    }
    const fisNo = sonrakiFisNo(year, kesinler.map((fis) => fis.fisNo));
    const yevmiye = await tx.yevmiyeKaydi.create({
      data: {
        companyId,
        fisNo,
        tarih,
        aciklama,
        toplamBorc: new Prisma.Decimal(borc.toFixed(2)),
        toplamAlacak: new Prisma.Decimal(alacak.toFixed(2)),
        durum: "KESIN",
        isLocked: true,
        satirlar: {
          create: resolved.map((s) => ({
            satirNo: s.satirNo,
            hesapKodu: s.hesapKodu,
            aciklama: s.aciklama,
            borc: new Prisma.Decimal(s.borc),
            alacak: new Prisma.Decimal(s.alacak),
          })),
        },
      },
      include: { satirlar: true },
    });
    await tx.auditLog.create({
      data: {
        tabloAdi: "yevmiye_kayitlari",
        islemTipi: "INSERT",
        kullaniciId: req.user?.userId ?? null,
        ipAdresi: req.ip || null,
        yeniVeri: { fisNo, tarih: tarihGun(tarih), toplam: borc.toFixed(2), satirSayisi: resolved.length },
      },
    });
    return yevmiye;
  });
  res.status(201).json(toVoucher(created));
}));

router.post("/yevmiye/fisler/:id/duzelt", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const id = Number(req.params.id);
  const kaynak = await prisma.yevmiyeKaydi.findFirst({
    where: { id, companyId },
    include: { satirlar: true },
  });
  if (!kaynak) throw new PublicError("Fiş bulunamadı.", 404);
  if (kaynak.durum !== "KESIN" || !kaynak.isLocked) {
    throw new PublicError("Yalnızca kesinleşmiş fiş için ters kayıt açılır.", 409);
  }
  const year = kaynak.tarih.getFullYear();
  const baslangic = new Date(year, 0, 1);
  const bitis = new Date(year + 1, 0, 1);
  const ters = await prisma.$transaction(async (tx) => {
    const period = await tx.fiscalPeriod.findUnique({ where: { companyId_year: { companyId, year } } });
    const tersAciklama = `Ters kayıt ${kaynak.fisNo}`.slice(0, 500);
    const oncekiTers = await tx.yevmiyeKaydi.findFirst({ where: { companyId, aciklama: tersAciklama } });
    if (oncekiTers) throw new PublicError("Bu fişin ters kaydı zaten var. İkinci ters fiş açılmaz.", 409);
    const kesinler = await tx.yevmiyeKaydi.findMany({
      where: { companyId, durum: "KESIN", tarih: { gte: baslangic, lt: bitis } },
      select: { fisNo: true, tarih: true },
    });
    const son = kesinler.reduce<Date | null>((en, fis) => (!en || fis.tarih > en ? fis.tarih : en), null);
    const tarih = tersKayitTarihi(kaynak.tarih, son, !period?.isClosed);
    if (!tarih) throw new PublicError(`${year} mali dönemi kilitli. Ters kayıt yazılamaz.`, 409);
    const fisNo = sonrakiFisNo(year, kesinler.map((fis) => fis.fisNo));
    const yevmiye = await tx.yevmiyeKaydi.create({
      data: {
        companyId,
        fisNo,
        tarih,
        aciklama: tersAciklama,
        toplamBorc: kaynak.toplamAlacak,
        toplamAlacak: kaynak.toplamBorc,
        durum: "KESIN",
        isLocked: true,
        satirlar: {
          create: kaynak.satirlar.map((s) => ({
            satirNo: s.satirNo,
            hesapKodu: s.hesapKodu,
            aciklama: `Ters: ${kaynak.fisNo} ${s.aciklama}`.slice(0, 500),
            borc: s.alacak,
            alacak: s.borc,
          })),
        },
      },
      include: { satirlar: true },
    });
    await tx.auditLog.create({
      data: {
        tabloAdi: "yevmiye_kayitlari",
        islemTipi: "INSERT",
        kullaniciId: req.user?.userId ?? null,
        ipAdresi: req.ip || null,
        yeniVeri: { fisNo, kaynak: kaynak.fisNo, tarih: tarihGun(tarih), islem: "TERS" },
      },
    });
    return yevmiye;
  });
  res.status(201).json(toVoucher(ters));
}));

router.get("/fatura", asyncRoute(async (req, res) => {
  const rows = await prisma.fatura.findMany({
    where: { companyId: companyIdOf(req) },
    include: { cari: true },
    orderBy: { tarih: "desc" },
    take: 200,
  });
  res.json({ items: rows.map(toInvoice), total: rows.length });
}));

const FaturaSatirGiris = z.object({
  aciklama: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  miktar: z.number().positive().optional(),
  qty: z.number().positive().optional(),
  birim_fiyat: z.number().nonnegative().optional(),
  unit_price: z.number().nonnegative().optional(),
  kdv_oran: z.number().nonnegative().optional(),
  tax_rate: z.number().nonnegative().optional(),
  stok_id: z.number().int().optional().nullable(),
  stock_id: z.number().int().optional().nullable(),
  birim: z.string().optional().nullable(),
});

const FaturaBody = z
  .object({
    belge_no: z.string().min(1).optional(),
    invoice_no: z.string().min(1).optional().nullable(),
    tarih: z.string().optional(),
    invoice_date: z.string().optional(),
    yon: z.string().optional(),
    invoice_type: z.string().optional(),
    cari_id: z.number().int().optional().nullable(),
    account_id: z.number().int().optional().nullable(),
    durum: z.string().optional(),
    save_mode: z.string().optional(),
    satirlar: z.array(FaturaSatirGiris).optional(),
    lines: z.array(FaturaSatirGiris).optional(),
    tevkifat_kodu: z.string().trim().optional().nullable(),
    tevkifat_code: z.string().trim().optional().nullable(),
  })
  .refine((body) => (body.satirlar?.length || 0) + (body.lines?.length || 0) > 0, {
    message: "En az bir fatura satırı gerekli",
  });

function faturaYon(body: { yon?: string; invoice_type?: string }): FaturaYon {
  const raw = `${body.yon || ""} ${body.invoice_type || ""}`.toUpperCase();
  if (raw.includes("SATIS") && raw.includes("IADE")) return "SATIS_IADE";
  if (raw.includes("ALIS") && raw.includes("IADE")) return "ALIS_IADE";
  if (raw.includes("ALIS")) return "ALIS";
  return "SATIS";
}

router.get("/fatura/kdv-beyan", asyncRoute(async (req, res) => {
  const donem = String(req.query.donem || "");
  const eslesme = /^(\d{4})-(\d{2})$/.exec(donem);
  if (!eslesme) throw new PublicError("Dönem YYYY-AA olmalıdır.", 400);
  res.json(await kdvBeyanRaporu(companyIdOf(req), Number(eslesme[1]), Number(eslesme[2])));
}));

router.get("/fatura/stok-degerleme", asyncRoute(async (req, res) => {
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId: companyIdOf(req) } });
  res.json({ stok_degerleme: ayar?.stokDegerleme === "FIFO" ? "FIFO" : "ORTALAMA" });
}));

router.put("/fatura/stok-degerleme", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const yontem = String(req.body?.stok_degerleme || "").toUpperCase();
  if (yontem !== "FIFO" && yontem !== "ORTALAMA") {
    throw new PublicError("Stok değerleme ORTALAMA veya FIFO olmalıdır.", 400);
  }
  const companyId = companyIdOf(req);
  await prisma.companyAyar.upsert({
    where: { companyId },
    update: { stokDegerleme: yontem },
    create: { companyId, stokDegerleme: yontem },
  });
  res.json({ stok_degerleme: yontem });
}));

router.post("/fatura", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const body = FaturaBody.parse(req.body);
  const tarih = new Date(body.tarih || body.invoice_date || new Date().toISOString().slice(0, 10));
  await assertPeriodOpen(companyId, tarih);
  const belgeNo = body.belge_no || body.invoice_no || `FTR-${Date.now()}`;
  const durum = body.durum === "ONAYLI" || body.save_mode === "approve" ? "ONAYLI" : "TASLAK";
  const gelenSatirlar = body.satirlar?.length ? body.satirlar : body.lines || [];
  const fatura = await kaydetFatura({
    companyId,
    kullaniciId: req.user?.id ?? null,
    ipAdresi: req.ip || null,
    belgeNo,
    tarih,
    yon: faturaYon(body),
    cariId: body.cari_id || body.account_id || null,
    durum,
    tevkifatKodu: body.tevkifat_kodu || body.tevkifat_code || null,
    satirlar: gelenSatirlar.map((satir) => {
      const kdvOran = satir.kdv_oran ?? satir.tax_rate;
      const miktar = satir.miktar ?? satir.qty;
      const fiyat = satir.birim_fiyat ?? satir.unit_price;
      if (kdvOran === undefined || miktar === undefined || fiyat === undefined) {
        throw new PublicError("Fatura satırında miktar, birim fiyat ve KDV oranı zorunludur.", 400);
      }
      return {
        aciklama: (satir.aciklama || satir.description || "Satır").trim() || "Satır",
        miktar: String(miktar),
        birim: satir.birim || null,
        birimFiyat: String(fiyat),
        kdvOran: String(kdvOran),
        stokId: satir.stok_id || satir.stock_id || null,
      };
    }),
  });
  res.status(201).json(toInvoice(fatura));
}));

router.post("/fatura/:id/ebelge", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const sonuc = await ebelgeTaslagi(companyIdOf(req), Number(req.params.id));
  res.status(202).json(sonuc);
}));

const mevzuatKayitSemasi = z.object({
  yil: z.number().int().min(2000).max(2100),
  kaynak: z.string().max(300).optional().default(""),
  kalemler: z
    .array(
      z.object({
        anahtar: z.string().min(1).max(80),
        deger: z.string().max(24).nullable(),
      }),
    )
    .max(80),
});

router.get("/personel/mevzuat", asyncRoute(async (req, res) => {
  const yil = Number(req.query.yil);
  res.json(await mevzuatYiliOku(yil));
}));

router.put("/personel/mevzuat", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const body = mevzuatKayitSemasi.parse(req.body);
  const kayit = await mevzuatYiliKaydet({
    yil: body.yil,
    kaynak: body.kaynak,
    kalemler: body.kalemler,
    kullaniciId: req.user?.id ?? null,
    ipAdresi: req.ip || null,
  });
  res.json(kayit);
}));

router.get("/personel", asyncRoute(async (req, res) => {
  const rows = await prisma.personel.findMany({ where: { companyId: companyIdOf(req) }, orderBy: { adSoyad: "asc" } });
  res.json({
    items: rows.map((p) => ({
      id: p.id,
      full_name: p.adSoyad,
      tckn: maskTcKimlikNo(p.tckn, false),
      title: p.gorev,
      hire_date: p.iseGiris?.toISOString().slice(0, 10) || null,
      is_passive: !p.isActive,
    })),
    total: rows.length,
  });
}));

router.post("/personel", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const adSoyad = String(req.body?.full_name || req.body?.ad_soyad || "").trim();
  const tckn = String(req.body?.tckn || "").trim();
  if (!adSoyad || !/^\d{11}$/.test(tckn)) throw new PublicError("Ad soyad ve 11 haneli TCKN zorunludur.", 400);
  const created = await prisma.personel.create({
    data: { companyId, adSoyad, tckn, gorev: req.body?.title || null, profil: req.body },
  });
  res.status(201).json({ id: created.id, full_name: created.adSoyad, tckn: maskTcKimlikNo(created.tckn, false) });
}));

router.get("/bordro", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const gorebilir = req.user?.role === "ADMIN" || req.user?.role === "MUHASEBE_UZMANI";
  const rows = await prisma.bordro.findMany({
    where: { companyId: companyIdOf(req) },
    include: { personel: true },
    orderBy: { donem: "desc" },
  });
  res.json({
    items: rows.map((b) => ({
      id: b.id,
      period: b.donem,
      employee: b.personel.adSoyad,
      tckn: gorebilir ? b.personel.tckn : maskTcKimlikNo(b.personel.tckn, false),
      gross: gorebilir ? Number(b.brut) : maskWage(Number(b.brut), false),
      net: gorebilir ? Number(b.net) : maskWage(Number(b.net), false),
      eksik_gun: b.eksikGun,
      eksik_gun_nedeni: b.eksikGunNedeni,
      kumulatif_gv_matrah: gorebilir ? Number(b.kumulatifGvMatrah) : null,
      status: b.durum,
    })),
    total: rows.length,
  });
}));

router.post("/bordro/calculate", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const brut = num(req.body?.brut);
  if (brut <= 0) throw new PublicError("Brüt ücret pozitif olmalıdır.", 400);
  const donem = String(req.body?.donem || "");
  const periodOk = /^\d{4}-\d{2}$/.test(donem);
  const year = periodOk ? Number(donem.slice(0, 4)) : new Date().getFullYear();
  const calismaYili = req.body?.calisma_yili;
  if (calismaYili !== undefined && calismaYili !== null && calismaYili !== "" && Number(calismaYili) !== year) {
    throw new PublicError("Bordro dönemi programın çalışma yılı ile aynı olmalıdır.", 422);
  }
  const stored = await payrollSetForYear(year);
  let workedDays = 30;
  let eksikGun = 0;
  let eksikNeden: string | null = null;
  if (req.body?.eksik_gun !== undefined && req.body?.eksik_gun !== null && req.body?.eksik_gun !== "") {
    eksikGun = Number(req.body.eksik_gun);
    if (!Number.isInteger(eksikGun) || eksikGun < 0 || eksikGun > 29) {
      throw new PublicError("Eksik gün 0 ile 29 arasında olmalıdır.", 400);
    }
    workedDays = 30 - eksikGun;
  } else if (req.body?.worked_days !== undefined) {
    workedDays = Number(req.body.worked_days);
    if (!Number.isInteger(workedDays) || workedDays < 1 || workedDays > 30) {
      throw new PublicError("Çalışılan gün 1 ile 30 arasında olmalıdır.", 400);
    }
    eksikGun = 30 - workedDays;
  }
  if (eksikGun > 0) {
    eksikNeden = String(req.body?.eksik_gun_nedeni || "").trim();
    if (!/^\d{2}$/.test(eksikNeden)) {
      throw new PublicError("Eksik gün nedeni 2 haneli kod olmalıdır. Resmi kod listesi bu programda yoktur.", 400);
    }
  }
  const personelId = Number(req.body?.personel_id || 0);
  const companyId = companyIdOf(req);
  const kanunKodu = String(req.body?.kanun_kodu || "");
  let kayitliKanun = kanunKodu;
  if (personelId) {
    const personelKanun = await prisma.personel.findFirst({ where: { id: personelId, companyId } });
    const profil = personelKanun?.profil;
    if (profil && typeof profil === "object" && !Array.isArray(profil) && "sgk_law_code" in profil) {
      kayitliKanun = String((profil as { sgk_law_code?: unknown }).sgk_law_code || "");
    }
  }
  let previous = 0;
  if (personelId && periodOk) {
    const onceki = oncekiDonem(donem);
    if (onceki) {
      const row = await prisma.bordro.findFirst({ where: { companyId, personelId, donem: onceki } });
      if (!row) {
        throw new PublicError(`${onceki} bordrosu yok. Kümülatif matrah için önceki ay hesaplanmalıdır.`, 422);
      }
      const saklanan = moneyNumber(row.kumulatifGvMatrah);
      if (saklanan > 0) previous = saklanan;
      else {
        const priors = await prisma.bordro.findMany({
          where: { companyId, personelId, donem: { startsWith: String(year), lt: donem } },
        });
        previous = addMoney(priors.map((item) => item.gvMatrah)).toNumber();
      }
    }
  }
  const draft = payrollDraftFromEngine({
    grossWage: brut,
    period: periodOk ? donem : `${year}-01`,
    workedDays,
    cumulativeTaxBasePrevious: previous,
    parameters: stored,
    has5510Discount: kayitliKanun === "05510",
  });
  const hesap = {
    brut: draft.brut,
    sgk_isci: draft.sgkIsci,
    issizlik_isci: draft.issizlik,
    sgk_isveren: draft.sgkIsveren,
    gelir_vergisi: draft.gelirVergisi,
    damga: draft.damga,
    net: draft.net,
    gv_matrah: draft.gvMatrah,
    kumulatif_matrah: draft.cumulative,
    vergi_dilimi: draft.topTaxRate,
    sgk_matrah: draft.sgkBase,
    note: `${draft.source}. Bu hesap resmi SGK bildirgesi değildir.`,
    kaydedildi: false,
    fis_durumu: "YOK",
    fis_no: null as string | null,
  };
  if (!personelId || !periodOk) {
    res.json({
      ...hesap,
      message: "Personel ve dönem birlikte gönderilmediği için önceki ay matrahı 0 alındı ve fiş yazılmadı.",
    });
    return;
  }
  if (draft.net < 0) {
    res.json({
      ...hesap,
      message: "Net ücret negatif. SGK tabanı brütün üstündeyse fiş yazılmaz.",
    });
    return;
  }
  const personel = await prisma.personel.findFirst({ where: { id: personelId, companyId } });
  if (!personel) throw new PublicError("Personel bulunamadı.", 404);
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId } });
  const tarih = new Date(Number(donem.slice(0, 4)), Number(donem.slice(5, 7)) - 1, 1, 12);
  await assertPeriodOpen(companyId, tarih);
  const fisNo = `BRD-${donem}-${personelId}`;
  const mevcut = await prisma.yevmiyeKaydi.findUnique({ where: { companyId_fisNo: { companyId, fisNo } } });
  if (mevcut && mevcut.durum !== "TASLAK") {
    res.json({ ...hesap, kaydedildi: true, fis_durumu: mevcut.durum, fis_no: mevcut.fisNo, message: "Bu dönem fişi kesin. Bordro satırı ve fiş değiştirilmedi." });
    return;
  }
  const lines = buildPayrollDraftLines({
    brut: draft.brut,
    sgkIsci: draft.sgkIsci,
    issizlik: draft.issizlik,
    sgkIsveren: draft.sgkIsveren,
    gelirVergisi: draft.gelirVergisi,
    damga: draft.damga,
    net: draft.net,
  }, bordroGiderHesabi(uretimPersonel(personel.profil, req.body?.birim), ayar?.maliyetYontemi === "7B" ? "7B" : "7A"));
  const toplamBorc = addMoney(lines.map((line) => line.debit));
  const toplamAlacak = addMoney(lines.map((line) => line.credit));
  const created = await prisma.$transaction(async (tx) => {
    await tx.bordro.upsert({
      where: { companyId_personelId_donem: { companyId, personelId, donem } },
      create: {
        companyId,
        personelId,
        donem,
        brut: draft.brut,
        net: draft.net,
        sgkIsci: draft.sgkIsci,
        sgkIsveren: draft.sgkIsveren,
        gelirVergisi: draft.gelirVergisi,
        gvMatrah: draft.gvMatrah,
        kumulatifGvMatrah: draft.cumulative,
        sgkMatrah: draft.sgkBase,
        damga: draft.damga,
        eksikGun,
        eksikGunNedeni: eksikNeden,
        durum: "TASLAK",
      },
      update: {
        brut: draft.brut,
        net: draft.net,
        sgkIsci: draft.sgkIsci,
        sgkIsveren: draft.sgkIsveren,
        gelirVergisi: draft.gelirVergisi,
        gvMatrah: draft.gvMatrah,
        kumulatifGvMatrah: draft.cumulative,
        sgkMatrah: draft.sgkBase,
        damga: draft.damga,
        eksikGun,
        eksikGunNedeni: eksikNeden,
      },
    });
    const son = await tx.bordro.findFirst({
      where: { companyId, personelId, donem: { startsWith: String(year) } },
      orderBy: { donem: "desc" },
    });
    if (son) {
      await tx.personel.updateMany({
        where: { id: personelId, companyId },
        data: { kumulatifGvMatrah: son.kumulatifGvMatrah, kumulatifYil: year },
      });
    }
    await tx.auditLog.create({
      data: {
        tabloAdi: "bordrolar",
        islemTipi: mevcut ? "UPDATE" : "INSERT",
        kullaniciId: req.user?.userId ?? null,
        ipAdresi: req.ip || null,
        yeniVeri: { donem, personelId, fisNo, gider: lines[0]?.code || "770" },
      },
    });
    const satirlar = lines.map((line, index) => ({
      satirNo: index + 1,
      hesapKodu: line.code,
      aciklama: `${line.name} — ${line.reason}`,
      borc: new Prisma.Decimal(money(line.debit).toFixed(2)),
      alacak: new Prisma.Decimal(money(line.credit).toFixed(2)),
    }));
    if (mevcut) {
      await tx.yevmiyeSatir.deleteMany({ where: { yevmiyeKaydiId: mevcut.id } });
      return tx.yevmiyeKaydi.update({
        where: { id: mevcut.id },
        data: {
          aciklama: `${donem} bordro taslağı: ${personel.adSoyad}. Kesinleşmedi.`,
          toplamBorc: new Prisma.Decimal(toplamBorc.toFixed(2)),
          toplamAlacak: new Prisma.Decimal(toplamAlacak.toFixed(2)),
          durum: "TASLAK",
          isLocked: false,
          satirlar: { create: satirlar },
        },
      });
    }
    return tx.yevmiyeKaydi.create({
      data: {
        companyId,
        fisNo,
        tarih,
        aciklama: `${donem} bordro taslağı: ${personel.adSoyad}. Kesinleşmedi.`,
        toplamBorc: new Prisma.Decimal(toplamBorc.toFixed(2)),
        toplamAlacak: new Prisma.Decimal(toplamAlacak.toFixed(2)),
        durum: "TASLAK",
        isLocked: false,
        satirlar: { create: satirlar },
      },
    });
  });
  res.json({
    ...hesap,
    kaydedildi: true,
    fis_durumu: "TASLAK",
    fis_no: created.fisNo,
    message: "Bordro taslak fişi oluşturuldu. Kesinleşmedi. Onay ayrıca verilir.",
    gider_hesabi: lines[0]?.code || "770",
  });
}));

router.get("/bordro/aphb", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const donem = String(req.query.donem || "");
  if (!/^\d{4}-\d{2}$/.test(donem)) throw new PublicError("Dönem YYYY-AA olmalıdır.", 400);
  const rows = await prisma.bordro.findMany({
    where: { companyId: companyIdOf(req), donem },
    include: { personel: true },
    orderBy: { personelId: "asc" },
  });
  res.json({
    tur: "APHB_VERI",
    gonderildi: false,
    sgk_kabul: false,
    donem,
    satirlar: rows.map((row) => ({
      personel_id: row.personelId,
      ad_soyad: row.personel.adSoyad,
      tckn: row.personel.tckn,
      sgk_gun: 30 - row.eksikGun,
      eksik_gun: row.eksikGun,
      eksik_gun_nedeni: row.eksikGunNedeni,
      prime_esas_kazanc: Number(row.sgkMatrah),
    })),
  });
}));

router.get("/bordro/muhsgk", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const donem = String(req.query.donem || "");
  if (!/^\d{4}-\d{2}$/.test(donem)) throw new PublicError("Dönem YYYY-AA olmalıdır.", 400);
  const rows = await prisma.bordro.findMany({
    where: { companyId: companyIdOf(req), donem },
    include: { personel: true },
    orderBy: { personelId: "asc" },
  });
  res.json({
    tur: "MUHSGK_VERI",
    gonderildi: false,
    gib_kabul: false,
    donem,
    satirlar: rows.map((row) => ({
      personel_id: row.personelId,
      ad_soyad: row.personel.adSoyad,
      tckn: row.personel.tckn,
      brut: Number(row.brut),
      gv_matrah: Number(row.gvMatrah),
      kumulatif_gv_matrah: Number(row.kumulatifGvMatrah),
      gelir_vergisi: Number(row.gelirVergisi),
      damga: Number(row.damga),
      sgk_matrah: Number(row.sgkMatrah),
    })),
  });
}));

router.get("/personel/sure-uyarilari", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const tur = String(req.query.tur || "");
  const olay = String(req.query.olay || "");
  const bildirim = String(req.query.bildirim || "");
  if ((tur !== "giris" && tur !== "cikis") || !/^\d{4}-\d{2}-\d{2}$/.test(olay) || !/^\d{4}-\d{2}-\d{2}$/.test(bildirim)) {
    throw new PublicError("tur giris veya cikis, olay ve bildirim YYYY-AA-GG olmalıdır.", 400);
  }
  const anahtar = tur === "giris" ? "sgk.ise_giris.once_gun" : "sgk.isten_cikis.gun";
  const gun = await getMevzuatParametre(anahtar, olay);
  const gunSayi = gun.toNumber();
  if (!Number.isInteger(gunSayi) || gunSayi <= 0) {
    throw new PublicError(`${anahtar} tam gün olmalıdır.`, 422);
  }
  const uygun = bildirimUygun(new Date(`${olay}T12:00:00`), new Date(`${bildirim}T12:00:00`), gunSayi, tur === "giris" ? "once" : "sonra");
  res.json({
    uygun,
    gun: gunSayi,
    resmi_kabul: false,
    mesaj: uygun ? "Bildirim, kayıtlı gün sayısına göre süre içindedir." : "Bildirim, kayıtlı gün sayısına göre süre dışındadır.",
  });
}));

router.get("/personel/:id/tazminat", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const personel = await prisma.personel.findFirst({ where: { id: Number(req.params.id), companyId } });
  if (!personel?.iseGiris) throw new PublicError("Personelin işe giriş tarihi yok.", 404);
  const tarihMetin = String(req.query.tarih || new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarihMetin)) throw new PublicError("Tarih YYYY-AA-GG olmalıdır.", 400);
  const brut = String(req.query.brut || "");
  if (!brut || Number(brut) <= 0) throw new PublicError("Aylık brüt ücret sorgu parametresi olmalıdır.", 400);
  const tavan = await getMevzuatParametre("kidem.tavan", tarihMetin);
  const bitis = new Date(`${tarihMetin}T12:00:00`);
  const gun = hizmetGunu(personel.iseGiris, bitis);
  const yasHam = req.query.yas;
  const yas = yasHam === undefined || yasHam === "" ? null : Number(yasHam);
  res.json({
    hizmet_gun: gun,
    yillik_izin_gun: yillikIzinGunu(gun, yas != null && Number.isFinite(yas) ? yas : null),
    kidem: kidemTutari(gun, brut, tavan.toString()),
    ihbar: ihbarTutari(gun, brut),
    hak_karari: false,
  });
}));

router.post("/yevmiye/uretim-maliyet", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const tarih = String(req.body?.tarih || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new PublicError("Tarih YYYY-AA-GG olmalıdır.", 400);
  const mamulKodu = String(req.body?.mamul_kodu || "").trim();
  const mamulAdi = String(req.body?.mamul_adi || "").trim();
  if (!mamulKodu || !mamulAdi) throw new PublicError("Mamul kodu ve adı zorunludur.", 400);
  const ayar = await prisma.companyAyar.findUnique({ where: { companyId } });
  const code = mamulKodu.replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || "MAMUL";
  const fisNo = `URT-${tarih.replace(/-/g, "")}-${code}`;
  const voucher = productionCostDraft({
    fisNo,
    tarih,
    mamulKodu,
    mamulAdi,
    hammadde: moneyNumber(req.body?.hammadde),
    iscilik: moneyNumber(req.body?.iscilik),
    genelUretim: moneyNumber(req.body?.genel_uretim),
    chart: ayar?.maliyetYontemi === "7B" ? "7B" : "7A",
  });
  await assertPeriodOpen(companyId, new Date(`${tarih}T12:00:00`));
  const mevcut = await prisma.yevmiyeKaydi.findUnique({ where: { companyId_fisNo: { companyId, fisNo } } });
  if (mevcut) {
    throw new PublicError("Bu mamul ve tarih için maliyet fişi zaten var. İkinci fiş yazılmadı.", 409);
  }
  const toplamBorc = addMoney(voucher.satirlar.map((line) => line.borc));
  const toplamAlacak = addMoney(voucher.satirlar.map((line) => line.alacak));
  const created = await prisma.yevmiyeKaydi.create({
    data: {
      companyId,
      fisNo,
      tarih: new Date(`${tarih}T12:00:00`),
      aciklama: voucher.aciklama,
      toplamBorc: new Prisma.Decimal(toplamBorc.toFixed(2)),
      toplamAlacak: new Prisma.Decimal(toplamAlacak.toFixed(2)),
      durum: "TASLAK",
      isLocked: false,
      satirlar: {
        create: voucher.satirlar.map((line) => ({
          satirNo: line.satir_no,
          hesapKodu: line.hesap_kodu,
          aciklama: line.aciklama,
          borc: new Prisma.Decimal(money(line.borc).toFixed(2)),
          alacak: new Prisma.Decimal(money(line.alacak).toFixed(2)),
        })),
      },
    },
  });
  res.status(201).json({
    fis_no: created.fisNo,
    fis_durumu: "TASLAK",
    toplam_borc: toplamBorc,
    toplam_alacak: toplamAlacak,
    message: "Maliyet taslak fişi yazıldı. Stok kartı değiştirilmedi. Kesinleşmedi. Örnek bütçe tutarları kullanılmadı.",
  });
}));

router.post("/myasistan/sor", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const question = String(req.body?.question || "").trim();
  if (!question) throw new PublicError("Soru boş olamaz.", 400);
  const [cari, stok, fis, fatura] = await Promise.all([
    prisma.cariKart.count({ where: { companyId, isActive: true } }),
    prisma.stokKart.count({ where: { companyId, isActive: true } }),
    prisma.yevmiyeKaydi.count({ where: { companyId } }),
    prisma.fatura.count({ where: { companyId } }),
  ]);
  res.json({
    answer: `Kayıtlı özet: ${cari} cari, ${stok} stok, ${fis} yevmiye fişi, ${fatura} fatura. Bu yanıt veritabanı sayımlarından üretilir; serbest metin üretimi kapalıdır.`,
    confidence: 1,
    data: { cari, stok, fis, fatura, question },
  });
}));

router.get("/workspace/state", asyncRoute(async (req, res) => {
  const row = await prisma.workspaceState.findUnique({ where: { companyId: companyIdOf(req) } });
  res.json({ payload: row?.payload || {} });
}));

router.put("/workspace/state", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const payload = req.body?.payload;
  if (!payload || typeof payload !== "object") throw new PublicError("Çalışma alanı gövdesi geçersiz.", 400);
  await prisma.workspaceState.upsert({
    where: { companyId },
    create: { companyId, payload },
    update: { payload },
  });
  res.json({ ok: true });
}));

function toCariList(row: {
  id: number;
  kod: string;
  ad: string;
  vergiNo: string;
  bakiye: Prisma.Decimal;
  isActive: boolean;
  branchId: number;
  hesapKodu: string | null;
  profil: Prisma.JsonValue;
}) {
  const profil = (row.profil || {}) as Record<string, unknown>;
  return {
    id: row.id,
    code: row.kod,
    title: row.ad,
    account_type: profil.account_type || "MUSTERI_TEDARIKCI",
    tax_number: row.vergiNo || null,
    city: profil.city || null,
    is_passive: !row.isActive,
    is_efatura: Boolean(profil.is_efatura),
    is_eirsaliye: Boolean(profil.is_eirsaliye),
    branch_id: row.branchId,
    record_type_id: num(profil.record_type_id, 1),
    coa_code: row.hesapKodu,
    coa_name: profil.coa_name || null,
    balance: Number(row.bakiye),
  };
}

function toCariForm(row: {
  id: number;
  kod: string;
  ad: string;
  vergiNo: string;
  bakiye: Prisma.Decimal;
  isActive: boolean;
  branchId: number;
  profil: Prisma.JsonValue;
}) {
  const profil = (row.profil || {}) as Record<string, unknown>;
  return {
    ...profil,
    id: row.id,
    code: row.kod,
    title: row.ad,
    tax_number: row.vergiNo,
    branch_id: row.branchId,
    is_passive: !row.isActive,
    balance: Number(row.bakiye),
  };
}

function toVoucher(row: {
  id: number;
  fisNo: string;
  tarih: Date;
  aciklama: string;
  toplamBorc: Prisma.Decimal;
  toplamAlacak: Prisma.Decimal;
  durum: string;
  satirlar: Array<{ satirNo: number; hesapKodu: string; aciklama: string; borc: Prisma.Decimal; alacak: Prisma.Decimal }>;
}) {
  return {
    id: row.id,
    voucher_no: row.fisNo,
    voucher_date: row.tarih.toISOString().slice(0, 10),
    description: row.aciklama,
    total_debit: Number(row.toplamBorc),
    total_credit: Number(row.toplamAlacak),
    status: row.durum,
    revision_no: 1,
    document_links: [],
    lines: row.satirlar.map((s) => ({
      line_no: s.satirNo,
      coa_code: s.hesapKodu,
      debit: Number(s.borc),
      credit: Number(s.alacak),
      description: s.aciklama,
    })),
  };
}

function toInvoice(row: {
  id: number;
  belgeNo: string;
  tarih: Date;
  yon: string;
  araToplam: Prisma.Decimal;
  kdvTutari: Prisma.Decimal;
  genelToplam: Prisma.Decimal;
  durum: string;
  yevmiyeFisNo: string | null;
  cari?: { kod: string; ad: string } | null;
}) {
  return {
    id: row.id,
    invoice_no: row.belgeNo,
    fis_no: row.yevmiyeFisNo,
    invoice_type: row.yon,
    invoice_type_label: row.yon === "ALIS" ? "Alış" : "Satış",
    invoice_date: row.tarih.toISOString().slice(0, 10),
    due_date: null,
    account_code: row.cari?.kod || null,
    account_title: row.cari?.ad || null,
    subtotal: Number(row.araToplam),
    tax_total: Number(row.kdvTutari),
    grand_total: Number(row.genelToplam),
    status: row.durum,
    is_posted: row.durum === "ONAYLI",
    yevmiye_fis_no: row.yevmiyeFisNo,
    gib_status: "TASLAK",
    gib_status_label: "Resmi gönderim yok",
    tax_breakdown: {},
  };
}

function mapTur(tip: string): "HAMMADDE" | "YARI_MAMUL" | "MAMUL" {
  if (tip === "MAMUL" || tip === "TICARI_MAL") return "MAMUL";
  if (tip === "YARI_MAMUL") return "YARI_MAMUL";
  return "HAMMADDE";
}

export default router;
