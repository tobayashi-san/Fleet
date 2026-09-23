import { DangerTab } from './danger';
import { DatabaseBackupCard } from '@/features/backup/DatabaseBackupCard';

export function BackupTab() {
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Fleet application data. Infrastructure backups are managed externally.</p>
    <DatabaseBackupCard />
    <details className="rounded-md border p-4"><summary className="cursor-pointer font-medium">Reset application data</summary><DangerTab /></details>
  </div>;
}
