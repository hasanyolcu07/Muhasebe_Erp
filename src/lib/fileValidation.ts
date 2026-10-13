/**
 * Dosya Yükleme ve Dışa Aktarma Güvenlik Yardımcıları
 * FAZ 8: Test Otomasyonu ve Güvenlik Kontrolleri
 */

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateUploadFile(
  file: File | { name: string; size: number; type?: string } | null | undefined,
  allowedExtensions: string[] = [".xlsx", ".xls", ".csv", ".pdf", ".xml", ".jpg", ".jpeg", ".png"],
  maxSizeBytes: number = MAX_FILE_SIZE_BYTES
): FileValidationResult {
  if (!file) {
    return { valid: false, error: "Dosya seçilmedi." };
  }

  // 1. Boş dosya kontrolü
  if (file.size <= 0) {
    return { valid: false, error: "Boş dosya yüklenemez." };
  }

  // 2. Boyut limiti kontrolü
  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `Dosya boyutu sınırı aşıldı. Maksimum izin verilen boyut: ${maxMb} MB.` };
  }

  // 3. Uzantı belirleme
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();

  // 4. Tehlikeli yürütülebilir veya script uzantısı engeli
  const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".php", ".py", ".js", ".vbs", ".msi", ".dll"];
  if (dangerousExtensions.includes(ext)) {
    return { valid: false, error: "Güvenlik nedeniyle yürütülebilir dosyalar yüklenemez." };
  }

  // 5. İzin verilen uzantı kontrolü
  const normalizedAllowed = allowedExtensions.map((e) =>
    e.toLowerCase().startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`
  );
  if (!normalizedAllowed.includes(ext)) {
    return {
      valid: false,
      error: `Geçersiz dosya türü (${ext}). Yalnızca şu türler desteklenir: ${allowedExtensions.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Güvenli CSV Dışa Aktarma Yardımcısı (RFC 4180 ve UTF-8 BOM)
 */
export function formatCsvExport(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const esc = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
  const s = String(val).replace(/"/g, '""');
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe}"`;
  };

  const headerLine = headers.map(esc).join(";");
  const dataLines = rows.map((row) => row.map(esc).join(";"));
  // \uFEFF: Excel'de Türkçe karakterlerin (ğ, ü, ş, ı, ö, ç) doğru görünmesi için UTF-8 BOM
  return "\uFEFF" + [headerLine, ...dataLines].join("\n");
}

/**
 * API İstek Hız Sınırlayıcı (Client-Side & Middleware Rate Limiter)
 */
export class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 30,
    private windowMs: number = 60000 // 1 dakika
  ) {}

  public isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  public reset(key?: string) {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}
