import type { SystemUiSettings, UiTheme } from "../api/sistemAyarlariApi";

const THEME_VARS: Record<UiTheme, Partial<Record<string, string>>> = {
  light: {
    "--primary": "#2563eb",
    "--primary-hover": "#1d4ed8",
    "--bg-main": "#f1f5f9",
    "--card-bg": "#ffffff",
    "--border": "#e2e8f0",
    "--text-dark": "#1e293b",
    "--text-muted": "#64748b",
    "--topbar-bg": "#ffffff",
    "--input-bg": "#ffffff",
    "--table-header-bg": "#f8fafc",
    "--placeholder-bg": "#f8fafc",
  },
  dark: {
    "--primary": "#60a5fa",
    "--primary-hover": "#3b82f6",
    "--bg-main": "#0b1220",
    "--card-bg": "#1e293b",
    "--border": "#334155",
    "--text-dark": "#f1f5f9",
    "--text-muted": "#94a3b8",
    "--topbar-bg": "#0f172a",
    "--input-bg": "#0f172a",
    "--table-header-bg": "#0f172a",
    "--placeholder-bg": "#111827",
  },
  navy: {
    "--primary": "#1e3a8a",
    "--primary-hover": "#1e40af",
    "--bg-main": "#eef2ff",
    "--card-bg": "#ffffff",
    "--border": "#c7d2fe",
    "--text-dark": "#1e293b",
    "--text-muted": "#64748b",
    "--topbar-bg": "#ffffff",
    "--input-bg": "#ffffff",
    "--table-header-bg": "#eef2ff",
    "--placeholder-bg": "#f8fafc",
  },
  "night-blue": {
    "--primary": "#38bdf8",
    "--primary-hover": "#0ea5e9",
    "--bg-main": "#0c1929",
    "--card-bg": "#132337",
    "--border": "#1e3a5f",
    "--text-dark": "#e0f2fe",
    "--text-muted": "#7dd3fc",
    "--topbar-bg": "#0a1628",
    "--input-bg": "#0a1628",
    "--table-header-bg": "#0a1628",
    "--placeholder-bg": "#0c1929",
  },
  corporate: {
    "--primary": "#1d4ed8",
    "--primary-hover": "#1e40af",
    "--bg-main": "#f8fafc",
    "--card-bg": "#ffffff",
    "--border": "#cbd5e1",
    "--text-dark": "#0f172a",
    "--text-muted": "#475569",
    "--topbar-bg": "#ffffff",
    "--input-bg": "#ffffff",
    "--table-header-bg": "#f1f5f9",
    "--placeholder-bg": "#f8fafc",
  },
};

export function applyUiTheme(settings: Pick<SystemUiSettings, "theme" | "language">) {
  const root = document.documentElement;
  root.setAttribute("data-theme", settings.theme);
  root.setAttribute("lang", settings.language);
  const vars = THEME_VARS[settings.theme] || THEME_VARS.light;
  for (const [k, v] of Object.entries(vars)) {
    if (v) root.style.setProperty(k, v);
  }
  try {
    localStorage.setItem("tabia_ui_theme", settings.theme);
    localStorage.setItem("tabia_ui_lang", settings.language);
  } catch {
    /* ignore */
  }
}

export function applyBrandingColors(opts: {
  themeColor?: string | null;
  theme_color?: string | null;
  cardBorderLight?: string | null;
  card_border_light?: string | null;
  cardBorderDark?: string | null;
  card_border_dark?: string | null;
}) {
  const root = document.documentElement;
  const themeColor = opts.themeColor ?? opts.theme_color;
  if (themeColor) {
    root.style.setProperty("--primary", themeColor);
  }
  const isDark =
    root.getAttribute("data-theme") === "dark" ||
    root.getAttribute("data-theme") === "night-blue";
  const border = isDark
    ? (opts.cardBorderDark ?? opts.card_border_dark)
    : (opts.cardBorderLight ?? opts.card_border_light);
  if (border) root.style.setProperty("--border", border);
}
