import { describe, expect, it } from "vitest";
import { buildCounselorMailto, counselorMailtoHref, isCounselorEmail } from "@/lib/counselor-handoff";

const payload = {
  studentName: "Alex",
  primaryLabel: "UC San Diego Bioengineering",
  secondaryLabels: ["UC Berkeley Economics"],
  nextTermLabel: "Fall 2026",
  courses: [
    { code: "CHEM-201", title: "General Chemistry I", units: 5 },
    { code: "MATH-211", title: "Calculus I", units: 5 },
  ],
  totalUnits: 10,
};

describe("counselor handoff", () => {
  it("accepts a normal counselor email and rejects junk", () => {
    expect(isCounselorEmail("pat.nguyen@canyons.edu")).toBe(true);
    expect(isCounselorEmail("not-an-email")).toBe(false);
    expect(isCounselorEmail("")).toBe(false);
  });

  it("writes a short counseling email a student can send", () => {
    const { subject, body } = buildCounselorMailto(payload);
    expect(subject).toBe("COC transfer plan — UC San Diego Bioengineering — Fall 2026");
    expect(body).toContain("CHEM-201 General Chemistry I (5 units)");
    expect(body).toContain("UC Berkeley Economics");
    expect(body).toContain("not an official degree audit");
    expect(body).not.toMatch(/usc:business_administration|multi-target-csp/i);
  });

  it("builds a mailto link from the student's own inbox", () => {
    const href = counselorMailtoHref("pat.nguyen@canyons.edu", payload);
    expect(href.startsWith("mailto:pat.nguyen%40canyons.edu?")).toBe(true);
    expect(href).toContain("subject=");
    expect(href).toContain("body=");
  });
});
