import type { EBelgeFilters } from "../api/ebelgeApi";
import { useAppStore } from "@/store/appStore";

const GIB_OPTIONS = [
  { v: "", l: "Tüm durumlar" },
  { v: "BEKLEMEDE", l: "Beklemede" },
  { v: "GONDERILDI", l: "Gönderildi" },
  { v: "ONAYLANDI", l: "Onaylandı" },
  { v: "RED", l: "Red" },
  { v: "HATA", l: "Hata" },
  { v: "IPTAL", l: "İptal" },
];

const BELGE_OPTIONS = [
  { v: "", l: "Tüm tipler" },
  { v: "E_FATURA", l: "e-Fatura" },
  { v: "E_ARSIV", l: "e-Arşiv" },
  { v: "E_IRSALIYE", l: "e-İrsaliye" },
  { v: "E_MM", l: "e-MM" },
  { v: "KAGIT", l: "Kağıt" },
];

type Props = {
  filters: EBelgeFilters;
  onChange: (next: EBelgeFilters) => void;
  onApply: () => void;
  showEmmOption?: boolean;
};

export function EBelgeFiltersBar({ filters, onChange, onApply, showEmmOption }: Props) {
  const branches = useAppStore((s) => s.branches);
  const recordTypes = useAppStore((s) => s.recordTypes);

  function set<K extends keyof EBelgeFilters>(key: K, value: EBelgeFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div
      className="card"
      style={{
        padding: "12px 14px",
        marginBottom: 12,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 10,
        alignItems: "end",
      }}
    >
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Tarih (baş)
        </label>
        <input
          type="date"
          className="form-control"
          value={filters.date_from || ""}
          onChange={(e) => set("date_from", e.target.value || undefined)}
        />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Tarih (bit)
        </label>
        <input
          type="date"
          className="form-control"
          value={filters.date_to || ""}
          onChange={(e) => set("date_to", e.target.value || undefined)}
        />
      </div>
      <div style={{ gridColumn: "span 2" }}>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Cari / Belge no
        </label>
        <input
          type="text"
          className="form-control"
          placeholder="Ara…"
          value={filters.q || ""}
          onChange={(e) => set("q", e.target.value || undefined)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onApply();
          }}
        />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
          GİB durumu
        </label>
        <select
          className="form-control"
          value={filters.gib_status || ""}
          onChange={(e) => set("gib_status", e.target.value || undefined)}
        >
          {GIB_OPTIONS.map((o) => (
            <option key={o.v || "all"} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Belge tipi
        </label>
        <select
          className="form-control"
          value={filters.belge_tipi || ""}
          onChange={(e) => set("belge_tipi", e.target.value || undefined)}
        >
          {BELGE_OPTIONS.filter((o) => showEmmOption || o.v !== "E_MM").map((o) => (
            <option key={o.v || "all"} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Şube
        </label>
        <select
          className="form-control"
          value={filters.branch_id ?? ""}
          onChange={(e) =>
            set("branch_id", e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">Tümü</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code || b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
          Kayıt türü
        </label>
        <select
          className="form-control"
          value={filters.record_type_id ?? ""}
          onChange={(e) =>
            set("record_type_id", e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">Tümü</option>
          {recordTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.code || rt.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button type="button" className="btn-save" style={{ width: "100%" }} onClick={onApply}>
          Filtrele
        </button>
      </div>
    </div>
  );
}
