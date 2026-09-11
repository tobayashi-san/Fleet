export function PackageVersionChange({ installed, candidate }: {
  installed?: string | null;
  candidate?: string | null;
}) {
  return <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-muted-foreground">
    <span><span className="sr-only">Installed version: </span><span className={installed ? 'font-mono break-all' : ''}>{installed || 'Installed version not reported'}</span></span>
    <span aria-hidden="true">→</span>
    <span><span className="sr-only">Available version: </span><span className="font-mono break-all text-foreground">{candidate || 'Not reported'}</span></span>
  </span>;
}
