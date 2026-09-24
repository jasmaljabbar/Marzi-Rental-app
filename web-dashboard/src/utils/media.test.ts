import { describe, expect, it } from "vitest";
import { resolveMediaUrl } from "./media";
import { initialsOf } from "./format";

describe("resolveMediaUrl", () => {
  it("passes absolute URLs from the API through unchanged", () => {
    const signed = "https://api.example.com/files/t/abc/customer_photo/x.thumb.webp?exp=1&sig=a%2Bb";
    expect(resolveMediaUrl(signed)).toBe(signed);
    expect(resolveMediaUrl("blob:http://localhost/123")).toBe("blob:http://localhost/123");
  });

  it("joins relative paths to the API base without double slashes", () => {
    expect(resolveMediaUrl("/files/a.webp", "https://api.example.com/")).toBe("https://api.example.com/files/a.webp");
    expect(resolveMediaUrl("files/a.webp", "https://api.example.com")).toBe("https://api.example.com/files/a.webp");
  });

  it("treats empty and unsafe values as no image", () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl("  ")).toBeNull();
    expect(resolveMediaUrl("javascript:alert(1)")).toBeNull();
    expect(resolveMediaUrl("//evil.example/x.png")).toBeNull();
  });
});

describe("initialsOf", () => {
  it("uses the first letter of up to two words", () => {
    expect(initialsOf("Jasmal")).toBe("J");
    expect(initialsOf("  jasmal   jabbar  k ")).toBe("JJ");
    expect(initialsOf(undefined)).toBe("");
  });
});
