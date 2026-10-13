import { useEffect, useMemo, useState } from "react";
import { MEVZUAT_SEED_TASLAK, mevzuatEtiket } from "../../../../prisma/mevzuat.seed";
import { AmountInput } from "@/components/AmountInput";
import { api } from "@/services/api";
import { useAppStore } from "@/store/appStore";

type Kalem = {
  anahtar: string;
  etiket: string;
  birim: "oran" | "tl";
  deger: string | null;
};

type YilKaydi = {
  yil: number;
  baslangic: string;
  bitis: string;
  kaynak: string;
  kalemler: Kalem[];
};

const GRUPLAR: Array<{ baslik: string; anahtarlar: string[] }> = [
  { baslik: "KDV", anahtarlar: ["kdv.oran.genel", "kdv.oran.indirimli", "kdv.oran.ozel"] },
  {
    baslik: "SGK oranları",
    anahtarlar: [
      "sgk.isci.oran",
      "sgk.isveren.oran",
      "sgk.issizlik.isci.oran",
      "sgk.issizlik.isveren.oran",
      "sgk.tesvik.5510.oran",
    ],
  },
  { baslik: "SGK tutarları", anahtarlar: ["sgk.taban", "sgk.tavan"] },
  {
    baslik: "Gelir vergisi dilimleri",
    anahtarlar: MEVZUAT_SEED_TASLAK.filter((s) => s.anahtar.startsWith("gv.")).map((s) => s.anahtar),
  },
  {
    baslik: "Damga, asgari ücret ve kıdem",
    anahtarlar: [
      "damga.oran",
      "asgari_ucret.brut",
      "asgari_ucret.istisna.gelir_vergisi",
      "asgari_ucret.istisna.damga",
      "kidem.tavan",
      "sgk.ise_giris.once_gun",
      "sgk.isten_cikis.gun",
    ],
  },
];

