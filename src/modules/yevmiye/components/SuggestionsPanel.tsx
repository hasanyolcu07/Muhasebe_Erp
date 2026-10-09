import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { yevmiyeApi, type Suggestion } from "../api/yevmiyeApi";

export function SuggestionsPanel() {
  const branchId = useAppStore((s) => s.branchId);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await yevmiyeApi.listSuggestions(branchId ?? undefined);
      setItems(res ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePreview(st: string, sid: number) {
    const res = await yevmiyeApi.previewSuggestion(st, sid);
    setPreview(JSON.stringify(res, null, 2));
  }

  async function handleRegenAndApprove(st: string, sid: number) {
    const created = await yevmiyeApi.regenSuggestion(st, sid);
    if (created.id) {
      await yevmiyeApi.approveSuggestion(created.id);
      setPreview("Onaylandı — yevmiye oluşturuldu");
      void load();
    }
  }

  return (
    <div className="panel">
      <h2>Yevmiye Önerileri</h2>
      <p className="muted">Muhasebeleşmemiş hareketler ve bekleyen öneriler — onay sonrası fiş oluşur.</p>
      {loading && <p className="muted">Yükleniyor…</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Kaynak</th>
            <th>Belge</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={`${s.source_type}-${s.source_id}-${i}`}>
              <td>{s.source_type}</td>
              <td>{s.doc_no ?? s.source_id}</td>
              <td>{s.status}</td>
              <td>
                <button type="button" onClick={() => void handlePreview(s.source_type, s.source_id)}>
                  Önizle
                </button>
                {s.id ? (
                  <button type="button" onClick={() => void yevmiyeApi.approveSuggestion(s.id!).then(() => load())}>
                    Onayla
                  </button>
                ) : (
                  <button type="button" onClick={() => void handleRegenAndApprove(s.source_type, s.source_id)}>
                    Oluştur & Onayla
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {preview && <pre className="code-block">{preview}</pre>}
    </div>
  );
}
