import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { ReportNav } from "../components/ReportNav";
import { StockReportPanel } from "../components/StockReportPanel";
import { GenericReportPanel } from "../components/GenericReportPanel";
import { SalesReportPanel } from "../components/SalesReportPanel";
import { StubReportPanel } from "../components/StubReportPanel";
import {
  findGroup,
  findReport,
  type ReportGroupId,
} from "../config/reportMenu";

export function ReportsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const guardNavigate = useAppStore((s) => s.guardNavigate);

  const group = findGroup(searchParams.get("group") ?? "stok");
  const report = findReport(group, searchParams.get("report"));

  useEffect(() => {
    const g = searchParams.get("group");
    const r = searchParams.get("report");
    if (g !== group.id || r !== report.id) {
      setSearchParams({ group: group.id, report: report.id }, { replace: true });
    }
  }, [group.id, report.id, searchParams, setSearchParams]);

  const onSelect = (groupId: ReportGroupId, reportId: string) => {
    guardNavigate(() => {
      setSearchParams({ group: groupId, report: reportId });
    });
  };

  const renderPanel = () => {
    if (group.id === "stok" && report.implemented) {
      return <StockReportPanel reportId={report.id} title={report.label} />;
    }
    if (group.id === "satis" && report.implemented) {
      return <SalesReportPanel report={report} groupLabel={group.label} />;
    }
    if (report.implemented && report.apiGroup) {
      return (
        <GenericReportPanel
          report={report}
          groupLabel={group.label}
          apiGroup={report.apiGroup}
        />
      );
    }
    return <StubReportPanel title={report.label} groupLabel={group.label} />;
  };

  return (
    <>
      <div className="header-bar">
        <div className="header-breadcrumb">Raporlar › {group.label}</div>
      </div>

      <div className="reports-hub-layout">
        <ReportNav
          activeGroup={group.id}
          activeReportId={report.id}
          onSelect={onSelect}
        />
        <main className="reports-hub-main">{renderPanel()}</main>
      </div>
    </>
  );
}
