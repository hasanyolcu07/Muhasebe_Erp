import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { AmountInput } from "@/components/AmountInput";

type CariRow = { id: number; code: string; title: string; tax_number: string; balance: number };
type EkstreRow = {
  id: number;
  tarih: string;
  aciklama: string;
  belge_no: string | null;
  borc: number;
  alacak: number;
  bakiye: number;
};

function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function CariIslemleriPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CariRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<CariRow | null>(null);
  const [ekstre, setEkstre] = useState<EkstreRow[]>([]);
  const [edit, setEdit] = useState<EkstreRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadList() {
    const res = await api<{ items: CariRow[] }>(`/cari-islemleri${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setRows(res.items);
  }

  async function openEkstre(row: CariRow) {
    setSelected(row);
    const res = await api<{ items: EkstreRow[] }>(`/cari-islemleri/${row.id}/ekstre`);
    setEkstre(res.items);
  }

  useEffect(() => {
    void loadList().catch((e) => setMessage(e instanceof Error ? e.message : "Cariler alınamadı"));
  }, []);

  function hazirla(group: "satislar" | "alislar", section: string) {
    if (!selected) {
      setMessage("Önce listeden bir cari seçin.");
      return;
    }
    navigate(`/app/hub/satis?group=${group}&section=${section}&cari_id=${selected.id}&hazirla=1`);
  }

  function downloadCsv() {
    if (!selected) return;
    const lines = ["tarih,belge,aciklama,borc,alacak,bakiye", ...ekstre.map((row) => [row.tarih, row.belge_no, row.aciklama, row.borc, row.alacak, row.bakiye].map(csvCell).join(","))];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.code}-ekstre.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 16 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cari-ekstre-print, #cari-ekstre-print * { visibility: visible; }
          #cari-ekstre-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <h2>Cari işlemleri</h2>
      <p>Kartlarda tanımlı cariler. Ekstre satırı düzeltilince bakiye ve bağlı fatura güncellenir. Kesin yevmiye varsa önce ters fiş açılır. GİB onaylı fatura ve ciro edilmiş çek kilitlidir.</p>
      <form
        style={{ display: "flex", gap: 8, marginBottom: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          void loadList().catch((err) => setMessage(err instanceof Error ? err.message : "Cariler alınamadı"));
        }}
      >
        <input className="form-control" placeholder="Kod veya ünvan" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="btn-top">
          Ara
        </button>
      </form>
      <table className="data-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Kod</th>
            <th>Ünvan</th>
            <th>VKN</th>
            <th>Bakiye</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>Kayıtlı cari kart yok. Kart Tanımları bölümünden cari açın.</td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.code}</td>
              <td>{row.title}</td>
              <td>{row.tax_number}</td>
              <td>{row.balance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
              <td>
                <button type="button" className="btn-top" onClick={() => void openEkstre(row).catch((e) => setMessage(e instanceof Error ? e.message : "Ekstre alınamadı"))}>
                  Ekstre
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected ? (
        <div style={{ marginTop: 16 }} id="cari-ekstre-print">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <h3>
              {selected.code} — {selected.title}
            </h3>
            <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn-top" onClick={() => hazirla("satislar", "satis-faturalar")}>Satış faturası</button>
              <button type="button" className="btn-top" onClick={() => hazirla("alislar", "alis-faturalar")}>Alış faturası</button>
              <button type="button" className="btn-top" onClick={() => hazirla("satislar", "satis-irsaliyeler")}>Satış irsaliyesi</button>
              <button type="button" className="btn-top" onClick={() => hazirla("alislar", "alis-irsaliyeler")}>Alış irsaliyesi</button>
              <button type="button" className="btn-top" onClick={() => hazirla("satislar", "satis-siparisler")}>Satış siparişi</button>
              <button type="button" className="btn-top" onClick={() => hazirla("alislar", "alis-siparisler")}>Alış siparişi</button>
              <button type="button" className="btn-top" onClick={() => hazirla("satislar", "satis-teklifler")}>Satış teklifi</button>
              <button type="button" className="btn-top" onClick={() => hazirla("alislar", "alis-teklifler")}>Alış teklifi</button>
              <button type="button" className="btn-top" onClick={downloadCsv}>
                Excel
              </button>
              <button type="button" className="btn-top" onClick={() => window.print()}>
                PDF / Yazıcı
              </button>
            </div>
          </div>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Belge</th>
                <th>Açıklama</th>
                <th>Borç</th>
                <th>Alacak</th>
                <th>Bakiye</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ekstre.length === 0 ? (
                <tr>
                  <td colSpan={7}>Bu caride ekstre satırı yok.</td>
                </tr>
              ) : null}
              {ekstre.map((row) => (
                <tr key={row.id}>
                  <td>{row.tarih}</td>
                  <td>{row.belge_no}</td>
                  <td>{row.aciklama}</td>
                  <td>{row.borc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  <td>{row.alacak.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  <td>{row.bakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  <td className="no-print">
                    <button type="button" className="btn-top" onClick={() => setEdit(row)}>
                      Düzelt
                    </button>
                    <button
                      type="button"
                      className="btn-top"
                      onClick={() => {
                        if (!window.confirm("Bu ekstre satırı silinsin mi? Bakiye yeniden hesaplanır. GİB onaylı belge ve fatura kartı silinmez.")) return;
                        void api<{ message?: string }>(`/cari-islemleri/hareket/${row.id}`, { method: "DELETE" })
                          .then(async (res) => {
                            setMessage(res.message || "Satır silindi.");
                            await loadList();
                            await openEkstre(selected);
                          })
                          .catch((e) => setMessage(e instanceof Error ? e.message : "Silinemedi"));
                      }}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {edit && selected ? (
        <form
          className="ayar-form-card"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void api<{ message?: string }>(`/cari-islemleri/hareket/${edit.id}`, {
              method: "PUT",
              body: {
                aciklama: String(data.get("aciklama") || ""),
                borc: Number(data.get("borc") || 0),
                alacak: Number(data.get("alacak") || 0),
                belge_no: String(data.get("belge_no") || ""),
              },
            })
              .then(async (res) => {
                setEdit(null);
                setMessage(res.message || "Ekstre ve bağlı kayıtlar güncellendi.");
                await loadList();
                await openEkstre(selected);
              })
              .catch((err) => setMessage(err instanceof Error ? err.message : "Güncellenemedi"));
          }}
        >
          <h3>Ekstre satırını düzelt</h3>
          <label>Belge no<input className="form-control" name="belge_no" defaultValue={edit.belge_no || ""} /></label>
          <label>Açıklama<input className="form-control" name="aciklama" defaultValue={edit.aciklama} /></label>
          <label>Borç<AmountInput className="form-control" name="borc" defaultValue={edit.borc} /></label>
          <label>Alacak<AmountInput className="form-control" name="alacak" defaultValue={edit.alacak} /></label>
          <button type="submit" className="btn-top green">
            Kaydet
          </button>
          <button type="button" className="btn-top" onClick={() => setEdit(null)}>
            Vazgeç
          </button>
        </form>
      ) : null}
      {message ? <p>{message}</p> : null}
    </div>
  );
}
