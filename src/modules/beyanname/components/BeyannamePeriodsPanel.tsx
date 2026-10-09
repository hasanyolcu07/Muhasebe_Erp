import type { BeyannamePeriod } from "../api/beyannameApi";
import { beyannameApi } from "../api/beyannameApi";
import { STATUS_LABELS, STATUS_STYLE, normalizeStatus } from "../config/beyannameMenus";

function money(v: unknown) {
  return Number(v ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { bg: "#f3f4f6", color: "#374151" };
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}
    >
      {label}
    </span>
  );
}

function periodLabel(p: BeyannamePeriod) {
  if (p.period_month) return `${p.period_year}/${String(p.period_month).padStart(2, "0")}`;
  if (p.period_quarter) return `${p.period_year} Q${p.period_quarter}`;
  return String(p.period_year);
}

function fileTag(p: BeyannamePeriod) {
  return p.period_month
    ? `${p.period_year}${String(p.period_month).padStart(2, "0")}`
    : p.period_quarter
      ? `${p.period_year}q${p.period_quarter}`
      : String(p.period_year);
}

function SummaryTotals({ totals }: { totals: Record<string, unknown> | undefined }) {
  if (!totals) return null;
  const skip = new Set([
    "declaration_type",
    "period_kind",
    "year",
    "month",
    "quarter",
    "date_from",
    "date_to",
    "summary_label",
    "by_rate",
    "by_class",
    "stock",
    "sgk",
  ]);
  const entries = Object.entries(totals).filter(([k, v]) => !skip.has(k) && typeof v !== "object");
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{k}</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {typeof v === "number" || (typeof v === "string" && !Number.isNaN(Number(v)))
              ? money(v)
              : String(v)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PeriodActions({
  p,
  busy,
  runAction,
}: {
  p: BeyannamePeriod;
  busy: boolean;
  runAction: (fn: () => Promise<unknown>, okMsg: string) => Promise<void>;
}) {
  const status = normalizeStatus(p.status);
  const tag = fileTag(p);
  const base = String(p.declaration_type).toLowerCase();

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {status === "TASLAK" && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.workflow(p.id, "GIB_HAZIR"),
                "GIB Hazır durumuna alındı",
              )
            }
          >
            GIB Hazır Yap
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || !p.package_path}
            onClick={() =>
              void runAction(
                () => beyannameApi.sign(p.id, "mali_muhur"),
                "Mali mühür imzası uygulandı",
              )
            }
          >
            İmza (Mali Mühür)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || !p.package_path}
            onClick={() =>
              void runAction(() => beyannameApi.sign(p.id, "nei"), "NEİ imzası uygulandı")
            }
          >
            İmza (NEİ)
          </button>
        </>
      )}

      {status === "GIB_HAZIR" && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy || !p.package_path}
            onClick={() => void runAction(() => beyannameApi.upload(p.id), "GİB'e gönderildi")}
          >
            GİB Gönder
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadXml(p.id, `${base}_${tag}.xml`),
                "XML indirildi",
              )
            }
          >
            XML
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadPdf(p.id, `${base}_${tag}.pdf`),
                "PDF indirildi",
              )
            }
          >
            PDF
          </button>
        </>
      )}

      {status === "GIB_GONDERILDI" && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.workflow(p.id, "GIB_ONAYLANDI"),
                "GIB Onaylandı işaretlendi",
              )
            }
          >
            Onaylandı İşaretle
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadGib(p.id, `${base}_${tag}_gib.zip`),
                "GIB paketi indirildi",
              )
            }
          >
            GIB İndir
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadXml(p.id, `${base}_${tag}.xml`),
                "XML indirildi",
              )
            }
          >
            XML
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadPdf(p.id, `${base}_${tag}.pdf`),
                "PDF indirildi",
              )
            }
          >
            PDF
          </button>
        </>
      )}

      {status === "GIB_ONAYLANDI" && (
        <>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadXml(p.id, `${base}_${tag}.xml`),
                "XML indirildi",
              )
            }
          >
            XML
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadPdf(p.id, `${base}_${tag}.pdf`),
                "PDF indirildi",
              )
            }
          >
            PDF
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => {
              const to = window.prompt("Alıcı e-posta adresi:");
              if (!to?.trim()) return;
              void runAction(
                () => beyannameApi.sendMail(p.id, { to_email: to.trim() }),
                "Mail gönderildi",
              );
            }}
          >
            Mail
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => beyannameApi.downloadGib(p.id, `${base}_${tag}_gib.zip`),
                "GIB paketi indirildi",
              )
            }
          >
            GIB İndir
          </button>
        </>
      )}

      {(status === "HATA" ||
        status === "ARSIV" ||
        !["TASLAK", "GIB_HAZIR", "GIB_GONDERILDI", "GIB_ONAYLANDI"].includes(status)) && (
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy || !p.package_path}
          onClick={() =>
            void runAction(
              () => beyannameApi.downloadPackage(p.id, `${base}_${tag}.zip`),
              "Paket indirildi",
            )
          }
        >
          Paket İndir
        </button>
      )}
    </div>
  );
}

export function BeyannamePeriodsPanel({
  items,
  loading,
  busy,
  runAction,
  emptyHint,
  title = "Dönemler",
}: {
  items: BeyannamePeriod[];
  loading: boolean;
  busy: boolean;
  runAction: (fn: () => Promise<unknown>, okMsg: string) => Promise<void>;
  emptyHint: string;
  title?: string;
}) {
  const list = items || [];
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ fontSize: 14, fontWeight: 800 }}>{title}</h4>
        {loading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Yükleniyor…</span>}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th>Dönem</th>
              <th>Durum</th>
              <th>Özet</th>
              <th>GİB Ref</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 16 }}>
                  {emptyHint}
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id}>
                  <td>{periodLabel(p)}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    <SummaryTotals totals={p.totals} />
                  </td>
                  <td style={{ fontSize: 11 }}>{p.gib_ref || "—"}</td>
                  <td>
                    <PeriodActions p={p} busy={busy} runAction={runAction} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const PeriodsTable = BeyannamePeriodsPanel;

export { StatusBadge, SummaryTotals, periodLabel, fileTag };
