import type { ReactNode } from 'react';
import { Logo } from '@/ui';
import { NavLink } from '@/ui';

export function TopBar({ children, homePath }: { children?: ReactNode; homePath?: string }) {
  return (
    <header data-shell-topbar="" className="sticky top-0 z-[70] flex min-h-[68px] shrink-0 items-center gap-lg border-b border-border bg-surface-card/95 px-[clamp(24px,3.5vw,56px)] text-text-primary backdrop-blur max-lg:min-h-16 max-lg:gap-sm max-lg:px-md max-md:min-h-14 max-md:px-[10px]">
      {homePath
        ? <NavLink to={homePath} testId="shell-mobile-home" aria-label="Go to Home" className="flex min-h-touch shrink-0 items-center lg:hidden"><Logo className="h-8 max-md:h-7" /></NavLink>
        : <span className="flex shrink-0 items-center lg:hidden"><Logo className="h-8 max-md:h-7" /></span>}
      <div className="flex min-w-0 flex-1 items-center gap-sm">{children}</div>
    </header>);
}
