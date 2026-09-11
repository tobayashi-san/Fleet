export function OsUpdateImpact({ available, deferred, rebootRequired }: {
  available: number;
  deferred: number;
  rebootRequired?: boolean;
}) {
  return <div className="space-y-1 text-xs text-muted-foreground">
    <p>{available} available package updates · {deferred} deferred packages</p>
    <p className={rebootRequired ? 'text-warning' : undefined}>
      {rebootRequired === true ? 'Host currently reports a required reboot.' : rebootRequired === false
        ? 'No reboot currently reported. These updates may still require one.'
        : 'Current reboot requirement has not been reported.'}
    </p>
    <p>The catalog does not predict service restarts. Preview package changes for available service-ownership hints; package scripts may restart services.</p>
  </div>;
}
