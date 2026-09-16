/** Preserve multiline host messages and task headings when filtering default Ansible output. */
export function filterExecutionLog(output: string, query: string, host: string): string {
  const lines = output.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/);
  const blocks: Array<{host: string | null; heading: string; lines: string[]}> = [];
  let heading = '';
  let current: typeof blocks[number] | undefined;
  for (const line of lines) {
    if (/^(TASK|RUNNING HANDLER|PLAY|PLAY RECAP)\s/.test(line)) {
      heading = line; current = undefined;
      if (!host) blocks.push({host: null, heading: '', lines: [line]});
      continue;
    }
    const name = line.match(/^(?:ok|changed|fatal|skipping|unreachable):\s*\[([^\]]+?)\](?:\s|:|$)/)?.[1]?.split(' -> ')[0]
      || line.match(/^\s*(\S+)\s*:\s*ok=\d+/)?.[1];
    if (name || !current) {
      current = {host: name || null, heading, lines: []}; blocks.push(current);
    }
    current.lines.push(line);
  }
  const matched = blocks.filter(block => (!host || block.host === host) && (!query.trim() || block.lines.join('\n').toLowerCase().includes(query.trim().toLowerCase())));
  let previousHeading = '';
  return matched.flatMap(block => {
    const prefix = host && block.heading && block.heading !== previousHeading ? [block.heading] : [];
    previousHeading = block.heading;
    return [...prefix, ...block.lines];
  }).join('\n');
}
