import { cn } from '@/lib/utils';

/** Shipyard mark: server modules stacked on a hull. Colours follow the active theme. */
export function BrandMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('h-6 w-6 shrink-0', className)}>
    <rect width="40" height="40" rx="10" fill="hsl(var(--primary))" />
    <g fill="hsl(var(--primary-foreground))">
      <rect x="14" y="8.5" width="12" height="5.5" rx="1.3" />
      <rect x="10.5" y="15.5" width="19" height="5.5" rx="1.3" />
      <path d="M6.5 23h27l-3.6 7.4a2.4 2.4 0 0 1-2.16 1.35H12.26a2.4 2.4 0 0 1-2.16-1.35z" />
    </g>
    <g fill="hsl(var(--primary))">
      <circle cx="16.6" cy="11.25" r="1" />
      <circle cx="13.1" cy="18.25" r="1" />
    </g>
  </svg>;
}
