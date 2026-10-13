/**
 * Express.js Full-Stack Sunucu Giriş Noktası
 * PostgreSQL & Prisma ORM Backend + Vite SPA Frontend Middleware
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./src/server/routes/auth.routes";
import yevmiyeRoutes from "./src/server/routes/yevmiye.routes";
import erpRoutes from "./src/server/routes/erp.routes";
import { startBackupScheduler } from "./src/server/routes/uyarlama.routes";
import { assertRuntimeSecrets } from "./src/server/security/secrets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  assertRuntimeSecrets();
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "127.0.0.1";

  if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  const origins = (process.env.CORS_ORIGIN || "http://127.0.0.1:3000,http://localhost:3000")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: origins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Çok fazla giriş denemesi. 15 dakika sonra yeniden deneyin." },
  });
  app.use("/auth/login", loginLimit);
  app.use("/api/auth/login", loginLimit);
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get("/api/health", async (_req, res) => {
    try {
      const { prisma } = await import("./src/server/prisma");
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "OK", database: "up", timestamp: new Date().toISOString(), service: "TabiaERP" });
    } catch {
      res.status(503).json({ status: "DEGRADED", database: "down", timestamp: new Date().toISOString() });
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/auth", authRoutes);
  app.use("/api/yevmiye", yevmiyeRoutes);
  app.use("/api", erpRoutes);
  app.use(erpRoutes);

  // Geliştirme (DEV) veya Üretim (PROD) Vite Entegrasyonu
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Üretim ortamında dist/ klasöründen statik dosya sunumu
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Sunucu] TabiaERP http://${HOST}:${PORT} adresinde çalışıyor.`);
    startBackupScheduler();
  });
}

// Yalnızca doğrudan çalıştırıldığında sunucuyu başlat
if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("[Sunucu Başlatma Hatası]:", err);
  });
}

export { startServer };
