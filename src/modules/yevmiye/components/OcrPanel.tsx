import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { yevmiyeApi } from "../api/yevmiyeApi";

export function OcrPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const [result, setResult] = useState<string>("");
  const [ocrId, setOcrId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !branchId || !recordTypeId) return;
    setLoading(true);
    try {
      const res = await yevmiyeApi.uploadOcr(branchId, recordTypeId, file);
      setOcrId(Number(res.id));
      setResult(JSON.stringify(res, null, 2));
    } catch (err) {
      setResult(err instanceof Error ? err.message : "OCR hatası");
    } finally {
      setLoading(false);
    }
  }

  async function propose() {
    if (!ocrId) return;
    const res = await yevmiyeApi.proposeOcr(ocrId);
    setResult(JSON.stringify(res, null, 2));
  }

  async function approve() {
    if (!ocrId) return;
    const res = await yevmiyeApi.approveOcr(ocrId);
    setResult(JSON.stringify(res, null, 2));
  }

  return (
    <div className="panel">
      <h2>AI OCR — Fiş / Fatura</h2>
      <p className="muted">PDF/JPG/PNG yükle → çıkarım → cari/stok eşleştirme → yevmiye önerisi → onay.</p>
      <input type="file" accept="image/*,.pdf" onChange={(e) => void onFile(e)} />
      {loading && <p className="muted">İşleniyor…</p>}
      {ocrId && (
        <div className="form-row">
          <button type="button" onClick={() => void propose()}>Yevmiye Önerisi</button>
          <button type="button" onClick={() => void approve()}>Onayla & Fişle</button>
        </div>
      )}
      {result && <pre className="code-block">{result}</pre>}
    </div>
  );
}
