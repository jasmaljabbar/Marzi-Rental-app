import { describe, expect, it } from "vitest";
import { imageProblem, selectionProblem, uploadFileName } from "./image";

const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });

describe("imageProblem", () => {
  it("accepts JPEG, PNG, WebP and GIF", () => {
    expect(imageProblem(file("a.jpg", "image/jpeg"))).toBeNull();
    expect(imageProblem(file("a.png", "image/png"))).toBeNull();
    expect(imageProblem(file("a.webp", "image/webp"))).toBeNull();
    expect(imageProblem(file("a.gif", "image/gif"))).toBeNull();
  });
  it("explains HEIC instead of uploading something browsers can't show", () => {
    expect(imageProblem(file("IMG_1.HEIC", ""))).toMatch(/HEIC/);
  });
  it("rejects SVG and other files, including a wrong extension", () => {
    expect(imageProblem(file("logo.svg", "image/svg+xml"))).toMatch(/isn't a JPEG/);
    expect(imageProblem(file("doc.pdf", "application/pdf"))).toMatch(/isn't a JPEG/);
    expect(imageProblem(file("setup.exe", "image/png"))).toMatch(/isn't a JPEG/);
  });
  it("rejects files too large to upload", () => {
    expect(imageProblem(file("huge.gif", "image/gif", 11 * 1024 * 1024))).toMatch(/too large \(max 10 MB\)/);
    expect(imageProblem(file("huge.jpg", "image/jpeg", 31 * 1024 * 1024))).toMatch(/too large \(max 30 MB\)/);
  });
});

describe("selectionProblem", () => {
  it("accepts a selection that fits", () => {
    expect(selectionProblem(1, 4, 4)).toBeNull();
    expect(selectionProblem(4, 4, 4)).toBeNull();
    expect(selectionProblem(2, 2, 4)).toBeNull();
  });
  it("rejects a selection that doesn't fit, saying how many can still be added", () => {
    expect(selectionProblem(3, 2, 4)).toBe("You can add up to 4 photos. You selected 3, but only 2 more can be added.");
    expect(selectionProblem(5, 4, 4)).toMatch(/only 4 more/);
    expect(selectionProblem(1, 0, 4)).toBe("You can add up to 4 photos. Remove one before adding another.");
  });
});

describe("uploadFileName", () => {
  it("matches the extension to what is actually sent", () => {
    expect(uploadFileName("IMG 2024.PNG", new Blob([], { type: "image/jpeg" }))).toBe("IMG-2024.jpg");
    expect(uploadFileName("logo.png", new Blob([], { type: "image/png" }))).toBe("logo.png");
    expect(uploadFileName(".png", new Blob([], { type: "image/webp" }))).toBe("image.webp");
  });
});
