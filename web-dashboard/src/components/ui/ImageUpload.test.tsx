import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import { uploadApi } from "../../api/services";
import { ImageUpload } from "./ImageUpload";

const photo = (name: string, type = "image/jpeg") => new File([new Uint8Array(64)], name, { type });

// Stands in for POST /upload: one file per call, a URL per file. `fail`
// lists file names that fail on their first attempt, with the API's error.
// (jsdom can't send multipart bodies, so the HTTP layer itself is covered by
// the API tests and the Playwright suite.)
function mockUploads({ fail = [] as string[] } = {}) {
  const received: string[] = [];
  const failedOnce = new Set<string>();
  vi.spyOn(uploadApi, "upload").mockImplementation(async (_blob, kind, filename = "image.jpg") => {
    received.push(filename);
    const base = filename.replace(/\.[^.]+$/, "");
    if (fail.includes(base) && !failedOnce.has(base)) {
      failedOnce.add(base);
      throw new AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 400,
        data: { detail: "The image is damaged or incomplete. Try exporting it again.", code: "UNSUPPORTED_IMAGE" },
      } as AxiosResponse);
    }
    const url = `https://api.example.com/files/t/a/${kind}/${base}.webp`;
    return { key: `t/a/${kind}/${base}.webp`, url, thumb_url: url, kind };
  });
  return received;
}

function Harness({ initial = [], onBusyChange }: { initial?: string[]; onBusyChange?: (busy: boolean) => void }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <>
      <ImageUpload label="Photos" kind="equipment" value={value} onChange={setValue} max={4} onBusyChange={onBusyChange} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const valueOf = () => JSON.parse(screen.getByTestId("value").textContent ?? "[]") as string[];
const input = () => screen.getByLabelText("Choose Photos files");
const existing = ["https://api.example.com/files/t/a/equipment/old1.webp", "https://api.example.com/files/t/a/equipment/old2.webp"];

describe("ImageUpload", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uploads a single selected image", async () => {
    const received = mockUploads();
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(input(), photo("drill.jpg"));
    await waitFor(() => expect(valueOf()).toEqual(["https://api.example.com/files/t/a/equipment/drill.webp"]));
    expect(received).toEqual(["drill.jpg"]);
    expect(screen.getByRole("img", { name: "Photos 1" })).toBeInTheDocument();
  });

  it("uploads four images picked together, keeps the order picked and hides the add button when full", async () => {
    const received = mockUploads();
    const user = userEvent.setup();
    render(<Harness />);
    expect(input()).toHaveAttribute("multiple");
    await user.upload(input(), [photo("a.jpg"), photo("b.png", "image/png"), photo("c.webp", "image/webp"), photo("d.jpg")]);
    await waitFor(() => expect(valueOf()).toHaveLength(4));
    expect(valueOf().map((u) => u.split("/").pop())).toEqual(["a.webp", "b.webp", "c.webp", "d.webp"]);
    expect(received.sort()).toEqual(["a.jpg", "b.png", "c.webp", "d.jpg"]);
    expect(screen.getByText("(4/4)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add photos/ })).not.toBeInTheDocument();
  });

  it("adds 2 new images to 2 existing ones", async () => {
    mockUploads();
    const user = userEvent.setup();
    render(<Harness initial={existing} />);
    expect(screen.getByText("You can select up to 2 photos at once.")).toBeInTheDocument();
    await user.upload(input(), [photo("new1.jpg"), photo("new2.jpg")]);
    await waitFor(() => expect(valueOf()).toHaveLength(4));
    expect(valueOf().slice(0, 2)).toEqual(existing);
  });

  it("rejects 3 new images when only 2 more fit, without uploading or dropping any", async () => {
    const received = mockUploads();
    const user = userEvent.setup();
    render(<Harness initial={existing} />);
    await user.upload(input(), [photo("x.jpg"), photo("y.jpg"), photo("z.jpg")]);
    expect(screen.getByRole("alert")).toHaveTextContent("You can add up to 4 photos. You selected 3, but only 2 more can be added.");
    expect(received).toEqual([]);
    expect(valueOf()).toEqual(existing);
  });

  it("rejects more than 4 images picked at once", async () => {
    const received = mockUploads();
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(input(), ["1", "2", "3", "4", "5"].map((n) => photo(`${n}.jpg`)));
    expect(screen.getByRole("alert")).toHaveTextContent(/You selected 5, but only 4 more/);
    expect(received).toEqual([]);
  });

  it("rejects files that are not images and still uploads the valid ones", async () => {
    const received = mockUploads();
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness />);
    await user.upload(input(), [photo("good.jpg"), photo("invoice.pdf", "application/pdf")]);
    expect(screen.getByRole("alert")).toHaveTextContent('"invoice.pdf" isn\'t a JPEG, PNG, WebP or GIF image.');
    await waitFor(() => expect(valueOf()).toHaveLength(1));
    expect(received).toEqual(["good.jpg"]);
  });

  it("keeps a failed upload on screen with its error, blocks saving, and retries it", async () => {
    mockUploads({ fail: ["bad"] });
    const onBusyChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onBusyChange={onBusyChange} />);
    await user.upload(input(), [photo("ok.jpg"), photo("bad.jpg")]);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bad.jpg: The image is damaged or incomplete. Try exporting it again.");
    expect(alert).toHaveTextContent("Retry or remove it before saving.");
    await waitFor(() => expect(valueOf()).toHaveLength(1), { timeout: 2000 });
    expect(screen.getAllByTestId("pending-image")).toHaveLength(1);
    expect(onBusyChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Retry bad.jpg" }));
    await waitFor(() => expect(valueOf()).toHaveLength(2));
    expect(screen.queryByTestId("pending-image")).not.toBeInTheDocument();
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("removes one image without touching the others", async () => {
    const user = userEvent.setup();
    render(<Harness initial={existing} />);
    await user.click(screen.getByRole("button", { name: "Remove image 1" }));
    expect(valueOf()).toEqual([existing[1]]);
  });
});
