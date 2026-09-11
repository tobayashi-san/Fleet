import { useEffect, useId, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { useEnvironments } from '@/lib/queries';
import { useUi } from '@/lib/store';

interface ConfirmDialogProps {
  open: boolean;
  closeOnConfirm?: boolean;
  error?: string;
  targetEnvironmentId?: string;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning';
  onConfirm: () => void;
  isPending?: boolean;
  confirmTextValue?: string;
  confirmInputLabel?: string;
  confirmInputPlaceholder?: string;
  confirmInputHelp?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  closeOnConfirm = true,
  error,
  targetEnvironmentId,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  isPending,
  confirmTextValue,
  confirmInputLabel = 'Type to confirm',
  confirmInputPlaceholder,
  confirmInputHelp,
}: ConfirmDialogProps) {
  const activeEnvironmentId = useUi((state) => state.environmentId);
  const environmentId = targetEnvironmentId ?? activeEnvironmentId;
  const { data: environments } = useEnvironments();
  const environment = environments?.find((item) => String(item.id) === environmentId);
  const environmentName = String(environment?.name || (environmentId === 'default' ? 'Default' : environmentId));
  const [typed, setTyped] = useState('');
  const submitted = useRef(false);
  useEffect(() => { if (!isPending) submitted.current = false; }, [isPending, open]);
  const confirmInputId = useId();
  const requiredValue = String(confirmTextValue ?? '');
  const requiresText = requiredValue.length > 0;
  const canConfirm = !requiresText || typed === requiredValue;

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isPending) onOpenChange(next); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 rounded-sm border border-border/80 bg-muted/25 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{targetEnvironmentId ? 'Target environment' : 'Active environment'}</span>
          <span className="truncate font-medium" title={environmentName}>{environmentName}</span>
        </div>
        {requiresText && (
          <div className="space-y-2">
            <Label htmlFor={confirmInputId}>{confirmInputLabel}</Label>
            <Input
              id={confirmInputId}
              value={typed}
              disabled={isPending}
              // `input` is deliberately handled in addition to React's
              // change abstraction.  Browser autofill/password managers and
              // some WebKit/Firefox paths update the native value first; the
              // destructive-action guard must follow that value immediately.
              onInput={(e) => setTyped(e.currentTarget.value)}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmInputPlaceholder ?? requiredValue}
              autoComplete="off"
              className="font-mono"
            />
            <div className="text-xs text-muted-foreground">
              {confirmInputHelp ?? (
                <>
                  Type <span className="font-mono text-foreground">{requiredValue}</span> to enable this action.
                </>
              )}
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'outline'}
            className={variant === 'warning' ? 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600' : undefined}
            onClick={() => {
              if (isPending || !canConfirm || (!closeOnConfirm && submitted.current)) return;
              if (!closeOnConfirm) submitted.current = true;
              onConfirm();
              if (closeOnConfirm) onOpenChange(false);
            }}
            disabled={isPending || !canConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
