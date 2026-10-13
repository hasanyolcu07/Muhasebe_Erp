import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/appStore";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  (typeof window === "undefined" ? "http://127.0.0.1:3000" : "");

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: Record<string, unknown>;
  company: Record<string, unknown> | null;
  companies: Array<Record<string, unknown>>;
  permissions?: Record<string, string[]>;
  role_code?: string;
};

function sanitizeErrorMessage(msg: string): string {
  if (
    /bearer\s+[a-z0-9._-]+/i.test(msg) ||
    /password/i.test(msg) ||
    /secret/i.test(msg) ||
    /traceback/i.test(msg) ||
    /\b(select|insert|update|delete|drop|alter)\b/i.test(msg) ||
    /[a-zA-Z]:\\[a-zA-Z0-9_\\]+/i.test(msg) ||
    /\/app\/[a-zA-Z0-9_/.]+/i.test(msg)
  ) {
    return "Sunucu tarafında bir işlem hatası oluştu. Lütfen sistem yöneticinize başvurun.";
  }
  return msg;
}

function turkishError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ detail?: string | string[]; message?: string }>;
    const detail = ax.response?.data?.detail ?? ax.response?.data?.message;
    if (Array.isArray(detail)) return sanitizeErrorMessage(detail.join(", "));
    if (typeof detail === "string" && detail.trim()) return sanitizeErrorMessage(detail.trim());
    if (ax.code === "ERR_NETWORK") return "Sunucuya bağlanılamadı. API çevrimdışı veya ağ bağlantısı yok.";
    if (ax.response?.status === 401) return "Oturum süresi doldu veya yetkisiz erişim. Lütfen tekrar giriş yapın.";
    if (ax.response?.status === 403) return "Bu işlem için yetkiniz bulunmamaktadır.";
    if (ax.response?.status === 404) return "İstenen kaynak bulunamadı.";
    if (ax.response?.status && ax.response.status >= 500) return "Sunucu iç hatası oluştu. Lütfen daha sonra tekrar deneyin.";
    return sanitizeErrorMessage(ax.message || "İstek başarısız");
  }
  if (err instanceof Error) return sanitizeErrorMessage(err.message);
  return "Beklenmeyen bir hata oluştu";
}

export const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
  withCredentials: true,
});

