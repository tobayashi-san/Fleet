interface NodeCapacity {
  cpu?: number | null;
  maxcpu?: number | null;
  mem?: number | null;
  maxmem?: number | null;
}
const validUsage = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validTotal = (value: unknown): value is number => validUsage(value) && value > 0;

export function platformCapacity(nodes: NodeCapacity[]) {
  const cpuComplete = nodes.length > 0 && nodes.every(node => validUsage(node.cpu) && validTotal(node.maxcpu));
  const memoryComplete = nodes.length > 0 && nodes.every(node => validUsage(node.mem) && validTotal(node.maxmem));
  return {
    cpuUsed: cpuComplete ? nodes.reduce((sum, node) => sum + node.cpu! * node.maxcpu!, 0) : NaN,
    cpuTotal: cpuComplete ? nodes.reduce((sum, node) => sum + node.maxcpu!, 0) : NaN,
    memUsed: memoryComplete ? nodes.reduce((sum, node) => sum + node.mem!, 0) : NaN,
    memTotal: memoryComplete ? nodes.reduce((sum, node) => sum + node.maxmem!, 0) : NaN,
  };
}
