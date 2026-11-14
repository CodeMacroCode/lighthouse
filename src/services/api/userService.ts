import { api } from "../apiService";
import { PREK_ROLES, PrekRole } from "@/constants/roles";

export interface PreKUser {
  _id: string;
  id?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: PrekRole | string;
  zone?: string;
  region?: string;
  cluster?: string;
  centres?: string[];
  status?: "active" | "inactive" | string;
  isActive?: boolean;
  isLocked?: boolean;
  failedLoginAttempts?: number;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetUsersParams {
  role?: string;
  zone?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number | string;
}

export interface GetUsersResponse {
  success: boolean;
  data: PreKUser[];
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserData {
  name: string;
  username: string;
  email?: string;
  phone?: string;
  password?: string;
  role: string;
  zone?: string;
  cluster?: string;
  centres?: string[];
}

export const userService = {
  // GET /api/users
  getUsers: async (params?: GetUsersParams): Promise<GetUsersResponse> => {
    return await api.get<GetUsersResponse>("/users", params);
  },

  // POST /api/users
  createUser: async (data: CreateUserData): Promise<any> => {
    return await api.post<any>("/users", data);
  },

  // PUT /api/users/:id
  updateUser: async (id: string, data: Partial<CreateUserData>): Promise<any> => {
    return await api.put<any>(`/users/${id}`, data);
  },

  // PUT /api/users/:id/unlock (Unlock locked accounts)
  unlockUser: async (id: string): Promise<any> => {
    return await api.put<any>(`/users/${id}/unlock`, {});
  },

  // PUT /api/users/:id/reset-password
  resetUserPassword: async (id: string, newPassword?: string): Promise<any> => {
    return await api.put<any>(`/users/${id}/reset-password`, { password: newPassword });
  },

  // PUT /api/users/:id/status (Toggle active/inactive)
  updateUserStatus: async (id: string, status: string | boolean): Promise<any> => {
    const statusVal = typeof status === "boolean" ? (status ? "active" : "inactive") : status;
    return await api.put<any>(`/users/${id}/status`, { status: statusVal });
  },

  // DELETE /api/users/:id
  deleteUser: async (id: string): Promise<any> => {
    return await api.delete<any>(`/users/${id}`);
  },

  // POST /auth/reset-password (Self-service public reset)
  selfResetPassword: async (data: { username: string; newPassword: string; email?: string }): Promise<any> => {
    return await api.post<any>("/reset-password", data);
  },
};
