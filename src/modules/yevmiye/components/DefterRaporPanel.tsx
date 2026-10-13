import { useState } from "react";
import { api } from "@/services/api";
import { useAppStore } from "@/store/appStore";

type Tur = "yevmiye" | "kebir" | "mizan" | "bilanco" | "gelir";

type Rapor = {
  tur: Tur;
  satirlar: Array<Record<string, string>>;
  toplamBorc: string;
  toplamAlacak: string;
  bilgi: string | null;
  giderCesitleri: Array<Record<string, string>>;
};

const TURLER: { id: Tur; label: string }[] = [
  { id: "yevmiye", label: "Yevmiye defteri" },
  { id: "kebir", label: "Defter-i kebir" },
  { id: "mizan", label: "Mizan" },
  { id: "bilanco", label: "Bilanço" },
  { id: "gelir", label: "Gelir tablosu" },
];

export function DefterRaporPanel() {
  const workingYear = useAppStore((s) => s.workingYear);
  const [tur, setTur] = useState<Tur>("mizan");
  const [hesap, setHesap] = useState("");
  const [rapor, setRapor] = useState<Rapor | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function yukle(sonraki: Tur) {
    setTur(sonraki);
    setYukleniyor(true);
    setHata(null);
    try {
      const sorgu = new URLSearchParams({ tur: sonraki, yil: String(workingYear) });
      if (hesap.trim()) sorgu.set("hesap", hesap.trim());
      setRapor(await api<Rapor>(`/yevmiye/defter?${sorgu.toString()}`));
    } catch (error) {
      setRapor(null);
      setHata(error instanceof Error ? error.message : "Rapor alınamadı");
    } finally {
      setYukleniyor(false);
    }
  }

  const kolonlar = rapor?.satirlar[0] ? Object.keys(rapor.satirlar[0]) : [];

  return (
    <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0 }}>Defter ve mali tablolar</h3>
      <p style={{ margin: 0, color: "#475569" }}>
        {workingYear} yılının kesin fişleri. Rapor fiş kesmez. Üst çubuktaki çalışma yılı kullanılır.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Hesap
          <input className="form-control" value={hesap} onChange={(e) => setHesap(e.target.value)} placeholder="120 veya 120.01" />
        </label>
        {TURLER.map((item) => (
          <button key={item.id} type="button" className="btn-top" onClick={() => void yukle(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {yukleniyor ? <p>Yükleniyor…</p> : null}
      {hata ? <p role="alert">{hata}</p> : null}
      {rapor ? (
        <>
          <p>
            Borç {rapor.toplamBorc} · Alacak {rapor.toplamAlacak}
          </p>
          {rapor.bilgi ? <p>{rapor.bilgi}</p> : null}
          <table>
            <thead>
              <tr>
                {kolonlar.map((kolon) => (
                  <th key={kolon}>{kolon}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rapor.satirlar.map((satir, index) => (
                <tr key={`${satir.fisNo || satir.hesapKodu}-${index}`}>
                  {kolonlar.map((kolon) => (
                    <td key={kolon}>{satir[kolon]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rapor.giderCesitleri.length > 0 ? (
            <>
              <h4>7. sınıf gider çeşitleri</h4>
              <table>
                <tbody>
                  {rapor.giderCesitleri.map((satir) => (
                    <tr key={satir.hesapKodu}>
                      <td>{satir.hesapKodu}</td>
                      <td>{satir.borc}</td>
                      <td>{satir.alacak}</td>
                      <td>{satir.bakiye}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
