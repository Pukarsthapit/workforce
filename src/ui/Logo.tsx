import { cn } from '@/lib/utils';
import lightModeLogoUrl from '../../Logos/logo light mode.png';
import darkModeLogoUrl from '../../Logos/Logo dark mode.png';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('block h-11 shrink-0', className)}>
      <img src={lightModeLogoUrl} alt="calm.ly" className="block h-full w-auto dark:hidden" />
      <img src={darkModeLogoUrl} alt="" aria-hidden="true" className="hidden h-full w-auto dark:block dark:mix-blend-lighten" />
    </span>);
}
