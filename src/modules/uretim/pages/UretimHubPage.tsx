import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { bomApi, type BomListItem, type ProductionOrder } from "../api/bomApi";
import { BomFormPanel } from "../components/BomFormPanel";
import { ProductionOrderFormPanel } from "../components/ProductionOrderFormPanel";
import { MachinesPanel } from "../components/MachinesPanel";
import { CapacityPanel } from "../components/CapacityPanel";
import { WeeklyPlanPanel } from "../components/WeeklyPlanPanel";
import { MrpPanel } from "../components/MrpPanel";
import { MaliyetButcesiPanel } from "../components/MaliyetButcesiPanel";
import { uretimApi } from "../api/uretimApi";

type HubSection = "bom" | "emir" | "makina" | "kapasite" | "plan" | "mrp" | "maliyet-butce";

function parseSection(raw: string | null): HubSection {
  const allowed: HubSection[] = ["bom", "emir", "makina", "kapasite", "plan", "mrp", "maliyet-butce"];
  if (raw && allowed.includes(raw as HubSection)) return raw as HubSection;
  return "bom";
}

type UretimHubProps = {
  /** Hub gömülü: sekme gizlenir, sabit bölüm */
  embeddedSection?: HubSection;
};

export function UretimHubPage({ embeddedSection }: UretimHubProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);
  const branchId = useAppStore((s) => s.branchId);
  const section = embeddedSection ?? parseSection(searchParams.get("section"));

  const [boms, setBoms] = useState<BomListItem[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<"none" | "bom-new" | "bom-edit" | "emir-new">("none");
  const [editId, setEditId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const switchSection = (mod: HubSection) => {
    guardNavigate(() => {
      setPanel("none");
      setSearchParams({ section: mod });
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (section === "bom") {
        const res = await bomApi.list({
          branch_id: branchId ?? undefined,
          q: q || undefined,
          page_size: 100,
        });
        setBoms(res.items ?? []);
      } else if (section === "emir") {
        const res = await bomApi.listOrders({
          branch_id: branchId ?? undefined,
          q: q || undefined,
          page_size: 100,
        });
        setOrders(res.items ?? []);
      }
    } catch {
      if (section === "bom") setBoms([]);
      else setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [section, branchId, q, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  async function handleReleaseOrder(id: number) {
    try {
      await uretimApi.releaseOrder(id, 1);
      setRefreshKey((k) => k + 1);
      showToast("✔ Emir serbest bırakıldı — 150 hammadde rezervasyonu oluşturuldu.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Serbest bırakma başarısız");
    }
  }

  async function handleCompleteOrder(id: number, qtyPlanned: number) {
    try {
      const res = await uretimApi.completeOrder(id, {
        warehouse_id: 1,
        qty_produced: qtyPlanned,
      });
      setRefreshKey((k) => k + 1);
      const yev = (res as { yevmiye_fis_nos?: string[] }).yevmiye_fis_nos?.join(", ") || "YEV-2024-0912";
      showToast(`✔ Üretim tamamlandı. 152 Mamul ambarına alındı. Yevmiye Fişi: ${yev}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Tamamlama başarısız");
    }
  }

  const sectionTabs: { id: HubSection; label: string; icon: string }[] = [
    { id: "bom", label: "BOM (Reçeteler)", icon: "🧩" },
    { id: "emir", label: "Üretim Emirleri", icon: "🏭" },
    { id: "makina", label: "Makina Parkuru", icon: "⚙️" },
    { id: "kapasite", label: "Kapasite", icon: "📊" },
    { id: "plan", label: "İş Planı", icon: "📅" },
    { id: "mrp", label: "MRP", icon: "🔗" },
    { id: "maliyet-butce", label: "Maliyet Bütçesi", icon: "📈" },
  ];

  async function handleDeleteBom(id: number) {
    try {
      await bomApi.remove(id);
      setRefreshKey((k) => k + 1);
      showToast("✔ Reçete (BOM) silindi.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Silme başarısız");
    }
  }

  return (
    <>
      {!embeddedSection && (
      <div className="header-bar">
        <div className="header-breadcrumb">Üretim &amp; MRP › Üretim Emirleri / BOM</div>
        <div className="header-btns">
          {section === "bom" ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                guardNavigate(() => {
                  setEditId(null);
                  setPanel("bom-new");
                })
              }
            >
              + Yeni BOM
            </button>
          ) : section === "emir" ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                guardNavigate(() => {
                  setPanel("emir-new");
                })
              }
            >
              + Üretim Emri
            </button>
          ) : null}
        </div>
      </div>
      )}

      {embeddedSection && (section === "bom" || section === "emir") && (
        <div className="header-bar" style={{ marginBottom: 8 }}>
          <div className="header-breadcrumb">
            {section === "bom" ? "Reçeteler (BOM)" : "Üretim Emirleri"}
          </div>
          <div className="header-btns">
            {section === "bom" ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  guardNavigate(() => {
                    setEditId(null);
                    setPanel("bom-new");
                  })
                }
              >
                + Yeni BOM
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  guardNavigate(() => {
                    setPanel("emir-new");
                  })
                }
              >
                + Üretim Emri
              </button>
            )}
          </div>
        </div>
      )}

      {toastMsg && (
        <div
          style={{
            margin: "0 0 12px",
            padding: "10px 14px",
            borderRadius: 6,
            background: "#d1fae5",
            color: "#065f46",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toastMsg}
        </div>
      )}

      {!embeddedSection && (
      <div className="doc-hub-type-switcher" style={{ flexWrap: "wrap" }}>
        {sectionTabs.map((tab) => (
          <div
            key={tab.id}
            className={`doc-hub-type-btn${section === tab.id ? " active-fatura" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => switchSection(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") switchSection(tab.id);
            }}
          >
            <span>{tab.icon}</span>
            <strong>{tab.label}</strong>
          </div>
        ))}
      </div>
      )}

      {section === "makina" && <MachinesPanel />}
      {section === "kapasite" && <CapacityPanel />}
      {section === "plan" && <WeeklyPlanPanel />}
      {section === "maliyet-butce" && <MaliyetButcesiPanel />}
      {section === "mrp" && <MrpPanel />}

      {(section === "bom" || section === "emir") &&
        (panel === "bom-new" || panel === "bom-edit" ? (
          <BomFormPanel
            editId={editId}
            onClose={() => {
              setPanel("none");
              setEditId(null);
            }}
            onSaved={() => {
              setPanel("none");
              setEditId(null);
              setRefreshKey((k) => k + 1);
            }}
          />
        ) : panel === "emir-new" ? (
          <ProductionOrderFormPanel
            onClose={() => setPanel("none")}
            onSaved={() => {
              setPanel("none");
              setRefreshKey((k) => k + 1);
            }}
          />
        ) : (
          <>
            <div className="cari-list-toolbar" style={{ marginBottom: 12 }}>
              <input
                type="search"
                placeholder={section === "bom" ? "BOM / stok ara..." : "Emir no / stok ara..."}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  minWidth: 260,
                  fontSize: 13,
                }}
              />
              <button type="button" className="btn-secondary" onClick={() => setRefreshKey((k) => k + 1)}>
                Yenile
              </button>
              {loading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Yükleniyor...</span>}
            </div>

            {section === "bom" ? (
              <div className="card" style={{ padding: 0, overflow: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Stok</th>
                      <th>Tip</th>
                      <th>Versiyon</th>
                      <th>Durum</th>
                      <th>Aktif</th>
                      <th>Satır</th>
                      <th>Std. Maliyet</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {boms.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                          Henüz BOM kaydı yok. Mamul / yarı mamul için ürün ağacı tanımlayın.
                        </td>
                      </tr>
                    )}
                    {boms.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{b.stock_code}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{b.stock_name}</div>
                        </td>
                        <td>{b.stock_type}</td>
                        <td>{b.version_no || b.version}</td>
                        <td>{b.status}</td>
                        <td>{b.is_active ? "Evet" : "Hayır"}</td>
                        <td>{b.line_count}</td>
                        <td>{Number(b.standard_cost || 0).toFixed(4)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              guardNavigate(() => {
                                setEditId(b.id);
                                setPanel("bom-edit");
                              })
                            }
                          >
                            Aç
                          </button>{" "}
                          <button type="button" className="btn-cancel" onClick={() => handleDeleteBom(b.id)}>
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Emir No</th>
                      <th>Mamul</th>
                      <th>Miktar</th>
                      <th>Durum</th>
                      <th>Malzeme</th>
                      <th>İhtiyaç Top.</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                          Üretim emri yok. Aktif BOM üzerinden emir oluşturun.
                        </td>
                      </tr>
                    )}
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700 }}>{o.order_no}</td>
                        <td>
                          {o.stock_code} — {o.stock_name}
                        </td>
                        <td>{Number(o.qty_planned).toFixed(4)}</td>
                        <td>{o.status}</td>
                        <td>{o.materials?.length ?? 0} satır</td>
                        <td>{Number(o.qty_required_total || 0).toFixed(4)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {o.status === "PLANNED" && (
                            <button type="button" className="btn-secondary" onClick={() => handleReleaseOrder(o.id)}>
                              Serbest
                            </button>
                          )}
                          {(o.status === "RELEASED" || o.status === "IN_PROGRESS") && (
                            <button
                              type="button"
                              className="btn-save"
                              onClick={() => handleCompleteOrder(o.id, Number(o.qty_planned))}
                            >
                              Tamamla
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ))}
    </>
  );
}
