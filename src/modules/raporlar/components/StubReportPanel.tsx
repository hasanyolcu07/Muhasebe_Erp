import { GenericReportPanel } from "./GenericReportPanel";
import type { ReportItem } from "../config/reportMenu";

type Props = {
  title: string;
  groupLabel: string;
  apiGroup?: string;
  reportId?: string;
};

/**
 * FAZ 7: StubReportPanel artık sahte statik veri yerine
 * GenericReportPanel üzerinden gerçek kaynak kayıtlarını ve API sorgularını çalıştırır.
 */
export function StubReportPanel({ title, groupLabel, apiGroup = "genel", reportId = "genel" }: Props) {
  const reportItem: ReportItem = {
    id: reportId,
    label: title,
    implemented: true,
    apiGroup,
  };

  return (
    <GenericReportPanel
      report={reportItem}
      groupLabel={groupLabel}
      apiGroup={apiGroup}
    />
  );
}
