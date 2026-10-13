import { useEffect, useState } from "react";
import { api } from "@/services/api";

type Row = {
  id: number;
  tarih: string;
  stok_kodu: string;
  stok_adi: string;
  giris: number;
  cikis: number;
  aciklama: string;
  belge_no: string | null;
};

export function StokDefterPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api<{ items: Row[] }>("/stok/hareket-defteri")
      .then((res) => setItems(res.items))
      .catch((e) => setMessage(e instanceof Error ? e.message : "Defter alınamadı"));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Stok hareket defteri</h2>
      <p>Miktarlar stok hareket satırlarından gelir. Karttaki miktar bu hareketlerin toplamıdır.</p>
      {message ? <p>{message}</p> : null}
      <table className="data-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Stok</th>
            <th>Giriş</th>
            <th>Çıkış</th>
            <th>Belge</th>
            <th>Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.tarih}</td>
              <td>
                {row.stok_kodu} — {row.stok_adi}
              </td>
              <td>{row.giris}</td>
              <td>{row.cikis}</td>
              <td>{row.belge_no}</td>
              <td>{row.aciklama}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
