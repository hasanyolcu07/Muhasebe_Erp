import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { bomApi } from "@/modules/uretim/api/bomApi";
import { MaliyetButcesiPanel } from "@/modules/uretim/components/MaliyetButcesiPanel";
import { maliyetApi } from "../api/maliyetApi";

type Section =
  | "butce"
  | "motor"
  | "fiyat"
  | "ai"
  | "ihracat"
  | "yatirim"
  | "nakit"
  | "kapasite"
  | "amortisman"
  | "stok"
  | "proforma"
  | "tesvik"
  | "vergi"
  | "mutabakat";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "butce", label: "📊 Maliyet Bütçesi & P&L" },
  { id: "motor", label: "Maliyet Motoru" },
  { id: "fiyat", label: "Fiyat" },
  { id: "ai", label: "AI Araştırma" },
  { id: "ihracat", label: "İhracat" },
  { id: "yatirim", label: "Yatırım" },
  { id: "nakit", label: "Nakit Akış" },
  { id: "kapasite", label: "Kapasite/Plan" },
  { id: "amortisman", label: "Amortisman" },
  { id: "stok", label: "Stok Bütçe" },
  { id: "proforma", label: "Proforma" },
  { id: "tesvik", label: "Teşvik" },
  { id: "vergi", label: "Vergi Hazırlık" },
  { id: "mutabakat", label: "Mutabakat" },
];

function parseSection(raw: string | null): Section {
  if (raw && SECTIONS.some((s) => s.id === raw)) return raw as Section;
  return "motor";
}

