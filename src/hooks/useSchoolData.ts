import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/api/userService";
import { School } from "@/interface/modal";

export const useSchoolData = (options?: { enabled?: boolean }) =>
  useQuery<School[]>({
    queryKey: ["schoolData"],
    queryFn: async () => {
      try {
        const uRes: any = await userService.getUsers({ role: "National Head" });
        const list = uRes?.data || uRes?.users || (Array.isArray(uRes) ? uRes : []);
        if (Array.isArray(list)) {
          return list.map((u: any) => ({
            ...u,
            _id: u._id || u.id,
            schoolName: u.name || u.schoolName || u.username,
          }));
        }
      } catch (e) {
        console.warn("Failed to fetch National Head users for useSchoolData:", e);
      }
      return [];
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
