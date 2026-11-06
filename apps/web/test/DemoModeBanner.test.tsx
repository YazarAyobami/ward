import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { DemoModeBanner } from "../components/DemoModeBanner";

describe("DemoModeBanner", () => {
  it("renders null when timeScale is 1", () => {
    const html = renderToString(<DemoModeBanner timeScale={1} />);
    expect(html).toBe("");
  });

  it("renders null when timeScale is 0 or negative", () => {
    const htmlZero = renderToString(<DemoModeBanner timeScale={0} />);
    expect(htmlZero).toBe("");
    const htmlNegative = renderToString(<DemoModeBanner timeScale={-5} />);
    expect(htmlNegative).toBe("");
  });

  it("renders DEMO MODE ×60 when timeScale is 60", () => {
    const html = renderToString(<DemoModeBanner timeScale={60} />);
    expect(html).toContain("DEMO MODE ×60");
    expect(html).toContain('role="status"');
  });

  it("renders DEMO MODE ×3600 when timeScale is 3600", () => {
    const html = renderToString(<DemoModeBanner timeScale={3600} />);
    expect(html).toContain("DEMO MODE ×3600");
  });
});
