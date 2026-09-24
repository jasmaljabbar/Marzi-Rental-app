import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server, API } from "../../test/server";
import { renderWithProviders, signIn } from "../../test/render";
import { StaffSettings } from "./StaffSettings";

const members = [
  { id: "u1", username: "owner", email: null, role: "owner", shop_id: null, created_at: "", last_login_at: null },
  { id: "u2", username: "ravi", email: "ravi@example.com", role: "staff", shop_id: null, created_at: "", last_login_at: null },
];

describe("StaffSettings", () => {
  it("adds a member, validating the password first", async () => {
    let created: unknown;
    server.use(
      http.get(`${API}/auth/users`, () => HttpResponse.json(members)),
      http.post(`${API}/auth/users`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ ...members[1], id: "u3", username: "neha" }, { status: 201 });
      })
    );
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<StaffSettings />);

    await user.click(await screen.findByRole("button", { name: /Add team member/ }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Username"), "neha");
    await user.type(within(dialog).getByLabelText("Temporary password"), "short");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/at least 8/);
    expect(created).toBeUndefined();

    await user.clear(within(dialog).getByLabelText("Temporary password"));
    await user.type(within(dialog).getByLabelText("Temporary password"), "counter-pass-1");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(created).toMatchObject({ username: "neha", password: "counter-pass-1", role: "staff" }));
  });

  it("lets an owner reset a staff member's password but not their own or the owner's", async () => {
    let reset: unknown;
    server.use(
      http.get(`${API}/auth/users`, () => HttpResponse.json(members)),
      http.put(`${API}/auth/users/u2/password`, async ({ request }) => {
        reset = await request.json();
        return HttpResponse.json({ message: "ok" });
      })
    );
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<StaffSettings />);

    await user.click(await screen.findByRole("button", { name: "Reset password for ravi" }));
    expect(screen.queryByRole("button", { name: "Reset password for owner" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("New password"), "fresh-password-1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(reset).toEqual({ new_password: "fresh-password-1" }));
  });
});
