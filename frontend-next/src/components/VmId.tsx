import { useUi } from '@/lib/store';

/** Browser preference shared by host and VM list views. */
export function VmId({ value }: { value?: number | string | null }) {
  const visible = useUi(state => state.showInfrastructureVmIds);
  if (!visible || value == null || value === '' || Number(value) <= 0) return null;
  return <span className="shrink-0 font-mono text-xs text-muted-foreground">VM {value}</span>;
}
