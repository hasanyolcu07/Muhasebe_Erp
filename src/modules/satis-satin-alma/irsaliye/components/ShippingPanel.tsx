import { UseFormRegister } from "react-hook-form";
import { E_IRSALIYE_TYPES } from "../constants/dispatchTypes";
import type { IrsaliyeFormValues } from "../schemas/irsaliyeSchema";
import type { OrderLookup } from "../api/irsaliyeApi";

type ShippingProps = {
  register: UseFormRegister<IrsaliyeFormValues>;
};

export function ShippingPanel({ register }: ShippingProps) {
  return (
    <div className="fatura-box fatura-shipping-compact">
      <div className="fatura-box-title">
        <span>🚚 Sevkiyat Bilgileri</span>
      </div>
      <div className="fatura-shipping-grid">
        <div className="form-row compact">
          <label>Sevkiyat Adresi</label>
          <textarea className="form-control" rows={2} {...register("shipping_address")} placeholder="Teslimat adresi..." />
        </div>
        <div className="form-row compact">
          <label>Taşıyıcı</label>
          <div className="inline-pair">
            <input type="text" className="form-control" {...register("carrier_code")} placeholder="Kod" />
            <input type="text" className="form-control" {...register("carrier_name")} placeholder="Taşıyıcı adı" />
          </div>
        </div>
        <div className="form-row compact">
          <label>Sürücü / Plaka</label>
          <div className="inline-pair">
            <input type="text" className="form-control" {...register("driver_name")} placeholder="Sürücü" />
            <input type="text" className="form-control plate-input" {...register("plate_no")} placeholder="34XX00" />
          </div>
        </div>
        <div className="form-row compact">
          <label>Gönderi No</label>
          <input type="text" className="form-control" {...register("tracking_no")} placeholder="Takip no..." />
        </div>
      </div>
    </div>
  );
}

type ParamsProps = {
  register: UseFormRegister<IrsaliyeFormValues>;
  orders: OrderLookup[];
  quotations?: OrderLookup[];
  istisnaCodes?: Array<{ id: number; code: string; name: string }>;
  showIstisnaAi?: boolean;
  istisnaCode?: string | null;
  onIstisnaChange?: (code: string) => void;
  onAiIstisna?: () => void;
};

export function ParamsPanel({
  register,
  orders,
  quotations = [],
  istisnaCodes = [],
  showIstisnaAi = false,
  istisnaCode,
  onIstisnaChange,
  onAiIstisna,
}: ParamsProps) {
  return (
    <div className="fatura-box">
      <div className="fatura-box-title">
        <span>📋 e-Dönüşüm &amp; Ek Bilgi</span>
      </div>
      <div className="fatura-params-grid fatura-params-grid-3col">
        <div className="form-row compact">
          <label>Belge No</label>
          <input type="text" className="form-control" {...register("document_no")} placeholder="Matbu no..." />
        </div>
        <div className="form-row compact">
          <label>Sevk Zamanı</label>
          <div className="inline-pair">
            <input type="date" className="form-control" {...register("shipment_date")} />
            <input type="time" className="form-control" {...register("shipment_time")} />
          </div>
        </div>
        <div className="form-row compact">
          <label>İrsaliye Tipi</label>
          <select className="form-control" {...register("e_irsaliye_type")}>
            {E_IRSALIYE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row compact">
          <label>Teklif / Sipariş</label>
          <select className="form-control" {...register("order_id", { setValueAs: (v) => (v ? Number(v) : null) })}>
            <option value="">—</option>
            {quotations.length > 0 && (
              <optgroup label="Teklifler">
                {quotations.map((o) => (
                  <option key={`t-${o.id}`} value={o.id}>
                    {o.order_no} — {o.account_title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Siparişler">
              {orders.map((o) => (
                <option key={`s-${o.id}`} value={o.id}>
                  {o.order_no} — {o.account_title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        {showIstisnaAi && (
          <div className="form-row compact">
            <label>İstisna (GİB)</label>
            <div style={{ display: "flex", gap: 6 }}>
              <select
                className="form-control"
                value={istisnaCode ?? ""}
                onChange={(e) => onIstisnaChange?.(e.target.value)}
              >
                <option value="">—</option>
                {istisnaCodes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-top" style={{ fontSize: 11 }} onClick={onAiIstisna}>
                ✨ AI
              </button>
            </div>
          </div>
        )}
        <div className="form-row compact span-2">
          <label>Açıklama</label>
          <textarea className="form-control" rows={2} {...register("description")} />
        </div>
      </div>
    </div>
  );
}
