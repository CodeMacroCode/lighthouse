import api from "@/lib/axios";
import { PREK_ROLES } from "@/constants/roles";

export const dropdownService = {
  getSchools: async () => {
    try {
      const res: any = await api.get("/users", { params: { role: PREK_ROLES.NATIONAL_HEAD } });
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return { data: { data: list.map((u: any) => ({ ...u, _id: u._id || u.id, schoolName: u.name || u.schoolName || u.username })) } };
      }
    } catch {}
    return { data: { data: [] } };
  },

  getBranches: async (schoolId?: string) => {
    try {
      const res: any = await api.get("/users", { params: { role: PREK_ROLES.BM } });
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        return { data: { data: list.map((u: any) => ({ ...u, _id: u._id || u.id, branchName: u.name || u.branchName || u.username })) } };
      }
    } catch {}
    return { data: { data: [] } };
  },

  getDevices: (branchId?: string) =>
    api.get("/device/dropdown", {
      params: branchId ? { branchId } : {},
    }),

  getDevicesWithUniqueId: (params: { branchId?: string; schoolId?: string } = {}) =>
    api.get("/device/dropdown/uniqueId", {
      params,
    }),

  getDevicesWithPagination: (params: { branchId?: string; schoolId?: string; page?: number; limit?: number; search?: string } = {}) =>
    api.get("/device/dropdown-by-pagination", {
      params,
    }),

  getRoutes: (branchId?: string) =>
    api.get("/route/dropdown", {
      params: branchId ? { branchId } : {},
    }),

  getParents: (params: {
    branchId: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    api.get("/parent/dropdown", {
      params,
    }),

  getGeofence: (params: {
    routeObjId: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    api.get("/geofence/dropdown", {
      params,
    }),

  getCategory: () => api.get("/category/dropdown"),

  getModel: () => api.get("/model/dropdown"),

  getDriver: (params: {
    branchId: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => api.get("/driver/dropdown", { params }),
};
