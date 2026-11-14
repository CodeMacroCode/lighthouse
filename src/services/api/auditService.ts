import { api } from "../apiService";

export const auditService = {
  createAudit: async (data: any) => {
    return api.post("/audit/create", data);
  },

  sectionSave: async (data: any) => {
    return api.post("/audit/section/save", data);
  },

  getAudits: async (params: { page: number; limit: number }) => {
    try {
      const res: any = await api.get("/audit-logs", params);
      if (res?.data && Array.isArray(res.data)) {
        return res;
      }
    } catch (e) {
      // fallback to legacy /audit
    }
    return api.get("/audit", params);
  },

  finalizeAudit: async (auditId: string) => {
    return api.post(`/audit/finalize/${auditId}`);
  },

  getAuditLogs: async (params?: { page?: number; limit?: number | string; action?: string; search?: string }) => {
    return api.get("/audit-logs", params);
  },
};