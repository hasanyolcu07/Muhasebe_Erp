import { useState } from "react";
import { api } from "@/services/api";
import { AmountInput } from "@/components/AmountInput";

type CostResponse = { fis_no?: string; message?: string; fis_durumu?: string };

/** Örnek bütçe tablosundan tutar almaz. Yalnızca elle girilen tutarı taslak fişe yazar. */
export function ProductionCostDraftForm() {
  const [tarih, setTarih] = useState("2026-10-12");
  const [kod, setKod] = useState("");
  const [ad, setAd] = useState("");
  const [hammadde, setHammadde] = useState("");
  const [iscilik, setIscilik] = useState("");
  const [genel, setGenel] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage("");
    try {
      const result = await api<CostResponse>("/yevmiye/uretim-maliyet", {
        method: "POST",
        body: {
          tarih,
          mamul_kodu: kod,
          mamul_adi: ad,
          hammadde: Number(hammadde),
          iscilik: Number(iscilik),
          genel_uretim: Number(genel),
        },
      });
      setMessage(`${result.fis_no || ""} ${result.fis_durumu || ""} ${result.message || "Taslak yazıldı."}`.trim());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fiş yazılamadı.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="ayar-form-card"
      style={{ padding: 12, marginBottom: 14, background: "#f8fafc" }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h4 style={{ margin: "0 0 6px", fontSize: 14 }}>Yevmiye taslak fişi</h4>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
        Aşağıdaki bütçe tabloları örnektir ve yevmiyeye yazılmaz. Bu form yalnızca sizin girdiğiniz tutarla taslak fiş açar. Stok değişmez.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input className="form-control" type="date" aria-label="Tarih" value={tarih} onChange={(event) => setTarih(event.target.value)} required />
        <input className="form-control" aria-label="Mamul kodu" placeholder="Mamul kodu" value={kod} onChange={(event) => setKod(event.target.value)} required />
        <input className="form-control" aria-label="Mamul adı" placeholder="Mamul adı" value={ad} onChange={(event) => setAd(event.target.value)} required />
        <AmountInput className="form-control" aria-label="Hammadde" placeholder="Hammadde" value={hammadde} onChange={(event) => setHammadde(event.target.value)} required />
        <AmountInput className="form-control" aria-label="İşçilik" placeholder="İşçilik" value={iscilik} onChange={(event) => setIscilik(event.target.value)} required />
        <AmountInput className="form-control" aria-label="Genel üretim" placeholder="Genel üretim" value={genel} onChange={(event) => setGenel(event.target.value)} required />
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Yazılıyor" : "Taslak fiş aç"}</button>
      </div>
      {message ? <p style={{ margin: "8px 0 0", fontSize: 12 }}>{message}</p> : null}
    </form>
  );
}
