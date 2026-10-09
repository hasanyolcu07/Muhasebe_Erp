import { useEffect, useState } from "react";
import {
  useFieldArray,
  useFormContext,
  type FieldPath,
  type UseFormRegister,
} from "react-hook-form";
import { ChartOfAccountsPicker } from "@/components/ChartOfAccountsPicker";
import { BranchRecordTypeFields } from "@/components/financial/BranchRecordTypeFields";
import { CodeSelectFields } from "@/modules/ayarlar/components/CodeSelectFields";
import { formatCoaDisplay } from "@/services/coaApi";
import { BLOCK_ACTIONS, OPENING_SIDES, ACCOUNT_TYPES } from "../constants";
import type { CariFormValues } from "../schemas/cariSchema";
import type { PriceListLookup } from "../api/cariApi";
import type { CariTabId } from "../constants";

function Field({
  label,
  name,
  register,
  type = "text",
  required,
  children,
}: {
  label: string;
  name: FieldPath<CariFormValues>;
  register: UseFormRegister<CariFormValues>;
  type?: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="form-row">
      <label>{label}</label>
      {children ?? (
        <input
          type={type}
          className={`form-control${required ? " required" : ""}`}
          {...register(name, { valueAsNumber: type === "number" })}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  register,
  options,
}: {
  label: string;
  name: FieldPath<CariFormValues>;
  register: UseFormRegister<CariFormValues>;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label} name={name} register={register}>
      <select className="form-control" {...register(name)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

type Props = {
  activeTab: CariTabId;
  priceLists: PriceListLookup[];
  accountId: number | null;
};

export function CariTabPanels({ activeTab, priceLists, accountId }: Props) {
  const { register, control, watch, setValue, getValues } = useFormContext<CariFormValues>();
  const coaId = watch("coa_id");
  const [coaLabel, setCoaLabel] = useState<string>("");

  const contacts = useFieldArray({ control, name: "contacts" });
  const banks = useFieldArray({ control, name: "banks" });
  const addresses = useFieldArray({ control, name: "addresses" });
  const gib = useFieldArray({ control, name: "gib_mailboxes" });
  const documents = useFieldArray({ control, name: "documents" });
  const notes = useFieldArray({ control, name: "notes" });

  useEffect(() => {
    if (!coaId) setCoaLabel("");
  }, [coaId]);

  const priceListIds = watch("price_list_ids") || [];

  function togglePriceList(id: number) {
    const set = new Set(priceListIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setValue("price_list_ids", Array.from(set), { shouldDirty: true });
  }

  return (
    <>
      <div className={`cari-left-section${activeTab === "genel" ? " active" : ""}`}>
        <div className="section-title">
          <span>📋 1. Genel & İletişim Bilgileri</span>
        </div>
        <div className="cari-form-grid">
          <div>
            <SelectField
              label="Müşteri/Tedarikçi Tipi"
              name="account_type"
              register={register}
              options={[...ACCOUNT_TYPES]}
            />
            <Field label="Cari Adı / Ünvan" name="title" register={register} required />
            <Field label="Cari Kodu" name="code" register={register} required />
            <Field label="Vergi No" name="tax_number" register={register} />
            <Field label="Vergi Dairesi" name="tax_office" register={register} />
            <Field label="Telefon" name="phone" register={register} />
            <Field label="E-Posta" name="email" register={register} />
            <div className="form-row">
              <label>Muhasebe Hesap Kodu</label>
              <ChartOfAccountsPicker
                value={coaId ?? null}
                displayLabel={coaLabel}
                initialSearch="120"
                onChange={(id, item) => {
                  setValue("coa_id", id, { shouldDirty: true });
                  setCoaLabel(item ? formatCoaDisplay(item) : "");
                }}
              />
            </div>
            <BranchRecordTypeFields variant="card" />
          </div>
          <div>
            <Field label="Semt / Mahalle" name="neighborhood" register={register} />
            <Field label="İlçe" name="district" register={register} />
            <Field label="Şehir" name="city" register={register} />
            <Field label="Ülke" name="country" register={register} />
            <Field label="Bulvar / Cadde" name="address_line" register={register} />
            <Field label="Blok" name="block_name" register={register} />
            <Field label="Bina Adı" name="building_name" register={register} />
            <Field label="Vade Gün" name="payment_days" register={register} type="number" />
            <div className="form-row">
              <label>Pasif</label>
              <label className="toggle-inline">
                <input type="checkbox" {...register("is_passive")} /> Pasif kayıt
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className={`cari-left-section${activeTab === "ticari" ? " active" : ""}`}>
        <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📌 2. Ticari & e-Belge Parametreleri</span>
          <button
            type="button"
            className="btn-top"
            style={{ fontSize: 11, padding: "3px 10px", background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", fontWeight: 700 }}
            onClick={() => {
              const tax = (getValues("tax_number") as string) || "";
              const title = (getValues("title") as string) || "Firma";
              const isEfatura = tax.replace(/\D/g, "").length >= 10 || !!tax;
              const isEirsaliye = isEfatura;
              setValue("is_efatura", isEfatura);
              setValue("is_eirsaliye", isEirsaliye);
              setValue("gib_mailboxes", [
                { mailbox_type: "PK", alias: "defaultpk", label: "e-Fatura Gelen Kutusu", scenario: "TICARIFATURA", is_default: true },
                { mailbox_type: "GB", alias: "defaultgb", label: "e-Fatura Gönderici Birim", scenario: "TICARIFATURA", is_default: true },
                ...(isEirsaliye
                  ? [{ mailbox_type: "PK" as const, alias: `urn:mail:irsaliyepk@${title.toLowerCase().slice(0, 8)}.com.tr`, label: "e-İrsaliye Gelen Kutusu", scenario: "TEMELIRSALIYE", is_default: false }]
                  : []),
              ]);
            }}
          >
            🔍 GİB'den Etiketleri Otomatik Çek
          </button>
        </div>
        <div className="cari-form-grid">
          <div>
            <div className="form-row">
              <label>e-Fatura Mükellefi</label>
              <select className="form-control" {...register("is_efatura", { setValueAs: (v) => v === "true" || v === true })}>
                <option value="false">Hayır</option>
                <option value="true">Evet (e-Fatura)</option>
              </select>
            </div>
            <div className="form-row">
              <label>e-İrsaliye Mükellefi</label>
              <select className="form-control" {...register("is_eirsaliye", { setValueAs: (v) => v === "true" || v === true })}>
                <option value="false">Hayır</option>
                <option value="true">Evet (e-İrsaliye)</option>
              </select>
            </div>
            <div className="form-row">
              <label>Fatura Gelen Kutusu (PK Etiketi)</label>
              <input
                className="form-control"
                placeholder="Örn: defaultpk"
                defaultValue="defaultpk"
                onChange={(e) => {
                  const val = e.target.value;
                  const current = (getValues("gib_mailboxes") as any[]) || [];
                  const pk = current.find((m: any) => m.mailbox_type === "PK" && m.label?.includes("Fatura")) || { mailbox_type: "PK", label: "e-Fatura Gelen Kutusu" };
                  pk.alias = val;
                }}
              />
            </div>
            <div className="form-row">
              <label>Fatura Gönderici Birim (GB Etiketi)</label>
              <input
                className="form-control"
                placeholder="Örn: defaultgb"
                defaultValue="defaultgb"
                onChange={(e) => {
                  const val = e.target.value;
                  const current = (getValues("gib_mailboxes") as any[]) || [];
                  const gb = current.find((m: any) => m.mailbox_type === "GB" && m.label?.includes("Fatura")) || { mailbox_type: "GB", label: "e-Fatura Gönderici Birim" };
                  gb.alias = val;
                }}
              />
            </div>
            <div className="form-row">
              <label>İrsaliye Gelen Kutusu (PK Etiketi)</label>
              <input
                className="form-control"
                placeholder="Örn: urn:mail:irsaliyepk@domain.com.tr"
                defaultValue="urn:mail:irsaliyepk@firma.com.tr"
                onChange={(e) => {
                  const val = e.target.value;
                  const current = (getValues("gib_mailboxes") as any[]) || [];
                  const pk = current.find((m: any) => m.mailbox_type === "PK" && m.label?.includes("İrsaliye")) || { mailbox_type: "PK", label: "e-İrsaliye Gelen Kutusu", scenario: "TEMELIRSALIYE" };
                  pk.alias = val;
                }}
              />
            </div>
            <div className="form-row">
              <label>İrsaliye Gönderici Birim (GB Etiketi)</label>
              <input
                className="form-control"
                placeholder="Örn: urn:mail:irsaliyegb@domain.com.tr"
                defaultValue="urn:mail:irsaliyegb@firma.com.tr"
                onChange={(e) => {
                  const val = e.target.value;
                  const current = (getValues("gib_mailboxes") as any[]) || [];
                  const gb = current.find((m: any) => m.mailbox_type === "GB" && m.label?.includes("İrsaliye")) || { mailbox_type: "GB", label: "e-İrsaliye Gönderici Birim", scenario: "TEMELIRSALIYE" };
                  gb.alias = val;
                }}
              />
            </div>
            <Field label="İskonto Oranı (%)" name="discount_rate" register={register} type="number" />
          </div>
          <div>
            <Field label="Para Birimi ID" name="currency_id" register={register} type="number" />
            <div className="form-row">
              <label>Çoklu Fiyat Listesi</label>
              <div className="price-list-checkboxes">
                {priceLists.length === 0 ? (
                  <span className="text-muted">Fiyat listesi tanımlı değil</span>
                ) : (
                  priceLists.map((pl) => (
                    <label key={pl.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={priceListIds.includes(pl.id)}
                        onChange={() => togglePriceList(pl.id)}
                      />
                      {pl.code} — {pl.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`cari-left-section${activeTab === "yetkili" ? " active" : ""}`}>
        <div className="section-title">
          <span>👥 3. İrtibat & Yetkili Kişiler</span>
          <button type="button" className="btn-top blue" onClick={() => contacts.append({ full_name: "", title: "", phone: "", email: "" })}>
            + Yetkili Ekle
          </button>
        </div>
        <table className="auth-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Görevi</th>
              <th>GSM</th>
              <th>E-Posta</th>
              <th style={{ width: 100 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {contacts.fields.map((f, i) => (
              <tr key={f.id}>
                <td><input className="form-control" {...register(`contacts.${i}.full_name`)} /></td>
                <td><input className="form-control" {...register(`contacts.${i}.title`)} /></td>
                <td><input className="form-control" {...register(`contacts.${i}.phone`)} /></td>
                <td><input className="form-control" {...register(`contacts.${i}.email`)} /></td>
                <td>
                  <button type="button" className="pill-btn delete" onClick={() => contacts.remove(i)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`cari-left-section${activeTab === "bakiye" ? " active" : ""}`}>
        <div className="section-title"><span>💰 4. Başlangıç Bakiyesi</span></div>
        <div className="cari-form-grid">
          <SelectField label="Bakiye Tipi" name="opening_side" register={register} options={[...OPENING_SIDES]} />
          <Field label="Tutar (₺)" name="opening_balance" register={register} type="number" />
        </div>
      </div>

      <div className={`cari-left-section${activeTab === "banka" ? " active" : ""}`}>
        <div className="section-title">
          <span>🏛️ 5. Banka & IBAN Kartları</span>
          <button type="button" className="btn-top blue" onClick={() => banks.append({ bank_name: "", branch_name: "", iban: "", is_default: false })}>
            + Banka Ekle
          </button>
        </div>
        <table className="auth-table">
          <thead>
            <tr><th>Banka</th><th>Şube</th><th>IBAN</th><th>Varsayılan</th><th /></tr>
          </thead>
          <tbody>
            {banks.fields.map((f, i) => (
              <tr key={f.id}>
                <td><input className="form-control" {...register(`banks.${i}.bank_name`)} /></td>
                <td><input className="form-control" {...register(`banks.${i}.branch_name`)} /></td>
                <td><input className="form-control" {...register(`banks.${i}.iban`)} /></td>
                <td><input type="checkbox" {...register(`banks.${i}.is_default`)} /></td>
                <td><button type="button" className="pill-btn delete" onClick={() => banks.remove(i)}>Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`cari-left-section${activeTab === "sube" ? " active" : ""}`}>
        <div className="section-title">
          <span>🏢 6. Şubeler & Sevkiyat Adresleri</span>
          <button type="button" className="btn-top blue" onClick={() => addresses.append({ address_type: "SEVKIYAT", country: "Türkiye", is_default: false })}>
            + Adres Ekle
          </button>
        </div>
        {addresses.fields.map((f, i) => (
          <div key={f.id} className="inline-entry-box open">
            <div className="cari-form-grid compact">
              <input className="form-control" placeholder="Şehir" {...register(`addresses.${i}.city`)} />
              <input className="form-control" placeholder="İlçe" {...register(`addresses.${i}.district`)} />
              <input className="form-control" placeholder="Cadde/Sokak" {...register(`addresses.${i}.street`)} />
              <input className="form-control" placeholder="Posta Kodu" {...register(`addresses.${i}.postal_code`)} />
            </div>
            <button type="button" className="pill-btn delete" onClick={() => addresses.remove(i)}>Adresi Sil</button>
          </div>
        ))}
      </div>

      <div className={`cari-left-section${activeTab === "gib" ? " active" : ""}`}>
        <div className="section-title">
          <span>🔢 7. GİB Posta Kutuları & e-Devlet</span>
          <button type="button" className="btn-top blue" onClick={() => gib.append({ mailbox_type: "GB", alias: "", label: "", scenario: "TICARIFATURA", is_default: false })}>
            + Posta Kutusu
          </button>
        </div>
        <table className="auth-table">
          <thead>
            <tr><th>Tip (GB/PK)</th><th>Alias / URN</th><th>Etiket</th><th>Senaryo</th><th>Varsayılan</th><th /></tr>
          </thead>
          <tbody>
            {gib.fields.map((f, i) => (
              <tr key={f.id}>
                <td>
                  <select className="form-control" {...register(`gib_mailboxes.${i}.mailbox_type`)}>
                    <option value="GB">GB — Gönderici Birim</option>
                    <option value="PK">PK — Posta Kutusu</option>
                  </select>
                </td>
                <td><input className="form-control" {...register(`gib_mailboxes.${i}.alias`)} /></td>
                <td><input className="form-control" {...register(`gib_mailboxes.${i}.label`)} /></td>
                <td><input className="form-control" {...register(`gib_mailboxes.${i}.scenario`)} /></td>
                <td><input type="checkbox" {...register(`gib_mailboxes.${i}.is_default`)} /></td>
                <td><button type="button" className="pill-btn delete" onClick={() => gib.remove(i)}>Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`cari-left-section${activeTab === "belge" ? " active" : ""}`}>
        <div className="section-title">
          <span>📂 8. Sözleşme & Doküman</span>
          <button type="button" className="btn-top blue" onClick={() => documents.append({ file_name: "", doc_type: "SOZLESME" })}>
            + Doküman
          </button>
        </div>
        {documents.fields.map((f, i) => (
          <div key={f.id} className="form-row">
            <input className="form-control" placeholder="Dosya adı" {...register(`documents.${i}.file_name`)} />
            <input className="form-control" placeholder="Dosya yolu / URL" {...register(`documents.${i}.file_path`)} />
            <button type="button" className="pill-btn delete" onClick={() => documents.remove(i)}>Sil</button>
          </div>
        ))}
      </div>

      <div className={`cari-left-section${activeTab === "not" ? " active" : ""}`}>
        <div className="section-title">
          <span>📝 9. Tarihçe & Notlar</span>
          <button type="button" className="btn-top blue" onClick={() => notes.append({ note_text: "", note_date: new Date().toISOString().slice(0, 10) })}>
            + Not Ekle
          </button>
        </div>
        {notes.fields.map((f, i) => (
          <div key={f.id} className="inline-entry-box open">
            <input type="date" className="form-control" {...register(`notes.${i}.note_date`)} />
            <textarea className="form-control" rows={3} {...register(`notes.${i}.note_text`)} />
            <button type="button" className="pill-btn delete" onClick={() => notes.remove(i)}>Sil</button>
          </div>
        ))}
      </div>

      <div className={`cari-left-section${activeTab === "risk" ? " active" : ""}`}>
        <div className="section-title">
          <span>🛡️ 10. Risk Bilgileri, Teminatlar & Limit Aşım Kontrolleri</span>
          <span className="badge badge-red">Çoklu Kontrol</span>
        </div>
        <div className="cari-form-grid">
          <div>
            <Field label="Kredi Limiti" name="risk.credit_limit" register={register} type="number" />
            <Field label="Teminat Toplamı" name="risk.collateral_total" register={register} type="number" />
            <Field label="Risk Faktörü" name="risk.risk_factor" register={register} type="number" />
            <SelectField
              label="Risk Takibi Para Birimi"
              name="risk.risk_currency_mode"
              register={register}
              options={[
                { value: "LOCAL", label: "Yerel Para Birimi (TL)" },
                { value: "TRANSACTION", label: "İşlem Dövizi" },
              ]}
            />
            <SelectField
              label="Risk Kontrolü"
              name="risk.risk_control_mode"
              register={register}
              options={[
                { value: "BALANCE", label: "Bakiye Bazında" },
                { value: "TOTALS", label: "Toplamlar Bazında" },
              ]}
            />
          </div>
          <div>
            <strong className="subsection-title">Limit Aşımı Durumunda Yapılacak İşlem</strong>
            <SelectField label="Siparişte" name="risk.block_on_order" register={register} options={[...BLOCK_ACTIONS]} />
            <SelectField label="İrsaliyede" name="risk.block_on_dispatch" register={register} options={[...BLOCK_ACTIONS]} />
            <SelectField label="Faturada" name="risk.block_on_invoice" register={register} options={[...BLOCK_ACTIONS]} />
            <Field label="Risk Notları" name="risk.notes" register={register} />
          </div>
        </div>
      </div>

      <div className={`cari-left-section${activeTab === "param" ? " active" : ""}`}>
        <div className="section-title"><span>⚙️ 11. Parametreler, Kullanım Yeri & Vade Takibi</span></div>
        <div className="cari-form-grid">
          <div>
            <div className="form-row">
              <label>Parçalı Sipariş Sevk.</label>
              <select className="form-control" {...register("parameters.partial_shipment", { setValueAs: (v) => v === "true" || v === true })}>
                <option value="true">EVET</option>
                <option value="false">HAYIR</option>
              </select>
            </div>
            <Field label="Fatura Yazım Sayısı" name="parameters.invoice_copies" register={register} type="number" />
            <Field label="İrsaliye Yazım Sayısı" name="parameters.dispatch_copies" register={register} type="number" />
            <div className="form-row">
              <label>Kullanım Yeri</label>
              <div className="checkbox-row-group">
                <label><input type="checkbox" {...register("parameters.usage_purchase")} /> Satınalma</label>
                <label><input type="checkbox" {...register("parameters.usage_sales")} /> Satış</label>
                <label><input type="checkbox" {...register("parameters.usage_finance")} /> Finans</label>
              </div>
            </div>
          </div>
          <div>
            <strong className="subsection-title">Vade Takibi Kriterleri</strong>
            <Field label="Yaşlandırma Günü" name="parameters.aging_days" register={register} type="number" />
            <SelectField label="Vade Aşıldığında" name="parameters.due_exceeded_action" register={register} options={[...BLOCK_ACTIONS]} />
          </div>
        </div>
      </div>

      <div className={`cari-left-section${activeTab === "ozel" ? " active" : ""}`}>
        <div className="section-title"><span>🏷️ 12. Diğer Parametreler, Özel Kodlar & Form Gönderimi</span></div>
        <div className="cari-form-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <strong className="subsection-title">Özel Kodlar (6) — Tanımlardan seçilir</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Özel Kod {n}</label>
                  <CodeSelectFields
                    entityType="ACCOUNT"
                    values={{}}
                    onChange={() => undefined}
                    showGroupSpecial
                    showProject={false}
                    showCostCenter={false}
                    compact
                  />
                </div>
              ))}
            </div>
            <strong className="subsection-title">Grup Kodları (2)</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[1, 2].map((n) => (
                <div key={n} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Grup Kodu {n}</label>
                  <CodeSelectFields
                    entityType="ACCOUNT"
                    values={{}}
                    onChange={() => undefined}
                    showGroupSpecial
                    showProject={false}
                    showCostCenter={false}
                    compact
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <CodeSelectFields
                entityType="ACCOUNT"
                values={{}}
                onChange={() => undefined}
                showGroupSpecial={false}
                showProject
                showCostCenter
              />
            </div>
          </div>
          <div>
            <strong className="subsection-title">Form Gönderim Bilgileri</strong>
            <Field label="Fatura Gönderim Kanalı" name="parameters.invoice_send_channel" register={register} />
            <Field label="Fatura Format" name="parameters.invoice_send_format" register={register} />
          </div>
        </div>
      </div>

      <div className={`cari-left-section${activeTab === "tasarim" ? " active" : ""}`}>
        <div className="section-title"><span>📐 13. Form & Rapor Tasarımları Ataması</span></div>
        <div className="cari-form-grid">
          <Field label="Fatura Fişi Tasarımı" name="parameters.invoice_design" register={register} />
          <Field label="İrsaliye Fişi Tasarımı" name="parameters.dispatch_design" register={register} />
        </div>
      </div>

      <div className={`cari-left-section${activeTab === "entegrasyon" ? " active" : ""}`}>
        <div className="section-title">
          <span>🔗 14. Entegrasyonlar (e-ticaret, CRM vb.)</span>
        </div>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          e-Ticaret platformu, mağaza URL ve CRM bağlantı bilgileri. LogoConnect & EDI bu sürümde kapsam dışıdır.
        </p>
        <div className="cari-form-grid">
          <Field label="e-Ticaret Platformu" name="integration.ecommerce_platform" register={register} />
          <Field label="Mağaza URL" name="integration.ecommerce_store_url" register={register} />
          <Field label="CRM Sağlayıcı" name="integration.crm_provider" register={register} />
          <Field label="CRM Harici ID" name="integration.crm_external_id" register={register} />
        </div>
      </div>
    </>
  );
}
