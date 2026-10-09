import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { yevmiyeApi } from "../api/yevmiyeApi";

export function YearEndPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [year, setYear] = useState(new Date().getFullYear());
  const [result, setResult] = useState<string>("");
  const [runId, setRunId] = useState<number | null>(null);

  async function preview() {
    if (!branchId || !recordTypeId) return;
    const res = await yevmiyeApi.yearEndPreview({
      branch_id: branchId,
      record_type_id: recordTypeId,
      fiscal_year: year,
    });
    setRunId(Number(res.id));
    setResult(JSON.stringify(res, null, 2));
  }

  async function approve() {
    if (!runId) return;
    const res = await yevmiyeApi.yearEndApprove(runId);
    setResult(JSON.stringify(res, null, 2));
  }

  return (
    <div className="panel">
      <h2>Yıl Sonu Kapanış</h2>
      <div className="form-row">
        <label>Yıl</label>
        <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} />
        <button type="button" onClick={() => void preview()}>Önizleme</button>
        {runId && (
          <button type="button" onClick={() => void approve()}>Kapanış Fişini Onayla</button>
        )}
      </div>
      {result && <pre className="code-block">{result}</pre>}
    </div>
  );
}
