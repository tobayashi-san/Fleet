import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  /** Small sections inside a card: one short line of height. */
  inline?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact, inline }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-3',
        inline ? 'gap-2 py-5' : compact ? 'min-h-[9rem] py-7' : 'min-h-[15rem] py-10 sm:py-12',
        className
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/65 text-muted-foreground shadow-sm">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className={cn('text-sm text-foreground', inline ? 'font-medium text-muted-foreground' : 'font-semibold')}>{title}</h3>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
