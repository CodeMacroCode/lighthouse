import { dropdownService } from "@/services/api/dropdownService";
import { api } from "@/services/apiService";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { PREK_ROLES } from "@/constants/roles";

export interface DropdownItem {
  _id: string;
  name?: string;
  schoolName?: string;
  branchName?: string;
  routeNumber?: string;
  categoryName?: string;
  modelName?: string;
  driverName?: string;
}

export interface DropdownResponse<T> {
  page?: number;
  limit?: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
  data: T[];
}

export const useSchoolDropdown = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ["dropdown-schools"],
    queryFn: dropdownService.getSchools,
    enabled: shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export interface BranchGroupDropdownItem {
  _id: string;
  branchGroupName: string;
  regionHeadName?: string;
  schoolId?: { _id: string; schoolName: string } | string;
  AssignedBranch?: { _id: string; branchName: string }[];
  [key: string]: any;
}

export const useBranchGroupDropdown = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ["branchGroups-dropdown"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/users", { params: { role: PREK_ROLES.RSO } });
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list)) {
          return list.map((u: any) => ({
            ...u,
            _id: u._id || u.id,
            branchGroupName: u.name || u.branchGroupName || u.username,
          }));
        }
      } catch {}
      return [];
    },
    enabled: shouldFetch,
    select: (res: any) => (Array.isArray(res) ? res : res?.data || []),
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBranchDropdown = (
  schoolId?: string,
  shouldFetch: boolean = true,
  skipSchoolId: boolean = false
) => {
  // console.log("Fetching branches for schoolId:", schoolId);
  return useQuery({
    queryKey: ["branch-dropdown", skipSchoolId ? undefined : schoolId],
    queryFn: () =>
      dropdownService.getBranches(skipSchoolId ? undefined : schoolId),
    enabled: (skipSchoolId || !!schoolId) && shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDeviceDropdown = (
  branchId?: string,
  shouldFetch: boolean = true
) => {
  return useQuery({
    queryKey: ["device-dropdown", branchId],
    queryFn: () => dropdownService.getDevices(branchId),
    enabled: !!branchId,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDeviceDropdownWithUniqueId = (
  branchId?: string,
  schoolId?: string,
  shouldFetch: boolean = true
) => {
  return useQuery({
    queryKey: ["device-dropdown-uniqueId", branchId, schoolId],
    queryFn: () => dropdownService.getDevicesWithUniqueId({ branchId, schoolId }),
    enabled: shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDeviceDropdownWithPagination = (
  branchId?: string,
  schoolId?: string,
  search: string = "",
  shouldFetch: boolean = true,
  enabledPagination: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ["device-dropdown-pagination", branchId, schoolId, search],
    enabled: shouldFetch,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await dropdownService.getDevicesWithPagination({
        branchId,
        schoolId: branchId ? undefined : schoolId,
        page: pageParam as number,
        limit: 10,
        search,
      });
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (!enabledPagination) return undefined;
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDeviceDropdownWithUniqueIdForHistory = (
  shouldFetch: boolean = true
) => {
  return useQuery({
    queryKey: ["device-dropdown-uniqueId"],
    queryFn: () => dropdownService.getDevicesWithUniqueId(),
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useRouteDropdown = (
  branchId?: string,
  shouldFetch: boolean = true
) => {
  return useQuery({
    queryKey: ["route-dropdown", branchId],
    queryFn: async () => await dropdownService.getRoutes(branchId),
    enabled: !!branchId && shouldFetch,
    select: (res) => res.data.data as DropdownItem[],
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useParentDropdown = (
  branchId?: string,
  search: string = "",
  shouldFetch: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ["parent-dropdown", branchId, search],
    enabled: !!branchId && shouldFetch,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await dropdownService.getParents({
        branchId: branchId as string,
        page: pageParam as number,
        limit: 10,
        search,
      });

      return res.data as DropdownResponse<DropdownItem>;
    },
    getNextPageParam: (lastPage) => {
      if ((lastPage.page ?? 0) < (lastPage.totalPages ?? 0)) {
        return (lastPage.page ?? 0) + 1;
      }
      return undefined;
    },
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGeofenceDropdown = (
  routeObjId?: string,
  search: string = "",
  shouldFetch: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: ["geofence-dropdown", routeObjId, search],
    enabled: !!routeObjId && shouldFetch,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await dropdownService.getGeofence({
        routeObjId: routeObjId as string,
        page: pageParam as number,
        limit: 10,
        search,
      });

      return res.data as DropdownResponse<DropdownItem>;
    },

    getNextPageParam: (lastPage) => {
      if ((lastPage.page ?? 0) < (lastPage.totalPages ?? 0)) {
        return (lastPage.page ?? 0) + 1;
      } else {
        return undefined;
      }
    },
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCategoryDropdown = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ["category-dropdown"],
    queryFn: dropdownService.getCategory,
    enabled: shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useModelDropdown = (shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ["model-dropdown"],
    queryFn: dropdownService.getModel,
    enabled: shouldFetch,
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDriverDropdown = (
  shouldFetch: boolean = true,
  search: string = "",
  branchId?: string
) => {
  return useInfiniteQuery({
    queryKey: ["driver-dropdown", branchId, search],
    enabled: !!branchId && shouldFetch,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await dropdownService.getDriver({
        branchId: branchId as string,
        page: pageParam as number,
        limit: 10,
        search,
      });

      return res.data as DropdownResponse<DropdownItem>;
    },

    getNextPageParam: (lastPage) => {
      if ((lastPage.page ?? 0) < (lastPage.totalPages ?? 0)) {
        return (lastPage.page ?? 0) + 1;
      } else {
        return undefined;
      }
    },
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};
