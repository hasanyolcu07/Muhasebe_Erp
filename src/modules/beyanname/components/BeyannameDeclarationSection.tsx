import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  beyannameApi,
  type BeyannamePeriod,
  type BeyannamePreview,
  type DeclarationType,
} from "../api/beyannameApi";
import { SECTION_MENU_ITEMS, type HubTabId } from "../config/beyannameMenus";
import { AccountSelectField, type AccountSelectValue } from "./AccountSelectField";
import { BeyannameLayout } from "./BeyannameLayout";
import {
  PeriodsTable,
  StatusBadge,
  SummaryTotals,
} from "./BeyannamePeriodsPanel";

const MONTHS = [
  { v: 1, l: "Ocak" },
  { v: 2, l: "Şubat" },
  { v: 3, l: "Mart" },
  { v: 4, l: "Nisan" },
  { v: 5, l: "Mayıs" },
  { v: 6, l: "Haziran" },
  { v: 7, l: "Temmuz" },
  { v: 8, l: "Ağustos" },
  { v: 9, l: "Eylül" },
  { v: 10, l: "Ekim" },
  { v: 11, l: "Kasım" },
  { v: 12, l: "Aralık" },
];

const QUARTERS = [
  { v: 1, l: "1. Çeyrek (Ocak–Mart)" },
  { v: 2, l: "2. Çeyrek (Nisan–Haziran)" },
  { v: 3, l: "3. Çeyrek (Temmuz–Eylül)" },
  { v: 4, l: "4. Çeyrek (Ekim–Aralık)" },
];

export type PeriodKind = "month" | "quarter" | "year";

export type DeclarationSectionConfig = {
  declarationType: DeclarationType;
  title: string;
  description: string;
  periodKind: PeriodKind;
  menuKey: HubTabId;
};

export function BeyannameDeclarationSection({ config }: { config: DeclarationSectionConfig }) {
  const now = new Date();
  const [submenu, setSubmenu] = useState("prepare");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BeyannamePeriod[]>([]);
  const [preview, setPreview] = useState<BeyannamePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountLink, setAccountLink] = useState<AccountSelectValue>({ mode: "account" });

  const menuItems = SECTION_MENU_ITEMS[config.menuKey] ?? SECTION_MENU_ITEMS.kdv1;
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => now.getFullYear() - i), [now]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await beyannameApi.list({
        type: config.declarationType,
        page: 1,
        page_size: 100,
      });
      setItems(res?.items || (Array.isArray(res) ? (res as BeyannamePeriod[]) : []));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Dönem listesi alınamadı");
    } finally {
      setLoading(false);
    }
  }, [config.declarationType]);

  const loadPreview = useCallback(async () => {
    try {
      const params: {
        type: DeclarationType;
        year: number;
        month?: number;
        quarter?: number;
      } = { type: config.declarationType, year };
      if (config.periodKind === "month") params.month = month;
      if (config.periodKind === "quarter") params.quarter = quarter;
      const res = await beyannameApi.preview(params);
      setPreview(res);
    } catch {
      setPreview(null);
    }
  }, [config.declarationType, config.periodKind, year, month, quarter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    setSubmenu("prepare");
  }, [config.menuKey]);

  async function handlePrepare() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body: {
        declaration_type: DeclarationType;
        year: number;
        month?: number;
        quarter?: number;
        notes?: string;
      } = {
        declaration_type: config.declarationType,
        year,
        notes: notes || undefined,
      };
      if (config.periodKind === "month") body.month = month;
      if (config.periodKind === "quarter") body.quarter = quarter;
      const res = await beyannameApi.prepare(body);
      setMessage(res.message || `${config.title} paketi hazırlandı`);
      await loadList();
      await loadPreview();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hazırlama başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(okMsg);
      await loadList();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(false);
    }
  }

  const prepareCard = (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{config.title}</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
        {config.description}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Yıl
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {config.periodKind === "month" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            Ay
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.l}
                </option>
              ))}
            </select>
          </label>
        )}

        {config.periodKind === "quarter" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            Çeyrek
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
              {QUARTERS.map((q) => (
                <option key={q.v} value={q.v}>
                  {q.l}
                </option>
              ))}
            </select>
          </label>
        )}

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 12,
            flex: 1,
            minWidth: 180,
          }}
        >
          Not
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opsiyonel"
          />
        </label>

        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void handlePrepare()}
        >
          Dönemi Hazırla
        </button>
      </div>

      {preview && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border, #e5e7eb)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            Önizleme
            {preview.existing_period_status ? (
              <>
                {" "}
                · mevcut: <StatusBadge status={preview.existing_period_status} />
              </>
            ) : null}
          </div>
          <SummaryTotals totals={preview.totals} />
        </div>
      )}

      {message && (
        <div style={{ marginTop: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>
      )}
      {error && (
        <div style={{ marginTop: 10, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}
    </div>
  );

  let body: ReactNode = null;
  if (submenu === "prepare") {
    body = (
      <>
        {prepareCard}
        <PeriodsTable
          items={items}
          loading={loading}
          busy={busy}
          runAction={runAction}
          emptyHint="Henüz dönem yok — yukarıdan hazırlayın."
        />
      </>
    );
  } else if (submenu === "accounts") {
    body = (
      <div>
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Hesap Bağlantıları</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Beyanname hesap eşlemelerinde tek ekran seçim: Hesap, aralık, liste veya tutar.
          </p>
        </div>
        <AccountSelectField
          label="Hesap Seçimi"
          value={accountLink}
          onChange={setAccountLink}
        />
      </div>
    );
  } else if (submenu === "tables") {
    body = (
      <div>
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Tablolar</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Dönem özet tabloları — oluşturulan beyanname kayıtlarından izleyin.
          </p>
        </div>
        <PeriodsTable
          items={items}
          loading={loading}
          busy={busy}
          runAction={runAction}
          emptyHint="Tablo verisi için önce dönem hazırlayın."
        />
      </div>
    );
  } else if (submenu === "outputs") {
    body = (
      <div>
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Çıktılar</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            XML, PDF, mail ve GIB indirme işlemleri dönem durumuna göre burada.
          </p>
          {message && (
            <div style={{ marginTop: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>
          )}
          {error && (
            <div style={{ marginTop: 10, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
          )}
        </div>
        <PeriodsTable
          items={items}
          loading={loading}
          busy={busy}
          runAction={runAction}
          emptyHint="Çıktı için dönem kaydı yok."
        />
      </div>
    );
  } else {
    body = (
      <div>
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
            Oluşturulan Beyannameler
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{config.title}</p>
          {message && (
            <div style={{ marginTop: 10, color: "#065f46", fontSize: 13, fontWeight: 600 }}>{message}</div>
          )}
          {error && (
            <div style={{ marginTop: 10, color: "#991b1b", fontSize: 13, fontWeight: 600 }}>{error}</div>
          )}
        </div>
        <PeriodsTable
          items={items}
          loading={loading}
          busy={busy}
          runAction={runAction}
          emptyHint="Henüz oluşturulan beyanname yok."
        />
      </div>
    );
  }

  return (
    <BeyannameLayout
      items={menuItems}
      activeId={submenu}
      onChange={setSubmenu}
      title={config.title}
    >
      {body}
    </BeyannameLayout>
  );
}
