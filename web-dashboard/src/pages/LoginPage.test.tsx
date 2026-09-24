import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { server, API } from "../test/server";
import { renderWithProviders } from "../test/render";
import { LoginPage } from "./LoginPage";

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Home</p>} />
    </Routes>,
    { route: "/login" }
  );
}

const ok = { access_token: "t", token_type: "bearer", username: "admin", role: "owner", account_id: "a1", business_code: "alpha", is_platform_admin: false };

describe("LoginPage", () => {
  it("asks for the business code when the username exists in several businesses, then signs in", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        const body = (await request.json()) as { business_code?: string };
        bodies.push(body);
        if (!body.business_code) {
          return HttpResponse.json({ detail: "used by more than one business", code: "BUSINESS_CODE_REQUIRED" }, { status: 409 });
        }
        return HttpResponse.json(ok);
      })
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "secret-pass-1");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/more than one business/);
    await user.type(screen.getByLabelText("Business code"), "alpha");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(bodies[1]).toMatchObject({ username: "admin", business_code: "alpha" });
    expect(localStorage.getItem("rental_admin_token")).toBe("t");
  });

  it("shows the server's error for wrong credentials", async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({ detail: "Incorrect username or password." }, { status: 401 })));
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText("Username"), "x");
    await user.type(screen.getByLabelText("Password"), "y");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password.");
    await waitFor(() => expect(localStorage.getItem("rental_admin_token")).toBeNull());
  });
});
