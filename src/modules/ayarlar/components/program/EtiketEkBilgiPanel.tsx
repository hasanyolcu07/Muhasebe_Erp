import { useCallback, useEffect, useMemo, useState } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  sistemAyarlariApi,
  type EtiketEkBilgiDef,
  type EtiketEntityType,
} from "../../api/sistemAyarlariApi";
import { AktifPasifToggle } from "../AktifPasifToggle";

type Section = {
  code: EtiketEntityType;
  title: string;
  groupCount: number;
};

const SECTIONS: Section[] = [
  { code: "STOK", title: "Stok", groupCount: 5 },
  { code: "GELIR", title: "Gelir", groupCount: 3 },
  { code: "GIDER", title: "Gider", groupCount: 3 },
  { code: "CARI", title: "Cari Hesaplar", groupCount: 5 },
  { code: "PERSONEL", title: "Personel", groupCount: 3 },
];

type FormState = {
  name: string;
  group_1: string;
  group_2: string;
  group_3: string;
  group_4: string;
  group_5: string;
  ek_metin_1: string;
  ek_metin_2: string;
  ek_sayi_1: string;
  ek_sayi_2: string;
  ek_tarih_1: string;
  ek_tarih_2: string;
  ek_decimal_1: string;
  ek_decimal_2: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  group_1: "",
  group_2: "",
  group_3: "",
  group_4: "",
  group_5: "",
  ek_metin_1: "",
  ek_metin_2: "",
  ek_sayi_1: "",
  ek_sayi_2: "",
  ek_tarih_1: "",
  ek_tarih_2: "",
  ek_decimal_1: "",
  ek_decimal_2: "",
  is_active: true,
});

