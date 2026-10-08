import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* The employee self-service layout: the prototype's essWrap and its cards
   (calm.ly-workforce-v15.html:5531-5541, 730-734, 819-820, 1180-1185). One
   layout driven by the real viewport: the cards flow into as many 320px
   columns as fit, one on a phone. */

/* .mcols: the responsive column flow the employee cards sit in. */
export function EssCols({ children, testId }: { children: ReactNode; testId?: string }) {
  return <div data-slot="ess-cols" data-testid={testId} className="grid grid-cols-12 items-start gap-x-2xl gap-y-xl max-md:grid-cols-1">{children}</div>;
}

/* .mc and .mc.dark: an employee card, 16px padding, 12px under it. The dark
   one is the inverse surface with its pale ink, and its label at 65%. `label`
   is the card's .lb line. */
export function EssCard({ testId, dark, label, children }: { testId?: string; dark?: boolean; label?: ReactNode; children?: ReactNode }) {
  return (
    <section data-slot="ess-card" data-testid={testId} className={cn('min-w-0 border-t border-border pt-md',
      dark && 'border-l-2 border-l-ok bg-ok-surface/45 pl-lg')}>
      {label && <div className="mb-sm text-xs font-medium tracking-[.09em] text-text-muted">{label}</div>}
      {children}
    </section>);
}

/* .mc .big: the 18px/600 headline of a card. */
export function EssBig({ children, testId }: { children: ReactNode; testId?: string }) {
  return <div data-testid={testId} className="text-[length:var(--type-data-large)] leading-[1.12] font-medium tracking-[-.045em] tabular-nums">{children}</div>;
}

/* .mr inside a card: what on the left, its value on the right, a light rule under every row but the last. */
export function EssRow({ children, testId }: { children: ReactNode; testId?: string }) {
  return <div data-testid={testId} className="flex items-center justify-between gap-md border-b py-sm text-sm last:border-b-0">{children}</div>;
}

/* .mbtn: a full-width 44px button in the card flow, for an action of its own. */
export function EssButton({ testId, onClick, children }: { testId: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" data-testid={testId} onClick={onClick}
      className="mb-[10px] h-11 w-full rounded-control border border-border-strong bg-surface-card text-sm font-semibold outline-none hover:bg-surface-tint focus-visible:shadow-focus">
      {children}
    </button>);
}
