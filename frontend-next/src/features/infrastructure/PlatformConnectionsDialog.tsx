import type {ReactNode} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';

export function PlatformConnectionsDialog({open,onOpenChange,children}:{open:boolean;onOpenChange:(open:boolean)=>void;children:ReactNode}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-5xl grid-cols-[minmax(0,1fr)] overflow-y-auto p-0">
      <DialogHeader className="min-w-0 break-words border-b px-5 py-4 pr-12">
        <DialogTitle>Platform connections</DialogTitle>
        <DialogDescription>Manage the Proxmox connections used by this environment’s inventory and VM definitions.</DialogDescription>
      </DialogHeader>
      <div className="min-w-0 p-4">{children}</div>
    </DialogContent>
  </Dialog>;
}
