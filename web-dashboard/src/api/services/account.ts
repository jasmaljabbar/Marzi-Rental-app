import { http } from "../http";
import type { AccountUsage, CompanyInfo, TenantAccount } from "../../types/models";

export const accountApi = {
  getMe: () => http.get<TenantAccount>("/account/me").then((r) => r.data),
  getUsage: () => http.get<AccountUsage>("/account/usage").then((r) => r.data),
  getCompanyInfo: () => http.get<CompanyInfo>("/account/company").then((r) => r.data),
  updateCompanyInfo: (data: Partial<CompanyInfo>) => http.put<CompanyInfo>("/account/company", data).then((r) => r.data),
};
