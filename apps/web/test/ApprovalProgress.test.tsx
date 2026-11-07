import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ApprovalProgress } from "../components/ApprovalProgress";

describe("ApprovalProgress", () => {
  it("renders pending state when 1 of 2 circles approved", () => {
    const html = renderToString(
      <ApprovalProgress
        approvals={[{ account: "g1.near", circle: "Maternal" }]}
        requiresTwoCircles={true}
      />
    );
    expect(html).toContain("Needs approvals from 2 distinct circles (1/2 approved)");
    expect(html).toContain("Maternal");
  });

  it("renders consensus reached when 2 distinct circles approved", () => {
    const html = renderToString(
      <ApprovalProgress
        approvals={[
          { account: "g1.near", circle: "Maternal" },
          { account: "g2.near", circle: "Paternal" },
        ]}
        requiresTwoCircles={true}
      />
    );
    expect(html).toContain("Consensus reached");
    expect(html).toContain("Maternal");
    expect(html).toContain("Paternal");
  });

  it("renders custom needed text when provided", () => {
    const html = renderToString(
      <ApprovalProgress
        approvals={[]}
        needed="Requires maternal and paternal sign-off"
      />
    );
    expect(html).toContain("Requires maternal and paternal sign-off");
  });
});
