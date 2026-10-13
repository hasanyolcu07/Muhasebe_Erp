import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authorize } from "../middleware/auth.middleware";
import { PublicError, toPublicMessage } from "../security/publicError";
import { assertPeriodOpen } from "../services/period.service";
import { Decimal } from "../../lib/financialMath";
import { money } from "../money";
import { maskIban } from "../../modules/personel/types/personelTypes";
import {
  amortismanFisi,
  amortismanGiderHesabi,
  amortismanTutari,
  cekFisi,
  cekHesabi,
  denkFis,
  hammaddeFisi,
  kurFarkiFisi,
  nakitFisi,
  sarfMiktari,
  sarfTutari,
  type FisSatiri,
} from "../services/finansDonem.logic";
import { bakiyeTl, maliyetYontemi, yazKesinFis } from "../services/kesinFis.service";

export const finansRouter = Router();

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((error: unknown) => {
      if (res.headersSent) return;
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: "Girdi doğrulama hatası", message: "Girdi doğrulama hatası" });
        return;
      }
      const pub = toPublicMessage(error, "İşlem tamamlanamadı.");
      res.status(pub.status).json({ success: false, error: pub.message, message: pub.message });
    });
  };
}

function companyIdOf(req: Request): number {
  const id = req.user?.companyId;
  if (!id) throw new PublicError("Şirket kapsamı bulunamadı.", 401);
  return id;
}

function gun(metin: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metin)) throw new PublicError("Tarih YYYY-AA-GG olmalıdır.", 400);
  return new Date(`${metin}T12:00:00`);
}

function masrafHesabi(yontem: string): "797" | "780" {
  return yontem === "7B" ? "797" : "780";
}

finansRouter.get("/kasa-banka/kasa", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const rows = await prisma.kasaHesabi.findMany({ where: { companyId }, orderBy: { kod: "asc" } });
  const hareket = await prisma.nakitHareket.findMany({ where: { companyId, kanal: "KASA" } });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      code: row.kod,
      name: row.ad,
      branch_id: 1,
      record_type_id: 1,
      currency_id: null,
      currency_code: row.doviz,
      opening_balance: Number(row.acilis),
      balance: Number(bakiyeTl(row.acilis, hareket, row.id)),
      responsible_user_id: null,
      is_passive: !row.isActive,
      coa_code: row.hesapKodu,
    })),
    total: rows.length,
    page: 1,
    page_size: rows.length || 1,
  });
}));

finansRouter.post("/kasa-banka/kasa", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const kod = String(req.body?.code || "").trim();
  const ad = String(req.body?.name || "").trim();
  if (!kod || !ad) throw new PublicError("Kasa kodu ve adı zorunludur.", 400);
  const hesap = String(req.body?.coa_code || "100");
  if (!hesap.startsWith("100")) throw new PublicError("Kasa hesabı 100 ile başlamalıdır.", 422);
  const row = await prisma.kasaHesabi.create({
    data: {
      companyId,
      kod,
      ad,
      hesapKodu: hesap,
      doviz: "TRY",
      acilis: money(req.body?.opening_balance || 0).toFixed(2),
    },
  });
  await prisma.auditLog.create({
    data: {
      tabloAdi: "kasa_hesaplari",
      islemTipi: "INSERT",
      kullaniciId: req.user?.userId ?? null,
      ipAdresi: req.ip || null,
      yeniVeri: { kod, hesap },
    },
  });
  res.status(201).json({ id: row.id, code: row.kod, name: row.ad });
}));

finansRouter.get("/kasa-banka/banka", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const rows = await prisma.bankaHesabi.findMany({ where: { companyId }, orderBy: { kod: "asc" } });
  const hareket = await prisma.nakitHareket.findMany({ where: { companyId, kanal: "BANKA" } });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      code: row.kod,
      name: row.ad,
      bank_name: row.bankaAdi,
      iban: maskIban(row.iban, false),
      branch_id: 1,
      record_type_id: 1,
      currency_code: row.doviz,
      opening_balance: Number(row.acilis),
      balance: Number(bakiyeTl(row.acilis, hareket, row.id)),
      is_passive: !row.isActive,
    })),
    total: rows.length,
    page: 1,
    page_size: rows.length || 1,
  });
}));

