import { useMemo, useState } from 'react';
import { lineDiff } from '@/lib/line-diff';

export function PlaybookDiff({ before, after }: { before: string; after: string }) {
  const [open,setOpen]=useState(false);
  const diff=useMemo(()=>lineDiff(before,after),[before,after]);
  const added=diff.lines.filter(line=>line.kind==='added').length;
  const removed=diff.lines.filter(line=>line.kind==='removed').length;
  return <details className="rounded-md border bg-background text-xs" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer px-3 py-2 font-medium">Review changes · {added} added · {removed} removed</summary>
    {open && <div className="border-t">
      <p className="p-2 text-muted-foreground">Compared with the version opened for editing. − removes a line; + adds a line. Left/right numbers refer to saved/draft text. {diff.simplified && 'Large edit: the changed region is shown as a full replacement.'}</p>
      <div className="max-h-80 overflow-auto font-mono" role="region" aria-label="Playbook changes" tabIndex={0}>
        {diff.lines.slice(0,2000).map((line,index)=><div key={index} className={`flex min-w-max gap-2 px-2 ${line.kind==='removed'?'bg-destructive/10':line.kind==='added'?'bg-success/10':''}`}>
          <span className="w-10 shrink-0 text-right text-muted-foreground">{line.before ?? ''}</span><span className="w-10 shrink-0 text-right text-muted-foreground">{line.after ?? ''}</span><span aria-label={line.kind}>{line.kind==='removed'?'−':line.kind==='added'?'+':' '}</span><span className="whitespace-pre">{line.text || ' '}</span>
        </div>)}
      </div>
      {diff.lines.length>2000 && <p className="p-2 text-warning">Preview limited to 2,000 lines. Review the complete draft in the editor before saving.</p>}
    </div>}
  </details>;
}
