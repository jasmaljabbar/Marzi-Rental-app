import { describe, expect, it } from "vitest";
import { passwordProblem, toNumber } from "./validation";

describe("passwordProblem (client mirror of the server policy)", () => {
  it("accepts a reasonable password", () => {
    expect(passwordProblem("correct-horse-9")).toBeNull();
  });
  it.each([
    ["short", /at least 8/],
    ["password123", /too easy/],
    ["aaaaaaaaaaa", /too easy/],
  ])("rejects %s", (pw, message) => {
    expect(passwordProblem(pw)).toMatch(message);
  });
  it("rejects the username as password", () => {
    expect(passwordProblem("ravi-kumar", "RAVI-KUMAR")).toMatch(/same as the username/);
  });
  it("parses form numbers safely", () => {
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber("")).toBe(0);
    expect(toNumber("abc")).toBe(0);
  });
});
