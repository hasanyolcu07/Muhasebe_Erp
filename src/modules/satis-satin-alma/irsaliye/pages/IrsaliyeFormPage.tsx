import { Navigate, useLocation } from "react-router-dom";

export function IrsaliyeFormPage() {
  const location = useLocation();
  const isPurchase = location.pathname.includes("alislar-giderler");
  const hub = isPurchase ? "alislar-giderler" : "satislar-e-fatura";
  return <Navigate to={`/app/satis-satin-alma/${hub}?section=irsaliye`} replace />;
}
