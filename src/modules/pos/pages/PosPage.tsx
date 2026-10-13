import { useCallback, useEffect, useMemo, useState } from "react";
import { posApi, type PosCartLine, type PosCatalogItem } from "../api/posApi";
import { useAppStore } from "@/store/appStore";

const FALLBACK_GROUPS = [
  "Tüm Ürünler",
  "Sıcak İçecekler",
  "Restoran / Yemek",
  "Market & Barkodlu",
  "Soğuk İçecekler",
  "Atıştırmalık",
];

function money(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PosPage() {
  const branchId = useAppStore((s) => s.branchId);
  const [registerId, setRegisterId] = useState<number | null>(null);
  const [group, setGroup] = useState("Tüm Ürünler");
  const [groups, setGroups] = useState<string[]>(FALLBACK_GROUPS);
  const [items, setItems] = useState<PosCatalogItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [search, setSearch] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [heldCart, setHeldCart] = useState<PosCartLine[] | null>(null);
  const [lastSale, setLastSale] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    posApi.registers(branchId ?? undefined).then((regs) => {
      if (regs.length) setRegisterId(regs[0].id);
    });
  }, [branchId]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await posApi.catalog({
        branchId: branchId ?? undefined,
        q: search.trim() || undefined,
        group: group === "Tüm Ürünler" ? undefined : group,
      });
      setItems(res.items || []);
      const g = ["Tüm Ürünler", ...(res.groups || [])];
      // Keep fallback labels visible for UX even if empty DB groups
      for (const f of FALLBACK_GROUPS) {
        if (!g.includes(f)) g.push(f);
      }
      setGroups(g);
    } catch {
      setItems([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [branchId, group, search]);

  useEffect(() => {
    const t = setTimeout(() => void loadCatalog(), 200);
    return () => clearTimeout(t);
  }, [loadCatalog]);

  const totals = useMemo(() => {
    let ara = 0;
    let kdv = 0;
    for (const ln of lines) {
      const base = ln.qty * ln.unit_price * (1 - (ln.discount_rate || 0) / 100);
      const tax = base * (ln.tax_rate / 100);
      ara += base;
      kdv += tax;
    }
    const iskonto = ara * (discountPct / 100);
    const net = ara - iskonto;
    const kdvNet = kdv * (1 - discountPct / 100);
    return { ara, kdv: kdvNet, odenecek: net + kdvNet, iskonto };
  }, [lines, discountPct]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSelectedToCart() {
    const toAdd = items.filter((i) => selected.has(i.id));
    if (!toAdd.length) return;
    setLines((prev) => {
      const next = [...prev];
      for (const p of toAdd) {
        const idx = next.findIndex((l) => l.stock_id === p.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        } else {
          next.push({
            stock_id: p.id,
            barcode: p.barcode || p.code,
            description: p.name,
            qty: 1,
            unit_price: Number(p.sale_price),
            discount_rate: 0,
            tax_rate: Number(p.tax_rate),
          });
        }
      }
      return next;
    });
    setSelected(new Set());
  }

  async function addBySearchEnter() {
    if (!search.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const p = await posApi.lookup(search.trim(), branchId ?? undefined);
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.stock_id === p.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
          return copy;
        }
        return [
          ...prev,
          {
            stock_id: p.id,
            barcode: p.barcode || p.code,
            description: p.name,
            qty: 1,
            unit_price: Number(p.sale_price),
            discount_rate: 0,
            tax_rate: Number(p.tax_rate),
          },
        ];
      });
      setSearch("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ürün bulunamadı");
    } finally {
      setLoading(false);
    }
  }

  function setQty(i: number, qty: number) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, qty: Math.max(0.01, qty) } : l)));
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function pay(paymentType: "CASH" | "CARD" | "OTHER") {
    if (!registerId || lines.length === 0) return;
    setLoading(true);
    setMessage(null);
    try {
      try {
        await posApi.openShift(registerId, 0);
      } catch {
        /* shift already open */
      }
      const res = await posApi.completeSale({
        register_id: registerId,
        lines,
        payments: [{ payment_type: paymentType, amount: totals.odenecek }],
        discount_total: totals.iskonto,
      });
      setLastSale(`${res.sale_no} · ${money(Number(res.grand_total))} ₺`);
      setMessage(`Satış tamam: ${res.sale_no}`);
      setLines([]);
      setDiscountPct(0);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Satış başarısız");
    } finally {
      setLoading(false);
    }
  }

  function holdCart() {
    setHeldCart(lines);
    setLines([]);
    setMessage("Sepet bekletildi");
  }

  function recallHeld() {
    if (!heldCart?.length) return;
    setLines(heldCart);
    setHeldCart(null);
    setMessage("Bekletilen sepet geri alındı");
  }

  return (
    <div className="pos-root">
      <div className="header-bar">
        <div className="header-breadcrumb">Satış › Hızlı Satış (POS)</div>
        <div className="header-btns">
          {lastSale ? <span className="pos-last">Son: {lastSale}</span> : null}
        </div>
      </div>

      <div className="pos-groups">
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            className={`pos-group-btn${group === g ? " active" : ""}`}
            onClick={() => setGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="pos-layout">
        <div className="pos-main">
          <div className="pos-card">
            <div className="pos-card-head">
              <strong>{group} — Stok Listesi</strong>
              <button type="button" className="btn-save" disabled={!selected.size} onClick={addSelectedToCart}>
                Seçilenleri Sepete Ekle ({selected.size})
              </button>
            </div>
            {catalogLoading ? (
              <div className="pos-muted">Yükleniyor…</div>
            ) : (
              <div className="pos-stock-grid">
                {items.length === 0 ? (
                  <div className="pos-muted">Bu grupta ürün yok — barkod ile ekleyin.</div>
                ) : (
                  items.map((it) => (
                    <label key={it.id} className={`pos-stock-item${selected.has(it.id) ? " selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={selected.has(it.id)}
                        onChange={() => toggleSelect(it.id)}
                      />
                      <div>
                        <strong>{it.name}</strong>
                        <span>
                          {it.code} · {it.group_name}
                          {it.barcode ? ` · ${it.barcode}` : ""}
                        </span>
                        <em>{money(Number(it.sale_price))} ₺</em>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="pos-card pos-search-bar">
            <input
              className="form-control"
              placeholder="Barkod / stok kodu / ürün adı / grup — akıllı arama"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addBySearchEnter();
              }}
            />
            <button type="button" className="btn-primary" disabled={loading} onClick={() => void addBySearchEnter()}>
              Ekle
            </button>
          </div>

          <div className="pos-card">
            <strong>Sepet</strong>
            <table className="data-table" style={{ width: "100%", fontSize: 13, marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th style={{ width: 90 }}>Adet</th>
                  <th>Fiyat</th>
                  <th>KDV</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="pos-muted" style={{ textAlign: "center" }}>
                      Sepet boş
                    </td>
                  </tr>
                ) : (
                  lines.map((ln, i) => (
                    <tr key={`${ln.stock_id}-${i}`}>
                      <td>{ln.description}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min={0.01}
                          step={1}
                          value={ln.qty ?? 1}
                          onChange={(e) => setQty(i, Number(e.target.value))}
                        />
                      </td>
                      <td>{money(ln.unit_price)}</td>
                      <td>%{ln.tax_rate}</td>
                      <td>
                        <button type="button" className="btn-top" onClick={() => removeLine(i)}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pos-actions">
            <button type="button" className="btn-save" disabled={loading || !lines.length} onClick={() => void pay("CASH")}>
              Nakit
            </button>
            <button type="button" className="btn-primary" disabled={loading || !lines.length} onClick={() => void pay("CARD")}>
              Kredi Kartı
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!lines.length}
              onClick={() => {
                setMessage("Parçalı ödeme: önce nakit/kart tutarını bölün (yakında)");
              }}
            >
              Parçalı
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!lines.length}
              onClick={() => void pay("OTHER")}
            >
              Veresiye
            </button>
            <button type="button" className="btn-top" disabled={!lines.length} onClick={holdCart}>
              Beklet
            </button>
            <button type="button" className="btn-top" disabled={!heldCart?.length} onClick={recallHeld}>
              Bekleteni Al
            </button>
            <button
              type="button"
              className="btn-top"
              onClick={() => {
                const v = window.prompt("İskonto %", String(discountPct));
                if (v != null) setDiscountPct(Math.max(0, Math.min(100, Number(v) || 0)));
              }}
            >
              İskonto
            </button>
            <button type="button" className="btn-top" onClick={() => setLines([])}>
              Sepeti Temizle
            </button>
            <button type="button" className="btn-top" disabled={!lastSale} onClick={() => setMessage(lastSale)}>
              Son Satış
            </button>
          </div>
          {message ? <div className="pos-msg">{message}</div> : null}
        </div>

        <aside className="pos-side">
          <div className="pos-card pos-calc">
            <h3>Hesaplama</h3>
            <div className="pos-calc-row">
              <span>Ara Toplam</span>
              <strong>{money(totals.ara)} ₺</strong>
            </div>
            <div className="pos-calc-row">
              <span>İskonto ({discountPct}%)</span>
              <strong>-{money(totals.iskonto)} ₺</strong>
            </div>
            <div className="pos-calc-row">
              <span>KDV</span>
              <strong>{money(totals.kdv)} ₺</strong>
            </div>
            <div className="pos-calc-row total">
              <span>Ödenecek Tutar</span>
              <strong>{money(totals.odenecek)} ₺</strong>
            </div>
            <button
              type="button"
              className="btn-save"
              style={{ width: "100%", marginTop: 12 }}
              disabled={loading || !lines.length}
              onClick={() => void pay("CASH")}
            >
              Nakit Ödeme
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading || !lines.length}
              onClick={() => void pay("CARD")}
            >
              Kredi Kartı
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
