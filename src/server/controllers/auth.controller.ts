/**
 * Kimlik doğrulama: bcrypt, süreli erişim jetonu, sunucuda tutulan yenileme jetonu,
 * hesap kilidi ve isteğe bağlı TOTP.
 */

import crypto from "node:crypto";
import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { getJwtRefreshSecret, getJwtSecret, expiryToSeconds } from "../security/secrets";
import { assertStrongPassword } from "../security/password";
import { PublicError, toPublicMessage } from "../security/publicError";
import { clientIp } from "../security/clientIp";
import { generateTotpSecret, totpAuthUrl, verifyTotp } from "../security/totp";

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;

const DUMMY_HASH = bcrypt.hashSync("timing-placeholder-not-a-user", 10);

export const LoginInputSchema = z
  .object({
    identifier: z.string().trim().optional(),
    username: z.string().trim().optional(),
    email: z.string().trim().optional(),
    vkn: z.string().trim().optional(),
    password: z.string().min(1, "Şifre alanı zorunludur."),
    otp: z.string().trim().optional(),
    company_id: z.number().int().optional(),
  })
  .refine((data) => Boolean(data.identifier || data.username || data.email || data.vkn), {
    message: "Kullanıcı adı, e-posta veya Vergi Kimlik Numarası (VKN) zorunludur.",
    path: ["identifier"],
  });

export const RefreshTokenInputSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token zorunludur."),
});

const PasswordChangeSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(1),
});

