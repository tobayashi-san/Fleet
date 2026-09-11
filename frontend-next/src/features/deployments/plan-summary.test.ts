import { describe, expect, it } from "vitest";
import { parsePlanSummary, planSummaryLabel, driftResultLabel } from "./plan-summary";

const empty = { create: 0, update: 0, delete: 0, replace: 0 };
describe("saved plan summaries", () => {
  it("distinguishes a verified empty plan from unavailable statistics", () => {
    expect(parsePlanSummary(JSON.stringify(empty))).toEqual(empty);
    expect(planSummaryLabel(empty)).toBe("0 create · 0 update · 0 delete · 0 replace");
    for (const value of [undefined, null, "", "{", "null", "[]", {}, { create: 0 }]) {
      expect(parsePlanSummary(value)).toBeNull();
      expect(planSummaryLabel(value)).toBe("Plan summary unavailable; review run logs");
    }
  });
  it("rejects invalid counters in every operation, including destructive changes", () => {
    for (const key of Object.keys(empty)) {
      for (const invalid of [-1, 0.5, "0", null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        expect(parsePlanSummary({ ...empty, [key]: invalid })).toBeNull();
      }
    }
  });
  it("preserves mixed operations and permits backend metadata", () => {
    const summary = { create: 1, update: 2, delete: 3, replace: 4, read: 5, no_op: 6 };
    expect(parsePlanSummary(JSON.stringify(summary))).toEqual(summary);
    expect(planSummaryLabel(summary)).toBe("1 create · 2 update · 3 delete · 4 replace");
  });
});

it("never presents an old clean drift result as the latest failed or pending check", () => {
 const clean = { action: "drift", status: "success", plan_summary: empty };
 expect(driftResultLabel([clean])).toBe("None detected");
 expect(driftResultLabel([{...clean,status:"failed"},clean])).toBe("Latest check unsuccessful; review run logs");
 expect(driftResultLabel([{...clean,status:"running"},clean])).toBe("Check in progress");
 expect(driftResultLabel([{...clean,plan_summary:null},clean])).toBe("Latest check summary unavailable");
 expect(driftResultLabel([{...clean,plan_summary:{...empty,update:1}}])).toBe("Detected");
 expect(driftResultLabel([])).toBe("Not checked");
});