export function MaliyetHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const section = parseSection(searchParams.get("section"));

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [calcs, setCalcs] = useState<Array<Record<string, unknown>>>([]);
  const [investments, setInvestments] = useState<Array<Record<string, unknown>>>([]);
  const [bomId, setBomId] = useState("");
  const [stockId, setStockId] = useState("");
  const [costInput, setCostInput] = useState("100");
  const [marginPct, setMarginPct] = useState("20");
  const [resultJson, setResultJson] = useState("");

  const switchSection = (id: Section) => {
    guardNavigate(() => setSearchParams({ section: id }));
  };

  const loadSection = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setMessage("");
    try {
      if (section === "motor") {
        const res = await maliyetApi.listCalculations(branchId);
        setCalcs(res.items ?? []);
      } else if (section === "yatirim") {
        const res = await maliyetApi.listInvestments(branchId);
        setInvestments(res ?? []);
      } else if (section === "vergi") {
        const res = await maliyetApi.taxPrep(branchId);
        setResultJson(JSON.stringify(res, null, 2));
      } else if (section === "mutabakat") {
        const res = await maliyetApi.reconciliation(branchId);
        setResultJson(JSON.stringify(res, null, 2));
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setLoading(false);
    }
  }, [section, branchId]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  async function handleRunBomCost() {
    if (!branchId || !recordTypeId || !bomId) {
      setMessage("Şube, kayıt türü ve BOM ID gerekli");
      return;
    }
    setLoading(true);
    try {
      const res = await maliyetApi.runBomCost({
        branch_id: branchId,
        record_type_id: recordTypeId,
        bom_id: parseInt(bomId, 10),
        calc_type: "STANDARD",
        labor_hours: 1,
        labor_rate: 50,
        overhead_pool: 100,
      });
      setResultJson(JSON.stringify(res, null, 2));
      setMessage("Maliyet hesabı oluşturuldu");
      void loadSection();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Hesaplama hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handlePricing() {
    if (!stockId) return;
    setLoading(true);
    try {
      const res = await maliyetApi.pricing({
        stock_id: parseInt(stockId, 10),
        cost: parseFloat(costInput),
        margin_pct: parseFloat(marginPct),
      });
      setResultJson(JSON.stringify(res, null, 2));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Fiyat hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handleAiMarket() {
    if (!stockId) return;
    setLoading(true);
    try {
      const res = await maliyetApi.marketResearch(parseInt(stockId, 10), [
        { name: "Rakip A", price: parseFloat(costInput) * 1.1 },
        { name: "Rakip B", price: parseFloat(costInput) * 0.9 },
      ]);
      setResultJson(JSON.stringify(res, null, 2));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "AI hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvestment() {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await maliyetApi.createInvestment({
        branch_id: branchId,
        name: "5 Yıllık Senaryo",
        years: 5,
        initial_investment: 500000,
        cash_flows: [120000, 130000, 140000, 150000, 160000],
        discount_rate: 12,
      });
      setResultJson(JSON.stringify(res, null, 2));
      void loadSection();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Yatırım hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handleCashFlow() {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await maliyetApi.cashFlowProjection({
        branch_id: branchId,
        name: "12 Ay Projeksiyon",
        horizon_months: 12,
        historical_data: [{ net_cash: 10000 }, { net_cash: 11000 }, { net_cash: 10500 }],
        growth_coeff: 1.02,
      });
      setResultJson(JSON.stringify(res, null, 2));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Nakit akış hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handleStockBudget() {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await maliyetApi.stockBudget(branchId);
      setResultJson(JSON.stringify(res, null, 2));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Stok bütçe hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubsidy() {
    setLoading(true);
    try {
      const res = await maliyetApi.subsidy({
        city: "İstanbul",
        sector: "İmalat",
        investment_min: 1000000,
        employment_min: 10,
      });
      setResultJson(JSON.stringify(res, null, 2));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Teşvik hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setLoading(true);
    try {
      const res = await maliyetApi.exportPrice({
        unit_cost: parseFloat(costInput),
        margin_pct: 15,
        freight: 500,
        insurance: 100,
        tax_pct: 0,
        fx_rate: 34.5,
        target_country: "DE",
      });
      setResultJson(JSON.stringify(res, null, 2));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "İhracat hatası");
    } finally {
      setLoading(false);
    }
  }

  async function loadBoms() {
    try {
      const res = await bomApi.list({ branch_id: branchId ?? undefined, page_size: 5 });
      const first = res.items?.[0];
      if (first) setBomId(String(first.id));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadBoms();
  }, [branchId]);

  return (
    <div className="module-page">
      <header className="module-header">
        <h1>Maliyet Muhasebesi</h1>
        <p className="muted">FAZ 8 — maliyet motoru, fiyat, AI öneri, yatırım, nakit, amortisman, bütçe</p>
      </header>

      <nav className="hub-tabs" aria-label="Maliyet bölümleri">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={section === s.id ? "hub-tab active" : "hub-tab"}
            onClick={() => switchSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {message && <p className="form-hint">{message}</p>}
      {loading && <p className="muted">Yükleniyor…</p>}

      {section === "butce" && <MaliyetButcesiPanel />}

      {section === "motor" && (
        <section className="panel">
          <h2>Maliyet Motoru (BOM)</h2>
          <div className="form-row">
            <label>BOM ID</label>
            <input value={bomId} onChange={(e) => setBomId(e.target.value)} />
            <button type="button" onClick={() => void handleRunBomCost()}>Hesapla</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tip</th>
                <th>Standart</th>
                <th>Fiili</th>
                <th>Fark</th>
              </tr>
            </thead>
            <tbody>
              {calcs.map((c) => (
                <tr key={String(c.id)}>
                  <td>{String(c.calc_no)}</td>
                  <td>{String(c.calc_type)}</td>
                  <td>{Number(c.standard_total).toFixed(2)}</td>
                  <td>{Number(c.actual_total).toFixed(2)}</td>
                  <td>{Number(c.variance_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(section === "fiyat" || section === "ai") && (
        <section className="panel">
          <h2>{section === "fiyat" ? "Fiyat Hesaplama" : "AI Piyasa Araştırması"}</h2>
          <div className="form-row">
            <label>Stok ID</label>
            <input value={stockId} onChange={(e) => setStockId(e.target.value)} />
            <label>Maliyet</label>
            <input value={costInput} onChange={(e) => setCostInput(e.target.value)} />
            <label>Kar %</label>
            <input value={marginPct} onChange={(e) => setMarginPct(e.target.value)} />
            {section === "fiyat" ? (
              <button type="button" onClick={() => void handlePricing()}>Fiyat Hesapla</button>
            ) : (
              <button type="button" onClick={() => void handleAiMarket()}>AI Piyasa</button>
            )}
          </div>
          <p className="muted">AI çıktısı onay gerektirir — finansal kayda otomatik dönüşmez.</p>
        </section>
      )}

      {section === "ihracat" && (
        <section className="panel">
          <h2>İhracat Fiyat (FOB/CIF)</h2>
          <button type="button" onClick={() => void handleExport()}>Hesapla</button>
        </section>
      )}

      {section === "yatirim" && (
        <section className="panel">
          <h2>5 Yıllık Yatırım (ROI/NPV/IRR)</h2>
          <button type="button" onClick={() => void handleInvestment()}>Senaryo Oluştur</button>
          <ul>
            {investments.map((i) => (
              <li key={String(i.id)}>
                {String(i.name)} — ROI {Number(i.roi_pct ?? 0).toFixed(1)}% · NPV {Number(i.npv ?? 0).toFixed(0)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {section === "nakit" && (
        <section className="panel">
          <h2>Nakit Akış Projeksiyonu</h2>
          <button type="button" onClick={() => void handleCashFlow()}>12 Ay Projeksiyon</button>
        </section>
      )}

      {section === "kapasite" && (
        <section className="panel">
          <h2>Kapasite / Makina / Haftalık Plan</h2>
          <p>
            Üretim modülündeki kapasite ve haftalık plan için{" "}
            <a href="/production?section=kapasite">Üretim → Kapasite</a> ve{" "}
            <a href="/production?section=plan">Üretim → Plan</a> sayfalarını kullanın.
          </p>
        </section>
      )}

      {section === "amortisman" && (
        <section className="panel">
          <h2>Makina Amortismanı</h2>
          <p className="muted">
            Makina kaydı ve amortisman fişi API: POST /maliyet/amortisman ve POST /maliyet/amortisman/&#123;id&#125;/onayla
            (yevmiye onay sonrası).
          </p>
        </section>
      )}

      {section === "stok" && (
        <section className="panel">
          <h2>Stok Bütçesi (EOQ)</h2>
          <button type="button" onClick={() => void handleStockBudget()}>Bütçe Çalıştır</button>
        </section>
      )}

      {section === "proforma" && (
        <section className="panel">
          <h2>Proforma / Gerçekleşen</h2>
          <p className="muted">Proforma snapshot API üzerinden bütçe/gerçekleşen sapması kaydedilir.</p>
        </section>
      )}

      {section === "tesvik" && (
        <section className="panel">
          <h2>Bölgesel Teşvik Araştırması</h2>
          <button type="button" onClick={() => void handleSubsidy()}>Araştır</button>
          <p className="muted">Resmi kaynak linkleri — başvuru öncesi doğrulama gerekli.</p>
        </section>
      )}

      {(section === "vergi" || section === "mutabakat" || resultJson) && resultJson && (
        <section className="panel">
          <h2>Sonuç</h2>
          <pre className="code-block">{resultJson}</pre>
        </section>
      )}
    </div>
  );
}
