import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  beyannameApi,
  type BeyannamePeriod,
  type BeyannamePreview,
} from "../../api/beyannameApi";
import { AccountSelectField, type AccountSelectValue } from "../../components/AccountSelectField";
import { BeyannameLayout } from "../../components/BeyannameLayout";
import {
  PeriodsTable,
  StatusBadge,
  SummaryTotals,
} from "../../components/BeyannamePeriodsPanel";
import { KDV1_MENU_ITEMS } from "../config/kdv1Menu";
import { KDV1_TABLE_DEFS } from "../config/kdv1Tables";
import { GibTablePanel } from "./GibTablePanel";

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

export function Kdv1Section() {
  const now = new Date();
  const [submenu, setSubmenu] = useState("prepare");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BeyannamePeriod[]>([]);
  const [preview, setPreview] = useState<BeyannamePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hesaplananKdv, setHesaplananKdv] = useState<AccountSelectValue>({ mode: "account" });
  const [indirilecekKdv, setIndirilecekKdv] = useState<AccountSelectValue>({ mode: "account" });
  const [devredenKdv, setDevredenKdv] = useState<AccountSelectValue>({ mode: "account" });

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => now.getFullYear() - i), [now]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await beyannameApi.list({ type: "KDV1", page: 1, page_size: 100 });
      setItems(res?.items || (Array.isArray(res) ? (res as BeyannamePeriod[]) : []));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Dönem listesi alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreview = useCallback(async () => {
    try {
      const res = await beyannameApi.preview({ type: "KDV1", year, month });
      setPreview(res);
    } catch {
      setPreview(null);
    }
  }, [year, month]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function handlePrepare() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await beyannameApi.prepare({
        declaration_type: "KDV1",
        year,
        month,
        notes: notes || undefined,
      });
      setMessage(res.message || "KDV1 paketi hazırlandı");
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
      <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>KDV1 Beyannamesi</h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
        Dönem faturalarından matrah / KDV toplamlarını hazırlar, e-Beyanname ZIP paketi üretir.
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
            KDV1 hesap eşlemeleri — Hesap, aralık, liste veya tutar seçimi.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <AccountSelectField
            label="Hesaplanan KDV"
            value={hesaplananKdv}
            onChange={setHesaplananKdv}
          />
          <AccountSelectField
            label="İndirilecek KDV"
            value={indirilecekKdv}
            onChange={setIndirilecekKdv}
          />
          <AccountSelectField
            label="Devreden KDV"
            value={devredenKdv}
            onChange={setDevredenKdv}
          />
        </div>
      </div>
    );
  } else if (submenu === "list") {
    body = (
      <div>
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Oluşturulan Beyannameler</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>KDV1 Beyannamesi</p>
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
  } else if (KDV1_TABLE_DEFS[submenu]) {
    body = <GibTablePanel key={submenu} def={KDV1_TABLE_DEFS[submenu]} />;
  } else {
    body = (
      <div className="card">
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Bölüm bulunamadı.</p>
      </div>
    );
  }

  return (
    <BeyannameLayout
      items={KDV1_MENU_ITEMS}
      activeId={submenu}
      onChange={setSubmenu}
      title="KDV1"
    >
      {body}
    </BeyannameLayout>
  );
}
