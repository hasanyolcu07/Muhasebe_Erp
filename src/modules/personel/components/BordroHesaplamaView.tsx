import { useState, useEffect } from "react";
import { personelStore } from "../services/personelStore";
import { formatMoneyExact } from "@/lib/financialMath";
import { payrollSetFromDegerler } from "@/lib/mevzuatYil";
import { api } from "@/services/api";
import { useAppStore } from "@/store/appStore";
import type { BordroRecord, PayrollParameterSet } from "../types/personelTypes";

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

type YilKalem = { anahtar: string; deger: string | null };

export function BordroHesaplamaView() {
  const workingYear = useAppStore((s) => s.workingYear);
  const [period, setPeriod] = useState(`${workingYear}-01`);
  const [bordrolar, setBordrolar] = useState<BordroRecord[]>([]);
  const [parametre, setParametre] = useState<PayrollParameterSet | null>(null);
  const [paramHata, setParamHata] = useState("");

  useEffect(() => {
    setPeriod(`${workingYear}-01`);
    setBordrolar(personelStore.getBordroList(`${workingYear}-01`));
    let iptal = false;
    api<{ kaynak: string; kalemler: YilKalem[] }>(`/personel/mevzuat?yil=${workingYear}`)
      .then((kayit) => {
        if (iptal) return;
        const degerler: Record<string, string> = {};
        for (const kalem of kayit.kalemler) {
          if (kalem.deger) degerler[kalem.anahtar] = kalem.deger;
        }
        try {
          setParametre(payrollSetFromDegerler(workingYear, kayit.kaynak, degerler));
          setParamHata("");
        } catch (error) {
          setParametre(null);
          setParamHata(error instanceof Error ? error.message : "Çalışma yılı parametresi eksik.");
        }
      })
      .catch((error: unknown) => {
        if (iptal) return;
        setParametre(null);
        setParamHata(error instanceof Error ? error.message : "Çalışma yılı parametresi okunamadı.");
      });
    return () => {
      iptal = true;
    };
  }, [workingYear]);

  const handleCalculate = () => {
    if (Number(period.slice(0, 4)) !== workingYear) {
      alert("Bordro dönemi programın çalışma yılı ile aynı olmalıdır.");
      return;
    }
    if (!parametre) {
      alert(paramHata || "Çalışma yılı için oran ve tutarlar girilmeden bordro hesaplanmaz.");
      return;
    }
    try {
      const calculated = personelStore.calculatePeriodBordrolar(period, parametre);
      setBordrolar(calculated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Hesaplama yapılamadı.";
      alert(`Bordro Hesaplama Hatası: ${message}`);
    }
  };

  const handleFinalize = () => {
    if (!confirm(`${period} dönemi bordroları kesinleştirilecektir. Kesinleşen bordrolar onaylı statüye geçer. Onaylıyor musunuz?`)) {
      return;
    }
    const res = personelStore.finalizeBordro(period);
    setBordrolar(personelStore.getBordroList(period));
    alert(`${res.count} adet personel bordrosu başarıyla kesinleştirildi.`);
  };

  const isAnyFinalized = bordrolar.some((b) => b.status === "KESINLESTI" || b.status === "MUHASEBELESTI");

  // Özet Toplamlar
  const totalGross = bordrolar.reduce((s, b) => s + b.gross_total, 0);
  const totalNet = bordrolar.reduce((s, b) => s + b.net_payable, 0);
  const totalSgkEmployee = bordrolar.reduce((s, b) => s + b.sgk_employee_share + b.unemployment_employee_share, 0);
  const totalTaxPayable = bordrolar.reduce((s, b) => s + b.payable_income_tax + b.payable_stamp_tax, 0);
  const totalEmployerCost = bordrolar.reduce((s, b) => s + b.total_employer_cost, 0);

  return (
    <div className="bordro-hesaplama-view">
      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ fontWeight: 600 }}>Hesaplama Dönemi:</label>
          <select
            className="form-control"
            style={{ width: 180 }}
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setBordrolar(personelStore.getBordroList(e.target.value));
            }}
          >
            {AYLAR.map((ad, index) => {
              const value = `${workingYear}-${String(index + 1).padStart(2, "0")}`;
              return (
                <option key={value} value={value}>
                  {workingYear} / {ad}
                </option>
              );
            })}
          </select>

          <button type="button" className="btn-top green" onClick={handleCalculate}>
            🧮 Dönem Bordrosunu Hesapla
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {bordrolar.length > 0 && !isAnyFinalized && (
            <button type="button" className="btn-top blue" onClick={handleFinalize}>
              ✔️ Bordroyu Kesinleştir (Onayla)
            </button>
          )}
          {isAnyFinalized && (
            <span className="badge" style={{ background: "#dcfce7", color: "#166534", padding: "6px 12px", fontSize: 13 }}>
              🔒 Bu Dönem Bordrosu Kesinleşti
            </span>
          )}
        </div>
      </div>

      {paramHata && (
        <div className="card" style={{ padding: 12, marginBottom: 16, color: "#9a3412" }}>
          {paramHata} Personel menüsündeki Mevzuat Parametreleri ekranından {workingYear} yılını doldurun.
        </div>
      )}

      {/* Dönem İcmal Kartları */}
      {bordrolar.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ padding: 12, background: "#f8fafc" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Toplam Brüt Ücret</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {formatMoneyExact(totalGross)}
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: "#f0fdf4" }}>
            <span style={{ fontSize: 11, color: "#166534" }}>Toplam Net Ödenecek</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>
              {formatMoneyExact(totalNet)}
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: "#fef3c7" }}>
            <span style={{ fontSize: 11, color: "#92400e" }}>SGK İşçi Primleri</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#92400e" }}>
              {formatMoneyExact(totalSgkEmployee)}
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: "#fee2e2" }}>
            <span style={{ fontSize: 11, color: "#991b1b" }}>Ödenecek GV + DV</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#991b1b" }}>
              {formatMoneyExact(totalTaxPayable)}
            </div>
          </div>
          <div className="card" style={{ padding: 12, background: "#ede9fe" }}>
            <span style={{ fontSize: 11, color: "#5b21b6" }}>Toplam İşveren Maliyeti</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#5b21b6" }}>
              {formatMoneyExact(totalEmployerCost)}
            </div>
          </div>
        </div>
      )}

      {/* Bordro Detay Tablosu */}
      <div className="table-responsive card" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th>Personel / Görev</th>
              <th>Gün</th>
              <th>Brüt Ücret</th>
              <th>SGK İşçi</th>
              <th>GV Matrahı</th>
              <th>Kümülatif GV</th>
              <th>Hesaplanan GV</th>
              <th>Asgari Ücret GV İstisnası</th>
              <th>Ödenecek GV</th>
              <th>Ödenecek DV</th>
              <th>Net Ücret</th>
              <th>İşveren Maliyeti</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {bordrolar.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                  Bu dönem için hesaplanmış bordro bulunmuyor. "Dönem Bordrosunu Hesapla" butonuna tıklayınız.
                </td>
              </tr>
            ) : (
              bordrolar.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.personel_name}</strong>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{b.department}</div>
                  </td>
                  <td>{b.worked_days}</td>
                  <td style={{ fontWeight: 600 }}>{formatMoneyExact(b.gross_total)}</td>
                  <td>{formatMoneyExact(b.sgk_employee_share + b.unemployment_employee_share)}</td>
                  <td>{formatMoneyExact(b.income_tax_base)}</td>
                  <td style={{ color: "#0369a1", fontWeight: 600 }}>{formatMoneyExact(b.cumulative_income_tax_base)}</td>
                  <td>{formatMoneyExact(b.calculated_income_tax)}</td>
                  <td style={{ color: "#166534" }}>{formatMoneyExact(b.asgari_ucret_gv_istisnasi)}</td>
                  <td style={{ fontWeight: 600, color: b.payable_income_tax > 0 ? "#b91c1c" : "#166534" }}>
                    {formatMoneyExact(b.payable_income_tax)}
                  </td>
                  <td>{formatMoneyExact(b.payable_stamp_tax)}</td>
                  <td style={{ fontWeight: 700, color: "#15803d", fontSize: 13 }}>
                    {formatMoneyExact(b.net_payable)}
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatMoneyExact(b.total_employer_cost)}</td>
                  <td>
                    {b.status === "KESINLESTI" || b.status === "MUHASEBELESTI" ? (
                      <span className="badge" style={{ background: "#dcfce7", color: "#166534" }}>
                        Kesinleşti
                      </span>
                    ) : (
                      <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                        Taslak
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
        Hesap, seçili çalışma yılının kayıtlı oran ve tutarlarıyla yapılır. 5510 teşviki, o yıl için oran girilmişse ve personelin kanun kodu 05510 ise uygulanır. Oran girilmeden teşvik yazılmaz.
      </div>
    </div>
  );
}
