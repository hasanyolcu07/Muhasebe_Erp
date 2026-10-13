import { useEffect, useState } from "react";
import { api } from "@/services/api";

type Departman = { id: number; code: string; name: string; isActive: boolean };
type Meslek = { id: number; kod: string; ad: string; kaynak: string };
type Isyeri = {
  id: number;
  tip: string;
  isyeri_kodu: string;
  kullanici_adi: string;
  unvan: string;
  sifre_var: boolean;
  is_active: boolean;
};

export function PersonelTanimlariPanel() {
  const [departmanlar, setDepartmanlar] = useState<Departman[]>([]);
  const [meslekler, setMeslekler] = useState<Meslek[]>([]);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function load() {
    const [d, m] = await Promise.all([
      api<{ items: Departman[] }>("/tanim/departman"),
      api<{ items: Meslek[] }>(`/tanim/meslek${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    ]);
    setDepartmanlar(d.items);
    setMeslekler(m.items);
  }

  useEffect(() => {
    void load().catch((e) => setMessage(e instanceof Error ? e.message : "Liste alınamadı"));
  }, [q]);

  return (
    <div className="ayar-form-card" style={{ display: "grid", gap: 16 }}>
      <div>
        <h3 style={{ marginTop: 0 }}>Personel tanımları — Departman</h3>
        <p>Personel kartındaki departman bu listeden seçilir.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="form-control" placeholder="Kod" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="form-control" placeholder="Departman adı" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="btn-top green"
            onClick={() => {
              void api("/tanim/departman", { method: "POST", body: { code, name } })
                .then(() => {
                  setCode("");
                  setName("");
                  return load();
                })
                .catch((e) => setMessage(e instanceof Error ? e.message : "Kayıt başarısız"));
            }}
          >
            Departman ekle
          </button>
        </div>
        <ul>
          {departmanlar.map((row) => (
            <li key={row.id}>
              {row.code} — {row.name}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Meslek listesi (SGK / ISCO-08)</h3>
        <p>Personel kartındaki görev bu sabit listeden gelir. Çevrimiçi güncelleme, https üzerindeki JSON listesinden kod ve ad alanlarını alır.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="form-control" placeholder="Meslek ara" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="form-control" placeholder="https://.../meslek.json" value={url} onChange={(e) => setUrl(e.target.value)} style={{ minWidth: 280 }} />
          <button
            type="button"
            className="btn-top blue"
            onClick={() => {
              void api<{ count: number }>("/tanim/meslek/guncelle", { method: "POST", body: { url } })
                .then((res) => {
                  setMessage(`${res.count} meslek güncellendi.`);
                  return load();
                })
                .catch((e) => setMessage(e instanceof Error ? e.message : "Güncelleme başarısız"));
            }}
          >
            Çevrimiçi güncelle
          </button>
        </div>
        <div style={{ maxHeight: 280, overflow: "auto", marginTop: 8 }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Meslek</th>
                <th>Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {meslekler.map((row) => (
                <tr key={row.id}>
                  <td>{row.kod}</td>
                  <td>{row.ad}</td>
                  <td>{row.kaynak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function SgkIsyeriPanel() {
  const [items, setItems] = useState<Isyeri[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ tip: "MERKEZ", isyeri_kodu: "", kullanici_adi: "", sifre: "", unvan: "" });

  async function load() {
    const res = await api<{ items: Isyeri[] }>("/tanim/sgk-isyeri");
    setItems(res.items);
  }

  useEffect(() => {
    void load().catch((e) => setMessage(e instanceof Error ? e.message : "İşyerleri alınamadı"));
  }, []);

  return (
    <div className="ayar-form-card">
      <h3 style={{ marginTop: 0 }}>SGK işyeri tanımları</h3>
      <p>Merkez ve şube için ayrı işyeri kodu, kullanıcı adı ve şifre tutulur. Şifre şifrelenerek saklanır ve ekrana geri yazılmaz.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        <select className="form-control" value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
          <option value="MERKEZ">Merkez</option>
          <option value="SUBE">Şube</option>
        </select>
        <input className="form-control" placeholder="İşyeri kodu" value={form.isyeri_kodu} onChange={(e) => setForm({ ...form, isyeri_kodu: e.target.value })} />
        <input className="form-control" placeholder="Ünvan" value={form.unvan} onChange={(e) => setForm({ ...form, unvan: e.target.value })} />
        <input className="form-control" placeholder="Kullanıcı adı" value={form.kullanici_adi} onChange={(e) => setForm({ ...form, kullanici_adi: e.target.value })} />
        <input className="form-control" type="password" placeholder="Şifre" value={form.sifre} onChange={(e) => setForm({ ...form, sifre: e.target.value })} />
        <button
          type="button"
          className="btn-top green"
          onClick={() => {
            void api("/tanim/sgk-isyeri", { method: "POST", body: form })
              .then(() => {
                setForm({ tip: "MERKEZ", isyeri_kodu: "", kullanici_adi: "", sifre: "", unvan: "" });
                return load();
              })
              .catch((e) => setMessage(e instanceof Error ? e.message : "Kayıt başarısız"));
          }}
        >
          Kaydet
        </button>
      </div>
      <table className="data-table" style={{ width: "100%", marginTop: 12 }}>
        <thead>
          <tr>
            <th>Tip</th>
            <th>İşyeri kodu</th>
            <th>Ünvan</th>
            <th>Kullanıcı</th>
            <th>Şifre</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{row.tip === "MERKEZ" ? "Merkez" : "Şube"}</td>
              <td>{row.isyeri_kodu}</td>
              <td>{row.unvan}</td>
              <td>{row.kullanici_adi}</td>
              <td>{row.sifre_var ? "Kayıtlı" : "Yok"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function KvkkPanel() {
  const [metin, setMetin] = useState("");
  const [personelYil, setPersonelYil] = useState(10);
  const [cariYil, setCariYil] = useState(10);
  const [gorev, setGorev] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api<{ kvkk_metin: string; personel_saklama_yil: number; cari_saklama_yil: number; gorev_ayrimi: boolean }>("/sistem/kvkk")
      .then((row) => {
        setMetin(row.kvkk_metin);
        setPersonelYil(row.personel_saklama_yil);
        setCariYil(row.cari_saklama_yil);
        setGorev(row.gorev_ayrimi);
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "KVKK metni alınamadı"));
  }, []);

  return (
    <div className="ayar-form-card">
      <h3 style={{ marginTop: 0 }}>KVKK aydınlatma ve saklama</h3>
      <textarea className="form-control" rows={6} value={metin} onChange={(e) => setMetin(e.target.value)} />
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        <label>
          Personel saklama (yıl)
          <input className="form-control" type="number" value={personelYil} onChange={(e) => setPersonelYil(Number(e.target.value))} />
        </label>
        <label>
          Cari saklama (yıl)
          <input className="form-control" type="number" value={cariYil} onChange={(e) => setCariYil(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={gorev} onChange={(e) => setGorev(e.target.checked)} /> Onaycı ile kaydeden ayrı olsun
        </label>
      </div>
      <p>Muhasebe defterleri VUK süresince saklanır. Bu yıl sayıları kimlik verisinin anonimleştirme politikasını tutar; defteri kendiliğinden silmez.</p>
      <button
        type="button"
        className="btn-top green"
        onClick={() => {
          void api("/sistem/kvkk", {
            method: "PUT",
            body: { kvkk_metin: metin, personel_saklama_yil: personelYil, cari_saklama_yil: cariYil, gorev_ayrimi: gorev },
          })
            .then(() => setMessage("KVKK ayarı kaydedildi."))
            .catch((e) => setMessage(e instanceof Error ? e.message : "Kayıt başarısız"));
        }}
      >
        Kaydet
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function DonemKilitPanel() {
  const [items, setItems] = useState<Array<{ id: number; year: number; is_closed: boolean }>>([]);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    return api<{ items: Array<{ id: number; year: number; is_closed: boolean }> }>("/sistem/donem").then((res) => setItems(res.items));
  }

  useEffect(() => {
    void load().catch((e) => setMessage(e instanceof Error ? e.message : "Dönemler alınamadı"));
  }, []);

  return (
    <div className="ayar-form-card">
      <h3 style={{ marginTop: 0 }}>Dönem kilidi</h3>
      <p>Kilitli mali döneme yevmiye, ticari belge ve ekstre düzeltmesi yazılmaz. Kesin fiş silinmez; düzeltme ters kayıtla yapılır.</p>
      <ul>
        {items.map((row) => (
          <li key={row.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{row.year}</span>
            <strong>{row.is_closed ? "Kilitli" : "Açık"}</strong>
            <button
              type="button"
              className="btn-top"
              onClick={() => {
                void api(`/sistem/donem/${row.id}/kilitle`, { method: "POST", body: { is_closed: !row.is_closed } })
                  .then(() => load())
                  .catch((e) => setMessage(e instanceof Error ? e.message : "Dönem güncellenemedi"));
              }}
            >
              {row.is_closed ? "Kilidi aç" : "Kilitle"}
            </button>
          </li>
        ))}
      </ul>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function OturumPanel() {
  const [items, setItems] = useState<Array<{ id: string; createdAt: string; expiresAt: string; ipAdresi?: string | null; userAgent?: string | null }>>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api<{ items: Array<{ id: string; createdAt: string; expiresAt: string; ipAdresi?: string | null; userAgent?: string | null }> }>("/auth/sessions")
      .then((res) => setItems(res.items || []))
      .catch((e) => setMessage(e instanceof Error ? e.message : "Oturumlar alınamadı"));
  }, []);

  return (
    <div className="ayar-form-card">
      <h3 style={{ marginTop: 0 }}>Kullanıcı oturum listesi</h3>
      <table className="data-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Açılış</th>
            <th>Bitiş</th>
            <th>Adres</th>
            <th>Tarayıcı</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.createdAt).toLocaleString("tr-TR")}</td>
              <td>{new Date(row.expiresAt).toLocaleString("tr-TR")}</td>
              <td>{row.ipAdresi || "—"}</td>
              <td>{row.userAgent || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function EntegratorPanel() {
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [environment, setEnvironment] = useState("test");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api<{ url: string; username: string; environment: string; sifre_var: boolean }>("/sistem/entegrator")
      .then((row) => {
        setUrl(row.url || "");
        setUsername(row.username || "");
        setEnvironment(row.environment || "test");
        if (row.sifre_var) setMessage("Kayıtlı entegratör şifresi duruyor. Yeni şifre yazılmazsa eskisi kalır.");
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Entegratör okunamadı"));
  }, []);

  return (
    <div className="ayar-form-card">
      <h3 style={{ marginTop: 0 }}>e-Fatura entegratörü</h3>
      <p>Belge, entegratör https adresinden kabul yanıtı gelmeden GİB onaylı işaretlenmez.</p>
      <div style={{ display: "grid", gap: 8, maxWidth: 480 }}>
        <input className="form-control" placeholder="https://entegrator..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="form-control" placeholder="Kullanıcı" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="form-control" type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="form-control" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          <option value="test">Test</option>
          <option value="live">Canlı</option>
        </select>
        <button
          type="button"
          className="btn-top green"
          onClick={() => {
            void api("/sistem/entegrator", { method: "PUT", body: { url, username, password, environment } })
              .then(() => setMessage("Entegratör kaydedildi."))
              .catch((e) => setMessage(e instanceof Error ? e.message : "Kayıt başarısız"));
          }}
        >
          Kaydet
        </button>
      </div>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function HesapYontemBar({ onChanged }: { onChanged: () => void }) {
  const [yontem, setYontem] = useState("7A");
  const [degerleme, setDegerleme] = useState("ORTALAMA");

  useEffect(() => {
    void api<{ maliyet_yontemi: string }>("/sistem/hesap-plani/yontem").then((row) => setYontem(row.maliyet_yontemi));
    void api<{ stok_degerleme: string }>("/fatura/stok-degerleme").then((row) => setDegerleme(row.stok_degerleme));
  }, []);

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        VUK maliyet
        <select
          className="form-control"
          value={yontem}
          onChange={(e) => {
            const next = e.target.value;
            void api("/sistem/hesap-plani/yontem", { method: "PUT", body: { maliyet_yontemi: next } }).then(() => {
              setYontem(next);
              onChanged();
            });
          }}
        >
          <option value="7A">7/A fonksiyonel</option>
          <option value="7B">7/B çeşit esası</option>
        </select>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        Stok değerleme
        <select
          className="form-control"
          aria-label="Stok değerleme"
          value={degerleme}
          onChange={(e) => {
            const next = e.target.value;
            void api("/fatura/stok-degerleme", { method: "PUT", body: { stok_degerleme: next } })
              .then(() => setDegerleme(next))
              .catch(() => setDegerleme(degerleme));
          }}
        >
          <option value="ORTALAMA">Ağırlıklı ortalama</option>
          <option value="FIFO">FIFO</option>
        </select>
      </label>
    </div>
  );
}
