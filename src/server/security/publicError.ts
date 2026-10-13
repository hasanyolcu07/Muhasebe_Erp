export class PublicError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PublicError";
    this.status = status;
  }
}

export function toPublicMessage(error: unknown, fallback: string): { status: number; message: string } {
  if (error instanceof PublicError) {
    return { status: error.status, message: error.message };
  }
  const code = (error as { code?: string } | null)?.code;
  if (code === "P2002") {
    return { status: 409, message: "Bu kayıt zaten mevcut." };
  }
  if (code === "P2025") {
    return { status: 404, message: "Kayıt bulunamadı." };
  }
  console.error(redactForLog(error));
  return { status: 500, message: fallback };
}

/** Hata günlüğüne TCKN, şifre, token ve bağlantı dizesi yazılmaz. */
export function redactForLog(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text
    .replace(/postgresql:\/\/\S+/gi, "postgresql://[gizli]")
    .replace(/bearer\s+\S+/gi, "bearer [gizli]")
    .replace(/(password|sifre|secret|token)\s*[:=]\s*\S+/gi, "$1=[gizli]")
    .replace(/\b[1-9]\d{10}\b/g, "[tckn]");
}
