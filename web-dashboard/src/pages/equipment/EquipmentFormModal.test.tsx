import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server, API } from "../../test/server";
import { renderWithProviders, signIn } from "../../test/render";
import { uploadApi } from "../../api/services";
import type { UploadResult } from "../../api/services";
import type { Equipment } from "../../types/models";
import { EquipmentFormModal } from "./EquipmentFormModal";

const OLD = ["https://api.example.com/files/t/a/equipment/old1.webp", "https://api.example.com/files/t/a/equipment/old2.webp"];

const item: Equipment = {
  id: "e1",
  sync_id: "e1",
  name: "Tent",
  description: null,
  stock_count: 3,
  rent_per_day: 100,
  deposit_amount: 0,
  purchase_price_per_unit: 0,
  useful_life_years: 5,
  images: OLD,
  image_thumbs: OLD,
  available_count: 3,
  category_id: "cat1",
  shop_id: "s1",
  damaged_count: 0,
  maintenance_logs: [],
  is_archived: false,
  archived_at: null,
  created_at: "",
  updated_at: "",
};

const photo = (name: string) => new File([new Uint8Array(64)], name, { type: "image/jpeg" });
const uploaded = (name: string): UploadResult => {
  const url = `https://api.example.com/files/t/a/equipment/${name}.webp`;
  return { key: `t/a/equipment/${name}.webp`, url, thumb_url: url, kind: "equipment" };
};

function mockSave() {
  const sent: { body?: Record<string, unknown> } = {};
  server.use(
    http.get(`${API}/categories`, () => HttpResponse.json([{ id: "cat1", name: "Tents", icon: null, sort_order: 0, sync_id: "c", shop_id: "s1", is_archived: false, archived_at: null, created_at: "", updated_at: "" }])),
    http.put(`${API}/equipment/e1`, async ({ request }) => {
      sent.body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ ...item, images: sent.body.images });
    })
  );
  return sent;
}

describe("EquipmentFormModal photos", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps existing photos when saving an edit that doesn't touch them", async () => {
    const sent = mockSave();
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<EquipmentFormModal open onClose={() => {}} equipment={item} />);

    expect(await screen.findByText("(2/4)")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Big tent");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(sent.body).toMatchObject({ name: "Big tent", images: OLD }));
  });

  it("adds two photos picked together to the two already there, and waits for uploads before saving", async () => {
    const sent = mockSave();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.spyOn(uploadApi, "upload").mockImplementation(async (_blob, _kind, filename = "x.jpg") => {
      await gate;
      return uploaded(filename.replace(/\.[^.]+$/, ""));
    });
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<EquipmentFormModal open onClose={() => {}} equipment={item} />);
    const dialog = await screen.findByRole("dialog");

    await user.upload(within(dialog).getByLabelText("Choose Photos files"), [photo("new1.jpg"), photo("new2.jpg")]);
    expect(within(dialog).getAllByTestId("pending-image")).toHaveLength(2);
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeDisabled();

    release();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeEnabled());
    expect(within(dialog).getByText("(4/4)")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(sent.body?.images).toEqual([...OLD, "https://api.example.com/files/t/a/equipment/new1.webp", "https://api.example.com/files/t/a/equipment/new2.webp"])
    );
  });
});
