import { api } from "../apiService";

export interface ActiveRSO {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
}

export interface ZoneCentre {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  status?: string;
}

export interface ZoneItem {
  _id: string;
  name: string;
  code: string;
  description?: string;
  states?: string[];
  cities?: string[];
  centreCount?: number;
  activeRSO?: ActiveRSO | null;
  isActive?: boolean;
  centres?: ZoneCentre[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateZonePayload {
  name: string;
  code: string;
  description?: string;
  states?: string[];
  cities?: string[];
}

export interface UpdateZonePayload {
  name?: string;
  code?: string;
  description?: string;
  states?: string[];
  cities?: string[];
  isActive?: boolean;
}

export interface ZoneListResponse {
  success: boolean;
  total?: number;
  data: ZoneItem[];
  message?: string;
}

export interface SingleZoneResponse {
  success: boolean;
  data: ZoneItem;
  message?: string;
}

export interface ZoneMutationResponse {
  success: boolean;
  message: string;
  data?: ZoneItem;
}

export const zoneService = {
  /**
   * List all zones with optional search and active status filter
   * Endpoint: GET /api/zones?search=...&isActive=true
   */
  getZones: async (params?: {
    search?: string;
    isActive?: boolean | string;
  }): Promise<ZoneListResponse> => {
    return await api.get<ZoneListResponse>("/zones", params);
  },

  /**
   * Get zone details by Mongo ID or Zone Code (e.g. ZN-WEST)
   * Endpoint: GET /api/zones/:idOrCode
   */
  getZoneByIdOrCode: async (idOrCode: string): Promise<SingleZoneResponse> => {
    return await api.get<SingleZoneResponse>(`/zones/${encodeURIComponent(idOrCode)}`);
  },

  /**
   * Create a new Zone Master record (Central only)
   * Endpoint: POST /api/zones
   */
  createZone: async (payload: CreateZonePayload): Promise<ZoneMutationResponse> => {
    return await api.post<ZoneMutationResponse>("/zones", payload);
  },

  /**
   * Update Zone Master record (Central only)
   * Endpoint: PUT /api/zones/:id
   */
  updateZone: async (
    id: string,
    payload: UpdateZonePayload
  ): Promise<ZoneMutationResponse> => {
    return await api.put<ZoneMutationResponse>(`/zones/${encodeURIComponent(id)}`, payload);
  },

  /**
   * Soft delete Zone (Central only)
   * Endpoint: DELETE /api/zones/:id
   * Note: Blocked with HTTP 400 if active centres are attached.
   */
  deleteZone: async (id: string): Promise<ZoneMutationResponse> => {
    return await api.delete<ZoneMutationResponse>(`/zones/${encodeURIComponent(id)}`);
  },

  /**
   * Restore a soft-deleted Zone from trash (Central only)
   * Endpoint: PUT /api/zones/:id/restore
   */
  restoreZone: async (id: string): Promise<ZoneMutationResponse> => {
    return await api.put<ZoneMutationResponse>(`/zones/${encodeURIComponent(id)}/restore`);
  },
};
