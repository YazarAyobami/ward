import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CircleBadge } from "../components/CircleBadge";

describe("CircleBadge", () => {
  it("renders Maternal circle with rose accent", () => {
    const html = renderToString(<CircleBadge circle="Maternal" />);
    expect(html).toContain("Maternal");
    expect(html).toContain("rose");
  });

  it("renders Paternal circle with sky accent", () => {
    const html = renderToString(<CircleBadge circle="Paternal" />);
    expect(html).toContain("Paternal");
    expect(html).toContain("sky");
  });

  it("renders Community circle with emerald accent", () => {
    const html = renderToString(<CircleBadge circle="Community" />);
    expect(html).toContain("Community");
    expect(html).toContain("emerald");
  });

  it("renders Institution circle with purple accent", () => {
    const html = renderToString(<CircleBadge circle="Institution" />);
    expect(html).toContain("Institution");
    expect(html).toContain("purple");
  });

  it("renders with custom size", () => {
    const html = renderToString(<CircleBadge circle="Maternal" size="md" />);
    expect(html).toContain("text-sm");
  });
});
