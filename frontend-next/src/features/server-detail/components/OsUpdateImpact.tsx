export function OsUpdateImpact({ available, deferred, rebootRequired }: {
  available: number;
  deferred: number;
  rebootRequired?: boolean;
}) {
  return <div className="space-y-1 text-xs text-muted-foreground">
    <p>{available} {available === 1 ? 'package' : 'packages'} to update{deferred ? ` · ${deferred} deferred` : ''}. Services may restart.</p>
    {rebootRequired && <p className="text-warning">A reboot is already pending.</p>}
  </div>;
}
