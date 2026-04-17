import { api } from "../apiService";
import { IncidentResponse } from "@/interface/modal";

export const incidentService = {
  getIncidents: async (params: { page: number; limit: number }): Promise<IncidentResponse> => {
    return await api.get<IncidentResponse>("/get-incidents", params);
  },

  addIncident: async (data: any): Promise<any> => {
    return await api.post<any>("/add-incident", data);
  },

  updateIncident: async (id: string, data: any): Promise<any> => {
    return await api.put<any>(`/update-incident/${id}`, data);
  },
};