finansRouter.post("/kasa-banka/banka", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const kod = String(req.body?.code || "").trim();
  const ad = String(req.body?.name || "").trim();
  const iban = String(req.body?.iban || "").replace(/\s+/g, "");
  if (!kod || !ad || iban.length < 10) throw new PublicError("Banka kodu, adı ve IBAN zorunludur.", 400);
  const hesap = String(req.body?.coa_code || "102");
  if (!hesap.startsWith("102")) throw new PublicError("Banka hesabı 102 ile başlamalıdır.", 422);
  const row = await prisma.bankaHesabi.create({
    data: {
      companyId,
      kod,
      ad,
      bankaAdi: String(req.body?.bank_name || ""),
      iban,
      hesapKodu: hesap,
      doviz: String(req.body?.doviz || "TRY").toUpperCase(),
      acilis: money(req.body?.opening_balance || 0).toFixed(2),
    },
  });
  await prisma.auditLog.create({
    data: {
      tabloAdi: "banka_hesaplari",
      islemTipi: "INSERT",
      kullaniciId: req.user?.userId ?? null,
      ipAdresi: req.ip || null,
      yeniVeri: { kod, hesap },
    },
  });
  res.status(201).json({ id: row.id, code: row.kod, name: row.ad });
}));

finansRouter.get("/kasa-islemleri/lookups/kasa", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const rows = await prisma.kasaHesabi.findMany({ where: { companyId, isActive: true }, orderBy: { kod: "asc" } });
  const hareket = await prisma.nakitHareket.findMany({ where: { companyId, kanal: "KASA" } });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      code: row.kod,
      name: row.ad,
      balance: Number(bakiyeTl(row.acilis, hareket, row.id)),
      currency_code: row.doviz,
      is_passive: false,
    })),
  });
}));

finansRouter.get("/kasa-islemleri/lookups/cari", asyncRoute(async (req, res) => {
  const rows = await prisma.cariKart.findMany({
    where: { companyId: companyIdOf(req), isActive: true },
    orderBy: { kod: "asc" },
    take: 100,
  });
  res.json({ items: rows.map((row) => ({ id: row.id, code: row.kod, title: row.ad })) });
}));

finansRouter.get("/kasa-islemleri", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const rows = await prisma.nakitHareket.findMany({
    where: { companyId, kanal: "KASA" },
    orderBy: { tarih: "desc" },
  });
  const kasalar = await prisma.kasaHesabi.findMany({ where: { companyId } });
  const ad = new Map(kasalar.map((row) => [row.id, row]));
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      txn_no: row.fisNo,
      txn_date: row.tarih.toISOString().slice(0, 10),
      txn_type: row.tur === "TAHSILAT" || row.tur === "ODEME" || row.tur === "VIRMAN" ? row.tur : "ODEME",
      txn_type_label: row.tur,
      cash_account_id: row.hesapId,
      cash_account_code: ad.get(row.hesapId)?.kod || "",
      cash_account_name: ad.get(row.hesapId)?.ad || "",
      target_cash_account_id: row.hedefId,
      target_cash_account_label: row.hedefId ? ad.get(row.hedefId)?.ad || null : null,
      account_id: null,
      account_label: row.karsiHesap,
      invoice_id: null,
      invoice_no: null,
      amount: Number(row.tutar),
      description: row.aciklama,
      branch_id: 1,
      record_type_id: 1,
      record_type_code: null,
      yevmiye_fis_no: row.fisNo,
      is_posted: true,
      journal_voucher_id: null,
      debit_amount: row.tur === "TAHSILAT" ? Number(row.tutar) : 0,
      credit_amount: row.tur === "TAHSILAT" ? 0 : Number(row.tutar),
      created_at: null,
    })),
    total: rows.length,
    page: 1,
    page_size: rows.length || 1,
    summary: null,
  });
}));

