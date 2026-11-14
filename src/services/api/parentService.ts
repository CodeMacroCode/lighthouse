import api from "@/lib/axios";
import { GetParentsResponse } from "@/interface/modal";
import { userService } from "./userService";
import { PREK_ROLES } from "@/constants/roles";

export const parentService = {
  getParents: async (
    params: Record<string, any>
  ): Promise<GetParentsResponse> => {
    try {
      const uRes: any = await userService.getUsers({ role: PREK_ROLES.AOM, ...params });
      const list = uRes?.data || uRes?.users || (Array.isArray(uRes) ? uRes : []);
      if (Array.isArray(list)) {
        return {
          parents: list.map((u: any) => ({
            ...u,
            parentName: u.name || u.parentName || u.username,
            mobileNumber: u.phone || u.mobileNumber,
            _id: u._id || u.id,
          })),
          pagination: uRes.pagination || {
            total: uRes.total || list.length,
            page: params.page || 1,
            limit: params.limit || 10,
            totalPages: Math.ceil((uRes.total || list.length) / (params.limit || 10)),
          },
        } as any;
      }
    } catch (e) {
      console.error("Failed to load AOM users:", e);
    }
    return {
      parents: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
    } as any;
  },

  createParent: async (payload: any) => {
    return await userService.createUser({
      name: payload.parentName || payload.name,
      username: payload.username,
      email: payload.email,
      phone: payload.mobileNumber || payload.phone,
      password: payload.password,
      role: PREK_ROLES.AOM,
      centres: payload.centres || (payload.schoolId ? [payload.schoolId] : []),
      ...payload,
    });
  },

  updateParent: async (id: string, payload: any) => {
    return await userService.updateUser(id, payload);
  },

  deleteParent: async (id: string) => {
    return await userService.deleteUser(id);
  },
};
