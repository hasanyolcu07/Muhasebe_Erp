import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useAppStore, isAccountingEnabledForRecordType } from "@/store/appStore";

type Options = {
  /** Düzenleme modunda topbar'dan gelen değerleri forma yazma */
  isEdit?: boolean;
  /** Topbar değişince forma senkronize et (yeni kayıt) */
  syncFromTopbar?: boolean;
};

/**
 * Finansal formlarda topbar şube + kayıt türü varsayılanlarını forma taşır.
 * Yeni kayıt oluştururken mount ve topbar değişiminde branch_id / record_type_id güncellenir.
 */
export function useFinancialFormDefaults(options: Options = {}) {
  const { isEdit = false, syncFromTopbar = true } = options;
  const branchId = useAppStore((s) => s.branchId);
  const recordTypeId = useAppStore((s) => s.recordTypeId);
  const recordTypes = useAppStore((s) => s.recordTypes);
  const { setValue, control } = useFormContext();

  const formBranchId = useWatch({ control, name: "branch_id" });
  const formRecordTypeId = useWatch({ control, name: "record_type_id" });

  useEffect(() => {
    if (isEdit || !syncFromTopbar) return;
    if (branchId != null) {
      setValue("branch_id", branchId, { shouldValidate: true });
    }
    if (recordTypeId != null) {
      setValue("record_type_id", recordTypeId, { shouldValidate: true });
    }
  }, [branchId, recordTypeId, isEdit, syncFromTopbar, setValue]);

  const activeRecordTypeId = formRecordTypeId ?? recordTypeId;
  const accountingEnabled = isAccountingEnabledForRecordType(recordTypes, activeRecordTypeId);

  return {
    defaultBranchId: branchId,
    defaultRecordTypeId: recordTypeId,
    formBranchId,
    formRecordTypeId: activeRecordTypeId,
    accountingEnabled,
    recordTypes,
  };
}