finansRouter.post("/kasa-islemleri", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const tur = String(req.body?.txn_type || "");
  if (tur !== "TAHSILAT" && tur !== "ODEME" && tur !== "VIRMAN") {
    throw new PublicError("İşlem tahsilat, ödeme veya virman olmalıdır.", 400);
  }
  const tarih = gun(String(req.body?.txn_date || ""));
  const tutar = money(req.body?.amount);
  if (tutar.lessThanOrEqualTo(0)) throw new PublicError("Tutar pozitif olmalıdır.", 400);
  const aciklama = String(req.body?.description || "").trim();
  if (aciklama.length < 3) throw new PublicError("Açıklama zorunludur.", 400);
  const kasa = await prisma.kasaHesabi.findFirst({ where: { id: Number(req.body?.cash_account_id), companyId } });
  if (!kasa) throw new PublicError("Kasa bulunamadı.", 404);
  let karsi = tur === "TAHSILAT" ? "120" : "320";
  let hedefId: number | null = null;
  if (tur === "VIRMAN") {
    const hedef = await prisma.kasaHesabi.findFirst({ where: { id: Number(req.body?.target_cash_account_id), companyId } });
    if (!hedef || hedef.id === kasa.id) throw new PublicError("Hedef kasa farklı olmalıdır.", 400);
    karsi = hedef.hesapKodu;
    hedefId = hedef.id;
  } else if (req.body?.account_id) {
    const cari = await prisma.cariKart.findFirst({ where: { id: Number(req.body.account_id), companyId } });
    if (!cari) throw new PublicError("Cari bulunamadı.", 404);
    if (cari.hesapKodu) karsi = cari.hesapKodu;
  }
  const satirlar = nakitFisi(tur, kasa.hesapKodu, karsi, tutar.toFixed(2));
  await assertPeriodOpen(companyId, tarih);
  const yontem = await maliyetYontemi(companyId);
  const kayit = await prisma.$transaction(async (tx) => {
    const fis = await yazKesinFis(tx, {
      companyId,
      tarih,
      aciklama: `Kasa: ${aciklama}`,
      satirlar,
      kullaniciId: req.user?.userId ?? null,
      ip: req.ip || null,
      maliyetYontemi: yontem,
    });
    return tx.nakitHareket.create({
      data: {
        companyId,
        kanal: "KASA",
        hesapId: kasa.id,
        hedefId,
        tur,
        tarih,
        tutar: tutar.toFixed(2),
        karsiHesap: karsi,
        aciklama,
        fisNo: fis.fisNo,
      },
    });
  });
  res.status(201).json({ id: kayit.id, txn_no: kayit.fisNo, yevmiye_fis_no: kayit.fisNo, is_posted: true });
}));

finansRouter.delete("/kasa-islemleri/:id", authorize(["ADMIN"]), asyncRoute(async () => {
  throw new PublicError("Kesin kasa fişi silinmez. Ters kayıt yevmiye ekranından açılır.", 409);
}));

finansRouter.get("/banka-islemleri/lookups/banka", asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const rows = await prisma.bankaHesabi.findMany({ where: { companyId, isActive: true }, orderBy: { kod: "asc" } });
  const hareket = await prisma.nakitHareket.findMany({ where: { companyId, kanal: "BANKA" } });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      code: row.kod,
      name: row.ad,
      bank_name: row.bankaAdi,
      balance: Number(bakiyeTl(row.acilis, hareket, row.id)),
      currency_code: row.doviz,
      is_passive: false,
    })),
  });
}));

finansRouter.get("/banka-islemleri", asyncRoute(async (req, res) => {
  const rows = await prisma.nakitHareket.findMany({
    where: { companyId: companyIdOf(req), kanal: "BANKA" },
    orderBy: { tarih: "desc" },
  });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      txn_no: row.fisNo,
      txn_date: row.tarih.toISOString().slice(0, 10),
      txn_type: "HAVALE_EFT",
      txn_type_label: row.tur,
      direction: row.tur === "TAHSILAT" || row.tur === "KUR_ARTIS" ? "GELEN" : "GIDEN",
      bank_account_id: row.hesapId,
      bank_account_code: "",
      bank_account_name: "",
      target_bank_account_id: row.hedefId,
      target_bank_account_label: null,
      account_id: null,
      account_label: row.karsiHesap,
      amount: Number(row.tutar),
      description: row.aciklama,
      document_no: null,
      check_ref: null,
      pos_batch_no: null,
      commission_amount: null,
      branch_id: 1,
      record_type_id: 1,
      record_type_code: null,
      yevmiye_fis_no: row.fisNo,
      is_posted: true,
      journal_voucher_id: null,
      debit_amount: 0,
      credit_amount: 0,
      created_at: null,
    })),
    total: rows.length,
    page: 1,
    page_size: rows.length || 1,
    summary: null,
  });
}));

