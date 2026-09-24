import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const API = "http://localhost:5000";

// Default handlers for calls most screens make; tests add their own on top.
export const server = setupServer(
  http.get(`${API}/auth/me`, () =>
    HttpResponse.json({ id: "u1", username: "owner", email: null, role: "owner", account_id: "a1", shop_id: null, business_code: "acme", company_name: "Acme", is_platform_admin: false })
  ),
  http.get(`${API}/shops`, () => HttpResponse.json([{ id: "s1", name: "Main", address: null, phone: null, is_active: true, created_at: "", updated_at: "" }])),
  http.get(`${API}/account/me`, () => HttpResponse.json({ id: "a1", company_name: "Acme", business_code: "acme", currency: "INR", created_at: "", subscription: null, plan: null }))
);
