import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/api";

type Block = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  text?: string;
  dataField?: string;
  align?: string;
  fontSize?: number;
  locked?: boolean;
};

type Settings = {
  gorunum: { pageSize: string; showBorders: boolean };
  konum: { align: string; marginMm: number };
  renk: { header: string; text: string; tableBg: string; accent: string };
  metin: { intro: string; fixedNote: string; closing: string };
};

type Template = {
  id?: number;
  code?: string;
  name: string;
  doc_type: string;
  is_gib: boolean;
  is_default: boolean;
  logo_url?: string | null;
  settings: Settings;
  blocks: Block[];
};

const DOC_TYPES = [
  { value: "EFATURA", label: "e-Fatura (GİB)" },
  { value: "EARSIV", label: "e-Arşiv (GİB)" },
  { value: "EIRSALIYE", label: "e-İrsaliye (GİB)" },
  { value: "KURUMSAL", label: "Kurumsal Form" },
  { value: "POS_ADISYON", label: "POS Adisyon" },
];

const PALETTE = [
  { type: "logo", label: "Logo" },
  { type: "party", label: "Alıcı Cari" },
  { type: "table", label: "Ürün Tablosu" },
  { type: "totals", label: "Toplamlar" },
  { type: "qr", label: "QR" },
  { type: "payment", label: "Ödeme Planı" },
  { type: "seal", label: "Kaşe" },
  { type: "notes", label: "Dipnot" },
  { type: "text", label: "Metin" },
  { type: "meta", label: "Belge Meta" },
];

const DEFAULT_SETTINGS: Settings = {
  gorunum: { pageSize: "A4", showBorders: true },
  konum: { align: "left", marginMm: 10 },
  renk: { header: "#1e40af", text: "#0f172a", tableBg: "#f8fafc", accent: "#2563eb" },
  metin: { intro: "", fixedNote: "", closing: "Teşekkür ederiz." },
};

function uid() {
  return `b-${Math.random().toString(36).slice(2, 9)}`;
}

