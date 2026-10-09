import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useAppStore } from "../store/appStore";
import { authApi, tenantApi, type TokenBundle } from "../services/api";
import { DIRTY_MSG } from "../hooks/useDirtyGuard";
import { stokUyariApi, type StockNotification } from "../modules/stok-uyari/api/stokUyariApi";

type Props = {
  onLogout: () => void;
  onToggleSidebar?: () => void;
};

const SEARCH_CATALOG = [
  { id: "makinalar", title: "Makina Parkuru", subtitle: "Makinelerin tüm detaylı tanım kartları, güç ve maliyetleri", path: "/app/uretim?section=makinalar", tag: "Üretim", icon: "⚙️" },
  { id: "maliyet-butcesi", title: "Maliyet Bütçesi", subtitle: "Elektrik birim fiyatı, çalışma günleri ve makine kapasiteleri", path: "/app/uretim?section=maliyet-butcesi", tag: "Üretim", icon: "💰" },
  { id: "is-plani", title: "İş Planı & Çizelgeleme", subtitle: "Haftalık ve aylık serbest üretim planı, Excel/PDF çıktısı", path: "/app/uretim?section=haftalik-plan", tag: "Üretim", icon: "📅" },
  { id: "bom", title: "Reçeteler (BOM)", subtitle: "Mamul ve yarı mamul reçeteleri, bileşen satırları", path: "/app/uretim?section=bom", tag: "Üretim", icon: "📋" },
  { id: "uretim-emirleri", title: "Üretim Emirleri", subtitle: "Planlanan ve serbest bırakılan üretim iş emirleri", path: "/app/uretim?section=emirler", tag: "Üretim", icon: "🏭" },
  { id: "mrp", title: "Malzeme İhtiyaç Planlaması (MRP)", subtitle: "Eksik hammadde ve sipariş ihtiyaç analizi", path: "/app/uretim?section=mrp", tag: "Üretim", icon: "📊" },
  { id: "stoklar", title: "Stok Kartları", subtitle: "Hammadde, yarı mamul, ticari mal ve birim tanımları", path: "/app/stok-depo?section=stok-kartlari", tag: "Stok", icon: "📦" },
  { id: "cariler", title: "Cari Hesap Kartları", subtitle: "Müşteri ve tedarikçi kartları, bakiye listesi", path: "/app/satis-satin-alma?section=cari-kartlar", tag: "Cari", icon: "👥" },
  { id: "satis-fatura", title: "Satış Faturaları", subtitle: "Toptan, perakende ve e-fatura satış belgeleri", path: "/app/satis-satin-alma?section=satis-faturalari", tag: "Satış", icon: "🧾" },
  { id: "alis-fatura", title: "Alış Faturaları", subtitle: "Satın alma ve mal kabul faturaları", path: "/app/satis-satin-alma?section=alis-faturalari", tag: "Satın Alma", icon: "📥" },
  { id: "kasa-banka", title: "Kasa & Banka Kartları", subtitle: "Banka hesapları, nakit kasalar ve POS cihazları", path: "/app/kart-tanimlari/kasa-banka", tag: "Finans", icon: "🏦" },
  { id: "gelir-gider", title: "Gelir & Gider Kartları", subtitle: "Hizmet, masraf ve diğer operasyonel gelir/giderler", path: "/app/kart-tanimlari/gelir-gider", tag: "Finans", icon: "⚖️" },
  { id: "hesap-plani", title: "Hesap Planı & Mizan", subtitle: "Tekdüzen hesap planı (TDHP), muavin ve mizan raporları", path: "/app/ayarlar?section=hesap-plani", tag: "Muhasebe", icon: "📑" },
  { id: "hesap-plani-ayarlari", title: "Hesap Planı Ayarları", subtitle: "Ayrışım işareti, kırılım derinliği ve seviye renkleri", path: "/app/ayarlar?section=hesap-plani-ayarlari", tag: "Ayarlar", icon: "🎨" },
  { id: "bildirim-ayarlari", title: "Bildirim Tanımları", subtitle: "Çek, vade, stok min. ve resmi süre uyarı eşikleri", path: "/app/ayarlar?section=bildirim", tag: "Ayarlar", icon: "🔔" },
  { id: "firma-bilgileri", title: "Firma Bilgileri & Lisans", subtitle: "Şirket profili, şubeler, kullanıcılar ve lisans detayı", path: "/app/ayarlar?section=firma", tag: "Ayarlar", icon: "🏢" },
  { id: "yevmiye", title: "Yevmiye Defteri", subtitle: "Resmi muhasebe fişleri ve yevmiye kayıtları", path: "/app/yevmiye", tag: "Muhasebe", icon: "📖" },
  { id: "raporlar", title: "Raporlar & Analizler", subtitle: "Stok, satış, finans ve üretim raporları", path: "/app/raporlar", tag: "Rapor", icon: "📈" },
];

