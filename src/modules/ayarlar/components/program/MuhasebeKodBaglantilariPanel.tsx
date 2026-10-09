import { useCallback, useEffect, useMemo, useState } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { lookupChartOfAccounts, type CoaLookup } from "@/services/coaApi";
import {
  sistemAyarlariApi,
  type AccountMapping,
  type AccountMappingModule,
  type ScopeLookupItem,
} from "../../api/sistemAyarlariApi";
import { AktifPasifToggle } from "../AktifPasifToggle";

const SCOPE_LABELS: Record<string, string> = {
  ITEM: "Kart / Kalem bazlı",
  GROUP: "Grup bazlı",
  SPECIAL: "Özel kod bazlı",
  OPERATION: "İşlem türü bazlı",
  ACCOUNT_OP: "Hesap + işlem bazlı",
};

const ENTITY_HINTS: Record<string, Record<string, string>> = {
  STOK: {
    ITEM: "Tanımlı stok kartlarından seçin",
    GROUP: "Stok grup kodlarından seçin (Kod Tanımları)",
    SPECIAL: "Stok özel kodlarından seçin (Kod Tanımları)",
  },
  CARI: {
    ITEM: "Tanımlı cari hesaplardan seçin",
    GROUP: "Cari grup kodlarından seçin (Kod Tanımları)",
    SPECIAL: "Cari özel kodlarından seçin (Kod Tanımları)",
  },
  GELIR: {
    ITEM: "Tanımlı gelir kartlarından seçin",
    GROUP: "Gelir gruplarından seçin",
    SPECIAL: "Gelir özel kodlarından seçin",
  },
  GIDER: {
    ITEM: "Tanımlı gider kartlarından seçin",
    GROUP: "Gider gruplarından seçin",
    SPECIAL: "Gider özel kodlarından seçin",
  },
  CEK_SENET: {
    ITEM: "Kayıtlı çek / senetlerden seçin",
    GROUP: "Çek-senet grup kodlarından seçin",
    SPECIAL: "Çek-senet özel kodlarından seçin",
  },
  BANKA: {
    ITEM: "Banka hesaplarından seçin",
    ACCOUNT_OP: "Banka hesaplarından seçin",
  },
};

type FormState = {
  scope_type: string;
  scope_ref_id: number | null;
  scope_ref_code: string;
  scope_ref_name: string;
  operation_code: string;
  coa_id: number | null;
  coa_label: string;
  is_active: boolean;
};

const emptyForm = (scopeType: string): FormState => ({
  scope_type: scopeType,
  scope_ref_id: null,
  scope_ref_code: "",
  scope_ref_name: "",
  operation_code: "",
  coa_id: null,
  coa_label: "",
  is_active: true,
});

type PickerItem = { id: number; code: string; name: string };