finansRouter.post("/banka-islemleri", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const txn = String(req.body?.txn_type || "");
  if (txn === "POS_BLOKE_COZUMU") {
    throw new PublicError("POS bloke hesabı tanımlı değil. Fiş yazılmadı.", 422);
  }
  const tarih = gun(String(req.body?.txn_date || ""));
  const tutar = money(req.body?.amount);
  if (tutar.lessThanOrEqualTo(0)) throw new PublicError("Tutar pozitif olmalıdır.", 400);
  const aciklama = String(req.body?.description || "").trim();
  if (aciklama.length < 3) throw new PublicError("Açıklama zorunludur.", 400);
  const banka = await prisma.bankaHesabi.findFirst({ where: { id: Number(req.body?.bank_account_id), companyId } });
  if (!banka) throw new PublicError("Banka hesabı bulunamadı.", 404);
  const yontem = await maliyetYontemi(companyId);
  let tur = "ODEME";
  let hedefId: number | null = null;
  let karsi = "320";
  let satirlar: ReturnType<typeof nakitFisi>;
  if (txn === "VIRMAN") {
    const hedef = await prisma.bankaHesabi.findFirst({ where: { id: Number(req.body?.target_bank_account_id), companyId } });
    if (!hedef || hedef.id === banka.id) throw new PublicError("Hedef banka farklı olmalıdır.", 400);
    tur = "VIRMAN";
    hedefId = hedef.id;
    karsi = hedef.hesapKodu;
    satirlar = nakitFisi("VIRMAN", banka.hesapKodu, hedef.hesapKodu, tutar.toFixed(2));
  } else if (txn === "BANKA_MASRAFI") {
    tur = "MASRAF";
    karsi = masrafHesabi(yontem);
    satirlar = nakitFisi("MASRAF", banka.hesapKodu, karsi, tutar.toFixed(2));
  } else if (txn === "KUR_FARKI") {
    if (banka.doviz === "TRY") throw new PublicError("Kur farkı yalnız döviz hesabına yazılır.", 422);
    const yon = String(req.body?.kur_farki_type || "");
    if (yon !== "GELIR" && yon !== "GIDER") throw new PublicError("Kur farkı gelir veya gider olmalıdır.", 400);
    const kur = String(req.body?.exchange_rate || "");
    if (!Number.isFinite(Number(kur)) || Number(kur) <= 0) throw new PublicError("Kur pozitif olmalıdır.", 422);
    tur = yon === "GELIR" ? "KUR_ARTIS" : "KUR_AZALIS";
    karsi = yon === "GELIR" ? "646" : "656";
    satirlar = yon === "GELIR"
      ? denkFis([
        { hesap: banka.hesapKodu, borc: tutar.toFixed(2), alacak: "0.00", aciklama: "Kur artışı" },
        { hesap: "646", borc: "0.00", alacak: tutar.toFixed(2), aciklama: "Kambiyo kârı" },
      ])
      : denkFis([
        { hesap: "656", borc: tutar.toFixed(2), alacak: "0.00", aciklama: "Kambiyo zararı" },
        { hesap: banka.hesapKodu, borc: "0.00", alacak: tutar.toFixed(2), aciklama: "Kur azalışı" },
      ]);
  } else if (txn === "CEK_TAHSIL_TEDIYE") {
    const cek = await prisma.cekSenet.findFirst({ where: { id: Number(req.body?.check_bond_id), companyId } });
    if (!cek) throw new PublicError("Çek veya senet bulunamadı.", 404);
    const gelen = String(req.body?.direction || "") === "GELEN";
    tur = gelen ? "TAHSILAT" : "ODEME";
    karsi = cek.belgeHesap;
    satirlar = cekFisi(gelen ? "TAHSIL" : "ODEME", cek.belgeHesap, banka.hesapKodu, tutar.toFixed(2));
  } else {
    const gelen = String(req.body?.direction || "GELEN") !== "GIDEN";
    tur = gelen ? "TAHSILAT" : "ODEME";
    karsi = gelen ? "120" : "320";
    if (req.body?.account_id) {
      const cari = await prisma.cariKart.findFirst({ where: { id: Number(req.body.account_id), companyId } });
      if (cari?.hesapKodu) karsi = cari.hesapKodu;
    }
    satirlar = nakitFisi(gelen ? "TAHSILAT" : "ODEME", banka.hesapKodu, karsi, tutar.toFixed(2));
  }
  await assertPeriodOpen(companyId, tarih);
  const kayit = await prisma.$transaction(async (tx) => {
    if (txn === "KUR_FARKI") {
      await tx.dovizKuru.upsert({
        where: { companyId_doviz_tarih: { companyId, doviz: banka.doviz, tarih } },
        create: { companyId, doviz: banka.doviz, tarih, kur: String(req.body?.exchange_rate || "") },
        update: { kur: String(req.body?.exchange_rate || "") },
      });
    }
    const fis = await yazKesinFis(tx, {
      companyId,
      tarih,
      aciklama: `Banka: ${aciklama}`,
      satirlar,
      kullaniciId: req.user?.userId ?? null,
      ip: req.ip || null,
      maliyetYontemi: yontem,
    });
    return tx.nakitHareket.create({
      data: {
        companyId,
        kanal: "BANKA",
        hesapId: banka.id,
        hedefId,
        tur,
        tarih,
        tutar: tutar.toFixed(2),
        karsiHesap: karsi,
        aciklama,
        fisNo: fis.fisNo,
      },
    });
  });
  res.status(201).json({ id: kayit.id, txn_no: kayit.fisNo, yevmiye_fis_no: kayit.fisNo, is_posted: true });
}));