const FALLBACK_NOTIFICATIONS = [
  { id: 1, text: "3 adet e-Fatura GİB onayı bekliyor", time: "5 dk önce" },
  { id: 2, text: "Merkez şube stok uyarısı: kritik seviye", time: "1 saat önce" },
  { id: 3, text: "Yeni kullanıcı daveti: muhasebe@firma.com", time: "Bugün" },
];

function relativeTr(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.round(hours / 24)} gün önce`;
}

export function Topbar({ onLogout, onToggleSidebar }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const companies = useAuthStore((s) => s.companies);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const pageTitle = useAppStore((s) => s.pageTitle);
  const workingYear = useAppStore((s) => s.workingYear);
  const setWorkingYear = useAppStore((s) => s.setWorkingYear);
  const isDirty = useAppStore((s) => s.isDirty);
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const setBranchId = useAppStore((s) => s.setBranchId);
  const setRecordTypeId = useAppStore((s) => s.setRecordTypeId);
  const recordTypeMeta = useAppStore((s) => s.recordTypeMeta);
  const setTenantLists = useAppStore((s) => s.setTenantLists);
  const setDirty = useAppStore((s) => s.setDirty);

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [stockNotifs, setStockNotifs] = useState<StockNotification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Akıllı Arama state'i
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const initials =
    String(user?.full_name || user?.username || "U")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        const inp = searchRef.current?.querySelector("input");
        inp?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const filteredCatalog = searchQuery.trim()
    ? SEARCH_CATALOG.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_CATALOG.slice(0, 8);

  function handleNavigate(path: string) {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(path);
  }

  useEffect(() => {
    if (!accessToken) return;
    stokUyariApi
      .notifications({ limit: 12 })
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : (rows as { items?: StockNotification[] })?.items ?? [];
        setStockNotifs(Array.isArray(list) ? list : []);
      })
      .catch(() => setStockNotifs([]));
  }, [accessToken, company?.id]);

  const notifsList = Array.isArray(stockNotifs) ? stockNotifs : [];
  const unreadCount = notifsList.filter((n) => !n.is_read).length;
  const displayNotifs =
    notifsList.length > 0
      ? notifsList.map((n) => ({
          id: n.id,
          text: n.title || n.message,
          time: relativeTr(n.created_at),
          stockId: n.id,
        }))
      : FALLBACK_NOTIFICATIONS.map((n) => ({ ...n, stockId: null as number | null }));

  async function onNotifClick(id: number, isLive: boolean) {
    if (!isLive) return;
    try {
      await stokUyariApi.markRead(id);
      setStockNotifs((prev) =>
        Array.isArray(prev) ? prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)) : []
      );
    } catch {
      /* sessiz */
    }
  }

  async function onSwitchCompany(companyId: number) {
    if (!accessToken) return;
    if (!companyId || Number(company?.id) === companyId) return;
    if (isDirty) {
      const ok = window.confirm(DIRTY_MSG);
      if (!ok) return;
      setDirty(false);
    }
    try {
      const res = await authApi.switchCompany(accessToken, companyId);
      setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        user: res.user,
        company: res.company,
        companies: res.companies,
        permissions:
          (res as TokenBundle & { permissions?: Record<string, string[]> }).permissions || {},
        role_code: String(
          (res as { role_code?: string }).role_code || res.company?.role_code || ""
        ),
      });
      const ctx = (await tenantApi.context(res.access_token)) as {
        branches: Array<{ id: number; code: string; name: string }>;
        record_types: Array<{
          id: number;
          code: string;
          name: string;
          muhasebelessin_mi?: boolean;
          raporda_gorunsun_mu?: boolean;
        }>;
      };
      setTenantLists(ctx.branches || [], ctx.record_types || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Şirket değiştirilemedi";
      window.alert(msg);
    }
  }

  function onLogoutClick() {
    if (isDirty) {
      const ok = window.confirm(DIRTY_MSG);
      if (!ok) return;
      setDirty(false);
    }
    onLogout();
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="btn-top sidebar-toggle"
          aria-label="Menüyü aç/kapat"
          onClick={onToggleSidebar}
        >
          ☰
        </button>

        {/* Akıllı Arama Alanı (Header Solunda) */}
        <div className="topbar-smart-search" ref={searchRef}>
          <div className="smart-search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="smart-search-input"
              placeholder="Akıllı Arama... (Modül, menü, işlem ara)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
            />
            <span className="search-shortcut" title="Kısayol: ⌘K veya Ctrl+K">⌘K</span>
            {searchQuery ? (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            ) : null}
          </div>

          {searchOpen && filteredCatalog.length > 0 && (
            <div className="smart-search-dropdown">
              <div className="search-results-header">
                <span>Hızlı Modül ve Menü Arama ({filteredCatalog.length})</span>
                <span className="search-hint">Tıklayarak doğrudan sayfaya gidin</span>
              </div>
              <div className="search-results-list">
                {filteredCatalog.map((item) => (
                  <div
                    key={item.id}
                    className="search-result-item"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span className="result-icon">{item.icon}</span>
                    <div className="result-info">
                      <div className="result-title-row">
                        <span className="result-title">{item.title}</span>
                        <span className="result-tag">{item.tag}</span>
                      </div>
                      <span className="result-subtitle">{item.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <h2 className="topbar-title">
          {pageTitle}
          {isDirty ? <span className="dirty-badge show">⚠️ Kaydedilmemiş Değişiklik Var!</span> : null}
        </h2>
      </div>
      <div className="topbar-right">
        <div className="global-kayit-turu-box">
          <span>Şirket:</span>
          <select
            value={Number(company?.id || 0)}
            onChange={(e) => onSwitchCompany(Number(e.target.value))}
            title="Yetkili olduğunuz şirketler arasında geçiş yapın"
          >
            {companies.length === 0 ? (
              <option value={0}>Şirket yok</option>
            ) : (
              companies.map((c) => (
                <option key={String(c.id)} value={Number(c.id)}>
                  {String(c.name)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Çalışma Yıl Bilgisi (Şirket alanının sağında) */}
        <div className="global-kayit-turu-box" title="Aktif Çalışma Mali Yılı">
          <span>Yıl:</span>
          <select
            value={workingYear}
            onChange={(e) => setWorkingYear(Number(e.target.value))}
            title="Çalışma Yılı"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>

        <div className="global-kayit-turu-box">
          <span>Şube:</span>
          <select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))}>
            {branches.length === 0 ? (
              <option value="">—</option>
            ) : (
              branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="global-kayit-turu-box" title="Global Kayıt Türü (GR-R)">
          <span>GR-R:</span>
          <select value={recordTypeId ?? ""} onChange={(e) => setRecordTypeId(Number(e.target.value))}>
            {recordTypes.length === 0 ? (
              <option value="">—</option>
            ) : (
              recordTypes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))
            )}
          </select>
          {recordTypeMeta && !recordTypeMeta.muhasebelessin_mi ? (
            <span
              className="dirty-badge"
              style={{ marginLeft: 6, background: "#fef3c7", color: "#92400e" }}
              title="Gayri Resmi — muhasebeleşme kapalı"
            >
              GR
            </span>
          ) : null}
        </div>
        <div className="dropdown-group" ref={notifRef}>
          <button
            type="button"
            className="btn-top"
            title="Bildirimler"
            aria-expanded={notifOpen}
            onClick={() => {
              setNotifOpen((v) => !v);
              setUserOpen(false);
            }}
          >
            🔔
            {unreadCount > 0 || notifsList.length === 0 ? <span className="notif-dot" /> : null}
          </button>
          <div className={`dropdown-menu ${notifOpen ? "show" : ""}`} role="menu">
            <div className="dropdown-header">Bildirimler</div>
            {displayNotifs.map((n) => (
              <button
                key={n.id}
                type="button"
                className="dropdown-item notif-item"
                role="menuitem"
                onClick={() => onNotifClick(n.id, notifsList.length > 0)}
              >
                <span>{n.text}</span>
                <small>{n.time}</small>
              </button>
            ))}
            <div className="dropdown-footer">
              {notifsList.length > 0 ? "Stok uyarıları · FAZ 6" : "Tüm bildirimler · FAZ 2"}
            </div>
          </div>
        </div>
        <div className="dropdown-group" ref={userRef}>
          <button
            type="button"
            className="user-pill"
            aria-expanded={userOpen}
            onClick={() => {
              setUserOpen((v) => !v);
              setNotifOpen(false);
            }}
          >
            <div className="avatar-circle">{initials}</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {String(user?.full_name || user?.username)}
            </span>
            <span className="user-chevron">▾</span>
          </button>
          <div className={`dropdown-menu dropdown-menu-right ${userOpen ? "show" : ""}`} role="menu">
            <div className="dropdown-header">
              {String(user?.full_name || user?.username)}
              <small>{String(company?.name || "")}</small>
            </div>
            <button type="button" className="dropdown-item" role="menuitem" onClick={() => alert("Profil ekranı FAZ 2'de eklenecek.")}>
              👤 Profilim
            </button>
            <button type="button" className="dropdown-item" role="menuitem" onClick={() => alert("Hesap ayarları FAZ 2'de eklenecek.")}>
              ⚙️ Hesap Ayarları
            </button>
            <div className="dropdown-divider" />
            <button type="button" className="dropdown-item danger" role="menuitem" onClick={onLogoutClick}>
              🚪 Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
