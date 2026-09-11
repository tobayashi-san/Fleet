import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { newestNotesRevision } from "./notes-revision";
it("keeps newer note content and attribution when an older reply arrives", () => {
 const client = new QueryClient();
 const key = ["server", "a", "notes"];
 const latest = { revision: 3, notes: "New runbook", author: "Bob" };
 const late = { revision: 2, notes: "Old runbook", author: "Alice" };
 client.setQueryData(key, latest);
 client.setQueryData<typeof latest>(key, current => newestNotesRevision(current, late));
 expect(client.getQueryData(key)).toEqual(latest);
 const next = { ...latest, revision: 4, notes: "Updated" };
 client.setQueryData<typeof latest>(key, current => newestNotesRevision(current, next));
 expect(client.getQueryData(key)).toEqual(next);
 expect(newestNotesRevision(undefined, late)).toEqual(late);
 client.clear();
});
