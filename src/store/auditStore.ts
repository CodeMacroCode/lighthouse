import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuditState {
  schoolId: string | null;
  createdBy: string | null;
  auditId: string | null;

  setAuditData: (data: { schoolId: string; createdBy: string; _id: string }) => void;
  clearAuditData: () => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      schoolId: null,
      createdBy: null,
      auditId: null,

      setAuditData: (data) => set({
        schoolId: data.schoolId,
        createdBy: data.createdBy,
        auditId: data._id
      }),

      clearAuditData: () => set({
        schoolId: null,
        createdBy: null,
        auditId: null
      }),
    }),
    {
      name: "audit-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
