/** Select an explicit failure message, rather than treating trailing cleanup as the cause. */
export function historyFailureCause(item: { status?: string; output?: string | null }): string {
  if (item.status !== "failed") return "—";
  if (!item.output?.trim()) return "No error details were recorded.";
  const lines = item.output.replace(/\x1b\[[0-9;]*m/g, "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const explicit = lines.filter(line => /(?:^|\b)(?:error:|fatal:|failed!|exception:|permission denied|connection refused|timed out|lock unavailable|unable to|could not)\s*/i.test(line));
  return explicit.at(-1) || "Failure cause not identified; open the full log.";
}