function SectionCard({
  section,
  items,
  onReload,
}: {
  section: Section;
  items: EtiketEkBilgiDef[];
  onReload: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupLabel = section.code === "PERSONEL" ? "Kategori Grup" : "Grup";

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setPanelOpen(true);
  }

  function openEdit(row: EtiketEkBilgiDef) {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      group_1: row.group_1 || "",
      group_2: row.group_2 || "",
      group_3: row.group_3 || "",
      group_4: row.group_4 || "",
      group_5: row.group_5 || "",
      ek_metin_1: row.ek_metin_1 || "",
      ek_metin_2: row.ek_metin_2 || "",
      ek_sayi_1: row.ek_sayi_1 || "",
      ek_sayi_2: row.ek_sayi_2 || "",
      ek_tarih_1: row.ek_tarih_1 || "",
      ek_tarih_2: row.ek_tarih_2 || "",
      ek_decimal_1: row.ek_decimal_1 || "",
      ek_decimal_2: row.ek_decimal_2 || "",
      is_active: row.is_active,
    });
    setError(null);
    setPanelOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Ad / kategori adı zorunlu");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      group_1: form.group_1 || null,
      group_2: form.group_2 || null,
      group_3: form.group_3 || null,
      group_4: form.group_4 || null,
      group_5: form.group_5 || null,
      ek_metin_1: form.ek_metin_1 || null,
      ek_metin_2: form.ek_metin_2 || null,
      ek_sayi_1: form.ek_sayi_1 || null,
      ek_sayi_2: form.ek_sayi_2 || null,
      ek_tarih_1: form.ek_tarih_1 || null,
      ek_tarih_2: form.ek_tarih_2 || null,
      ek_decimal_1: form.ek_decimal_1 || null,
      ek_decimal_2: form.ek_decimal_2 || null,
      is_active: form.is_active,
    };
    try {
      if (editingId) {
        await sistemAyarlariApi.updateEtiketDef(editingId, body);
      } else {
        await sistemAyarlariApi.createEtiketDef({
          entity_type: section.code,
          ...body,
        });
      }
      setPanelOpen(false);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: EtiketEkBilgiDef) {
    if (!window.confirm(`“${row.name}” silinsin mi?`)) return;
    try {
      await sistemAyarlariApi.deleteEtiketDef(row.id);
      onReload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  const columns: DataTableColumn<EtiketEkBilgiDef>[] = useMemo(
    () => [
      { key: "name", header: "Ad / Kategori", width: 160, render: (r) => r.name },
      {
        key: "groups",
        header: groupLabel,
        width: 200,
        render: (r) =>
          [r.group_1, r.group_2, r.group_3, r.group_4, r.group_5].filter(Boolean).join(", ") || "—",
      },
      {
        key: "extra",
        header: "Ek Alanlar",
        width: 220,
        render: (r) =>
          [
            r.ek_metin_1 && `Metin:${r.ek_metin_1}`,
            r.ek_sayi_1 && `Sayı:${r.ek_sayi_1}`,
            r.ek_tarih_1 && `Tarih:${r.ek_tarih_1}`,
            r.ek_decimal_1 && `Dec:${r.ek_decimal_1}`,
          ]
            .filter(Boolean)
            .join(" · ") || "—",
      },
      {
        key: "status",
        header: "Durum",
        width: 80,
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
            <button type="button" className="btn-secondary" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => openEdit(r)}>
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
    [groupLabel],
  );

  return (
    <div className="etiket-section-card">
      <div className="etiket-section-head">
        <button type="button" className="etiket-section-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? "▾" : "▸"} {section.title}
          <span>({items.length})</span>
        </button>
        <button type="button" className="btn-top green" onClick={openAdd}>
          + Ekle
        </button>
      </div>

      {open ? (
        <div className="etiket-section-body">
          <DataTable
            tableKey={`etiket-${section.code}`}
            columns={columns}
            data={items}
            rowKey={(r) => r.id}
            zebra
            emptyMessage="Henüz tanım yok. Ekle ile oluşturun."
          />
        </div>
      ) : null}

      <SidePanel
        open={panelOpen}
        title={editingId ? `${section.title} — Değiştir` : `${section.title} — Ekle`}
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
        {error ? <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div> : null}

        <div className="form-row compact">
          <label>Ad / Kategori Adı</label>
          <input
            className="form-control"
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Örn. Ana grup seti"
          />
        </div>

        <div className="etiket-form-grid">
          {Array.from({ length: section.groupCount }, (_, i) => {
            const key = `group_${i + 1}` as keyof FormState;
            return (
              <div className="form-row compact" key={key}>
                <label>
                  {groupLabel} {i + 1} Adı
                </label>
                <input
                  className="form-control"
                  value={String(form[key] ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>

        <h4 className="etiket-form-sub">Ek Bilgi Alan Etiketleri</h4>
        <div className="etiket-form-grid">
          {(
            [
              ["ek_metin_1", "Ek Metin 1"],
              ["ek_metin_2", "Ek Metin 2"],
              ["ek_sayi_1", "Ek Sayı 1"],
              ["ek_sayi_2", "Ek Sayı 2"],
              ["ek_tarih_1", "Ek Tarih 1"],
              ["ek_tarih_2", "Ek Tarih 2"],
              ["ek_decimal_1", "Ek Decimal 1"],
              ["ek_decimal_2", "Ek Decimal 2"],
            ] as const
          ).map(([key, label]) => (
            <div className="form-row compact" key={key}>
              <label>{label}</label>
              <input
                className="form-control"
                value={form[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder="Alan etiketi"
              />
            </div>
          ))}
        </div>

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

/** Program Ayarları — Etiket / Ek Bilgi Tanımları */
export function EtiketEkBilgiPanel() {
  const [items, setItems] = useState<EtiketEkBilgiDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await sistemAyarlariApi.listEtiketDefs();
      setItems(list || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byEntity = useMemo(() => {
    const map: Record<string, EtiketEkBilgiDef[]> = {};
    for (const s of SECTIONS) map[s.code] = [];
    for (const it of items) {
      if (!map[it.entity_type]) map[it.entity_type] = [];
      map[it.entity_type].push(it);
    }
    return map;
  }, [items]);

  return (
    <div>
      <div className="etiket-page-head">
        <h3>🏷️ Etiket / Ek Bilgi Tanımları</h3>
        <button type="button" className="btn-top" onClick={() => void load()} disabled={loading}>
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="etiket-sections">
        {SECTIONS.map((s) => (
          <SectionCard key={s.code} section={s} items={byEntity[s.code] || []} onReload={load} />
        ))}
      </div>
    </div>
  );
}
