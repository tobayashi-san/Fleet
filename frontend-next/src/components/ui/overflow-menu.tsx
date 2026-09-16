import type { ReactNode, ComponentType } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from './button';

export function OverflowMenu({ children, width = 'w-56', title = 'Actions', trigger }: {
  children: ReactNode;
  width?: string;
  title?: string;
  trigger?: ReactNode;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant={trigger ? 'outline' : 'ghost'} size={trigger ? 'sm' : 'icon'} title={title} aria-label={title}>
          {trigger || <MoreVertical className="h-4 w-4" />}
          {trigger && <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end" sideOffset={4} collisionPadding={8}
          aria-label={title}
          className={`z-[100] ${width} max-w-[calc(100vw-1rem)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 shadow-md`}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function OverflowItem({
  icon: Icon,
  onClick,
  children,
  danger,
  warning,
  disabled,
}: {
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  warning?: boolean;
  disabled?: boolean;
}) {
  const colorClass = danger
    ? 'text-destructive hover:bg-destructive/10'
    : warning
    ? 'text-amber-500 hover:bg-amber-500/10'
    : 'hover:bg-accent';
  return (
    <DropdownMenu.Item
      onSelect={onClick}
      disabled={disabled}
      role="menuitem"
      className={`flex min-h-9 w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${colorClass}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </DropdownMenu.Item>
  );
}

export function OverflowSep() {
  return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
}

export function OverflowLink({
  to,
  params,
  icon: Icon,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.Item asChild><Link
      to={to as never}
      params={params as never}
      role="menuitem"
      className="flex min-h-9 w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </Link></DropdownMenu.Item>
  );
}
