import {
  directionBadge,
  integratorBadge,
  invoiceDocumentTypeLabel,
  waybillDocumentTypeLabel,
} from "../utils/documentChannelLabels";

type InvoiceLike = {
  document_channel?: string | null;
  document_channel_label?: string | null;
  e_fatura_type?: string | null;
  direction?: string;
  integrator_source?: string | null;
  is_incoming?: boolean;
};

type WaybillLike = {
  document_channel?: string | null;
  document_channel_label?: string | null;
  e_irsaliye_type?: string | null;
  direction?: string;
  integrator_source?: string | null;
  is_incoming?: boolean;
};

type Props =
  | { kind: "invoice"; row: InvoiceLike; showDirection?: boolean }
  | { kind: "waybill"; row: WaybillLike; showDirection?: boolean };

export function DocTypeBadgesInline({ kind, row, showDirection }: Props) {
  const docLabel =
    kind === "invoice"
      ? row.document_channel_label ??
        invoiceDocumentTypeLabel(row.document_channel, (row as InvoiceLike).e_fatura_type)
      : row.document_channel_label ??
        waybillDocumentTypeLabel(row.document_channel, (row as WaybillLike).e_irsaliye_type);

  const dir = showDirection ? directionBadge(row.direction) : null;
  const integ = integratorBadge(row.document_channel, row.integrator_source, row.is_incoming);

  return (
    <div className="doc-type-badges-inline">
      <span className="badge badge-gray">{docLabel}</span>
      {dir && <span className="badge badge-blue">{dir}</span>}
      {integ && <span className="badge badge-yellow">{integ}</span>}
    </div>
  );
}
