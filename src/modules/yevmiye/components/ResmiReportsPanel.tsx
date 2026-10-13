import { useState, useEffect } from "react";
import { GenericReportPanel } from "@/modules/raporlar/components/GenericReportPanel";
import { findReport, findGroup } from "@/modules/raporlar/config/reportMenu";
import { yevmiyeApi } from "../api/yevmiyeApi";

// VUK Resmî Mali Tabloları ve Defterler
const VUK_OFFICIAL_REPORTS = [
  { id: "genel-mizan", label: "Genel Mizan", icon: "⚖️" },
  { id: "kesin-mizan", label: "Kesin Mizan", icon: "📑" },
  { id: "iki-tarih-mizan", label: "İki Tarih Arası Mizan", icon: "📅" },
  { id: "muavin", label: "Muavin Defter (Ekstre)", icon: "📖" },
  { id: "bilanco", label: "Bilanço (VUK Resmî)", icon: "🏛️" },
  { id: "gelir-tablosu", label: "Gelir Tablosu (VUK Resmî)", icon: "📊" },
] as const;

// Yönetim ve Karar Destek Raporları (VUK Resmî Değildir)
const MANAGEMENT_REPORTS = [
  { id: "nakit-akis", label: "Nakit Akış Analizi (Yönetim)", icon: "💵" },
  { id: "kar-zarar", label: "Maliyet & Kâr/Zarar (Yönetim)", icon: "📈" },
] as const;

interface AiAnalysisResponse {
  analysis_text?: string;
  financial_ratios?: Array<{ name: string; value: string; benchmark: string; status: string }>;
  is_ai_live?: boolean;
  service_status?: string;
  period_label?: string;
}

export function ResmiReportsPanel() {
  const [active, setActive] = useState<string>("genel-mizan");
  const [showAi, setShowAi] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiData, setAiData] = useState<AiAnalysisResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const group = findGroup("muhasebe");
  const report = findReport(group, active);

  const isOfficial = VUK_OFFICIAL_REPORTS.some((r) => r.id === active);

  // AI Mali Tablo Analizini Gerçek Rapor Verisiyle Çalıştır
  async function runAiAnalysis() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = (await yevmiyeApi.aiMaliTablo({
        report_type: active,
        filters: { status: "POSTED" },
      })) as unknown as AiAnalysisResponse;
      setAiData(res);
      setShowAi(true);
    } catch (err: any) {
      setAiError(err instanceof Error ? err.message : "AI analizi oluşturulamadı");
      setShowAi(true);
    } finally {
      setAiLoading(false);
    }
  }

  // Sekme değiştiğinde eski AI analizini sıfırla
  useEffect(() => {
    setShowAi(false);
    setAiData(null);
    setAiError(null);
  }, [active]);

  return (
    <div className="resmi-reports-container" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Üst Bilgi ve Yasal Standart Başlığı */}
      <div
        className="card"
        style={{
          padding: "12px 16px",
          background: isOfficial ? "linear-gradient(to right, #f8fafc, #eff6ff)" : "linear-gradient(to right, #f8fafc, #fefce8)",
          border: isOfficial ? "1px solid #bfdbfe" : "1px solid #fef08a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{isOfficial ? "🏛️" : "📈"}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: isOfficial ? "#1e3a8a" : "#854d0e" }}>
              {isOfficial ? "VUK Resmî Mali Tabloları & Defter Raporları" : "Yönetim & Karar Destek Raporları"}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 9999,
                fontWeight: 600,
                background: isOfficial ? "#dbeafe" : "#fef9c3",
                color: isOfficial ? "#1e40af" : "#713f12",
              }}
            >
              {isOfficial ? "VUK 213 & MSUGT 1-15 Uyumlu" : "İç Yönetim / Resmî Değil"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Kaynak: Yevmiye Defteri (Borç/Alacak Çift Kayıt), Tekdüzen Hesap Planı (TDHP 2026.1). Sabit sahte rakam içermez.
          </div>
        </div>

        {/* AI Mali Tablo Analizi Aksiyon Butonu */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            onClick={() => void runAiAnalysis()}
            disabled={aiLoading}
          >
            <span>{aiLoading ? "⏳" : "✨"}</span>
            <span>{aiLoading ? "Analiz Ediliyor…" : "Akıllı Mali Tablo Analizi"}</span>
          </button>
        </div>
      </div>

      {/* AI Analiz Sonuç Kartı (Açıldığında) */}
      {showAi && (
        <div
          className="card"
          style={{
            padding: 16,
            background: "#ffffff",
            border: "1px solid #93c5fd",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>✨</span>
              <strong style={{ fontSize: 14, color: "#1e3a8a" }}>Mali Tablo ve Finansal Oran Analizi</strong>
              <span style={{ fontSize: 11, color: "#64748b" }}>({aiData?.service_status || "Yerel Doğruluk Motoru"})</span>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 12, padding: "2px 8px" }}
              onClick={() => setShowAi(false)}
            >
              Kapat ✕
            </button>
          </div>

          {aiError ? (
            <div style={{ color: "#b91c1c", fontSize: 13 }}>⚠️ {aiError}</div>
          ) : (
            <div>
              {/* Finansal Oranlar Grid */}
              {aiData?.financial_ratios?.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  {aiData.financial_ratios.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>{r.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{r.value}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: r.status === "İYİ" || r.status === "GÜÇLÜ" || r.status === "DOĞRULANDI" ? "#16a34a" : "#ca8a04",
                          }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Hedef: {r.benchmark}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Detay Metin */}
              {aiData?.analysis_text ? (
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "#334155",
                    whiteSpace: "pre-line",
                    background: "#f8fafc",
                    padding: 12,
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {aiData.analysis_text}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Rapor Kategorileri ve Sekmeleri */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            VUK Resmî Raporlar:
          </span>
          <div className="hub-tabs" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {VUK_OFFICIAL_REPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={active === item.id ? "hub-tab active" : "hub-tab"}
                onClick={() => setActive(item.id)}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: active === item.id ? 700 : 500,
                  borderBottom: active === item.id ? "2px solid #2563eb" : "2px solid transparent",
                }}
              >
                <span style={{ marginRight: 6 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Yönetim Raporları:
          </span>
          <div className="hub-tabs" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MANAGEMENT_REPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={active === item.id ? "hub-tab active" : "hub-tab"}
                onClick={() => setActive(item.id)}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: active === item.id ? 700 : 500,
                  borderBottom: active === item.id ? "2px solid #ca8a04" : "2px solid transparent",
                  color: active === item.id ? "#ca8a04" : undefined,
                }}
              >
                <span style={{ marginRight: 6 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rapor Paneli İçeriği */}
      {report.implemented && report.apiGroup && (
        <GenericReportPanel report={report} groupLabel={group.label} apiGroup={report.apiGroup} />
      )}
    </div>
  );
}
