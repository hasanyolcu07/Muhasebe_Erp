import { useState } from "react";
import { myasistanApi } from "../api/dashboardApi";

export function MyAsistanPanel({
  branchId,
  recordTypeId,
}: {
  branchId?: number;
  recordTypeId?: number;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await myasistanApi.ask(question.trim(), branchId, recordTypeId);
      setAnswer(res.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Soru işlenemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 16,
        marginTop: 20,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>MyAsistan</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="input"
          placeholder="Örn: aylık satışlar, kasa durumu, mizan"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button type="button" className="btn-top blue" disabled={loading} onClick={submit}>
          {loading ? "..." : "Sor"}
        </button>
      </div>
      {error && <div style={{ color: "#b91c1c", marginTop: 8, fontSize: 13 }}>{error}</div>}
      {answer && (
        <div style={{ marginTop: 10, fontSize: 14, color: "#334155", background: "#f8fafc", padding: 10, borderRadius: 8 }}>
          {answer}
        </div>
      )}
    </div>
  );
}