const GIB_LOCAL: Record<string, Block[]> = {
  EFATURA: [
    { id: "logo", type: "logo", x: 24, y: 24, w: 120, h: 56, label: "Logo", locked: true },
    { id: "title", type: "text", x: 200, y: 28, w: 340, h: 36, label: "e-FATURA", align: "center", fontSize: 18, locked: true },
    { id: "seller", type: "party", x: 24, y: 100, w: 260, h: 110, label: "Satıcı Bilgileri", dataField: "seller", locked: true },
    { id: "buyer", type: "party", x: 310, y: 100, w: 260, h: 110, label: "Alıcı Cari", dataField: "buyer", locked: true },
    { id: "meta", type: "meta", x: 24, y: 220, w: 546, h: 48, label: "Fatura No / Tarih / ETN", dataField: "invoice_meta", locked: true },
    { id: "lines", type: "table", x: 24, y: 280, w: 546, h: 280, label: "Ürün Tablosu", dataField: "lines", locked: true },
    { id: "totals", type: "totals", x: 340, y: 580, w: 230, h: 100, label: "Toplamlar", dataField: "totals", locked: true },
    { id: "qr", type: "qr", x: 24, y: 580, w: 90, h: 90, label: "QR", dataField: "qr", locked: true },
    { id: "notes", type: "notes", x: 24, y: 690, w: 546, h: 60, label: "Dipnot / Açıklama", dataField: "notes" },
  ],
  EARSIV: [
    { id: "logo", type: "logo", x: 24, y: 24, w: 120, h: 56, label: "Logo", locked: true },
    { id: "title", type: "text", x: 200, y: 28, w: 340, h: 36, label: "e-ARŞİV FATURA", align: "center", fontSize: 18, locked: true },
    { id: "seller", type: "party", x: 24, y: 100, w: 260, h: 110, label: "Satıcı Bilgileri", dataField: "seller", locked: true },
    { id: "buyer", type: "party", x: 310, y: 100, w: 260, h: 110, label: "Alıcı Cari", dataField: "buyer", locked: true },
    { id: "meta", type: "meta", x: 24, y: 220, w: 546, h: 48, label: "Belge No / Tarih", dataField: "invoice_meta", locked: true },
    { id: "lines", type: "table", x: 24, y: 280, w: 546, h: 260, label: "Ürün Tablosu", dataField: "lines", locked: true },
    { id: "totals", type: "totals", x: 340, y: 560, w: 230, h: 100, label: "Toplamlar", dataField: "totals", locked: true },
    { id: "qr", type: "qr", x: 24, y: 560, w: 90, h: 90, label: "QR", dataField: "qr", locked: true },
    { id: "pay", type: "payment", x: 130, y: 560, w: 190, h: 90, label: "Ödeme Planı", dataField: "payment" },
    { id: "notes", type: "notes", x: 24, y: 680, w: 546, h: 60, label: "Sabit Not", dataField: "notes" },
  ],
  EIRSALIYE: [
    { id: "logo", type: "logo", x: 24, y: 24, w: 120, h: 56, label: "Logo", locked: true },
    { id: "title", type: "text", x: 200, y: 28, w: 340, h: 36, label: "e-İRSALİYE", align: "center", fontSize: 18, locked: true },
    { id: "seller", type: "party", x: 24, y: 100, w: 260, h: 100, label: "Gönderici", dataField: "seller", locked: true },
    { id: "buyer", type: "party", x: 310, y: 100, w: 260, h: 100, label: "Alıcı", dataField: "buyer", locked: true },
    { id: "ship", type: "party", x: 24, y: 210, w: 546, h: 70, label: "Sevk / Taşıyıcı", dataField: "shipment", locked: true },
    { id: "lines", type: "table", x: 24, y: 300, w: 546, h: 280, label: "Mal Kalemleri", dataField: "lines", locked: true },
    { id: "seal", type: "seal", x: 400, y: 600, w: 170, h: 80, label: "Kaşe / İmza", dataField: "seal" },
    { id: "qr", type: "qr", x: 24, y: 600, w: 90, h: 90, label: "QR", dataField: "qr", locked: true },
  ],
  KURUMSAL: [
    { id: "logo", type: "logo", x: 24, y: 24, w: 140, h: 60, label: "Logo" },
    { id: "title", type: "text", x: 180, y: 32, w: 360, h: 40, label: "Kurumsal Form", align: "center", fontSize: 16 },
    { id: "intro", type: "notes", x: 24, y: 110, w: 546, h: 50, label: "Giriş Metni", dataField: "intro" },
    { id: "body", type: "table", x: 24, y: 180, w: 546, h: 320, label: "İçerik Tablosu", dataField: "body" },
    { id: "totals", type: "totals", x: 340, y: 520, w: 230, h: 90, label: "Toplamlar", dataField: "totals" },
    { id: "notes", type: "notes", x: 24, y: 630, w: 546, h: 70, label: "Kapanış Metni", dataField: "closing" },
  ],
  POS_ADISYON: [
    { id: "title", type: "text", x: 40, y: 20, w: 220, h: 30, label: "POS ADİSYON", align: "center", fontSize: 14, locked: true },
    { id: "meta", type: "meta", x: 24, y: 60, w: 250, h: 40, label: "Fiş No / Tarih", dataField: "sale_meta" },
    { id: "lines", type: "table", x: 24, y: 110, w: 250, h: 280, label: "Kalemler", dataField: "lines", locked: true },
    { id: "totals", type: "totals", x: 24, y: 400, w: 250, h: 80, label: "Ödenecek", dataField: "totals", locked: true },
  ],
};

