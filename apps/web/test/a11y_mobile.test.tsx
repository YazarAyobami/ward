import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import RootLayout from "../app/layout";
import HomePage from "../app/page";
import CreateTrustPage from "../app/create/page";
import { ChildView } from "../app/t/[id]/child/page";
import { CaregiverView } from "../app/t/[id]/caregiver/page";

describe("Accessibility and Mobile Viewport Pass (W-7.8)", () => {
  it("provides skip-to-content navigation in RootLayout", () => {
    const html = renderToString(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(html).toContain('href="#main-content"');
    expect(html).toContain("Skip to main content");
    expect(html).toContain('id="main-content"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-label="Main Navigation"');
  });

  it("HomePage enforces responsive classes and semantic hierarchy", () => {
    const html = renderToString(<HomePage />);

    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("Create a Trust");
    expect(html).toContain("Explore Demo Trust");
    // Ensure responsive grid classes for 360px viewport
    expect(html).toContain("grid-cols-1");
  });

  it("CreateTrustPage renders accessible form labels and controls", () => {
    const html = renderToString(<CreateTrustPage />);

    expect(html).toContain("<h1");
    expect(html).toContain("Trust Details");
    expect(html).toContain("Next:");
  });

  it("CaregiverView and ChildView adhere to touch target guidelines and accessible roles", () => {
    const caregiverHtml = renderToString(<CaregiverView trustId={0} />);
    expect(caregiverHtml).toContain("min-h-[44px]");
    expect(caregiverHtml).toContain('aria-labelledby="allowance-heading"');
    expect(caregiverHtml).toContain('aria-labelledby="new-request-heading"');

    const childHtml = renderToString(<ChildView trustId={0} />);
    expect(childHtml).toContain("min-h-[44px]");
    expect(childHtml).toContain('aria-label="Select Child Beneficiary"');
    expect(childHtml).toContain('aria-labelledby="flag-heading"');
  });
});