/** Compact searchable list picker — filter by code/name, click to select (no free-text only). */
function SearchableLookupPicker({
  label,
  searchLabel = "Ara (kod / ad)",
  query,
  onQueryChange,
  items,
  loading,
  selectedId,
  selectedCode,
  selectedName,
  onSelect,
  onClear,
  emptyText = "Sonuç yok — aramayı değiştirin veya Kod Tanımları’ndan ekleyin.",
  hint,
  selectedPrefix = "Seçili",
}: {
  label: string;
  searchLabel?: string;
  query: string;
  onQueryChange: (q: string) => void;
  items: PickerItem[];
  loading?: boolean;
  selectedId: number | null;
  selectedCode: string;
  selectedName: string;
  onSelect: (item: PickerItem) => void;
  onClear: () => void;
  emptyText?: string;
  hint?: string;
  selectedPrefix?: string;
}) {
  const hasSelection = !!(selectedId || selectedCode);

  return (
    <div className="map-lookup-picker">
      <div className="form-row compact">
        <label>{searchLabel}</label>
        <input
          className="form-control"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Kod veya ad yazın…"
          autoComplete="off"
        />
      </div>
      {hint && (
        <p className="muted" style={{ margin: "0 0 6px", fontSize: 11 }}>
          {hint}
        </p>
      )}
      <div className="form-row compact" style={{ alignItems: "flex-start" }}>
        <label>{label}</label>
        <div className="map-lookup-box">
          {hasSelection && (
            <div className="map-lookup-selected">
              <div>
                <span className="muted" style={{ fontSize: 11 }}>
                  {selectedPrefix}:{" "}
                </span>
                <code style={{ fontWeight: 700 }}>{selectedCode || "—"}</code>
                {selectedName ? (
                  <span style={{ marginLeft: 6, fontSize: 13 }}>{selectedName}</span>
                ) : null}
              </div>
              <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={onClear}>
                Temizle
              </button>
            </div>
          )}
          <div className="map-lookup-list" role="listbox" aria-label={label}>
            {loading && <div className="map-lookup-empty">Yükleniyor…</div>}
            {!loading && items.length === 0 && <div className="map-lookup-empty">{emptyText}</div>}
            {!loading &&
              items.map((ent) => {
                const active =
                  (selectedId != null && ent.id === selectedId) ||
                  (!!selectedCode && ent.code === selectedCode);
                return (
                  <button
                    key={`${ent.id}-${ent.code}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`map-lookup-item${active ? " is-selected" : ""}`}
                    onClick={() => onSelect(ent)}
                  >
                    <code>{ent.code}</code>
                    <span>{ent.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  items,
  onReload,
}: {
  module: AccountMappingModule;
  items: AccountMapping[];
  onReload: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(module.scope_modes[0] || "ITEM"));
  const [saving, setSaving] = useState(false);
  const [entityQ, setEntityQ] = useState("");
  const [entities, setEntities] = useState<ScopeLookupItem[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [coaQ, setCoaQ] = useState("");
  const [coaItems, setCoaItems] = useState<CoaLookup[]>([]);
  const [coaLoading, setCoaLoading] = useState(false);

  const needsEntity = ["ITEM", "GROUP", "SPECIAL", "ACCOUNT_OP"].includes(form.scope_type);
  const needsOp = ["OPERATION", "ACCOUNT_OP"].includes(form.scope_type);

  const entityHint =
    ENTITY_HINTS[module.code]?.[form.scope_type] ||
    ENTITY_HINTS[module.code]?.ITEM ||
    "Listeden seçin";

  const entityLabel =
    form.scope_type === "GROUP"
      ? "Grup kodu"
      : form.scope_type === "SPECIAL"
        ? "Özel kod"
        : form.scope_type === "ACCOUNT_OP"
          ? "Banka hesabı"
          : "Kaynak (kart / kalem)";

  const loadEntities = useCallback(async () => {
    if (!needsEntity) {
      setEntities([]);
      return;
    }
    const kind = form.scope_type === "ACCOUNT_OP" ? "ITEM" : form.scope_type;
    setEntitiesLoading(true);
    try {
      const res = await sistemAyarlariApi.mappingLookups({
        module_code: module.code,
        scope_type: kind,
        q: entityQ || undefined,
        limit: 60,
      });
      setEntities(res.items ?? []);
    } catch {
      setEntities([]);
    } finally {
      setEntitiesLoading(false);
    }
  }, [module.code, form.scope_type, entityQ, needsEntity]);

  useEffect(() => {
    if (!panelOpen || !needsEntity) return;
    const t = setTimeout(() => {
      void loadEntities();
    }, 220);
    return () => clearTimeout(t);
  }, [panelOpen, loadEntities, needsEntity]);

  useEffect(() => {
    if (!panelOpen) return;
    setCoaLoading(true);
    const t = setTimeout(() => {
      void lookupChartOfAccounts(coaQ || undefined, 50)
        .then(setCoaItems)
        .catch(() => setCoaItems([]))
        .finally(() => setCoaLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [coaQ, panelOpen]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm(module.scope_modes[0] || "ITEM"));
    setEntityQ("");
    setCoaQ("");
    setEntities([]);
    setPanelOpen(true);
  }

  function openEdit(row: AccountMapping) {
    setEditingId(row.id);
    setForm({
      scope_type: row.scope_type,
      scope_ref_id: row.scope_ref_id ?? null,
      scope_ref_code: row.scope_ref_code || "",
      scope_ref_name: row.scope_ref_name || "",
      operation_code: row.operation_code || "",
      coa_id: row.coa_id,
      coa_label: `${row.coa_code ?? ""} — ${row.coa_name ?? ""}`.replace(/^ — /, ""),
      is_active: row.is_active,
    });
    setEntityQ(row.scope_ref_code || "");
    setCoaQ(row.coa_code || "");
    setPanelOpen(true);
  }

  async function save() {
    if (!form.coa_id) {
      window.alert("Hesap planı kodu seçin");
      return;
    }
    if (needsEntity && !form.scope_ref_code && !form.scope_ref_id) {
      window.alert("Listeden bir kaynak seçin (kod / ad ile arayıp tıklayın)");
      return;
    }
    if (needsOp && !form.operation_code) {
      window.alert("İşlem türü zorunlu");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await sistemAyarlariApi.updateMapping(editingId, {
          scope_ref_id: form.scope_ref_id,
          scope_ref_code: form.scope_ref_code || null,
          scope_ref_name: form.scope_ref_name || null,
          operation_code: form.operation_code || null,
          coa_id: form.coa_id,
          is_active: form.is_active,
        });
      } else {
        await sistemAyarlariApi.createMapping({
          module_code: module.code,
          scope_type: form.scope_type,
          scope_ref_id: form.scope_ref_id,
          scope_ref_code: form.scope_ref_code || null,
          scope_ref_name: form.scope_ref_name || null,
          operation_code: form.operation_code || null,
          coa_id: form.coa_id,
          is_active: form.is_active,
        });
      }
      setPanelOpen(false);
      onReload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: AccountMapping) {
    if (!window.confirm(`${row.scope_ref_code || row.operation_code || row.id} silinsin mi?`)) return;
    try {
      await sistemAyarlariApi.deleteMapping(row.id);
      onReload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  const columns: DataTableColumn<AccountMapping>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Kod",
        width: 140,
        render: (r) => (
          <code style={{ fontWeight: 700 }}>
            {r.scope_ref_code || r.operation_code || "—"}
          </code>
        ),
      },
      {
        key: "name",
        header: "Ad",
        width: 220,
        render: (r) => {
          const parts = [
            r.scope_ref_name,
            r.operation_code ? `İşlem: ${r.operation_code}` : null,
            r.coa_code ? `${r.coa_code} ${r.coa_name ?? ""}` : null,
          ].filter(Boolean);
          return parts.join(" · ") || "—";
        },
      },
      {
        key: "scope",
        header: "Tür",
        width: 120,
        render: (r) => SCOPE_LABELS[r.scope_type] || r.scope_type,
      },
      {
        key: "status",
        header: "Durum",
        width: 90,
        render: (r) => (
          <span style={{ color: r.is_active ? "#15803d" : "#94a3b8", fontWeight: 700, fontSize: 12 }}>
            {r.is_active ? "Aktif" : "Pasif"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "İşlem",
        width: 150,
        render: (r) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: "2px 8px" }}
              onClick={() => openEdit(r)}
            >
              Değiştir
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11, padding: "2px 8px", color: "#b91c1c" }}
              onClick={() => void remove(r)}
            >
              Sil
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="ayar-form-card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 15,
            color: "#0f172a",
          }}
        >
          {open ? "▾" : "▸"} {module.title}
          <span className="muted" style={{ marginLeft: 8, fontWeight: 600, fontSize: 12 }}>
            ({items.length})
          </span>
        </button>
        <button type="button" className="btn-top green" onClick={openAdd}>
          + Ekle
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          <DataTable
            tableKey={`map-${module.code}`}
            columns={columns}
            data={items}
            rowKey={(r) => r.id}
            zebra
            emptyMessage="Henüz bağlantı yok. Ekle ile oluşturun."
          />
        </div>
      )}

      <SidePanel
        open={panelOpen}
        title={editingId ? `${module.title} — Değiştir` : `${module.title} — Ekle`}
        onClose={() => setPanelOpen(false)}
        size="md"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={() => setPanelOpen(false)}>
              Vazgeç
            </button>
            <button type="button" className="btn-save" disabled={saving} onClick={() => void save()}>
              Kaydet
            </button>
          </div>
        }
      >
        <div className="form-row compact">
          <label>Seçim Türü</label>
          <select
            className="form-control"
            value={form.scope_type ?? "OPERATION"}
            disabled={!!editingId}
            onChange={(e) => {
              setEntityQ("");
              setEntities([]);
              setForm((f) => ({
                ...emptyForm(e.target.value),
                is_active: f.is_active,
              }));
            }}
          >
            {module.scope_modes.map((m) => (
              <option key={m} value={m}>
                {SCOPE_LABELS[m] || m}
              </option>
            ))}
          </select>
        </div>

        {needsEntity && (
          <SearchableLookupPicker
            label={entityLabel}
            query={entityQ}
            onQueryChange={setEntityQ}
            items={entities}
            loading={entitiesLoading}
            selectedId={form.scope_ref_id}
            selectedCode={form.scope_ref_code}
            selectedName={form.scope_ref_name}
            hint={entityHint}
            onSelect={(ent) =>
              setForm((f) => ({
                ...f,
                scope_ref_id: ent.id,
                scope_ref_code: ent.code,
                scope_ref_name: ent.name,
              }))
            }
            onClear={() =>
              setForm((f) => ({
                ...f,
                scope_ref_id: null,
                scope_ref_code: "",
                scope_ref_name: "",
              }))
            }
          />
        )}

        {needsOp && (
          <div className="form-row compact">
            <label>İşlem Türü</label>
            <select
              className="form-control"
              value={form.operation_code ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, operation_code: e.target.value }))}
            >
              <option value="">Seçin…</option>
              {(module.operations || []).map((op) => (
                <option key={op.code} value={op.code}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <SearchableLookupPicker
          label="Muhasebe Kodu"
          searchLabel="Hesap Planı Ara"
          query={coaQ}
          onQueryChange={setCoaQ}
          items={coaItems.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
          loading={coaLoading}
          selectedId={form.coa_id}
          selectedCode={form.coa_label.split(" — ")[0] || ""}
          selectedName={form.coa_label.includes(" — ") ? form.coa_label.split(" — ").slice(1).join(" — ") : form.coa_label}
          hint="Hesap planından kod seçin"
          selectedPrefix="Seçili hesap"
          emptyText="Hesap bulunamadı — kod veya ad ile arayın."
          onSelect={(c) =>
            setForm((f) => ({
              ...f,
              coa_id: c.id,
              coa_label: `${c.code} — ${c.name}`,
            }))
          }
          onClear={() => setForm((f) => ({ ...f, coa_id: null, coa_label: "" }))}
        />

        <div className="form-row compact">
          <label>Durum</label>
          <AktifPasifToggle
            value={form.is_active}
            onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
        </div>
      </SidePanel>
    </div>
  );
}

export const DEFAULT_12_MAPPING_MODULES: AccountMappingModule[] = [
  {
    code: "FATURA_SATIS",
    title: "1. Satış Faturaları Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 1)",
    scope_modes: ["OPERATION", "GROUP", "ITEM"],
    operations: [
      { code: "YURTICI_SATIS", label: "Yurt İçi Satışlar (600)" },
      { code: "IHRACAT_SATIS", label: "İhracat Satışları (601)" },
      { code: "HESAPLANAN_KDV", label: "Hesaplanan KDV (391)" },
      { code: "ALICILAR", label: "Alıcılar / Cari (120)" },
      { code: "SATIS_ISKONTO", label: "Satış İskontoları (611)" },
      { code: "SATIS_IADE", label: "Satıştan İadeler (610)" },
    ],
  },
  {
    code: "FATURA_ALIS",
    title: "2. Alış Faturaları Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 2)",
    scope_modes: ["OPERATION", "GROUP", "ITEM"],
    operations: [
      { code: "TICARI_MALLAR", label: "Ticari Mallar Alışı (153)" },
      { code: "ILK_MADDE", label: "İlk Madde ve Malzeme (150)" },
      { code: "INDIRILECEK_KDV", label: "İndirilecek KDV (191)" },
      { code: "SATICILAR", label: "Satıcılar / Cari (320)" },
      { code: "ALIS_ISKONTO", label: "Alış İskontosu (153/649)" },
      { code: "ALIS_MASRAF", label: "Alış Masrafları / Nakliye (153/770)" },
    ],
  },
  {
    code: "KASA",
    title: "3. Kasa İşlemleri Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 3)",
    scope_modes: ["OPERATION", "ITEM"],
    operations: [
      { code: "KASA_TAHSILAT", label: "Nakit Kasa Tahsilatı (100 Borç)" },
      { code: "KASA_TEDIYE", label: "Nakit Kasa Tediye (100 Alacak)" },
      { code: "KASA_VIRMAN", label: "Kasalar Arası Virman (100 Borç/Alacak)" },
    ],
  },
  {
    code: "BANKA",
    title: "4. Banka İşlemleri Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 4)",
    scope_modes: ["OPERATION", "ITEM", "ACCOUNT_OP"],
    operations: [
      { code: "GELEN_HAVALE", label: "Gelen Havale / EFT (102 Borç)" },
      { code: "GIDEN_HAVALE", label: "Giden Havale / EFT (102 Alacak)" },
      { code: "BANKA_MASRAFI", label: "Banka Masraf & Komisyonu (770 Borç)" },
      { code: "KREDI_KULLANIM", label: "Banka Kredisi Kullanımı (102 Borç / 300 Alacak)" },
    ],
  },
  {
    code: "CEK_SENET",
    title: "5. Çek / Senet İşlemleri Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 5)",
    scope_modes: ["OPERATION", "GROUP"],
    operations: [
      { code: "CEK_GIRIS", label: "Portföye Çek Girişi (101 Borç)" },
      { code: "CEK_CIRO", label: "Müşteri Çeki Cirosu (320 Borç / 101 Alacak)" },
      { code: "CEK_TAHSIL", label: "Bankada Çek Tahsili (102 Borç / 101 Alacak)" },
      { code: "CEK_PROTESTO", label: "Karşılıksız / Protestolu Çek (101.99)" },
      { code: "SENET_GIRIS", label: "Alacak Senedi Girişi (121 Borç)" },
      { code: "SENET_TEDIYE", label: "Borç Senedi Çıkışı (321 Alacak)" },
    ],
  },
  {
    code: "STOK_HAREKET",
    title: "6. Stok & Depo Fişleri Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 6)",
    scope_modes: ["OPERATION", "GROUP", "ITEM"],
    operations: [
      { code: "SAYIM_FAZLASI", label: "Sayım Fazlası (153 Borç / 679 Alacak)" },
      { code: "SAYIM_NOKSANI", label: "Sayım Noksanı (689 Borç / 153 Alacak)" },
      { code: "SARF_FISI", label: "Sarf / Tüketim Fişi (710/730/770 Borç / 150/153 Alacak)" },
      { code: "FIRE_FISI", label: "Fire / Değer Düşüklüğü (689 Borç / 153 Alacak)" },
    ],
  },
  {
    code: "URETIM",
    title: "7. Üretim & MRP Fişleri Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 7)",
    scope_modes: ["OPERATION", "GROUP", "ITEM"],
    operations: [
      { code: "HAMMADDE_CIKIS", label: "Hammadde Üretime Sevk (710 Borç / 150 Alacak)" },
      { code: "ISCILIK_GIDERI", label: "Direkt İşçilik Payı (720 Borç / 335 Alacak)" },
      { code: "GUG_GIDERI", label: "Genel Üretim Gideri Payı (730 Borç / 770 Alacak)" },
      { code: "YARI_MAMUL_GIRIS", label: "Yarı Mamul Ambarına Giriş (151 Borç / 711 Alacak)" },
      { code: "MAMUL_GIRIS", label: "Mamul Ambarına Giriş (152 Borç / 151 Alacak)" },
    ],
  },
  {
    code: "MALIYET",
    title: "8. Satılan Malın Maliyeti (SMM) Bağlantısı (Muhasebe Kod Bağlantı 8)",
    scope_modes: ["OPERATION", "GROUP", "ITEM"],
    operations: [
      { code: "SMM_TICARI_MAL", label: "Satılan Ticari Mallar Maliyeti (621 Borç / 153 Alacak)" },
      { code: "SMM_MAMUL", label: "Satılan Mamul Maliyeti (620 Borç / 152 Alacak)" },
      { code: "SMM_HIZMET", label: "Satılan Hizmet Maliyeti (622 Borç / 741 Alacak)" },
    ],
  },
  {
    code: "SABIT_KIYMET",
    title: "9. Sabit Kıymet & Amortisman Bağlantısı (Muhasebe Kod Bağlantı 9)",
    scope_modes: ["OPERATION", "GROUP", "ITEM"],
    operations: [
      { code: "AMORTISMAN_YONETIM", label: "Genel Yönetim Amortismanı (770 Borç / 257 Alacak)" },
      { code: "AMORTISMAN_PAZARLAMA", label: "Pazarlama Taşıt/Demirbaş Amortismanı (760 Borç / 257 Alacak)" },
      { code: "AMORTISMAN_URETIM", label: "Üretim Tesis/Makine Amortismanı (730 Borç / 257 Alacak)" },
    ],
  },
  {
    code: "GELIR_GIDER",
    title: "10. Gelir & Gider Kartları Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 10)",
    scope_modes: ["OPERATION", "GROUP", "ITEM"],
    operations: [
      { code: "GENEL_YONETIM", label: "Genel Yönetim Giderleri (770 Borç)" },
      { code: "PAZARLAMA_SATIS", label: "Pazarlama Satış Dağıtım Giderleri (760 Borç)" },
      { code: "FAIZ_GELIRI", label: "Faiz ve Finansman Gelirleri (642 Alacak)" },
      { code: "KAMBIYO_KARI", label: "Kambiyo Karları (646 Alacak)" },
      { code: "KAMBIYO_ZARARI", label: "Kambiyo Zararları (656 Borç)" },
    ],
  },
  {
    code: "IRSALIYE",
    title: "11. Faturasız İrsaliyeler Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 11)",
    scope_modes: ["OPERATION", "GROUP"],
    operations: [
      { code: "FATURASIZ_SATIS_IRSALIYE", label: "Faturası Kesilmemiş Satış İrsaliyesi (120 Borç / 381 Alacak)" },
      { code: "FATURASIZ_ALIS_IRSALIYE", label: "Faturası Gelmemiş Alış İrsaliyesi (153 Borç / 181 Alacak)" },
    ],
  },
  {
    code: "POS",
    title: "12. POS Satış ve Tahsilat Muhasebe Bağlantısı (Muhasebe Kod Bağlantı 12)",
    scope_modes: ["OPERATION", "ITEM"],
    operations: [
      { code: "POS_TAHSILAT", label: "POS Kredi Kartı Alacakları (108 Borç)" },
      { code: "POS_KOMISYON", label: "POS Banka Komisyon Kesintisi (780 Borç)" },
      { code: "POS_HESABA_GECIS", label: "POS Blokesinin Hesaba Aktarımı (102 Borç / 108 Alacak)" },
    ],
  },
];

export function MuhasebeKodBaglantilariPanel() {
  const [modules, setModules] = useState<AccountMappingModule[]>(DEFAULT_12_MAPPING_MODULES);
  const [items, setItems] = useState<AccountMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mods, list] = await Promise.all([
        sistemAyarlariApi.listMappingModules().catch(() => ({ items: DEFAULT_12_MAPPING_MODULES })),
        sistemAyarlariApi.listMappings().catch(() => ({ items: [] })),
      ]);
      setModules(mods.items && mods.items.length > 0 ? mods.items : DEFAULT_12_MAPPING_MODULES);
      setItems(list.items ?? []);
    } catch {
      setModules(DEFAULT_12_MAPPING_MODULES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byModule = useMemo(() => {
    const map: Record<string, AccountMapping[]> = {};
    for (const m of modules) map[m.code] = [];
    for (const it of items) {
      if (!map[it.module_code]) map[it.module_code] = [];
      map[it.module_code].push(it);
    }
    return map;
  }, [modules, items]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>🔗 Muhasebeleştirme Kod Bağlantıları</h3>
        <button type="button" className="btn-top" onClick={() => void load()} disabled={loading}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {modules.map((m) => (
        <ModuleCard key={m.code} module={m} items={byModule[m.code] || []} onReload={load} />
      ))}
    </div>
  );
}
