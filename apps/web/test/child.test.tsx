import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ChildView } from "../app/t/[id]/child/page";
import { calls } from "@ward/core";

describe("ChildBeneficiaryPage (W-7.7)", () => {
  it("renders child rights, graduation, and flagging portal with SSR renderToString", () => {
    const html = renderToString(<ChildView trustId={0} />);

    expect(html).toContain("Child Rights &amp; Graduation");
    expect(html).toContain("Remaining Beneficiary Share");
    expect(html).toContain("Graduation Tranche Distribution");
    expect(html).toContain("Beneficiary Review &amp; Flag Authority");
    expect(html).toContain("Flag as Suspicious");
  });

  it("builds valid flag contract call", () => {
    const call = calls.flag({ request_id: 1, child_idx: 0 });
    expect(call.methodName).toBe("flag");
    expect(call.args).toEqual({ request_id: 1, child_idx: 0 });
    expect(call.deposit).toBe(0n);
  });

  it("builds valid claimGraduation contract call", () => {
    const call = calls.claimGraduation({ trust_id: 0, child_idx: 1 });
    expect(call.methodName).toBe("claim_graduation");
    expect(call.args).toEqual({ trust_id: 0, child_idx: 1 });
    expect(call.deposit).toBe(0n);
  });
});
