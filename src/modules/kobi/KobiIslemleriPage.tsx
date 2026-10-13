import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AmountInput } from "@/components/AmountInput";
import { api } from "@/services/api";

type Partner = {
  id: number;
  ad: string;
  rol: string;
  hisseOran: number;
  sermaye: number;
  giderPayi: number;
  fark: number;
  brutKar: number;
  stopaj: number;
  netOdeme: number;
};

type Expense = {
  id: number;
  tarih: string;
  aciklama: string;
  kategori: string;
  tutar: number;
};

type Summary = {
  ortaklar: Partner[];
  giderler: Expense[];
  gider_toplam: number;
  sermaye_toplam: number;
  hisse_toplam: number;
  fark_toplam: number;
  not: string;
};

const COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];
const ROLES = ["Kurucu Ortak", "Ortak", "Yatırımcı"];

function money(value: number): string {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function KobiIslemleriPage({ mode }: { mode: "ortaklik" | "yatirim" }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [netKar, setNetKar] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ ad: "", rol: "Ortak", hisse_oran: 0, sermaye: 0 });
  const [gider, setGider] = useState({ tarih: new Date().toISOString().slice(0, 10), aciklama: "", kategori: "KURULUS", tutar: 0 });

  const load = useCallback(async (kar = 0) => {
    const data = await api<Summary>(`/kobi/ozet?net_kar=${encodeURIComponent(String(kar || 0))}`);
    setSummary(data);
  }, []);

  useEffect(() => {
    load(0).catch((err: unknown) => setError(err instanceof Error ? err.message : "Ortaklık verisi alınamadı."));
  }, [load]);

  const rows = useMemo(() => {
    const partners = summary?.ortaklar || [];
    return partners.map((partner) => {
      const brutKar = round2(netKar * (Number(partner.hisseOran) / 100));
      const stopaj = round2(brutKar * 0.1);
      return { ...partner, brutKar, stopaj, netOdeme: round2(brutKar - stopaj) };
    });
  }, [summary, netKar]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        hisse: acc.hisse + Number(row.hisseOran),
        sermaye: acc.sermaye + Number(row.sermaye),
        brut: acc.brut + row.brutKar,
        stopaj: acc.stopaj + row.stopaj,
        net: acc.net + row.netOdeme,
      }),
      { hisse: 0, sermaye: 0, brut: 0, stopaj: 0, net: 0 },
    );
  }, [rows]);

  async function savePartner() {
    setError(null);
    const body = { ...form, hisse_oran: Number(form.hisse_oran), sermaye: Number(form.sermaye) };
    if (editing === "new") await api("/kobi/ortak", { method: "POST", body });
    else if (typeof editing === "number") await api(`/kobi/ortak/${editing}`, { method: "PUT", body });
    setEditing(null);
    await load(netKar);
  }

  async function removePartner(id: number) {
    if (!window.confirm("Bu ortak kaydı silinsin mi?")) return;
    await api(`/kobi/ortak/${id}`, { method: "DELETE" });
    await load(netKar);
  }

  async function saveExpense() {
    setError(null);
    await api("/kobi/gider", { method: "POST", body: { ...gider, tutar: Number(gider.tutar) } });
    setGider({ ...gider, aciklama: "", tutar: 0 });
    await load(netKar);
  }

  async function removeExpense(id: number) {
    if (!window.confirm("Bu gider kaydı silinsin mi?")) return;
    await api(`/kobi/gider/${id}`, { method: "DELETE" });
    await load(netKar);
  }

  async function approve() {
    setError(null);
    const result = await api<{ message: string }>("/kobi/dagitim", { method: "POST", body: { net_kar: Number(netKar) } });
    setNotice(result.message);
  }

  if (mode === "yatirim") {
    return (
      <section className="dash-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Yatırım Giderleri</h3>
        <p className="dash-chart-sub">Girilen kayıtların toplamı, ortaklık yapısında hisse oranına göre paylaştırılır.</p>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div className="kobi-form">
          <input type="date" value={gider.tarih} onChange={(e) => setGider({ ...gider, tarih: e.target.value })} />
          <input placeholder="Açıklama" value={gider.aciklama} onChange={(e) => setGider({ ...gider, aciklama: e.target.value })} />
          <select value={gider.kategori} onChange={(e) => setGider({ ...gider, kategori: e.target.value })}>
            <option value="KURULUS">Kuruluş</option>
            <option value="DEMIRBAS">Demirbaş</option>
            <option value="DIGER">Diğer</option>
          </select>
          <AmountInput placeholder="Tutar" value={gider.tutar} onValueChange={(tutar) => setGider({ ...gider, tutar })} />
          <button type="button" className="dash-ai-btn" onClick={() => saveExpense().catch((err: unknown) => setError(err instanceof Error ? err.message : "Kayıt yapılamadı."))}>Kaydet</button>
        </div>
        <table className="data-table" style={{ width: "100%", marginTop: 12 }}>
          <thead>
            <tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th>Tutar</th><th></th></tr>
          </thead>
          <tbody>
            {(summary?.giderler || []).map((row) => (
              <tr key={row.id}>
                <td>{row.tarih}</td>
                <td>{row.aciklama}</td>
                <td>{row.kategori}</td>
                <td>₺{money(row.tutar)}</td>
                <td><button type="button" onClick={() => removeExpense(row.id)}>Sil</button></td>
              </tr>
            ))}
            {!summary?.giderler.length ? <tr><td colSpan={5}>Kayıt yok</td></tr> : null}
          </tbody>
        </table>
        <p><strong>Toplam yatırım gideri: ₺{money(summary?.gider_toplam || 0)}</strong></p>
      </section>
    );
  }

  const hisse = summary?.hisse_toplam || 0;
  return (
    <div>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {notice ? <p style={{ color: "#166534" }}>{notice}</p> : null}
      <div className="kobi-grid">
        <section className="dash-card" style={{ padding: 16 }}>
          <div className="dash-chart-head">
            <h3>Ortaklık Yapısı</h3>
            <button type="button" className="dash-ai-btn" onClick={() => { setEditing("new"); setForm({ ad: "", rol: "Ortak", hisse_oran: 0, sermaye: 0 }); }}>+ Ortak Ekle</button>
          </div>
          <div style={{ height: 220 }}>
            {rows.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={rows} dataKey="hisseOran" nameKey="ad" innerRadius={58} outerRadius={88} paddingAngle={2}>
                    {rows.map((row, index) => <Cell key={row.id} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `%${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="dash-chart-sub">Henüz ortak yok.</p>}
          </div>
          <div className="kobi-legend">
            {rows.map((row, index) => (
              <span key={row.id}><i style={{ background: COLORS[index % COLORS.length] }} />{row.ad} (%{row.hisseOran})</span>
            ))}
          </div>
          {editing !== null ? (
            <div className="kobi-form">
              <input placeholder="Ad" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((rol) => <option key={rol}>{rol}</option>)}
              </select>
              <input type="number" min={0} max={100} step="0.01" placeholder="Hisse %" value={form.hisse_oran || ""} onChange={(e) => setForm({ ...form, hisse_oran: Number(e.target.value) })} />
              <AmountInput placeholder="Sermaye" value={form.sermaye} onValueChange={(sermaye) => setForm({ ...form, sermaye })} />
              <button type="button" onClick={() => savePartner().catch((err: unknown) => setError(err instanceof Error ? err.message : "Ortak kaydedilemedi."))}>Kaydet</button>
              <button type="button" onClick={() => setEditing(null)}>Vazgeç</button>
            </div>
          ) : null}
          <ul className="kobi-partners">
            {rows.map((row, index) => (
              <li key={row.id}>
                <span className="dot" style={{ background: COLORS[index % COLORS.length] }} />
                <div>
                  <strong>{row.ad}</strong>
                  <p>{row.rol} · %{row.hisseOran} hisse · ₺{money(row.sermaye)} sermaye</p>
                  <p>Gider payı ₺{money(row.giderPayi)} · Fark ₺{money(row.fark)}</p>
                </div>
                <button type="button" aria-label="Düzenle" onClick={() => { setEditing(row.id); setForm({ ad: row.ad, rol: row.rol, hisse_oran: row.hisseOran, sermaye: row.sermaye }); }}>✎</button>
                <button type="button" onClick={() => removePartner(row.id)}>Sil</button>
              </li>
            ))}
          </ul>
        </section>
        <section className="dash-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Sermaye Karşılaştırması</h3>
          <p className="dash-chart-sub">Hisse toplamı %{money(hisse)}</p>
          <div className="kobi-bar"><span style={{ width: `${Math.max(0, Math.min(100, hisse))}%` }} /></div>
          <div className="kobi-stat"><span>Toplam sermaye</span><strong>₺{money(summary?.sermaye_toplam || 0)}</strong></div>
          <div className="kobi-stat"><span>Yatırım giderleri</span><strong>₺{money(summary?.gider_toplam || 0)}</strong></div>
          <div className="kobi-stat"><span>Sermaye − gider farkı</span><strong>₺{money(summary?.fark_toplam || 0)}</strong></div>
          <div className="kobi-stat"><span>Kümülatif net kâr</span><strong>Hesaplanmadı</strong></div>
          <div className="kobi-stat"><span>Sermaye geri dönüş süresi</span><strong>Hesaplanmadı</strong></div>
          <p className="dash-chart-sub">{summary?.not}</p>
        </section>
      </div>

      <section className="dash-card" style={{ padding: 16, marginTop: 14 }}>
        <div className="dash-chart-head">
          <h3>Yıl Sonu Kâr Payı Dağıtımı (Tahmini)</h3>
          <button type="button" className="dash-ai-btn" onClick={() => load(netKar).catch((err: unknown) => setError(err instanceof Error ? err.message : "Hesaplanamadı."))}>Yeniden Hesapla</button>
        </div>
        <label className="kobi-profit">
          Dağıtılacak net kâr
          <AmountInput value={netKar} onValueChange={setNetKar} />
        </label>
        <table className="data-table" style={{ width: "100%", marginTop: 12 }}>
          <thead>
            <tr>
              <th>Ortak</th><th>Hisse</th><th>Sermaye</th><th>Brüt kâr payı</th><th>Stopaj (%10)</th><th>Net ödeme</th><th>Gider payı</th><th>Fark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.ad}</td>
                <td>%{row.hisseOran}</td>
                <td>₺{money(row.sermaye)}</td>
                <td className="kobi-money-green">₺{money(row.brutKar)}</td>
                <td className="kobi-money-red">₺{money(row.stopaj)}</td>
                <td>₺{money(row.netOdeme)}</td>
                <td>₺{money(row.giderPayi)}</td>
                <td>₺{money(row.fark)}</td>
              </tr>
            ))}
            <tr>
              <td>TOPLAM</td>
              <td>%{money(totals.hisse)}</td>
              <td>₺{money(totals.sermaye)}</td>
              <td>₺{money(totals.brut)}</td>
              <td>₺{money(totals.stopaj)}</td>
              <td>₺{money(totals.net)}</td>
              <td>₺{money(summary?.gider_toplam || 0)}</td>
              <td>₺{money(summary?.fark_toplam || 0)}</td>
            </tr>
          </tbody>
        </table>
        {Math.abs(totals.hisse - 100) > 0.05 ? <p className="dash-chart-sub">Hisse toplamı %100 değil. Dağıtım bu oranlarla yapılır.</p> : null}
        <div className="kobi-footer">
          <div>Ortaklara net ödeme<strong>₺{money(totals.net)}</strong></div>
          <button type="button" className="dash-ai-btn" onClick={() => approve().catch((err: unknown) => setError(err instanceof Error ? err.message : "Taslak kaydedilemedi."))}>Dağıtımı Onayla</button>
        </div>
      </section>
    </div>
  );
}
