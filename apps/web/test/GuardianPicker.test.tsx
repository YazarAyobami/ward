import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { rules } from "@ward/core";
import { GuardianPicker, GuardianItem } from "../components/GuardianPicker";

describe("GuardianPicker", () => {
  const validGuardians: GuardianItem[] = [
    { account: "m1.near", circle: "Maternal" },
    { account: "p1.near", circle: "Paternal" },
    { account: "c1.near", circle: "Community" },
  ];

  it("renders status when guardians are balanced and valid", () => {
    const html = renderToString(
      <GuardianPicker
        value={validGuardians}
        onChange={() => {}}
        caregiver="caregiver.near"
      />
    );
    expect(html).toContain("Guardian council passes all balance and circle constraints");
    expect(html).toContain("m1.near");
    expect(html).toContain("p1.near");
    expect(html).toContain("c1.near");
  });

  it("renders error alert when count is fewer than 3", () => {
    const html = renderToString(
      <GuardianPicker
        value={validGuardians.slice(0, 2)}
        onChange={() => {}}
        caregiver="caregiver.near"
      />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain(rules.ERRORS.E07_GUARDIAN_COUNT);
  });

  it("renders error alert when circle has more than 2 members", () => {
    const invalid: GuardianItem[] = [
      { account: "m1.near", circle: "Maternal" },
      { account: "m2.near", circle: "Maternal" },
      { account: "m3.near", circle: "Maternal" },
    ];
    const html = renderToString(
      <GuardianPicker
        value={invalid}
        onChange={() => {}}
        caregiver="caregiver.near"
      />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain(rules.ERRORS.E08_CIRCLE_LIMIT);
  });

  it("renders error alert when caregiver is appointed as guardian", () => {
    const withCaregiver: GuardianItem[] = [
      { account: "m1.near", circle: "Maternal" },
      { account: "p1.near", circle: "Paternal" },
      { account: "caregiver.near", circle: "Community" },
    ];
    const html = renderToString(
      <GuardianPicker
        value={withCaregiver}
        onChange={() => {}}
        caregiver="caregiver.near"
      />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain(rules.ERRORS.E11_CAREGIVER_IS_GUARDIAN);
  });
});
