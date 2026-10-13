import { useEffect, useState } from "react";
import { documentSeriesApi } from "@/services/documentSeriesApi";

type Props = {
  documentType: string;
  branchId: number | null | undefined;
  recordTypeId: number | null | undefined;
  transactionDate: string | null | undefined;
  savedValue?: string | null;
  label?: string;
};

/** Kayıt öncesi otomatik fiş no önizlemesi (salt okunur). */
export function FisNoPreviewField({
  documentType,
  branchId,
  recordTypeId,
  transactionDate,
  savedValue,
  label = "Fiş No",
}: Props) {
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (savedValue) {
      setPreview(savedValue);
      return;
    }
    if (!documentType || !branchId || !recordTypeId || !transactionDate) {
      setPreview("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    documentSeriesApi
      .preview({
        document_type: documentType,
        branch_id: branchId,
        record_type_id: recordTypeId,
        transaction_date: transactionDate,
      })
      .then((res) => {
        if (!cancelled) setPreview(res.fis_no);
      })
      .catch(() => {
        if (!cancelled) setPreview("Otomatik (kayıtta atanır)");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentType, branchId, recordTypeId, transactionDate, savedValue]);

  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="text"
        className="form-control"
        readOnly
        value={loading ? "Yükleniyor…" : preview || "Otomatik (kayıtta atanır)"}
        style={{ fontWeight: 700, color: "#1e3a8a", background: "#f8fafc" }}
        title="Belge serisi motoru tarafından kayıt anında atanır"
      />
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
        İş belgesi no — yevmiye fiş no&apos;sundan ayrıdır
      </div>
    </div>
  );
}