finansRouter.get("/cek-senet", asyncRoute(async (req, res) => {
  const rows = await prisma.cekSenet.findMany({ where: { companyId: companyIdOf(req) }, orderBy: { vade: "asc" } });
  const mapRow = (row: (typeof rows)[number]) => ({
    id: row.id,
    branch_id: 1,
    record_type_id: 1,
    record_type_code: null,
    instrument_type: row.tur,
    instrument_type_label: row.tur === "SENET" ? "Senet" : "Çek",
    direction: row.yon,
    direction_label: row.yon === "VERILEN" ? "Verilen" : "Alınan",
    document_no: row.belgeNo,
    amount: Number(row.tutar),
    currency_id: null,
    currency_code: "TRY",
    due_date: row.vade.toISOString().slice(0, 10),
    status: row.durum,
    status_label: row.durum,
    account_id: row.cariId,
    account_label: row.belgeHesap,
    bank_account_id: null,
    bank_account_label: null,
    in_portfolio: row.durum === "PORTFOY",
    description: null,
    days_to_due: null,
    is_overdue: false,
    yevmiye_fis_no: null,
    is_posted: true,
    journal_voucher_id: null,
    created_at: row.createdAt.toISOString(),
  });
  const alinan = rows.filter((row) => row.yon !== "VERILEN").map(mapRow);
  const verilen = rows.filter((row) => row.yon === "VERILEN").map(mapRow);
  res.json({
    items_alinan: alinan,
    items_verilen: verilen,
    total_alinan: alinan.length,
    total_verilen: verilen.length,
    page: 1,
    page_size: rows.length || 1,
  });
}));

