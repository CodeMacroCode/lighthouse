import { api } from "../apiService";

export interface AssignedBM {
  id?: string;
  _id?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
}

export interface SupervisedAOM {
  id?: string;
  _id?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  managedCentres?: string[];
  centresInThisCluster?: string[];
  allCentres?: string[];
}

export interface ClusterCentre {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
  city?: string;
  state?: string;
}

export interface ClusterItem {
  _id: string;
  id?: string;
  name: string;
  code: string;
  zone: string;
  description?: string;
  centreCount?: number;
  centres?: (string | ClusterCentre)[];
  assignedBM?: AssignedBM | null;
  aomCount?: number;
  supervisedAOMs?: SupervisedAOM[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClusterPayload {
  name: string;
  code: string;
  zone: string;
  description?: string;
}

export interface UpdateClusterPayload {
  name?: string;
  code?: string;
  zone?: string;
  description?: string;
  isActive?: boolean;
}

export interface ClusterListResponse {
  success: boolean;
  total?: number;
  data: ClusterItem[];
  message?: string;
}

export interface SingleClusterResponse {
  success: boolean;
  data: ClusterItem;
  message?: string;
}

export interface ClusterMutationResponse {
  success: boolean;
  message: string;
  data?: ClusterItem;
}

export interface ClusterAOMsResponse {
  success: boolean;
  cluster: string;
  zone: string;
  totalAOMs: number;
  data: SupervisedAOM[];
  message?: string;
}

export const clusterService = {
  /**
   * List all clusters with optional zone, search, unassigned, isActive filters
   * Endpoint: GET /api/clusters?zone=West&search=mumbai&unassigned=true
   */
  getClusters: async (params?: {
    zone?: string;
    search?: string;
    unassigned?: boolean | string;
    isActive?: boolean | string;
  }): Promise<ClusterListResponse> => {
    return await api.get<ClusterListResponse>("/clusters", params);
  },

  /**
   * Get cluster details by ID
   * Endpoint: GET /api/clusters/:id
   */
  getClusterById: async (id: string): Promise<SingleClusterResponse> => {
    return await api.get<SingleClusterResponse>(`/clusters/${encodeURIComponent(id)}`);
  },

  /**
   * Get supervised AOMs within a cluster
   * Endpoint: GET /api/clusters/:id/aoms
   */
  getClusterAOMs: async (clusterId: string): Promise<ClusterAOMsResponse> => {
    return await api.get<ClusterAOMsResponse>(`/clusters/${encodeURIComponent(clusterId)}/aoms`);
  },

  /**
   * Create a new Cluster Master record (Central only)
   * Endpoint: POST /api/clusters
   */
  createCluster: async (payload: CreateClusterPayload): Promise<ClusterMutationResponse> => {
    return await api.post<ClusterMutationResponse>("/clusters", payload);
  },

  /**
   * Update Cluster Master record (Central only)
   * Endpoint: PUT /api/clusters/:id
   */
  updateCluster: async (
    id: string,
    payload: UpdateClusterPayload
  ): Promise<ClusterMutationResponse> => {
    return await api.put<ClusterMutationResponse>(`/clusters/${encodeURIComponent(id)}`, payload);
  },

  /**
   * Soft delete Cluster (Central only)
   * Endpoint: DELETE /api/clusters/:id
   */
  deleteCluster: async (id: string): Promise<ClusterMutationResponse> => {
    return await api.delete<ClusterMutationResponse>(`/clusters/${encodeURIComponent(id)}`);
  },

  /**
   * Restore a soft-deleted Cluster from trash (Central only)
   * Endpoint: PUT /api/clusters/:id/restore
   */
  restoreCluster: async (id: string): Promise<ClusterMutationResponse> => {
    return await api.put<ClusterMutationResponse>(`/clusters/${encodeURIComponent(id)}/restore`);
  },
};
