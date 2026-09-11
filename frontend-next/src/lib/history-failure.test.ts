import { expect, it } from "vitest";
import { historyFailureCause } from "./history-failure";
it("keeps the explicit failure when cleanup follows it", () => {
 expect(historyFailureCause({status:"failed",output:"Starting\nERROR: Package lock unavailable\nCleaning temporary directory\nDisconnected"})).toBe("ERROR: Package lock unavailable");
 expect(historyFailureCause({status:"failed",output:"fatal: [host]: FAILED! unavailable\nPLAY RECAP"})).toBe("fatal: [host]: FAILED! unavailable");
});
it("does not invent a failure from ordinary log lines or successful runs", () => {
 expect(historyFailureCause({status:"failed",output:"Cleanup completed"})).toBe("Failure cause not identified; open the full log.");
 expect(historyFailureCause({status:"failed",output:""})).toBe("No error details were recorded.");
 expect(historyFailureCause({status:"success",output:"ERROR: ignored"})).toBe("—");
});
