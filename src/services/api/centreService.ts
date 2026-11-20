import { api } from "../apiService";

export interface AssignedAOM {
  id?: string;
  _id?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
}

export interface CentreItem {
  _id: string;
  id?: string;
  name: string;
  code: string;
  zone: string;
  cluster: string;
  state: string;
  city: string;
  address?: string;
  pincode?: string;
  contactPhone?: string;
  contactEmail?: string;
  assignedAOM?: AssignedAOM | null;
  isAssigned?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  incidentCount?: number;
  totalIncidents?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCentrePayload {
  name: string;
  code: string;
  zone: string;
  cluster: string;
  state: string;
  city: string;
  address?: string;
  pincode?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface UpdateCentrePayload {
  name?: string;
  code?: string;
  zone?: string;
  cluster?: string;
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive?: boolean;
}

export interface CentreListResponse {
  success: boolean;
  total?: number;
  page?: number;
  limit?: number;
  data: CentreItem[];
  message?: string;
}

export interface SingleCentreResponse {
  success: boolean;
  data: CentreItem;
  message?: string;
}

export interface CentreMutationResponse {
  success: boolean;
  message: string;
  data?: CentreItem;
}

export const centreService = {
  /**
   * List all centres / schools with optional zone, state, cluster, search, unassigned, isActive filters
   * Endpoint: GET /api/centres?zone=West&state=Maharashtra&cluster=Mumbai Cluster&search=bandra&unassigned=true
   */
  getCentres: async (params?: {
    zone?: string;
    state?: string;
    cluster?: string;
    search?: string;
    unassigned?: boolean | string;
    isActive?: boolean | string;
  }): Promise<CentreListResponse> => {
    return await api.get<CentreListResponse>("/centres", params);
  },

  /**
   * Get centre details by ID or Code
   * Endpoint: GET /api/centres/:id (or /api/centres/:code)
   */
  getCentreByIdOrCode: async (idOrCode: string): Promise<SingleCentreResponse> => {
    return await api.get<SingleCentreResponse>(`/centres/${encodeURIComponent(idOrCode)}`);
  },

  /**
   * Create a new Centre / School (Central only)
   * Endpoint: POST /api/centres
   */
  createCentre: async (payload: CreateCentrePayload): Promise<CentreMutationResponse> => {
    return await api.post<CentreMutationResponse>("/centres", payload);
  },

  /**
   * Update Centre / School (Central only)
   * Endpoint: PUT /api/centres/:id
   */
  updateCentre: async (
    id: string,
    payload: UpdateCentrePayload
  ): Promise<CentreMutationResponse> => {
    return await api.put<CentreMutationResponse>(`/centres/${encodeURIComponent(id)}`, payload);
  },

  /**
   * Soft delete Centre / School (Central only)
   * Endpoint: DELETE /api/centres/:id
   */
  deleteCentre: async (id: string): Promise<CentreMutationResponse> => {
    return await api.delete<CentreMutationResponse>(`/centres/${encodeURIComponent(id)}`);
  },

  /**
   * List soft-deleted Centres / Schools (Central, National Head)
   * Endpoint: GET /api/centres/deleted
   */
  getDeletedCentres: async (): Promise<CentreListResponse> => {
    return await api.get<CentreListResponse>("/centres/deleted");
  },

  /**
   * Restore soft-deleted Centre / School (Central only)
   * Endpoint: PUT /api/centres/:id/restore
   */
  restoreCentre: async (id: string): Promise<CentreMutationResponse> => {
    return await api.put<CentreMutationResponse>(`/centres/${encodeURIComponent(id)}/restore`);
  },
};