finansRouter.post("/cek-senet/transactions", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const islem = String(req.body?.transaction_type || "");
  const tarih = gun(String(req.body?.transaction_date || ""));
  const tutar = money(req.body?.amount);
  if (tutar.lessThanOrEqualTo(0)) throw new PublicError("Tutar pozitif olmalıdır.", 400);
  const aciklama = String(req.body?.description || "").trim();
  if (aciklama.length < 3) throw new PublicError("Açıklama zorunludur.", 400);
  const yontem = await maliyetYontemi(companyId);
  await assertPeriodOpen(companyId, tarih);
  const giris = islem === "PORTFOY_GIRIS" || islem === "CEK_SENET_CIKIS";
  const sonuc = await prisma.$transaction(async (tx) => {
    let belge = giris ? null : await tx.cekSenet.findFirst({ where: { id: Number(req.body?.check_bond_id), companyId } });
    if (!giris && !belge) throw new PublicError("Çek veya senet bulunamadı.", 404);
    if (giris) {
      const tur = String(req.body?.instrument_type || "") === "SENET" ? "SENET" : "CEK";
      const yon = islem === "CEK_SENET_CIKIS" ? "VERILEN" : "ALINAN";
      const belgeNo = String(req.body?.document_no || "").trim();
      const vade = gun(String(req.body?.due_date || ""));
      if (!belgeNo) throw new PublicError("Belge numarası zorunludur.", 400);
      let cariId: number | null = null;
      if (req.body?.account_id) {
        const cari = await tx.cariKart.findFirst({ where: { id: Number(req.body.account_id), companyId } });
        if (!cari) throw new PublicError("Cari bulunamadı.", 404);
        cariId = cari.id;
      }
      belge = await tx.cekSenet.create({
        data: {
          companyId,
          cariId,
          tur,
          yon,
          belgeNo,
          tutar: tutar.toFixed(2),
          vade,
          durum: yon === "VERILEN" ? "VERILDI" : "PORTFOY",
          belgeHesap: cekHesabi(tur, yon),
        },
      });
    }
    if (!belge) throw new PublicError("Çek veya senet bulunamadı.", 404);
    if (!giris) {
      const uygun = belge.yon === "VERILEN" ? belge.durum === "VERILDI" : belge.durum === "PORTFOY";
      if (!uygun) throw new PublicError("Bu durumdaki belgeye ikinci fiş yazılmaz.", 409);
      if (!money(belge.tutar.toString()).equals(tutar)) {
        throw new PublicError("Tutar belge tutarına eşit olmalıdır.", 422);
      }
    }
    let kasaBanka = "";
    let kanal: "KASA" | "BANKA" | null = null;
    let hesapId: number | null = null;
    if (req.body?.cash_account_id) {
      const kasa = await tx.kasaHesabi.findFirst({ where: { id: Number(req.body.cash_account_id), companyId } });
      if (!kasa) throw new PublicError("Kasa bulunamadı.", 404);
      kasaBanka = kasa.hesapKodu;
      kanal = "KASA";
      hesapId = kasa.id;
    } else if (req.body?.bank_account_id) {
      const banka = await tx.bankaHesabi.findFirst({ where: { id: Number(req.body.bank_account_id), companyId } });
      if (!banka) throw new PublicError("Banka hesabı bulunamadı.", 404);
      kasaBanka = banka.hesapKodu;
      kanal = "BANKA";
      hesapId = banka.id;
    }
    let fisIslem: "GIRIS" | "CIRO" | "TAHSIL" | "KARSILIKSIZ" | "ODEME" = "GIRIS";
    let durum = belge.durum;
    if (islem === "CIRO") {
      if (req.body?.target_account_id) {
        const hedef = await tx.cariKart.findFirst({ where: { id: Number(req.body.target_account_id), companyId } });
        if (!hedef) throw new PublicError("Ciro carisi bulunamadı.", 404);
      }
      fisIslem = "CIRO";
      durum = "CIRO";
    } else if (islem === "PORTFOY_TAHSIL" || islem === "BANKA_TAHSIL") {
      if (!kasaBanka) throw new PublicError("Tahsil için kasa veya banka seçin.", 400);
      fisIslem = "TAHSIL";
      durum = "TAHSIL";
    } else if (islem === "IADE_KARSILIKSIZ" || islem === "BANKADAN_KARSILIKSIZ") {
      fisIslem = "KARSILIKSIZ";
      durum = "KARSILIKSIZ";
    } else if (islem === "MUSTERIDE_ELDEN_TAHSIL") {
      if (!kasaBanka) throw new PublicError("Elden tahsil için kasa veya banka seçin.", 400);
      fisIslem = "ODEME";
      durum = "TAHSIL";
    } else if (!giris) {
      throw new PublicError("Bu çek hareketi için fiş kuralı yok. Kayıt yazılmadı.", 422);
    }
    const satirlar = cekFisi(fisIslem, belge.belgeHesap, kasaBanka || "100", tutar.toFixed(2));
    const fis = await yazKesinFis(tx, {
      companyId,
      tarih,
      aciklama: `Çek/senet: ${aciklama}`,
      satirlar,
      kullaniciId: req.user?.userId ?? null,
      ip: req.ip || null,
      maliyetYontemi: yontem,
    });
    if (kanal && hesapId && (fisIslem === "TAHSIL" || fisIslem === "ODEME")) {
      await tx.nakitHareket.create({
        data: {
          companyId,
          kanal,
          hesapId,
          tur: fisIslem === "TAHSIL" ? "TAHSILAT" : "ODEME",
          tarih,
          tutar: tutar.toFixed(2),
          karsiHesap: belge.belgeHesap,
          aciklama,
          fisNo: fis.fisNo,
        },
      });
    }
    await tx.cekSenet.updateMany({ where: { id: belge.id, companyId }, data: { durum } });
    return { fisNo: fis.fisNo, id: belge.id, durum };
  });
  res.status(201).json({
    id: sonuc.id,
    check_bond_id: sonuc.id,
    document_no: null,
    transaction_type: islem,
    transaction_type_label: islem,
    transaction_date: String(req.body?.transaction_date),
    amount: Number(tutar),
    description: aciklama,
    yevmiye_fis_no: sonuc.fisNo,
    is_posted: true,
    journal_voucher_id: null,
    new_status: sonuc.durum,
  });
}));

finansRouter.get("/demirbas", asyncRoute(async (req, res) => {
  const rows = await prisma.demirbas.findMany({ where: { companyId: companyIdOf(req) }, orderBy: { kod: "asc" } });
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      kod: row.kod,
      ad: row.ad,
      alis_tarihi: row.alisTarihi.toISOString().slice(0, 10),
      maliyet: row.maliyet.toString(),
      birikmis: row.birikmis.toString(),
      oran: row.oran.toString(),
      yontem: row.yontem,
      son_yil: row.sonYil,
    })),
  });
}));

