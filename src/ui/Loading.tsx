import { LoaderCircle } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center gap-sm text-sm text-text-secondary', className)}>
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-brand" />
      <span className="sr-only">{label}</span>
    </span>);
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-control bg-surface-subtle', className)} {...props} />;
}
