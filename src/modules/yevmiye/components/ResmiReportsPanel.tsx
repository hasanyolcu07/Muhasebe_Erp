import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { GenericReportPanel } from "@/modules/raporlar/components/GenericReportPanel";
import { findReport, findGroup } from "@/modules/raporlar/config/reportMenu";
import { yevmiyeApi } from "../api/yevmiyeApi";

const MALI_REPORTS = [
  "genel-mizan",
  "muavin",
  "bilanco",
  "gelir-tablosu",
  "nakit-akis",
  "kar-zarar",
] as const;

export function ResmiReportsPanel() {
  const [active, setActive] = useState<string>("genel-mizan");
  const [aiResult, setAiResult] = useState<string>("");
  const group = findGroup("muhasebe");
  const report = findReport(group, active);

  async function runAi() {
    const res = await yevmiyeApi.aiMaliTablo({
      report_type: active,
      period_label: "Önizleme",
      data: { net: 10000, assets_total: 500000, liabilities_total: 300000 },
    });
    setAiResult(JSON.stringify(res, null, 2));
  }

  return (
    <div>
      <div className="hub-tabs">
        {MALI_REPORTS.map((id) => (
          <button
            key={id}
            type="button"
            className={active === id ? "hub-tab active" : "hub-tab"}
            onClick={() => setActive(id)}
          >
            {findReport(group, id).label}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => void runAi()} style={{ marginBottom: 8 }}>
        AI Mali Tablo Yorumu
      </button>
      {aiResult && <pre className="code-block">{aiResult}</pre>}
      {report.implemented && report.apiGroup && (
        <GenericReportPanel report={report} groupLabel={group.label} apiGroup={report.apiGroup} />
      )}
    </div>
  );
}
