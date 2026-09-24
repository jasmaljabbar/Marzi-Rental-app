import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server, API } from "../../test/server";
import { renderWithProviders, signIn } from "../../test/render";
import { ReturnModal } from "./ReturnModal";
import type { Rental, ReturnInput, ReturnPreview } from "../../types/models";

const rental = {
  id: "r1",
  customer_id: "c1",
  equipment_id: "e1",
  customer: { id: "c1", name: "Pat", phone: "555" },
  equipment: { id: "e1", name: "Mixer" },
  quantity: 2,
  advance_amount: 100,
  status: "Active",
} as unknown as Rental;

function preview(input: ReturnInput): ReturnPreview {
  const damage = input.damages?.[0]?.amount ?? 0;
  const total = 600 + damage - (input.discount_amount ?? 0);
  const paid = Math.min(input.amount_paid ?? 0, total - 100);
  return {
    returned_at: new Date().toISOString(),
    lines: [
      {
        rental_id: "r1",
        days: 3,
        daily_rate: 100,
        quantity: 2,
        gross_amount: 600,
        discount_amount: input.discount_amount ?? 0,
        late_fee_amount: 0,
        damage_amount: damage,
        subtotal: total,
        tax_rate_percent: 0,
        tax_amount: 0,
        total_amount: total,
        advance_amount: 100,
        pending_before_payment: total - 100,
        refund_amount: 0,
        paid_now: paid,
        amount_due: total - 100 - paid,
        payment_status: "Partial",
      },
    ],
    totals: {
      gross_amount: 600,
      discount_requested: input.discount_amount ?? 0,
      discount_amount: input.discount_amount ?? 0,
      discount_capped: false,
      discount_cap_percent: null,
      late_fee_amount: 0,
      damage_amount: damage,
      tax_amount: 0,
      total_amount: total,
      advance_amount: 100,
      refund_amount: 0,
      paid_now: paid,
      amount_due: total - 100 - paid,
    },
  };
}

describe("ReturnModal", () => {
  it("shows the server-computed bill and submits damage with the return", async () => {
    let submitted: ReturnInput | null = null;
    server.use(
      http.post(`${API}/rentals/return/preview`, async ({ request }) => HttpResponse.json(preview((await request.json()) as ReturnInput))),
      http.post(`${API}/rentals/return`, async ({ request }) => {
        submitted = (await request.json()) as ReturnInput;
        return HttpResponse.json({ rentals: [], summary: preview(submitted) });
      })
    );
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<ReturnModal open onClose={() => {}} rentals={[rental]} />);

    expect(await screen.findByText(/3 days × ₹100/)).toBeInTheDocument();
    expect(await screen.findByText("Still due")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Report damage/ }));
    await user.type(screen.getByLabelText("Damage charge"), "50");
    await user.type(screen.getByLabelText("Amount received now"), "200");
    await waitFor(() => expect(screen.getAllByText("₹650").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Complete return" }));
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted).toMatchObject({ rental_ids: ["r1"], amount_paid: 200, payment_method: "Cash", damages: [{ rental_id: "r1", amount: 50, damaged_quantity: 1 }] });
  });

  it("shows the server's error instead of a wrong local calculation", async () => {
    server.use(http.post(`${API}/rentals/return/preview`, () => HttpResponse.json({ detail: "Active rental not found." }, { status: 404 })));
    signIn();
    renderWithProviders(<ReturnModal open onClose={() => {}} rentals={[rental]} />);
    expect(await screen.findByText("Active rental not found.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete return" })).toBeDisabled();
  });
});
