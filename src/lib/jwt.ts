import { jwtDecode } from "jwt-decode";

export interface DecodedToken {
  id: string;
  username: string;
  role: string;
  schoolId?: string;
  branchId?: string;
  exp?: number;
  iat?: number;
}

export const getDecodedToken = (token: string | null | undefined): DecodedToken | null => {
  if (!token || typeof token !== "string") return null;

  // JWT must have 3 parts separated by dots
  const parts = token.split(".");
  if (parts.length !== 3) {
    // console.warn("Malformed JWT token provided");
    return null;
  }

  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    // console.error("Error decoding token:", error);
    return null;
  }
};
