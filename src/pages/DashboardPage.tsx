import { DashboardHub } from "../modules/dashboard/components/DashboardHub";
import { useAppStore, useAuthStore } from "../store/appStore";

type Props = {
  canCreate: boolean;
  roleCode: string;
  amountLimit: number | null;
  onToggleDirty: () => void;
};

export function DashboardPage({ canCreate: _canCreate, roleCode: _roleCode, amountLimit: _amountLimit, onToggleDirty: _onToggleDirty }: Props) {
  const user = useAuthStore((s) => s.user);
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const userName =
    (typeof user?.full_name === "string" && user.full_name) ||
    (typeof user?.username === "string" && user.username) ||
    undefined;

  return (
    <div>
      <div className="header-bar">
        <div className="header-breadcrumb">Ana Panel › Dashboard</div>
      </div>
      <DashboardHub
        branchId={branchId ?? undefined}
        recordTypeId={recordTypeId ?? undefined}
        userName={userName}
      />
    </div>
  );
}
