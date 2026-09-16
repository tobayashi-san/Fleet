import { DangerTab } from './danger';
import { RecoveryStatus } from '@/features/backup/RecoveryStatus';
import { DatabaseBackupCard } from '@/features/backup/DatabaseBackupCard';

export function BackupTab() {
  return <div className="space-y-4"><RecoveryStatus />
    <section className="space-y-3 rounded-md border bg-card p-4" aria-label="Recovery coverage">
      <h2 className="font-semibold">Backup &amp; Recovery</h2>
      <p className="text-sm">A verified database archive is one part of recovery. Keep the following components together for the same application version.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Component</th><th className="p-2">Coverage</th><th className="p-2">Verification</th></tr></thead><tbody>
        <tr><td className="p-2">All-environment database</td><td className="p-2">Included in encrypted download</td><td className="p-2">Archive authentication and database integrity verified before download</td></tr>
        <tr><td className="p-2">Application encryption key and deployment configuration</td><td className="p-2">Back up separately</td><td className="p-2">Confirm restored credentials decrypt in an isolated instance</td></tr>
        <tr><td className="p-2">Playbooks, plugins, Git and infrastructure state</td><td className="p-2">Use the offline application backup</td><td className="p-2">Compare restored files and inventory against the source</td></tr>
        <tr><td className="p-2">Remote VMs, containers and workload data</td><td className="p-2">Separate platform/workload backups</td><td className="p-2">Test application recovery on an isolated target</td></tr>
      </tbody></table></div>
      <p className="text-sm text-muted-foreground">Record recovery tests above. A successful download does not prove full recovery.</p>
    </section>
    <DatabaseBackupCard />
    <details className="rounded-md border p-4"><summary className="cursor-pointer font-medium">Advanced: reset records and accounts</summary><DangerTab /></details>
  </div>;
}
