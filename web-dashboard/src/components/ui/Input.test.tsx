import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("gives whole-number fields the digit keypad and decimal fields the decimal keypad", () => {
    render(
      <>
        <Input label="Quantity" type="number" min={1} />
        <Input label="Days" type="number" step={1} />
        <Input label="Rent / day" type="number" step="0.01" />
        <Input label="Name" />
      </>
    );
    expect(screen.getByLabelText("Quantity")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Days")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Rent / day")).toHaveAttribute("inputmode", "decimal");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("inputmode");
  });

  it("keeps an explicit inputMode", () => {
    render(<Input label="Code" type="number" inputMode="text" />);
    expect(screen.getByLabelText("Code")).toHaveAttribute("inputmode", "text");
  });
});
