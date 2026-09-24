import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server, API } from "../../test/server";
import { renderWithProviders, signIn } from "../../test/render";
import type { Customer } from "../../types/models";
import { CustomersListPage } from "./CustomersListPage";

const THUMB = "https://api.example.com/files/t/a/customer_photo/p1.thumb.webp?exp=1&sig=s";
const FULL = "https://api.example.com/files/t/a/customer_photo/p1.webp?exp=1&sig=s";

function customer(overrides: Partial<Customer>): Customer {
  return {
    id: "c1",
    sync_id: "c1",
    name: "Jasmal",
    phone: "5550100",
    address: null,
    doc_url: null,
    photo_url: null,
    photo_thumb_url: null,
    shop_id: "s1",
    is_archived: false,
    archived_at: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function avatarFor(name: string) {
  const row = screen.getByText(name).closest("div");
  const avatar = row?.querySelector<HTMLElement>("[data-state]");
  if (!avatar) throw new Error(`no avatar next to ${name}`);
  return avatar;
}

describe("CustomersListPage avatars", () => {
  it("shows the uploaded photo for customers who have one and the initial for those who don't", async () => {
    server.use(
      http.get(`${API}/customers`, () =>
        HttpResponse.json([
          customer({ id: "c1", name: "Jasmal", photo_url: FULL, photo_thumb_url: THUMB }),
          customer({ id: "c2", name: "Noor", phone: "5550101" }),
        ])
      )
    );
    signIn();
    renderWithProviders(<CustomersListPage />);

    await screen.findByText("Jasmal");
    const withPhoto = avatarFor("Jasmal");
    expect(withPhoto.querySelector("img")).toHaveAttribute("src", THUMB);
    fireEvent.load(withPhoto.querySelector("img")!);
    expect(withPhoto).toHaveAttribute("data-state", "image");

    const withoutPhoto = avatarFor("Noor");
    expect(withoutPhoto.querySelector("img")).toBeNull();
    expect(withoutPhoto).toHaveTextContent(/^N$/);
  });

  it("falls back to the full photo, then the initial, when the thumbnail is broken", async () => {
    server.use(http.get(`${API}/customers`, () => HttpResponse.json([customer({ photo_url: FULL, photo_thumb_url: THUMB })])));
    signIn();
    renderWithProviders(<CustomersListPage />);

    await screen.findByText("Jasmal");
    fireEvent.error(avatarFor("Jasmal").querySelector("img")!);
    expect(avatarFor("Jasmal").querySelector("img")).toHaveAttribute("src", FULL);
    fireEvent.error(avatarFor("Jasmal").querySelector("img")!);
    expect(avatarFor("Jasmal")).toHaveAttribute("data-state", "initials");
    expect(avatarFor("Jasmal")).toHaveTextContent(/^J$/);
  });
});
