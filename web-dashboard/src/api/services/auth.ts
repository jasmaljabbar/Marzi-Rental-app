import { http } from "../http";
import type { AuthResponse, Id, Me, Role, StaffUser } from "../../types/models";

export interface CreateStaffInput {
  username: string;
  password: string;
  role: Exclude<Role, "owner">;
  shop_id?: Id | null;
  email?: string | null;
}

export const authApi = {
  login: (username: string, password: string, business_code?: string) =>
    http.post<AuthResponse>("/auth/login", { username, password, business_code: business_code || undefined }).then((r) => r.data),

  // Independent entry point for platform admins.
  adminLogin: (username: string, password: string) =>
    http.post<AuthResponse>("/auth/admin/login", { username, password }).then((r) => r.data),

  // Self-serve signup: new business + default shop + trial subscription.
  register: (input: { username: string; password: string; company_name: string; shop_name?: string; currency?: string; email?: string }) =>
    http.post<AuthResponse>("/auth/register", input).then((r) => r.data),

  me: () => http.get<Me>("/auth/me").then((r) => r.data),
  changePassword: (current_password: string, new_password: string) =>
    http.put<AuthResponse>("/auth/me/password", { current_password, new_password }).then((r) => r.data),

  // Always answers with the same generic message; the link arrives by email.
  forgotPassword: (username: string, business_code?: string) =>
    http.post<{ message: string }>("/auth/forgot-password", { username, business_code: business_code || undefined }).then((r) => r.data),
  resetPassword: (token: string, new_password: string) =>
    http.post<{ message: string }>("/auth/reset-password", { token, new_password }).then((r) => r.data),

  // Team management (owner/admin only).
  listUsers: () => http.get<StaffUser[]>("/auth/users").then((r) => r.data),
  createUser: (input: CreateStaffInput) => http.post<StaffUser>("/auth/users", input).then((r) => r.data),
  updateUser: (id: Id, input: Partial<Omit<CreateStaffInput, "password">>) => http.put<StaffUser>(`/auth/users/${id}`, input).then((r) => r.data),
  updateUserRole: (id: Id, role: "admin" | "staff") => http.put<StaffUser>(`/auth/users/${id}/role`, { role }).then((r) => r.data),
  setUserPassword: (id: Id, new_password: string) =>
    http.put<{ message: string }>(`/auth/users/${id}/password`, { new_password }).then((r) => r.data),
  deleteUser: (id: Id) => http.delete<{ message: string }>(`/auth/users/${id}`).then((r) => r.data),
};
