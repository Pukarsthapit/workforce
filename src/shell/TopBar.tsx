import type { ReactNode } from 'react';
import { Logo, NavLink, Tip } from '@/ui';
import { usePageTitle } from '@/ui/Page';

export function TopBar({ children, homePath }: { children?: ReactNode; homePath?: string }) {
  const heading = usePageTitle();
  const title = heading?.title;
  return (
    <header data-shell-topbar="" className={`sticky top-0 z-[70] flex ${title ? 'min-h-[92px] max-lg:min-h-20 max-md:min-h-16' : 'min-h-[68px] max-lg:min-h-16 max-md:min-h-14'} shrink-0 items-center gap-lg border-b border-border bg-surface-card/95 px-[clamp(24px,3.5vw,56px)] text-text-primary backdrop-blur max-lg:gap-sm max-lg:px-md max-md:px-[10px]`}>
      {homePath
        ? <NavLink to={homePath} testId="shell-mobile-home" aria-label="Go to Home" className="flex min-h-touch shrink-0 items-center lg:hidden"><Logo className="h-8 max-md:h-7" /></NavLink>
        : <span className="flex shrink-0 items-center lg:hidden"><Logo className="h-8 max-md:h-7" /></span>}
      <div className="flex min-w-0 flex-1 items-center gap-sm">
        {title && <h1 className="min-w-0 flex-1 truncate text-[length:var(--type-page-title)] leading-[1.08] font-medium tracking-[-.045em] max-md:text-2xl">
          {title}{heading?.tip && heading.tipTestId && <Tip testId={heading.tipTestId} text={heading.tip} />}
        </h1>}
        {children}
      </div>
    </header>);
}
