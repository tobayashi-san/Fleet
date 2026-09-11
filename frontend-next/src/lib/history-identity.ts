export function historyIdentity(row: { id: string | number; _type?: string }): string {
  return JSON.stringify([row._type === "schedule" ? "schedule" : "manual", String(row.id)]);
}