finansRouter.post("/demirbas", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const kod = String(req.body?.kod || "").trim();
  const ad = String(req.body?.ad || "").trim();
  const yontem = String(req.body?.yontem || "");
  if (!kod || !ad || (yontem !== "NORMAL" && yontem !== "AZALAN")) {
    throw new PublicError("Kod, ad ve yöntem (NORMAL veya AZALAN) zorunludur.", 400);
  }
  const oran = String(req.body?.oran || "");
  amortismanTutari(String(req.body?.maliyet || "0"), "0", oran, yontem);
  const row = await prisma.demirbas.create({
    data: {
      companyId,
      kod,
      ad,
      alisTarihi: gun(String(req.body?.alis_tarihi || "")),
      maliyet: money(req.body?.maliyet).toFixed(2),
      oran,
      yontem,
      uretim: Boolean(req.body?.uretim),
    },
  });
  await prisma.auditLog.create({
    data: {
      tabloAdi: "demirbaslar",
      islemTipi: "INSERT",
      kullaniciId: req.user?.userId ?? null,
      ipAdresi: req.ip || null,
      yeniVeri: { kod, yontem },
    },
  });
  res.status(201).json({ id: row.id, kod: row.kod });
}));

finansRouter.post("/demirbas/amortisman", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const yil = Number(req.body?.yil);
  if (!Number.isInteger(yil)) throw new PublicError("Yıl zorunludur.", 400);
  const tarih = gun(`${yil}-12-31`);
  const yontem = await maliyetYontemi(companyId);
  const kartlar = await prisma.demirbas.findMany({ where: { companyId, OR: [{ sonYil: null }, { sonYil: { lt: yil } }] } });
  const satirlar: FisSatiri[] = [];
  const guncellenecek: Array<{ id: number; birikmis: string }> = [];
  for (const kart of kartlar) {
    const hesap = amortismanTutari(kart.maliyet.toString(), kart.birikmis.toString(), kart.oran.toString(), kart.yontem === "AZALAN" ? "AZALAN" : "NORMAL");
    if (money(hesap.tutar).isZero()) continue;
    const gider = amortismanGiderHesabi(yontem, kart.uretim);
    satirlar.push(...amortismanFisi(hesap.tutar, gider).map((line) => ({ ...line, aciklama: `${kart.kod} ${line.aciklama}` })));
    guncellenecek.push({ id: kart.id, birikmis: money(kart.birikmis.toString()).plus(hesap.tutar).toFixed(2) });
  }
  if (satirlar.length === 0) throw new PublicError("Bu yıl için ayrılacak amortisman yok.", 422);
  denkFis(satirlar);
  await assertPeriodOpen(companyId, tarih);
  const fis = await prisma.$transaction(async (tx) => {
    const yazilan = await yazKesinFis(tx, {
      companyId,
      tarih,
      aciklama: `${yil} dönem amortismanı`,
      satirlar,
      kullaniciId: req.user?.userId ?? null,
      ip: req.ip || null,
      maliyetYontemi: yontem,
    });
    for (const kart of guncellenecek) {
      await tx.demirbas.updateMany({ where: { id: kart.id, companyId }, data: { birikmis: kart.birikmis, sonYil: yil } });
    }
    return yazilan;
  });
  res.status(201).json({ fis_no: fis.fisNo, durum: "KESIN", kist: false, kart: guncellenecek.length });
}));

finansRouter.post("/doviz/kur", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const doviz = String(req.body?.doviz || "").trim().toUpperCase();
  const tarih = gun(String(req.body?.tarih || ""));
  const kur = String(req.body?.kur || "");
  if (!/^[A-Z]{3}$/.test(doviz) || doviz === "TRY" || Number(kur) <= 0) {
    throw new PublicError("Döviz kodu ve pozitif kur zorunludur. Kur kullanıcı girer.", 422);
  }
  await prisma.dovizKuru.upsert({
    where: { companyId_doviz_tarih: { companyId, doviz, tarih } },
    create: { companyId, doviz, tarih, kur },
    update: { kur },
  });
  res.status(201).json({ doviz, kur, resmi_kur: false });
}));

finansRouter.post("/doviz/degerleme", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const doviz = String(req.body?.doviz || "").trim().toUpperCase();
  const tarih = gun(String(req.body?.tarih || ""));
  const hesap = String(req.body?.hesap || "");
  const kayit = await prisma.dovizKuru.findUnique({ where: { companyId_doviz_tarih: { companyId, doviz, tarih } } });
  if (!kayit) throw new PublicError("Bu tarih için kur yok. Önce kuru kaydedin.", 422);
  const eskiKur = String(req.body?.eski_kur || "");
  const satirlar = kurFarkiFisi(hesap, String(req.body?.doviz_tutar || ""), eskiKur, kayit.kur.toString(), req.body?.aktif !== false);
  const yontem = await maliyetYontemi(companyId);
  await assertPeriodOpen(companyId, tarih);
  const fis = await prisma.$transaction((tx) => yazKesinFis(tx, {
    companyId,
    tarih,
    aciklama: `${doviz} dönem sonu kur değerlemesi`,
    satirlar,
    kullaniciId: req.user?.userId ?? null,
    ip: req.ip || null,
    maliyetYontemi: yontem,
  }));
  res.status(201).json({ fis_no: fis.fisNo, kur: kayit.kur.toString(), resmi_kur: false });
}));

