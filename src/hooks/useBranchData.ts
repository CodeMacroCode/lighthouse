"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/api/userService";
import { Branch } from "@/interface/modal";

export const useBranchData = () =>
  useQuery<Branch[]>({
    queryKey: ["branchData"],
    queryFn: async () => {
      try {
        const uRes: any = await userService.getUsers({ role: "BM" });
        const list = uRes?.data || uRes?.users || (Array.isArray(uRes) ? uRes : []);
        if (Array.isArray(list)) {
          return list.map((u: any) => ({
            ...u,
            _id: u._id || u.id,
            branchName: u.name || u.branchName || u.username,
          }));
        }
      } catch (e) {
        console.warn("Failed to fetch BM users for useBranchData:", e);
      }
      return [];
    },
  });
