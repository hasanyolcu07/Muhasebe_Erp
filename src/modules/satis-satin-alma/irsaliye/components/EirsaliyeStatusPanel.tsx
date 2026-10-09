import { useCallback, useEffect, useState } from "react";
import { GibStatusBadge } from "../../utils/gibStatusBadge";
import { irsaliyeApi, type EirsaliyeStatusResponse, type IncomingEirsaliyeItem } from "../api/irsaliyeApi";

type Props = {
  compact?: boolean;
  side?: "sales" | "purchase";
  branchId?: number | null;
  recordTypeId?: number | null;
  onOpen?: (id: number) => void;
  refreshKey?: number;
};

export function EirsaliyeStatusPanel({
  compact,
  side = "sales",
  branchId,
  recordTypeId,
  onOpen,
  refreshKey = 0,
}: Props) {
  const [incoming, setIncoming] = useState<IncomingEirsaliyeItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (side !== "purchase") return;
    try {
      const res = await irsaliyeApi.eirsaliyeIncoming({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
        limit: 8,
      });
      setIncoming(res.items ?? []);
    } catch {
      setIncoming([]);
    }
  }, [side, branchId, recordTypeId, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReceive() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await irsaliyeApi.eirsaliyeReceiveNew({
        branch_id: branchId ?? undefined,
        record_type_id: recordTypeId ?? undefined,
      });
      setMsg(res.message);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Alım başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (side === "sales") {
    return (
      <div className={`earsiv-period-panel${compact ? " compact" : ""}`} style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 13 }}>Giden e-İrsaliye</strong>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Satış irsaliyesinde tip = e-İrsaliye → Oluştur → GİB Gönder
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`earsiv-period-panel${compact ? " compact" : ""}`} style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div>
          <strong style={{ fontSize: 13 }}>Gelen e-İrsaliye</strong>
          <div style={{ fontSize: 12, color: "#64748b" }}>Entegratör / GİB alım stub</div>
        </div>
        <button type="button" className="btn-top blue" style={{ fontSize: 11, padding: "4px 10px" }} disabled={busy} onClick={handleReceive}>
          Gelen Belge Al
        </button>
      </div>
      {msg && <div style={{ fontSize: 12, marginTop: 6, color: "#0369a1" }}>{msg}</div>}
      {incoming.length > 0 ? (
        <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", fontSize: 12 }}>
          {incoming.slice(0, 5).map((it) => (
            <li
              key={it.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                padding: "4px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#1d4ed8", cursor: "pointer", padding: 0 }}
                onClick={() => onOpen?.(it.id)}
              >
                {it.waybill_no}
              </button>
              <span style={{ color: "#64748b" }}>{it.account_title ?? "—"}</span>
              <GibStatusBadge status={it.gib_status} label={it.gib_status_label} />
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Henüz gelen e-İrsaliye yok.</div>
      )}
    </div>
  );
}

/** Compact GİB durum sorgulama yardımcı — form / liste satırı için */
export async function queryEirsaliyeStatus(id: number): Promise<EirsaliyeStatusResponse> {
  return irsaliyeApi.eirsaliyeQueryStatus(id);
}
