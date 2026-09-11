import { expect, it } from "vitest";
import { isActiveRunStatus, runDurationLabel, runIsolationLabel } from "./run-status";
it("keeps pending work and cancellation active until a terminal status arrives", () => {
  for (const status of ["queued", "running", "cancelling"]) expect(isActiveRunStatus(status)).toBe(true);
  for (const status of ["success", "failed", "interrupted", "cancelled", undefined, null]) expect(isActiveRunStatus(status)).toBe(false);
});

it("shows elapsed time consistently across SQLite and ISO timestamps without inventing missing durations", () => {
 expect(runDurationLabel({started_at:"2026-09-11 06:00:00",completed_at:"2026-09-11T07:01:02Z"})).toBe("1h 1m 2s");
 expect(runDurationLabel({started_at:"2026-09-11T06:00:00Z",completed_at:"2026-09-11 06:01:00"})).toBe("1m 0s");
 expect(runDurationLabel({status:"cancelling"})).toBe("Cancellation in progress");
 expect(runDurationLabel({status:"failed"})).toBe("Not recorded");
 expect(runDurationLabel({started_at:"invalid",completed_at:"invalid"})).toBe("Not recorded");
 expect(runDurationLabel({started_at:"2026-09-11 06:01:00",completed_at:"2026-09-11 06:00:00"})).toBe("Not recorded");
});

it("distinguishes pending isolation checks from missing terminal results", () => {
 expect(runIsolationLabel({status:"running"})).toBe("Pending");
 expect(runIsolationLabel({status:"success"})).toBe("Not recorded");
 expect(runIsolationLabel({status:"failed"})).toBe("Not recorded");
 expect(runIsolationLabel({status:"success",plan_safe:1})).toBe("Passed");
 expect(runIsolationLabel({status:"failed",plan_safe:0})).toBe("Blocked");
});