export function SablonTasarimciPage() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState("EFATURA");
  const [name, setName] = useState("GİB e-Fatura Varsayılan");
  const [isDefault, setIsDefault] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocks, setBlocks] = useState<Block[]>(GIB_LOCAL.EFATURA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedList, setSavedList] = useState<Template[]>([]);
  const [activeTab, setActiveTab] = useState<"gorunum" | "konum" | "renk" | "metin">("gorunum");
  const [message, setMessage] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [templateId, setTemplateId] = useState<number | null>(null);

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) || null, [blocks, selectedId]);

  const loadList = useCallback(async () => {
    try {
      const res = await http.get<Template[]>("/sablon/list");
      setSavedList(res.data || []);
    } catch {
      setSavedList([]);
    }
  }, []);

  const loadGib = useCallback(async (dt: string) => {
    setMessage(null);
    try {
      const res = await http.get<{ blocks: Block[]; settings: Settings; is_gib: boolean }>(
        `/sablon/gib-preset/${dt}`,
      );
      setBlocks(res.data.blocks || GIB_LOCAL[dt] || []);
      setSettings({ ...DEFAULT_SETTINGS, ...(res.data.settings || {}) });
    } catch {
      setBlocks(GIB_LOCAL[dt] || []);
      setSettings(DEFAULT_SETTINGS);
    }
    setSelectedId(null);
    setTemplateId(null);
    const label = DOC_TYPES.find((d) => d.value === dt)?.label || dt;
    setName(`GİB ${label}`);
    setIsDefault(false);
  }, []);

  useEffect(() => {
    void loadList();
    void loadGib("EFATURA");
  }, [loadGib, loadList]);

  function onDocTypeChange(dt: string) {
    setDocType(dt);
    if (["EFATURA", "EARSIV", "EIRSALIYE", "KURUMSAL", "POS_ADISYON"].includes(dt)) {
      void loadGib(dt);
    }
  }

  function addBlock(type: string, label: string) {
    const b: Block = {
      id: uid(),
      type,
      x: 40,
      y: 40 + blocks.length * 12,
      w: type === "table" ? 500 : 180,
      h: type === "table" ? 160 : 70,
      label,
      text: label,
      dataField: type,
      align: "left",
      fontSize: 11,
      locked: false,
    };
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
  }

  function updateSelected(patch: Partial<Block>) {
    if (!selectedId) return;
    setBlocks((prev) => prev.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)));
  }

  function onCanvasMouseDown(e: React.MouseEvent, b: Block) {
    if (b.locked) {
      setSelectedId(b.id);
      return;
    }
    e.preventDefault();
    setSelectedId(b.id);
    setDragId(b.id);
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left - b.x, y: e.clientY - rect.top - b.y });
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!dragId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(560, e.clientX - rect.left - offset.x));
    const y = Math.max(0, Math.min(780, e.clientY - rect.top - offset.y));
    setBlocks((prev) => prev.map((b) => (b.id === dragId && !b.locked ? { ...b, x, y } : b)));
  }

  function onCanvasMouseUp() {
    setDragId(null);
  }

  async function saveTemplate() {
    const nm = window.prompt("Şablon adı", name);
    if (!nm) return;
    setName(nm);
    setMessage(null);
    const body = {
      name: nm,
      doc_type: docType,
      is_gib: ["EFATURA", "EARSIV", "EIRSALIYE"].includes(docType),
      is_default: isDefault,
      logo_url: logoUrl || null,
      settings,
      blocks,
    };
    try {
      if (templateId) {
        const res = await http.put<Template>(`/sablon/${templateId}`, body);
        setTemplateId(res.data.id!);
      } else {
        const res = await http.post<Template>("/sablon", body);
        setTemplateId(res.data.id!);
      }
      setMessage(`Şablon kaydedildi: ${nm}`);
      await loadList();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kayıt başarısız");
    }
  }

  async function openSaved(t: Template) {
    if (!t.id) return;
    try {
      const res = await http.get<Template>(`/sablon/${t.id}`);
      setTemplateId(res.data.id!);
      setName(res.data.name);
      setDocType(res.data.doc_type);
      setIsDefault(!!res.data.is_default);
      setLogoUrl(res.data.logo_url || "");
      setSettings({ ...DEFAULT_SETTINGS, ...(res.data.settings || {}) });
      setBlocks(res.data.blocks || []);
      setSelectedId(null);
      setMessage(`Açıldı: ${res.data.name}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Açılamadı");
    }
  }

  function pdfPreview() {
    window.print();
  }

  return (
    <div className="sablon-root">
      <div className="header-bar">
        <div className="header-breadcrumb">Raporlar › Şablon & Rapor Tasarımcısı</div>
        <div className="header-btns">
          <button type="button" className="btn-secondary" onClick={pdfPreview}>
            PDF Önizle
          </button>
          <button type="button" className="btn-save" onClick={() => void saveTemplate()}>
            Şablonu Kaydet
          </button>
        </div>
      </div>

      <div className="sablon-toolbar">
        <label>
          Şablon tipi
          <select className="form-control" value={docType} onChange={(e) => onDocTypeChange(e.target.value)}>
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sablon-grow">
          Ad
          <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="sablon-check">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Varsayılan
        </label>
        {["EFATURA", "EARSIV", "EIRSALIYE"].includes(docType) ? (
          <button type="button" className="btn-top" onClick={() => void loadGib(docType)}>
            GİB Standartını Yükle
          </button>
        ) : null}
      </div>

      {message ? <div className="sablon-msg">{message}</div> : null}

      <div className="sablon-layout">
        <aside className="sablon-left">
          <h4>Alanlar & Bloklar</h4>
          <div className="sablon-palette">
            {PALETTE.map((p) => (
              <button key={p.type} type="button" className="sablon-pal-btn" onClick={() => addBlock(p.type, p.label)}>
                + {p.label}
              </button>
            ))}
          </div>
          <h4 style={{ marginTop: 16 }}>Kayıtlı Şablonlar</h4>
          <ul className="sablon-saved">
            {savedList.length === 0 ? <li className="muted">Henüz yok</li> : null}
            {savedList.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => void openSaved(t)}>
                  {t.name}
                  <span>{t.doc_type}{t.is_gib ? " · GİB" : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="sablon-center">
          <div
            className="sablon-a4"
            style={{
              borderColor: settings.renk.accent,
              color: settings.renk.text,
              textAlign: settings.konum.align as React.CSSProperties["textAlign"],
            }}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          >
            <div className="sablon-a4-label">A4 · {docType}</div>
            {settings.metin.intro ? (
              <div className="sablon-intro" style={{ color: settings.renk.header }}>
                {settings.metin.intro}
              </div>
            ) : null}
            {blocks.map((b) => (
              <div
                key={b.id}
                className={`sablon-block${selectedId === b.id ? " selected" : ""}${b.locked ? " locked" : ""}`}
                style={{
                  left: b.x,
                  top: b.y,
                  width: b.w,
                  height: b.h,
                  fontSize: b.fontSize || 11,
                  textAlign: (b.align as React.CSSProperties["textAlign"]) || "left",
                  background: b.type === "table" ? settings.renk.tableBg : "#fff",
                  borderColor: selectedId === b.id ? settings.renk.accent : "#cbd5e1",
                }}
                onMouseDown={(e) => onCanvasMouseDown(e, b)}
              >
                <strong style={{ color: settings.renk.header }}>{b.label}</strong>
                <span>{b.dataField || b.type}</span>
                {b.locked ? <em>GİB</em> : null}
              </div>
            ))}
            {settings.metin.closing ? (
              <div className="sablon-closing">{settings.metin.closing}</div>
            ) : null}
          </div>
        </main>

        <aside className="sablon-right">
          <div className="sablon-tabs">
            {(["gorunum", "konum", "renk", "metin"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={activeTab === t ? "active" : ""}
                onClick={() => setActiveTab(t)}
              >
                {t === "gorunum" ? "Görünüm" : t === "konum" ? "Konum" : t === "renk" ? "Renk" : "Metin"}
              </button>
            ))}
          </div>

          {activeTab === "gorunum" ? (
            <div className="sablon-props">
              <label>
                Şablon adı
                <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Belge tipi
                <input className="form-control" value={docType} readOnly />
              </label>
              <label>
                Logo URL
                <input className="form-control" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              </label>
              <label className="sablon-check">
                <input
                  type="checkbox"
                  checked={settings.gorunum.showBorders}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, gorunum: { ...s.gorunum, showBorders: e.target.checked } }))
                  }
                />
                Kenarlık göster
              </label>
            </div>
          ) : null}

          {activeTab === "konum" ? (
            <div className="sablon-props">
              <label>
                Sayfa hizası
                <select
                  className="form-control"
                  value={settings.konum?.align ?? "left"}
                  onChange={(e) => setSettings((s) => ({ ...s, konum: { ...s.konum, align: e.target.value } }))}
                >
                  <option value="left">Sol</option>
                  <option value="center">Orta</option>
                  <option value="right">Sağ</option>
                </select>
              </label>
              {selected ? (
                <>
                  <label>
                    Öğe hizası
                    <select
                      className="form-control"
                      value={selected.align || "left"}
                      onChange={(e) => updateSelected({ align: e.target.value })}
                    >
                      <option value="left">Sol</option>
                      <option value="center">Orta</option>
                      <option value="right">Sağ</option>
                    </select>
                  </label>
                  <label>
                    Yazı boyutu
                    <input
                      type="number"
                      className="form-control"
                      min={8}
                      max={32}
                      value={selected.fontSize || 11}
                      onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Veri alanı
                    <input
                      className="form-control"
                      value={selected.dataField || ""}
                      onChange={(e) => updateSelected({ dataField: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <p className="excel-muted">Öğe seçin</p>
              )}
            </div>
          ) : null}

          {activeTab === "renk" ? (
            <div className="sablon-props">
              {(
                [
                  ["header", "Başlık"],
                  ["text", "Yazı"],
                  ["tableBg", "Tablo zemini"],
                  ["accent", "Vurgu"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="color"
                    className="form-control"
                    value={settings.renk?.[key] ?? "#000000"}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, renk: { ...s.renk, [key]: e.target.value } }))
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}

          {activeTab === "metin" ? (
            <div className="sablon-props">
              <label>
                Giriş metni
                <textarea
                  className="form-control"
                  rows={2}
                  value={settings.metin?.intro ?? ""}
                  onChange={(e) => setSettings((s) => ({ ...s, metin: { ...s.metin, intro: e.target.value } }))}
                />
              </label>
              <label>
                Sabit not
                <textarea
                  className="form-control"
                  rows={2}
                  value={settings.metin?.fixedNote ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, metin: { ...s.metin, fixedNote: e.target.value } }))
                  }
                />
              </label>
              <label>
                Kapanış metni
                <textarea
                  className="form-control"
                  rows={2}
                  value={settings.metin?.closing ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, metin: { ...s.metin, closing: e.target.value } }))
                  }
                />
              </label>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="page-footer-actions">
        <button type="button" className="btn-cancel" onClick={() => navigate("/app/dashboard")}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