function yuzdeGoster(kesir: string): string {
  const yuzde = (Number(kesir) * 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return yuzde.replace(".", ",");
}

function yuzdeKaydet(metin: string): string | null {
  const ham = metin.trim();
  if (!ham) return null;
  if (!/^\d+(,\d{1,4})?$/.test(ham)) {
    throw new Error("Oranı yüzde olarak yazın. Örnek biçim: 14 veya 0,759");
  }
  const yuzde = Number(ham.replace(",", "."));
  if (yuzde > 100) throw new Error("Oran yüzde 100'ü aşamaz.");
  return (yuzde / 100).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function PersonelParametrelerView() {
  const workingYear = useAppStore((s) => s.workingYear);
  const [yil, setYil] = useState(workingYear);
  const [kaynak, setKaynak] = useState("");
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState("");
  const [tevkifatlar, setTevkifatlar] = useState<Array<{ kod: string; yuzde: string }>>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    setYil(workingYear);
  }, [workingYear]);

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setHata("");
    setMesaj("");
    api<YilKaydi>(`/personel/mevzuat?yil=${yil}`)
      .then((kayit) => {
        if (iptal) return;
        const sonraki: Record<string, string> = {};
        for (const kalem of kayit.kalemler) {
          if (!kalem.deger) {
            sonraki[kalem.anahtar] = "";
            continue;
          }
          sonraki[kalem.anahtar] = kalem.birim === "oran" ? yuzdeGoster(kalem.deger) : kalem.deger;
        }
        setDegerler(sonraki);
        setKaynak(kayit.kaynak || "");
        setTevkifatlar(
          kayit.kalemler
            .filter((kalem) => kalem.anahtar.startsWith("kdv.tevkifat."))
            .map((kalem) => ({
              kod: kalem.anahtar.slice(-3),
              yuzde: kalem.deger ? yuzdeGoster(kalem.deger) : "",
            })),
        );
      })
      .catch((error: unknown) => {
        if (!iptal) setHata(error instanceof Error ? error.message : "Parametreler okunamadı.");
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [yil]);

  const birim = useMemo(() => {
    const map = new Map(MEVZUAT_SEED_TASLAK.map((satir) => [satir.anahtar, satir.birim]));
    return map;
  }, []);

  async function kaydet() {
    setHata("");
    setMesaj("");
    try {
      const kalemler = MEVZUAT_SEED_TASLAK.map((satir) => {
        const metin = degerler[satir.anahtar] || "";
        if (satir.birim === "oran") return { anahtar: satir.anahtar, deger: yuzdeKaydet(metin) };
        const tutar = metin.trim();
        return { anahtar: satir.anahtar, deger: tutar ? tutar : null };
      });
      const tevkifatKalemleri = tevkifatlar
        .filter((satir) => satir.kod.trim())
        .map((satir) => ({
          anahtar: `kdv.tevkifat.${satir.kod.trim()}`,
          deger: yuzdeKaydet(satir.yuzde),
        }));
      const kayit = await api<YilKaydi>("/personel/mevzuat", {
        method: "PUT",
        body: { yil, kaynak, kalemler: [...kalemler, ...tevkifatKalemleri] },
      });
      setKaynak(kayit.kaynak || "");
      setMesaj(`${yil} yılı parametreleri kaydedildi. Geçerlilik ${kayit.baslangic} — ${kayit.bitis}.`);
    } catch (error) {
      setHata(error instanceof Error ? error.message : "Kayıt yapılamadı.");
    }
  }

  return (
    <div className="personel-parametreler-view">
      <div className="card" style={{ background: "#f8fafc", padding: 16, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 6px 0" }}>Yıllık mevzuat oran ve tutarları</h4>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Değerler elle girilir ve seçilen takvim yılı için saklanır. Bordro ve kıdem hesabı üst çubuktaki çalışma yılını
          kullanır. Şu anki çalışma yılı: <strong>{workingYear}</strong>.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "end", marginTop: 12, flexWrap: "wrap" }}>
          <label>
            Kayıt yılı
            <input
              className="form-control"
              type="number"
              min={2000}
              max={2100}
              value={yil}
              onChange={(event) => setYil(Number(event.target.value))}
              style={{ width: 120, marginLeft: 8 }}
            />
          </label>
          <button type="button" className="btn-top" onClick={() => setYil(workingYear)}>
            Çalışma yılını aç
          </button>
          {yil !== workingYear && (
            <span style={{ fontSize: 12, color: "#9a3412" }}>
              Bu form {yil} yılını düzenliyor. Hesaplar {workingYear} yılının kayıtlarını kullanır.
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Kaynak
          <input
            className="form-control"
            value={kaynak}
            onChange={(event) => setKaynak(event.target.value)}
            placeholder="Resmi gazete, tebliğ veya karar adı"
            style={{ marginTop: 6, maxWidth: 640 }}
          />
        </label>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
          Oranları yüzde yazın. 1, yüzde 1 demektir. Tutarlar TL'dir. Boş bırakılan satır o yıl için silinir. Aynı yıl içinde
          oran değişirse bu ekran o yıl için tek satır tutar.
        </p>
      </div>

      {GRUPLAR.map((grup) => (
        <div key={grup.baslik} className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h5 style={{ margin: "0 0 12px 0" }}>{grup.baslik}</h5>
          <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
            <tbody>
              {grup.anahtarlar.map((anahtar) => {
                const tip = birim.get(anahtar);
                return (
                  <tr key={anahtar}>
                    <td style={{ width: "55%" }}>{mevzuatEtiket(anahtar)}</td>
                    <td>
                      {tip === "tl" ? (
                        <AmountInput
                          aria-label={mevzuatEtiket(anahtar)}
                          value={degerler[anahtar] ? degerler[anahtar] : null}
                          onValueChange={(tutar) =>
                            setDegerler((onceki) => ({
                              ...onceki,
                              [anahtar]: tutar > 0 ? tutar.toFixed(2) : "",
                            }))
                          }
                        />
                      ) : tip === "gun" ? (
                        <input
                          className="form-control"
                          aria-label={mevzuatEtiket(anahtar)}
                          inputMode="numeric"
                          value={degerler[anahtar] || ""}
                          placeholder="gün"
                          onChange={(event) =>
                            setDegerler((onceki) => ({ ...onceki, [anahtar]: event.target.value.replace(/[^\d]/g, "") }))
                          }
                          style={{ maxWidth: 160, textAlign: "right" }}
                        />
                      ) : (
                        <input
                          className="form-control"
                          aria-label={mevzuatEtiket(anahtar)}
                          inputMode="decimal"
                          value={degerler[anahtar] || ""}
                          placeholder="yüzde"
                          onChange={(event) =>
                            setDegerler((onceki) => ({ ...onceki, [anahtar]: event.target.value }))
                          }
                          style={{ maxWidth: 160, textAlign: "right" }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h5 style={{ margin: "0 0 8px 0" }}>KDV tevkifat payı</h5>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
          Kod 3 hanelidir. Yüzde, KDV tutarının tevkif edilen payıdır. Fatura fişi bu yılın kayıtlı payını okur.
        </p>
        {tevkifatlar.map((satir, index) => (
          <div key={`${satir.kod}-${index}`} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              className="form-control"
              aria-label="Tevkifat kodu"
              value={satir.kod}
              maxLength={3}
              placeholder="kod"
              onChange={(event) =>
                setTevkifatlar((onceki) =>
                  onceki.map((row, rowIndex) => (rowIndex === index ? { ...row, kod: event.target.value } : row)),
                )
              }
              style={{ width: 100 }}
            />
            <input
              className="form-control"
              aria-label="Tevkifat yüzde"
              value={satir.yuzde}
              placeholder="yüzde"
              onChange={(event) =>
                setTevkifatlar((onceki) =>
                  onceki.map((row, rowIndex) => (rowIndex === index ? { ...row, yuzde: event.target.value } : row)),
                )
              }
              style={{ width: 140 }}
            />
          </div>
        ))}
        <button
          type="button"
          className="btn-top"
          onClick={() => setTevkifatlar((onceki) => [...onceki, { kod: "", yuzde: "" }])}
        >
          Tevkifat kodu ekle
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button type="button" className="btn-top green" onClick={() => void kaydet()} disabled={yukleniyor}>
          {yil} yılını kaydet
        </button>
        {yukleniyor && <span>Yükleniyor…</span>}
        {mesaj && <span style={{ color: "#166534" }}>{mesaj}</span>}
        {hata && <span style={{ color: "#991b1b" }}>{hata}</span>}
      </div>
    </div>
  );
}
