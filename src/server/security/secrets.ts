/**
 * Sunucu sırları yalnızca ortam değişkeninden okunur.
 * Eksik veya kısa anahtarda süreç açılmaz; koda gömülü yedek yoktur.
 */

const MIN_SECRET = 32;

export function readSecret(name: string): string {
  const value = process.env[name]?.trim() || "";
  if (value.length < MIN_SECRET) {
    throw new Error(`${name} tanımlı değil veya ${MIN_SECRET} karakterden kısa.`);
  }
  return value;
}

export function getJwtSecret(): string {
  return readSecret("JWT_SECRET");
}

export function getJwtRefreshSecret(): string {
  return readSecret("JWT_REFRESH_SECRET");
}

export function assertRuntimeSecrets(): void {
  if (process.env.AUTH_SKIP_DB === "1") {
    throw new Error("AUTH_SKIP_DB üretim veya geliştirme sunucusunda kullanılamaz.");
  }
  readSecret("JWT_SECRET");
  readSecret("JWT_REFRESH_SECRET");
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL tanımlı değil.");
  }
}

export function expiryToSeconds(expr: string | undefined, fallbackSeconds: number): number {
  const raw = (expr || "").trim();
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = match[2];
  const factor = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return amount * factor;
}