export function getPermissionsForRole(role: string): Record<string, string[]> {
  switch (role) {
    case "ADMIN":
      return {
        "*": ["*"],
        dashboard: ["*"],
        cari: ["*"],
        fatura: ["*"],
        irsaliye: ["*"],
        siparis: ["*"],
        stok: ["*"],
        uretim: ["*"],
        finans: ["*"],
        yevmiye: ["*"],
        resmi_muhasebe: ["*"],
        raporlar: ["*"],
        ayarlar: ["*"],
        e_belge: ["*"],
        personel: ["*"],
        kobi: ["*"],
        beyanname: ["*"],
      };
    case "MUHASEBE_UZMANI":
      return {
        dashboard: ["view"],
        cari: ["view", "create", "edit"],
        fatura: ["view", "create", "edit", "approve"],
        finans: ["view", "create", "edit"],
        yevmiye: ["view", "create", "edit"],
        resmi_muhasebe: ["view", "create", "edit"],
        raporlar: ["view", "export"],
        beyanname: ["view", "create"],
        e_belge: ["view"],
        personel: ["view", "create", "edit"],
        kobi: ["view", "create", "edit"],
        stok: ["view"],
      };
    case "DEPO_SORUMLUSU":
      return {
        dashboard: ["view"],
        stok: ["view", "create", "edit", "transfer"],
        irsaliye: ["view", "create"],
        uretim: ["view", "bom", "workorder"],
      };
    default:
      return {};
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function accessSeconds(): number {
  return expiryToSeconds(ACCESS_TOKEN_EXPIRY, 900);
}

async function writeAudit(data: Prisma.AuditLogUncheckedCreateInput): Promise<void> {
  try {
    const prev = await prisma.auditLog.findFirst({
      orderBy: { tarih: "desc" },
      select: { kayitHash: true },
    });
    const oncekiHash = prev?.kayitHash || "";
    const kayitHash = crypto
      .createHash("sha256")
      .update(oncekiHash + JSON.stringify(data.yeniVeri ?? data.eskiVeri ?? ""))
      .digest("hex");
    await prisma.auditLog.create({
      data: { ...data, oncekiHash: oncekiHash || null, kayitHash },
    });
  } catch (error) {
    console.error("[Audit] kayıt yazılamadı:", error);
  }
}

async function issueTokens(user: {
  id: number;
  email: string;
  username: string;
  role: string;
  fullName: string;
  vkn: string | null;
  companyId: number;
  tokenVersion: number;
  amountLimit: Prisma.Decimal | null;
}, req: Request) {
  const secret = getJwtSecret();
  const refreshSecret = getJwtRefreshSecret();
  const tokenPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    vkn: user.vkn,
    companyId: user.companyId,
    tokenVersion: user.tokenVersion,
  };
  const accessToken = jwt.sign(tokenPayload, secret, { expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] });
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const refreshJwt = jwt.sign({ userId: user.id, jti: hashToken(refreshToken) }, refreshSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  });
  const seconds = expiryToSeconds(REFRESH_TOKEN_EXPIRY, 7 * 86400);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + seconds * 1000),
      ipAdresi: clientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 240),
    },
  });
  const company = await prisma.company.findUnique({ where: { id: user.companyId } });
  const branches = await prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true } });
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    refresh_jwt: refreshJwt,
    token_type: "Bearer",
    expires_in: accessSeconds(),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
      is_superadmin: user.role === "ADMIN",
      vkn: user.vkn,
    },
    company: company ? { id: company.id, name: company.name, code: company.code } : null,
    companies: company ? [{ id: company.id, name: company.name, code: company.code }] : [],
    permissions: getPermissionsForRole(user.role),
    role_code: user.role,
    membership: {
      default_branch_code: branches[0]?.code || "MERKEZ",
      allowed_branch_codes: branches.map((b) => b.code),
      amount_limit: user.amountLimit == null ? null : Number(user.amountLimit),
    },
  };
}

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = LoginInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: "Girdi doğrulama hatası",
          details: parseResult.error.format(),
        });
        return;
      }

      const { identifier, username, email, vkn, password, otp } = parseResult.data;
      if (process.env.NODE_ENV === "test" && process.env.AUTH_SKIP_DB === "1") {
        res.status(401).json({
          success: false,
          error: "Yetkisiz Erişim",
          message: "Geçersiz kimlik bilgisi veya şifre.",
        });
        return;
      }
      const cleanTarget = (identifier || username || email || vkn || "").trim();
      const ipAdresi = clientIp(req);

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanTarget.toLowerCase() },
            { username: cleanTarget },
            ...(cleanTarget.length === 10 || cleanTarget.length === 11 ? [{ vkn: cleanTarget }] : []),
          ],
        },
      });

      if (!user || !user.isActive) {
        await bcrypt.compare(password, DUMMY_HASH);
        res.status(401).json({
          success: false,
          error: "Yetkisiz Erişim",
          message: "Geçersiz kimlik bilgisi veya şifre.",
        });
        return;
      }

      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        res.status(423).json({
          success: false,
          error: "Hesap kilitli",
          message: "Çok sayıda hatalı deneme. Hesap geçici olarak kilitlendi.",
        });
        return;
      }

      const passwordOk = await bcrypt.compare(password, user.passwordHash);
      if (!passwordOk) {
        const failed = user.failedLoginCount + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: failed,
            lockedUntil: failed >= LOCK_THRESHOLD ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
          },
        });
        res.status(401).json({
          success: false,
          error: "Yetkisiz Erişim",
          message: "Geçersiz kimlik bilgisi veya şifre.",
        });
        return;
      }

      if (user.totpEnabled) {
        if (!otp) {
          const challenge = jwt.sign({ purpose: "otp", userId: user.id }, getJwtSecret(), { expiresIn: "5m" });
          res.status(200).json({ success: false, otp_required: true, challenge });
          return;
        }
        if (!user.totpSecret || !verifyTotp(user.totpSecret, otp)) {
          res.status(401).json({ success: false, error: "Yetkisiz Erişim", message: "Doğrulama kodu geçersiz." });
          return;
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });

      const bundle = await issueTokens(user, req);
      await writeAudit({
        tabloAdi: "users",
        islemTipi: "INSERT",
        kullaniciId: user.id,
        eskiVeri: Prisma.JsonNull,
        yeniVeri: { event: "LOGIN_SUCCESS", username: user.username, ip: ipAdresi },
        ipAdresi,
      });

      res.status(200).json({ success: true, ...bundle });
    } catch (error) {
      const pub = toPublicMessage(error, "Giriş işlemi sırasında sunucu hatası oluştu.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async loginOtp(req: Request, res: Response): Promise<void> {
    try {
      const challenge = String(req.body?.challenge || "");
      const otp = String(req.body?.otp || "");
      const decoded = jwt.verify(challenge, getJwtSecret()) as { purpose?: string; userId?: number };
      if (decoded.purpose !== "otp" || !decoded.userId) {
        throw new PublicError("Doğrulama oturumu geçersiz.", 401);
      }
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.isActive || !user.totpEnabled || !user.totpSecret || !verifyTotp(user.totpSecret, otp)) {
        throw new PublicError("Doğrulama kodu geçersiz.", 401);
      }
      const bundle = await issueTokens(user, req);
      res.status(200).json({ success: true, ...bundle });
    } catch (error) {
      const pub = toPublicMessage(error, "İkinci adım doğrulanamadı.");
      res.status(pub.status === 500 ? 401 : pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async me(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.user;
      if (!payload) {
        res.status(401).json({ success: false, error: "Yetkisiz Erişim", message: "Oturum bilgisi bulunamadı." });
        return;
      }
      const dbUser = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!dbUser || !dbUser.isActive) {
        res.status(401).json({ success: false, error: "Yetkisiz Erişim", message: "Oturum bilgisi bulunamadı." });
        return;
      }
      const company = await prisma.company.findUnique({ where: { id: dbUser.companyId } });
      const branches = await prisma.branch.findMany({ where: { companyId: dbUser.companyId, isActive: true } });
      res.status(200).json({
        success: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          full_name: dbUser.fullName,
          role: dbUser.role,
          is_superadmin: dbUser.role === "ADMIN",
          vkn: dbUser.vkn,
          totp_enabled: dbUser.totpEnabled,
        },
        company: company ? { id: company.id, name: company.name, code: company.code } : null,
        companies: company ? [{ id: company.id, name: company.name, code: company.code }] : [],
        permissions: getPermissionsForRole(dbUser.role),
        role_code: dbUser.role,
        membership: {
          default_branch_code: branches[0]?.code || "MERKEZ",
          allowed_branch_codes: branches.map((b) => b.code),
          amount_limit: dbUser.amountLimit == null ? null : Number(dbUser.amountLimit),
        },
      });
    } catch (error) {
      const pub = toPublicMessage(error, "Profil bilgisi alınırken sunucu hatası oluştu.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = RefreshTokenInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ success: false, error: "Geçersiz refresh token parametresi." });
        return;
      }
      const presented = parseResult.data.refresh_token;
      const row = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(presented) },
        include: { user: true },
      });
      if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now() || !row.user.isActive) {
        res.status(401).json({ success: false, error: "Geçersiz veya süresi dolmuş refresh token." });
        return;
      }
      await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
      const bundle = await issueTokens(row.user, req);
      res.status(200).json({
        success: true,
        access_token: bundle.access_token,
        refresh_token: bundle.refresh_token,
        token_type: "Bearer",
        expires_in: bundle.expires_in,
        role_code: bundle.role_code,
        permissions: bundle.permissions,
        user: bundle.user,
        company: bundle.company,
        companies: bundle.companies,
      });
    } catch (error) {
      const pub = toPublicMessage(error, "Token yenileme sırasında sunucu hatası oluştu.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const presented = typeof req.body?.refresh_token === "string" ? req.body.refresh_token : "";
      if (presented) {
        await prisma.refreshToken.updateMany({
          where: { tokenHash: hashToken(presented), revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } else if (user) {
        await prisma.refreshToken.updateMany({
          where: { userId: user.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      if (user) {
        await writeAudit({
          tabloAdi: "users",
          islemTipi: "INSERT",
          kullaniciId: user.userId,
          eskiVeri: Prisma.JsonNull,
          yeniVeri: { event: "LOGOUT" },
          ipAdresi: clientIp(req),
        });
      }
      res.status(200).json({ success: true, message: "Oturum başarıyla sonlandırıldı." });
    } catch (error) {
      const pub = toPublicMessage(error, "Çıkış işlemi sırasında bir hata oluştu.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async sessions(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
      return;
    }
    const rows = await prisma.refreshToken.findMany({
      where: { userId: user.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, expiresAt: true, ipAdresi: true, userAgent: true },
    });
    res.json({ success: true, items: rows });
  }

  public static async revokeSession(req: Request, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
      return;
    }
    await prisma.refreshToken.updateMany({
      where: { id: String(req.params.id), userId: user.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ success: true });
  }

  public static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new PublicError("Oturum bilgisi bulunamadı.", 401);
      const parsed = PasswordChangeSchema.safeParse(req.body);
      if (!parsed.success) throw new PublicError("Mevcut şifre ve yeni şifre zorunludur.", 400);
      assertStrongPassword(parsed.data.new_password);
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (!dbUser) throw new PublicError("Kullanıcı bulunamadı.", 401);
      const ok = await bcrypt.compare(parsed.data.current_password, dbUser.passwordHash);
      if (!ok) throw new PublicError("Mevcut şifre hatalı.", 400);
      const passwordHash = await bcrypt.hash(parsed.data.new_password, 12);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: dbUser.id },
          data: {
            passwordHash,
            passwordChangedAt: new Date(),
            tokenVersion: { increment: 1 },
            failedLoginCount: 0,
            lockedUntil: null,
          },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: dbUser.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      res.json({ success: true, message: "Şifre güncellendi. Lütfen yeniden giriş yapın." });
    } catch (error) {
      const pub = toPublicMessage(error, "Şifre güncellenemedi.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async setupTotp(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new PublicError("Oturum bilgisi bulunamadı.", 401);
      const secret = generateTotpSecret();
      await prisma.user.update({ where: { id: user.userId }, data: { totpPendingSecret: secret } });
      res.json({
        success: true,
        secret,
        otpauth_url: totpAuthUrl(user.email || user.username, secret),
      });
    } catch (error) {
      const pub = toPublicMessage(error, "İki adımlı doğrulama başlatılamadı.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async enableTotp(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new PublicError("Oturum bilgisi bulunamadı.", 401);
      const otp = String(req.body?.otp || "");
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (!dbUser?.totpPendingSecret || !verifyTotp(dbUser.totpPendingSecret, otp)) {
        throw new PublicError("Doğrulama kodu geçersiz.", 400);
      }
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { totpSecret: dbUser.totpPendingSecret, totpPendingSecret: null, totpEnabled: true },
      });
      res.json({ success: true, message: "İki adımlı doğrulama açıldı." });
    } catch (error) {
      const pub = toPublicMessage(error, "İki adımlı doğrulama açılamadı.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }

  public static async disableTotp(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new PublicError("Oturum bilgisi bulunamadı.", 401);
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (!dbUser) throw new PublicError("Kullanıcı bulunamadı.", 401);
      const passwordOk = await bcrypt.compare(String(req.body?.current_password || ""), dbUser.passwordHash);
      const otpOk = dbUser.totpSecret ? verifyTotp(dbUser.totpSecret, String(req.body?.otp || "")) : false;
      if (!passwordOk || !otpOk) throw new PublicError("Şifre ve doğrulama kodu gerekli.", 400);
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { totpEnabled: false, totpSecret: null, totpPendingSecret: null },
      });
      res.json({ success: true, message: "İki adımlı doğrulama kapatıldı." });
    } catch (error) {
      const pub = toPublicMessage(error, "İki adımlı doğrulama kapatılamadı.");
      res.status(pub.status).json({ success: false, error: pub.message });
    }
  }
}