/**
 * Axios Request Interceptor:
 * Her HTTP isteğinde Zustand store'daki geçerli JWT access token'ı
 * otomatik olarak Authorization: Bearer <token> başlığına ekler.
 */
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) {
    clear();
    return null;
  }
  try {
    const res = await axios.post<TokenBundle>(
      `${API_BASE}/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: 15000, withCredentials: true }
    );
    if (!res.data?.access_token) {
      clear();
      return null;
    }
    setSession({
      access_token: res.data.access_token,
      refresh_token: res.data.refresh_token || refreshToken,
      user: res.data.user,
      company: res.data.company,
      companies: res.data.companies,
      permissions: res.data.permissions || {},
      role_code: res.data.role_code || "",
    });
    return res.data.access_token;
  } catch {
    clear();
    return null;
  }
}

/**
 * Axios Response Interceptor:
 * 401 Unauthorized hatası aldığında refresh token ile yenilemeyi dener;
 * yenileme başarısızsa veya auth rotasındaysa oturumu temizler ve /login sayfasına yönlendirir.
 */
http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/logout");

    if (error.response?.status === 401) {
      // Auth endpoint'leri veya zaten yinelenmiş isteklerde sonsuz döngüyü engelle ve login'e yönlendir
      if (isAuthEndpoint || original?._retry) {
        useAuthStore.getState().clear();
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return http.request(original);
      } else {
        useAuthStore.getState().clear();
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export async function api<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const method = (options.method || "GET").toLowerCase();
  try {
    const token = options.token ?? useAuthStore.getState().accessToken;
    const reqHeaders: Record<string, string> = { ...(options.headers || {}) };
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }
    // Finansal ve operasyonel mutasyonlarda mükerrer kayıt oluşmasını engellemek için Idempotency-Key başlığı
    if (["post", "put", "patch", "delete"].includes(method) && !reqHeaders["Idempotency-Key"]) {
      reqHeaders["Idempotency-Key"] = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    const res = await http.request<T>({
      url: path,
      method,
      data: options.body,
      headers: Object.keys(reqHeaders).length > 0 ? reqHeaders : undefined,
    });

    // Eğer backend rotası tanımlı değilse ve Express/Vite SPA fallback olarak HTML sayfası döndüyse:
    if (
      typeof res.data === "string" &&
      (res.data.trim().startsWith("<!doctype") || res.data.includes("<html"))
    ) {
      throw new Error("Bu işlem sunucuda tanımlı değil. Veri tarayıcıya yazılmadı.");
    }

    return res.data;
  } catch (err: any) {
    const isNetworkOr404 =
      (axios.isAxiosError(err) &&
        (err.code === "ERR_NETWORK" ||
          err.code === "ERR_INVALID_URL" ||
          !err.response ||
          err.response?.status === 404)) ||
      err?.code === "ERR_INVALID_URL" ||
      err?.message?.includes("Invalid URL");

    if (isNetworkOr404) {
      throw new Error(
        path.startsWith("/auth/")
          ? turkishError(err)
          : "Sunucu bu işlemi kaydetmedi. Bağlantı yok veya uç tanımlı değil. Veri tarayıcıya yazılmadı."
      );
    }
    throw new Error(turkishError(err));
  }
}

export const authApi = {
  login: (username: string, password: string, company_id?: number) =>
    api<TokenBundle>("/auth/login", {
      method: "POST",
      body: { username, password, company_id },
    }),
  loginOtp: (challenge: string, otp: string) =>
    api<TokenBundle>("/auth/login/otp", {
      method: "POST",
      body: { challenge, otp },
    }),
  me: (token?: string) =>
    api<{
      permissions: Record<string, string[]>;
      role_code: string;
      user: Record<string, unknown>;
      company: Record<string, unknown> | null;
      companies: Array<Record<string, unknown>>;
      membership: {
        default_branch_code?: string | null;
        allowed_branch_codes?: string[] | null;
        amount_limit?: number | null;
      };
    }>("/auth/me", { token }),
  logout: (token?: string) =>
    api("/auth/logout", {
      method: "POST",
      token,
      body: { refresh_token: useAuthStore.getState().refreshToken },
    }),
  switchCompany: (token: string, company_id: number) =>
    api<TokenBundle>("/auth/switch-company", {
      method: "POST",
      token,
      body: { company_id },
    }),
  refresh: (refresh_token: string) =>
    api<TokenBundle>("/auth/refresh", {
      method: "POST",
      body: { refresh_token },
    }),
  checkPermission: (module: string, action: string, token?: string) =>
    api<{ allowed: boolean; module: string; action: string }>(
      `/auth/check-permission?module=${encodeURIComponent(module)}&action=${encodeURIComponent(action)}`,
      { token }
    ),
  roles: (token?: string) => api<{ items: Array<Record<string, unknown>> }>("/auth/roles", { token }),
  permissionMatrix: (token?: string) =>
    api<Record<string, unknown>>("/auth/permission-matrix", { token }),
};

export type PgSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
};

export type CompanySetupPayload = {
  code?: string;
  name: string;
  trade_name?: string;
  tax_number?: string;
  tax_office?: string;
  db_name: string;
  admin_username: string;
  admin_email: string;
  admin_password: string;
  admin_full_name?: string;
  admin_first_name?: string;
  admin_last_name?: string;
};

export const setupApi = {
  status: () => api("/setup/status"),
  testPg: (body: PgSettings) =>
    api<{ ok: boolean; message: string; version?: string }>("/setup/test-pg", {
      method: "POST",
      body: { database: "postgres", ...body },
    }),
  directory: (install_dir: string) =>
    api<{ ok: boolean; message: string; install_dir: string }>("/setup/directory", {
      method: "POST",
      body: { install_dir },
    }),
  ensureTemplate: (body: PgSettings) =>
    api("/setup/ensure-template", {
      method: "POST",
      body: { database: "postgres", ...body },
    }),
  run: (body: {
    accept_license: boolean;
    install_dir: string;
    pg: PgSettings;
    company: CompanySetupPayload;
  }) => api<Record<string, unknown>>("/setup/run", { method: "POST", body }),
};

export const tenantApi = {
  companies: (token?: string) => api("/companies", { token }),
  context: (token?: string) => api("/tenant/context", { token }),
};
