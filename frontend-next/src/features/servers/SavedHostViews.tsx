import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readSavedViews, type HostView, type SavedHostView } from './saved-views';

/** Parent remounts this component when user/environment changes. */
export function SavedHostViews({ storageKey, current, onApply }: { storageKey: string; current: HostView; onApply: (view: HostView) => void }) {
  const [views, setViews] = useState(() => {
    try { return readSavedViews(localStorage.getItem(storageKey)); } catch { return []; }
  });
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const persist = (next: SavedHostView[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setViews(next);
      setError('');
      return true;
    } catch { setError('The view could not be saved in this browser. Check available browser storage.'); return false; }
  };
  return <details className="rounded-md border px-3 py-2">
    <summary className="cursor-pointer text-sm font-medium">Saved views{views.length ? ` (${views.length})` : ''}</summary>
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">Search, filters, sort order, grouping and operating columns. Stored separately for your account and this environment in this browser.</p>
      {views.length > 0 && <div className="flex flex-wrap gap-2">
        <select aria-label="Saved host view" value={selected} onChange={event => setSelected(event.target.value)} className="h-8 max-w-full rounded-md border bg-background px-2 text-sm">
          <option value="">Choose a view</option>
          {views.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
        <Button type="button" size="sm" variant="outline" disabled={!selected} onClick={() => {
          const item = views.find(view => view.name === selected);
          if (item) onApply(structuredClone(item.view));
        }}>Apply view</Button>
        <Button type="button" size="sm" variant="outline" disabled={!selected} onClick={() => persist(views.map(item => item.name === selected ? { ...item, view: structuredClone(current) } : item))}>Update from current</Button>
        <Button type="button" size="sm" variant="ghost" disabled={!selected} onClick={() => {
          if (persist(views.filter(item => item.name !== selected))) setSelected('');
        }}>Delete view</Button>
      </div>}
      <div className="flex flex-wrap gap-2">
        <Input aria-label="New view name" value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder="e.g. Production updates" className="max-w-xs" />
        <Button type="button" size="sm" variant="outline" disabled={!name.trim() || views.length >= 20} onClick={() => {
          const label = name.trim();
          if (views.some(item => item.name.toLowerCase() === label.toLowerCase())) { setError('That name already exists. Select the view and use Update from current.'); return; }
          if (persist([...views, { name: label, view: structuredClone(current) }])) { setSelected(label); setName(''); }
        }}>Save current view</Button>
      </div>
      {views.length >= 20 && <p className="text-xs text-muted-foreground">20 views saved. Delete a view before adding another.</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  </details>;
}