finansRouter.post("/maliyet/recete", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const kod = String(req.body?.kod || "").trim();
  const ad = String(req.body?.ad || "").trim();
  const satirlar = Array.isArray(req.body?.satirlar) ? req.body.satirlar : [];
  if (!kod || !ad || satirlar.length === 0) throw new PublicError("Reçete kodu, adı ve en az bir satır zorunludur.", 400);
  const temiz = satirlar.map((satir: { stok_kodu?: unknown; net?: unknown; fire_yuzde?: unknown }) => {
    const stokKodu = String(satir.stok_kodu || "").trim();
    sarfMiktari(String(satir.net || "0"), String(satir.fire_yuzde || "0"));
    if (!stokKodu) throw new PublicError("Reçete satırında stok kodu zorunludur.", 400);
    return { stok_kodu: stokKodu, net: String(satir.net), fire_yuzde: String(satir.fire_yuzde || "0") };
  });
  const row = await prisma.uretimRecete.upsert({
    where: { companyId_kod: { companyId, kod } },
    create: { companyId, kod, ad, satirlar: temiz },
    update: { ad, satirlar: temiz },
  });
  res.status(201).json({ id: row.id, kod: row.kod });
}));

finansRouter.post("/maliyet/sarf", authorize(["ADMIN", "MUHASEBE_UZMANI"]), asyncRoute(async (req, res) => {
  const companyId = companyIdOf(req);
  const tarih = gun(String(req.body?.tarih || ""));
  const partiHam = String(req.body?.parti || "1");
  const parti = new Decimal(partiHam);
  if (!Number.isFinite(Number(partiHam)) || parti.lessThanOrEqualTo(0)) throw new PublicError("Parti miktarı pozitif olmalıdır.", 400);
  const recete = await prisma.uretimRecete.findFirst({ where: { companyId, kod: String(req.body?.recete_kodu || "") } });
  if (!recete) throw new PublicError("Reçete bulunamadı.", 404);
  const yontem = await maliyetYontemi(companyId);
  const satirlar = recete.satirlar as Array<{ stok_kodu: string; net: string; fire_yuzde: string }>;
  await assertPeriodOpen(companyId, tarih);
  const sonuc = await prisma.$transaction(async (tx) => {
    let toplam = money(0);
    for (const satir of satirlar) {
      const stok = await tx.stokKart.findFirst({ where: { companyId, stokKodu: satir.stok_kodu } });
      if (!stok) throw new PublicError(`${satir.stok_kodu} stok kartı yok.`, 404);
      const net = parti.mul(satir.net).toFixed(4);
      const miktar = sarfMiktari(net, satir.fire_yuzde);
      const elde = new Decimal(stok.mevcutMiktar.toString());
      if (elde.lessThan(miktar)) {
        throw new PublicError(`${satir.stok_kodu} stoğu sarf için yetmiyor.`, 422);
      }
      const tutar = sarfTutari(miktar, stok.ortalamaMaliyet.toString());
      toplam = toplam.plus(tutar);
      const kalan = elde.minus(miktar).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
      await tx.stokKart.updateMany({
        where: { id: stok.id, companyId },
        data: { mevcutMiktar: kalan.toFixed(4) },
      });
      await tx.stokHareket.create({
        data: {
          companyId,
          stokId: stok.id,
          tarih,
          cikis: miktar,
          birimMaliyet: stok.ortalamaMaliyet,
          kalanMiktar: kalan.toFixed(4),
          aciklama: `${recete.kod} reçete sarfı`,
          belgeNo: recete.kod,
        },
      });
    }
    const fisTaslak = hammaddeFisi(yontem, toplam.toFixed(2));
    const fis = await yazKesinFis(tx, {
      companyId,
      tarih,
      aciklama: `${recete.kod} hammadde sarfı. ${fisTaslak.uyari}`,
      satirlar: fisTaslak.satirlar,
      kullaniciId: req.user?.userId ?? null,
      ip: req.ip || null,
      maliyetYontemi: yontem,
    });
    return { fisNo: fis.fisNo, tutar: toplam.toFixed(2), uyari: fisTaslak.uyari };
  });
  res.status(201).json({ fis_no: sonuc.fisNo, tutar: sonuc.tutar, uyari: sonuc.uyari, yansitma_798: false });
}));
