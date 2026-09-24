import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Avatar } from "./Avatar";

function avatar(container: HTMLElement) {
  const root = container.querySelector<HTMLElement>("[data-state]");
  if (!root) throw new Error("no avatar rendered");
  return { root, img: root.querySelector("img") };
}

describe("Avatar", () => {
  it("shows a customer's photo, with the initial underneath until it loads", () => {
    const { container } = render(<Avatar src="https://api.example.com/files/t/a/customer_photo/1.thumb.webp?exp=1&sig=x" name="Jasmal" />);
    const { root, img } = avatar(container);
    expect(img).toHaveAttribute("src", "https://api.example.com/files/t/a/customer_photo/1.thumb.webp?exp=1&sig=x");
    expect(root).toHaveAttribute("data-state", "loading");
    expect(root).toHaveTextContent("J");

    fireEvent.load(img!);
    expect(root).toHaveAttribute("data-state", "image");
  });

  it("shows initials when there is no photo", () => {
    const { container } = render(<Avatar src={null} name="Jasmal" />);
    const { root, img } = avatar(container);
    expect(img).toBeNull();
    expect(root).toHaveAttribute("data-state", "initials");
    expect(root).toHaveTextContent(/^J$/);
    expect(avatar(render(<Avatar name="jasmal jabbar" />).container).root).toHaveTextContent(/^JJ$/);
  });

  it("falls back to the full photo, then to initials, when images fail to load", () => {
    const { container } = render(<Avatar src="https://api.example.com/thumb.webp" fallbackSrc="https://api.example.com/full.webp" name="Jasmal" />);
    fireEvent.error(avatar(container).img!);
    expect(avatar(container).img).toHaveAttribute("src", "https://api.example.com/full.webp");
    fireEvent.error(avatar(container).img!);
    const { root, img } = avatar(container);
    expect(img).toBeNull();
    expect(root).toHaveAttribute("data-state", "initials");
    expect(root).toHaveTextContent(/^J$/);
  });

  it("shows a user's profile image the same way, and never loads unsafe URLs", () => {
    const { container } = render(<Avatar src="/files/t/a/logo/2.webp" name="owner" size="xs" />);
    expect(avatar(container).img?.getAttribute("src")).toMatch(/^http:\/\/localhost:5000\/files\/t\/a\/logo\/2\.webp$/);

    const unsafe = render(<Avatar src="javascript:alert(1)" name="owner" />);
    expect(avatar(unsafe.container).img).toBeNull();
    expect(avatar(unsafe.container).root).toHaveTextContent(/^O$/);
  });

  it("shows a neutral icon when there is no name either", () => {
    const { container } = render(<Avatar name="" />);
    expect(avatar(container).root.querySelector("svg")).not.toBeNull();
  });
});
