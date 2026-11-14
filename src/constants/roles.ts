/**
 * Pre-K Incident & Safety Reporting Portal - 5-Tier User Roles
 * Reference: Pre-K Incident Portal BRD v1.1 / README copy.md
 */

export const PREK_ROLES = {
  AOM: "AOM", // Area Operations Manager (~60 users)
  BM: "BM", // Business Manager (~25 users)
  RSO: "RSO", // Regional Safety Officer (~4 users)
  NATIONAL_HEAD: "National Head", // National Head (~3 users)
  CENTRAL: "Central", // Central (All-Activity Admin) (~2 users)
} as const;

export type PrekRole = (typeof PREK_ROLES)[keyof typeof PREK_ROLES];

export const PREK_ROLE_LIST: PrekRole[] = [
  PREK_ROLES.AOM,
  PREK_ROLES.BM,
  PREK_ROLES.RSO,
  PREK_ROLES.NATIONAL_HEAD,
  PREK_ROLES.CENTRAL,
];

export const PREK_ROLE_DESCRIPTIONS: Record<PrekRole, { title: string; scope: string; count: string }> = {
  [PREK_ROLES.AOM]: {
    title: "Area Operations Manager (AOM)",
    scope: "Own centre(s) / local area (~30–35 centres)",
    count: "~60 users",
  },
  [PREK_ROLES.BM]: {
    title: "Business Manager (BM)",
    scope: "Cluster of areas within a zone",
    count: "~25 users",
  },
  [PREK_ROLES.RSO]: {
    title: "Regional Safety Officer (RSO)",
    scope: "Full zone (one or more regions)",
    count: "~4 users",
  },
  [PREK_ROLES.NATIONAL_HEAD]: {
    title: "National Head",
    scope: "National (all zones / 23 states)",
    count: "~3 users",
  },
  [PREK_ROLES.CENTRAL]: {
    title: "Central (All-Activity Admin)",
    scope: "National (full admin access)",
    count: "~2 users",
  },
};

/**
 * Normalizes any legacy, backend, or case-variant role string into the official 5-tier Pre-K role
 */
export function normalizePrekRole(val?: string | null): PrekRole | null {
  if (!val || typeof val !== "string") return null;
  const clean = val.trim().toLowerCase().replace(/[\s_-]+/g, "");

  if (
    clean === "aom" ||
    clean === "areaoperationsmanager" ||
    clean === "parent" ||
    clean === "coordinator"
  ) {
    return PREK_ROLES.AOM;
  }
  if (
    clean === "bm" ||
    clean === "businessmanager" ||
    clean === "branch"
  ) {
    return PREK_ROLES.BM;
  }
  if (
    clean === "rso" ||
    clean === "regionalsafetyofficer" ||
    clean === "regionalhead" ||
    clean === "branchgroup"
  ) {
    return PREK_ROLES.RSO;
  }
  if (
    clean === "nationalhead" ||
    clean === "school"
  ) {
    return PREK_ROLES.NATIONAL_HEAD;
  }
  if (
    clean === "central" ||
    clean === "superadmin" ||
    clean === "admin"
  ) {
    return PREK_ROLES.CENTRAL;
  }

  // Exact match search across PREK_ROLES
  const found = Object.values(PREK_ROLES).find(
    (r) => r.toLowerCase() === val.trim().toLowerCase()
  );
  return found || null;
}
