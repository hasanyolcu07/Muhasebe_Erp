/**
 * Prisma Veritabanı İstemcisi Singleton
 * PostgreSQL Bağlantı Havuzu Yönetimi & Otomatik Denetim İzi (Audit Trail) Middleware
 */

import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { registerAuditMiddleware } from "./audit/prismaAuditMiddleware";

if (!process.env.DATABASE_URL) {
  const runningTest = process.argv.some((arg) => arg.includes("--test"));
  if (runningTest) {
    process.env.DATABASE_URL = "postgresql://invalid:invalid@127.0.0.1:5432/tabiaerp_test?schema=public";
  } else {
    throw new Error("DATABASE_URL tanımlı değil.");
  }
}

// Global singleton deseni (development ortamında birden fazla bağlantı oluşmasını engeller)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  isAuditRegistered?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Prisma audit middleware'ini singleton'a bir kez kaydet
if (!globalForPrisma.isAuditRegistered) {
  registerAuditMiddleware(prisma);
  globalForPrisma.isAuditRegistered = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
