import { api } from "../apiService";

export const auditService = {
  createAudit: async (data: any) => {
    return api.post("/audit/create", data);
  },

  sectionSave: async (data: any) => {
    return api.post("/audit/section/save", data);
  },

  
};