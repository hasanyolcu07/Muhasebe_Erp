import { useEffect, useState } from "react";
import { personelStore } from "../services/personelStore";
import { formatMoneyExact } from "@/lib/financialMath";
import { api } from "@/services/api";
import { useAppStore } from "@/store/appStore";

export function PersonelRaporlarView() {
  const workingYear = useAppStore((s) => s.workingYear);
  const [reportType, setReportType] = useState<"MALIYET" | "KIDEM_IHBAR" | "IZIN_BAKIYE">("MALIYET");
  const [kidemTavani, setKidemTavani] = useState<number | null>(null);
  const [kidemNotu, setKidemNotu] = useState("");
  const personelList = personelStore.getPersonelList().filter((p) => p.is_active);
  const donem = `${workingYear}-03`;
  const bordrolar = personelStore.getBordroList(donem);

  useEffect(() => {
    let iptal = false;
    api<{ kalemler: Array<{ anahtar: string; deger: string | null }> }>(`/personel/mevzuat?yil=${workingYear}`)
      .then((kayit) => {
        if (iptal) return;
        const tavan = kayit.kalemler.find((kalem) => kalem.anahtar === "kidem.tavan")?.deger;
        if (!tavan) {
          setKidemTavani(null);
          setKidemNotu(`${workingYear} yılı için kıdem tavanı girilmedi. Projeksiyon hesaplanmadı.`);
          return;
        }
        setKidemTavani(Number(tavan));
        setKidemNotu("");
      })
      .catch((error: unknown) => {
        if (iptal) return;
        setKidemTavani(null);
        setKidemNotu(error instanceof Error ? error.message : "Kıdem tavanı okunamadı.");
      });
    return () => {
      iptal = true;
    };
  }, [workingYear]);

  // Departman bazlı maliyet dağılımı
  const deptSummary: Record<string, { count: number; gross: number; employerCost: number; net: number }> = {};
  for (const b of bordrolar) {
    if (!deptSummary[b.department]) {
      deptSummary[b.department] = { count: 0, gross: 0, employerCost: 0, net: 0 };
    }
    deptSummary[b.department].count += 1;
    deptSummary[b.department].gross += b.gross_total;
    deptSummary[b.department].employerCost += b.total_employer_cost;
    deptSummary[b.department].net += b.net_payable;
  }

  const severanceList = personelList.map((p) => {
    const start = new Date(p.start_date);
    const now = new Date();
    const diffYears = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const effectiveWageForKidem = kidemTavani == null ? 0 : Math.min(p.wage_amount, kidemTavani);
    const estimatedSeverance = diffYears >= 1 ? diffYears * effectiveWageForKidem : 0;
    // İhbar: <6 ay: 2 hf, 6ay-1.5yıl: 4 hf, 1.5-3yıl: 6 hf, >3yıl: 8 hf
    let noticeWeeks = 2;
    if (diffYears >= 3) noticeWeeks = 8;
    else if (diffYears >= 1.5) noticeWeeks = 6;
    else if (diffYears >= 0.5) noticeWeeks = 4;
    const estimatedNotice = kidemTavani == null ? 0 : (p.wage_amount / 30) * (noticeWeeks * 7);

    return {
      personel_no: p.personel_no,
      name: p.full_name,
      department: p.department,
      start_date: p.start_date,
      tenure_years: diffYears.toFixed(1),
      estimated_severance: Math.round(estimatedSeverance),
      estimated_notice: Math.round(estimatedNotice),
      total_liability: Math.round(estimatedSeverance + estimatedNotice),
    };
  });

  const totalSeverance = severanceList.reduce((s, r) => s + r.estimated_severance, 0);
  const totalNotice = severanceList.reduce((s, r) => s + r.estimated_notice, 0);

  return (
    <div className="personel-raporlar-view">
      <div className="section-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className={`btn-top ${reportType === "MALIYET" ? "blue" : ""}`}
            onClick={() => setReportType("MALIYET")}
          >
            📊 Departman Maliyet İcmali
          </button>
          <button
            type="button"
            className={`btn-top ${reportType === "KIDEM_IHBAR" ? "blue" : ""}`}
            onClick={() => setReportType("KIDEM_IHBAR")}
          >
            ⚖️ Kıdem ve İhbar Yükü Projeksiyonu
          </button>
        </div>

        <button type="button" className="btn-top" onClick={() => window.print()}>
          🖨️ Raporu Yazdır
        </button>
      </div>

      {reportType === "MALIYET" && (
        <div className="table-responsive card" style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 700 }}>
            {workingYear} / Mart Dönemi Departman Bazlı İşveren Maliyeti Dağılımı
          </div>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Departman</th>
                <th>Çalışan Sayısı</th>
                <th>Toplam Brüt Ücret</th>
                <th>Toplam Net Ücret</th>
                <th>Toplam İşveren Maliyeti</th>
                <th>Maliyet Oranı</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(deptSummary).map(([dept, data]) => {
                const totalCostAll = Object.values(deptSummary).reduce((s, d) => s + d.employerCost, 0) || 1;
                const ratio = ((data.employerCost / totalCostAll) * 100).toFixed(1);
                return (
                  <tr key={dept}>
                    <td><strong>{dept}</strong></td>
                    <td>{data.count} kişi</td>
                    <td>{formatMoneyExact(data.gross)}</td>
                    <td style={{ color: "#166534", fontWeight: 600 }}>{formatMoneyExact(data.net)}</td>
                    <td style={{ fontWeight: 700 }}>{formatMoneyExact(data.employerCost)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "#e2e8f0", height: 8, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${ratio}%`, background: "#3b82f6", height: "100%" }} />
                        </div>
                        <span style={{ fontSize: 11, width: 40 }}>%{ratio}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "KIDEM_IHBAR" && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong style={{ fontSize: 14 }}>Kıdem ve İhbar Tazminatı Karşılığı Yükü</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                TMS 19 / Çalışanlara Sağlanan Faydalar Standardı Uyarınca Aktüeryal Yük
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, textAlign: "right" }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Kıdem Yükü Toplamı:</span>
                <div style={{ fontWeight: 700, color: "#1e3a8a" }}>{formatMoneyExact(totalSeverance)}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>İhbar Yükü Toplamı:</span>
                <div style={{ fontWeight: 700, color: "#92400e" }}>{formatMoneyExact(totalNotice)}</div>
              </div>
            </div>
          </div>
          {kidemNotu && (
            <div style={{ padding: 12, color: "#9a3412", fontSize: 13 }}>{kidemNotu}</div>
          )}
          <table className="data-table" style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Departman</th>
                <th>Giriş Tarihi</th>
                <th>Kıdem Süresi</th>
                <th>Kıdem Tazminatı Karşılığı</th>
                <th>İhbar Tazminatı Karşılığı</th>
                <th>Toplam Yükümlülük</th>
              </tr>
            </thead>
            <tbody>
              {severanceList.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.name}</strong> ({r.personel_no})</td>
                  <td>{r.department}</td>
                  <td>{r.start_date}</td>
                  <td>{r.tenure_years} yıl</td>
                  <td style={{ fontWeight: 600 }}>{formatMoneyExact(r.estimated_severance)}</td>
                  <td>{formatMoneyExact(r.estimated_notice)}</td>
                  <td style={{ fontWeight: 700, color: "#0f172a" }}>{formatMoneyExact(r.total_liability)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
