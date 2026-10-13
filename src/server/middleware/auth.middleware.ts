/**
 * Kimlik Doğrulama ve Yetkilendirme Middleware Katmanı
 * JWT (JSON Web Token) ve Rol Tabanlı Erişim Kontrolü (RBAC)
 * Türkiye Muhasebe Standartları & Siber Güvenlik Standartlarına Uygun
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { getJwtSecret } from "../security/secrets";

export interface AuthUserPayload {
  userId: number;
  id: number;
  email: string;
  username: string;
  role: "ADMIN" | "MUHASEBE_UZMANI" | "DEPO_SORUMLUSU" | string;
  fullName?: string;
  vkn?: string | null;
  companyId?: number;
  tokenVersion?: number;
}

// Express Request nesnesine user özelliğini genişlet
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * 1. authenticate Middleware:
 * İstek başlığındaki (Authorization: Bearer <token>) JWT token'ı doğrular.
 * Geçersiz, süresi dolmuş veya eksik belirteçlerde 401 Unauthorized döner.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Yetkisiz Erişim",
      message: "Yetkilendirme belirteci (Authorization: Bearer <token>) bulunamadı veya geçersiz format.",
    });
    return;
  }

  const token = authHeader.split(" ")[1]?.trim();

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Yetkisiz Erişim",
      message: "Erişim belirteci boş olamaz.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as unknown as AuthUserPayload;
    const userId = decoded.userId || decoded.id;

    if (process.env.NODE_ENV === "test" && process.env.AUTH_SKIP_DB === "1") {
      req.user = { ...decoded, id: userId, userId };
      next();
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser || !dbUser.isActive || dbUser.tokenVersion !== (decoded.tokenVersion ?? -1)) {
      res.status(401).json({
        success: false,
        error: "Geçersiz Belirteç",
        message: "Oturum doğrulanamadı. Lütfen yeniden giriş yapın.",
      });
      return;
    }

    req.user = {
      userId: dbUser.id,
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
      fullName: dbUser.fullName,
      vkn: dbUser.vkn,
      companyId: dbUser.companyId,
      tokenVersion: dbUser.tokenVersion,
    };

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        error: "Oturum Süresi Doldu",
        message: "Erişim belirtecinin süresi doldu. Lütfen oturumu yenileyin veya tekrar giriş yapın.",
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: "Geçersiz Belirteç",
      message: "Erişim belirteci doğrulanamadı veya sahte.",
    });
  }
}

/**
 * 2. authorize Middleware Factory:
 * Kullanıcının rolünü kontrol eder (Örn: authorize(["ADMIN", "MUHASEBE_UZMANI"])).
 * ADMIN her zaman tam yetkiye sahiptir. Yetkisiz rollerde 403 Forbidden döner.
 */
export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Yetkisiz Erişim",
        message: "Kimlik doğrulaması yapılmamış istek.",
      });
      return;
    }

    // ADMIN rolü veya izin verilen roller listesindeki eşleşme
    const isAllowed = user.role === "ADMIN" || allowedRoles.includes(user.role);

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        error: "Yetersiz Yetki",
        message: `Bu işlem için yetkiniz bulunmamaktadır. Gerekli yetkili roller: [${allowedRoles.join(", ")}].`,
      });
      return;
    }

    next();
  };
}
