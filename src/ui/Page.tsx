import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tip } from './Affordances';

/* The page frame every routed screen sits in: the prototype's .page
   (calm.ly-workforce-v15.html:388-389, 1524-1525), at most 1360px wide and
   centred, 24px all round, 16px 12px below 1024px. A page never adds outer
   padding or a max width of its own; `narrow` is the prototype's
   .page.narrow, 520px, for a single form or statement. */
export function Page({ testId, narrow, className, children }: { testId: string; narrow?: boolean; className?: string; children: ReactNode }) {
  return (
    <section data-testid={testId}
      className={cn('mx-auto w-full px-[clamp(20px,4.5vw,76px)] pb-[clamp(40px,6vw,88px)] pt-[clamp(24px,2.5vw,36px)] max-lg:px-md max-lg:py-lg',
        narrow ? 'max-w-[600px]' : 'max-w-[1480px]', className)}>
      {children}
    </section>);
}

/* The page head: the prototype's aHead (v15:7963-7975, .crumb and .pagehead
   at 364 and 394-395). A quiet parent/context crumb sits above one prominent
   title; repeated title segments are removed. Actions sit to the right. */
export function PageHead({ title, crumb, tip, tipTestId, actions }: {
  title: string; crumb?: string; tip?: string; tipTestId?: string; actions?: ReactNode;
}) {
  const parentCrumb = crumb?.split('·').map(part => part.trim())
    .filter(part => part.toLocaleLowerCase() !== title.toLocaleLowerCase()).join(' · ');
  return (
    <header data-slot="page-heading" className="relative mb-2xl flex flex-wrap items-end gap-x-xl gap-y-md border-b border-border pb-lg max-md:mb-xl max-md:pb-md">
      <div className="min-w-0 flex-1">
        {parentCrumb && <div className="mb-sm flex items-center gap-sm text-xs font-medium tracking-[.08em] text-text-muted">
          <span aria-hidden="true" className="flow-knot" />{parentCrumb}
        </div>}
        <h1 className="max-w-[22ch] text-[length:var(--type-page-title)] leading-[1.08] font-medium tracking-[-.045em]">
          {title}{tip && tipTestId && <Tip testId={tipTestId} text={tip} />}
        </h1>
      </div>
        {actions && <div className="ml-auto flex flex-wrap items-center gap-sm">{actions}</div>}
    </header>);
}

/* A long settings page's Save and Cancel, as a dialog's .mf holds its
   buttons: on the right, 8px apart, on the card surface, after the last card.
   While there is something to save (`stuck`) it stays in reach, stuck 8px
   above the foot of the screen (above the phone's bottom tabs), until the
   page is scrolled to where it rests. */
export function ActionBar({ stuck, children }: { stuck?: boolean; children: ReactNode }) {
  return (
    <div className={cn('mt-lg flex flex-wrap items-center justify-end gap-sm border-t border-border bg-surface-page/95 px-sm py-md backdrop-blur',
      stuck && 'sticky bottom-sm z-[50] shadow-sm max-md:bottom-[calc(61px+env(safe-area-inset-bottom,0px))]')}>
      {children}
    </div>);
}

/* A titled section inside a page: the prototype's h2 (v15:241), 18px/600,
   24px above and 12px below. */
export function SectionHead({ title, tip, tipTestId }: { title: string; tip?: string; tipTestId?: string }) {
  return <h2 className="mt-2xl mb-md text-[length:var(--type-section-title)] font-medium tracking-[-.035em]">{title}{tip && tipTestId && <Tip testId={tipTestId} text={tip} />}</h2>;
}
