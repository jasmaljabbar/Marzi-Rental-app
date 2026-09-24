import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server, API } from "../test/server";
import { renderWithProviders } from "../test/render";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { Route, Routes } from "react-router-dom";

describe("password reset", () => {
  it("shows the generic confirmation and never a reset code", async () => {
    server.use(http.post(`${API}/auth/forgot-password`, () => HttpResponse.json({ message: "If this account has an email address on file, a link was sent." })));
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Username"), "erin");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/link was sent/);
    expect(screen.queryByText(/code/i)).not.toBeInTheDocument();
  });

  it("sets a new password from the emailed link", async () => {
    let sent: unknown;
    server.use(
      http.post(`${API}/auth/reset-password`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ message: "ok" });
      })
    );
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<p>Login screen</p>} />
      </Routes>,
      { route: "/reset-password?token=tok_1234567890abcdef" }
    );
    await user.type(screen.getByLabelText("New password"), "brand-new-pass-1");
    await user.type(screen.getByLabelText("Confirm password"), "brand-new-pass-2");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords don't match.");

    await user.clear(screen.getByLabelText("Confirm password"));
    await user.type(screen.getByLabelText("Confirm password"), "brand-new-pass-1");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByText("Login screen")).toBeInTheDocument();
    expect(sent).toEqual({ token: "tok_1234567890abcdef", new_password: "brand-new-pass-1" });
  });
});
