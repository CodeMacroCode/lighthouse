import { api } from "../apiService";
import { IncidentResponse } from "@/interface/modal";

export interface IncidentStatsData {
  totalIncidents: number;
  openCases: number;
  highOrCritical: number;
  closureRate: string;
  severitySplit: {
    name: string;
    value: number;
  }[];
  incidentTrendBySeverity: {
    month: string;
    monthKey?: string;
    key?: string;
    label?: string;
    total: number;
    open?: number;
    closed?: number;
    closureRate?: string;
    low: number;
    medium: number;
    high: number;
    critical: number;
    Low?: number;
    Medium?: number;
    High?: number;
    Critical?: number;
  }[];
  incidentsByType: {
    name: string;
    count: number;
  }[];
  regionComparison: {
    region: string;
    count: number;
  }[];
  incidentTypeByRegion: {
    type: string;
    north: number;
    south: number;
    east: number;
    west: number;
    central: number;
    total: number;
  }[];
}

export const incidentService = {
  getIncidents: async (params: { page: number; limit: number | string; status?: string; region?: string; search?: string }): Promise<IncidentResponse> => {
    return await api.get<IncidentResponse>("/get-incidents", params);
  },

  getIncidentStats: async (params?: { region?: string; category?: string; month?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; data: IncidentStatsData }> => {
    return await api.get<{ success: boolean; data: IncidentStatsData }>("/incident-stats", params);
  },

  getNationalDashboard: async (params?: { state?: string }): Promise<any> => {
    return await api.get<any>("/national-dashboard", params);
  },

  getEscalationMatrix: async (): Promise<any> => {
    return await api.get<any>("/escalation-matrix");
  },

  addIncident: async (data: any): Promise<any> => {
    return await api.post<any>("/add-incident", data);
  },

  updateIncident: async (id: string, data: any): Promise<any> => {
    return await api.put<any>(`/update-incident/${id}`, data);
  },

  updateIncidentStatus: async (id: string, data: any): Promise<any> => {
    return await api.put<any>(`/update-incident-status/${id}`, data);
  },

  deleteIncident: async (id: string): Promise<any> => {
    return await api.delete<any>(`/delete-incident/${id}`);
  },

  getAuditLogs: async (params?: { page?: number; limit?: number | string; action?: string; search?: string }): Promise<any> => {
    return await api.get<any>("/audit-logs", params);
  },
};


