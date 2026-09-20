export function OsUpdateImpact({ available, deferred, rebootRequired }: {
  available: number;
  deferred: number;
  rebootRequired?: boolean;
}) {
  return <div className="space-y-1 text-xs text-muted-foreground">
    <p>{available} available package updates · {deferred} deferred packages</p>
    <p className={rebootRequired ? 'text-warning' : undefined}>
      {rebootRequired === true ? 'Reboot required.' : rebootRequired === false
        ? 'No reboot pending; updates may require one.'
        : 'Reboot status unknown.'}
    </p>
    <details><summary className="cursor-pointer">Service impact</summary><p className="mt-1">Updates may restart services. Preview package changes for service details.</p></details>
  </div>;
}
