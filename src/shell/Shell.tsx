import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { ArrowUpRight, BadgeDollarSign, Bell, BriefcaseBusiness, Building2, CalendarCheck, CalendarClock, CalendarDays, CalendarRange, ChartColumn, ChevronDown, ChevronLeft, CircleHelp, ClipboardCheck, ClipboardList, Clock3, FileSignature, FileText, Headset, HeartPulse, History, Home, Link2, MapPinned, Megaphone, Menu, PanelLeftClose, PanelLeftOpen, Puzzle, Settings, ShieldCheck, Sun, TriangleAlert, UserRound, UserRoundPlus, Users, Workflow } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import type { NavGroup, NavTab } from '@/domain/nav';
import type { Session } from '@/contract/session';
import { tid } from '@/testids';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/ui/shadcn/button';
import { Logo, Modal, NavLink, Page, PageHead, Card, toastInfo } from '@/ui';
import { GUIDES } from '@/ui/guides';
import { AccountMenu, type MenuAccount } from './AccountMenu';
import { TopBar } from './TopBar';
import { NotificationBell, type InboxState } from './Inbox';
import { useMarkAllRead, useMarkRead, useMyNotifications } from '@/api/notifications';
import { useShellData, ShellLoading, ShellError } from './shellData';
import { NotBuilt } from '@/features/not-built/NotBuilt';
import { PageUnavailable } from '@/features/not-built/PageUnavailable';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { SetupIndex } from '@/features/setup/SetupIndex';
import { PermissionsPage } from '@/features/access/PermissionsPage';
import { AuditPage } from '@/features/audit/AuditPage';
import { AdminPeoplePage } from '@/features/people/AdminPeoplePage';
import { TeamPeoplePage } from '@/features/people/TeamPeoplePage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { DimensionsPage } from '@/features/dimensions/DimensionsPage';
import { ContractsPage } from '@/features/dimensions/ContractsPage';
import { EmployeeTypesPage } from '@/features/employee-types/EmployeeTypesPage';
import { TimesheetPage } from '@/features/timesheet/TimesheetPage';
import { TeamTimesheetsPage } from '@/features/timesheet/TeamTimesheetsPage';
import { TimesheetSetupPage } from '@/features/timesheet/TimesheetSetupPage';
import { RotaPage } from '@/features/rota/RotaPage';
import { ShiftsPage } from '@/features/rota/ShiftsPage';
import { PatternsPage } from '@/features/rota/PatternsPage';
import { CoverPage } from '@/features/rota/CoverPage';
import { MyShiftsPage } from '@/features/rota/MyShiftsPage';
import { RotaSetupPage } from '@/features/rota/RotaSetupPage';
import { ItServiceDeskPage } from '@/features/rota/ItServiceDeskPage';
import { LeavePage } from '@/features/leave/LeavePage';
import { TeamLeavePage } from '@/features/leave/TeamLeavePage';
import { SicknessPage } from '@/features/leave/SicknessPage';
import { LeaveSetupPage } from '@/features/leave/LeaveSetupPage';
import { ModulesPage } from '@/features/modules/ModulesPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { OrganisationPage } from '@/features/organisation/OrganisationPage';
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage';
import { NoticesPage } from '@/features/notices/NoticesPage';
import { TeamNoticesPage } from '@/features/notices/TeamNoticesPage';
import { HomePage } from '@/features/home/HomePage';
import { TeamHomePage } from '@/features/home/TeamHomePage';
import { DocumentsPage } from '@/features/home/DocumentsPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { TeamOnboardingPage } from '@/features/onboarding/TeamOnboardingPage';
import { OnboardingSetupPage } from '@/features/onboarding/OnboardingSetupPage';
import { moduleBy } from '@/domain/modules';

const BUILT: Record<string, ComponentType> = { asetup: SetupIndex, aperm: PermissionsPage, iaudit: AuditPage,
  apeople: AdminPeoplePage, tpeople: TeamPeoplePage, profile: ProfilePage,
  aloc: DimensionsPage, acon: ContractsPage, atypes: EmployeeTypesPage, ts: TimesheetPage, tteam: TeamTimesheetsPage,
  mts: TimesheetSetupPage, trota: RotaPage, tshifts: ShiftsPage, tpat: PatternsPage,
  tcover: CoverPage, shifts: MyShiftsPage, mrota: RotaSetupPage, leave: LeavePage, tleave: TeamLeavePage, tsick: SicknessPage, mleave: LeaveSetupPage,
  amods: ModulesPage, acal: CalendarPage, aorg: OrganisationPage, anotif: NotificationsPage, aappr: ApprovalsPage, notices: NoticesPage, tnotices: TeamNoticesPage,
  home: HomePage, thome: TeamHomePage, docs: DocumentsPage, onb: OnboardingPage, tonb: TeamOnboardingPage,
  monb: OnboardingSetupPage, iit: ItServiceDeskPage };
const THEME_KEY = 'calm.ly.theme';
const SIDEBAR_KEY = 'calm.ly.sidebar.collapsed';

/* Avoids a non-null assertion on role[0]: charAt(0) is always defined, even
   for an empty string, so this needs no unsafe indexing. */
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* The role label used in the account area and workspace context: a renamed
   role's display name, and the viewed person's while viewing as someone. */
export function roleLabelOf(session: Pick<Session, 'account' | 'viewingAs'>): string {
  const on = session.viewingAs ?? session.account;
  return on.roleName || capitalise(on.userType);
}

export function Shell() {
  const data = useShellData();
  if (data.kind === 'loading') return <ShellLoading />;
  if (data.kind === 'error') return <ShellError onRetry={data.onRetry} onSignOut={data.onSignOut} />;
  const { session } = data;
  return <ShellView nav={data.nav} roleLabel={roleLabelOf(session)} viewingAs={session.viewingAs?.name ?? null}
    account={session.account} canViewAs={session.capabilities.includes('perm_cfg')}
    who={`${session.account.email}|${session.viewingAs?.personCode ?? ''}`}
    onSignOut={data.onSignOut} onViewAs={data.onViewAs} onEndViewAs={data.onEndViewAs} />;
}

/* The bell's inbox (D9): the reader's own items from the server. Opening one
   marks it read (not while looking at the app as someone else, which changes
   nothing) and goes where it points; the dot and the count change only once
   the server has answered. */
function useInbox(readOnly: boolean): InboxState {
  const q = useMyNotifications(), markRead = useMarkRead(), markAll = useMarkAllRead();
  return {
    status: q.isPending ? 'loading' : q.isError ? 'error' : 'ready', items: q.data?.items ?? [], unread: q.data?.unread ?? 0,
    readOnly, markAllPending: markAll.isPending('notifications/all'),
    onOpen: n => {
      if (!n.read && !readOnly) markRead.mutate({ id: n.id });
      toastInfo(`Opened from your notifications: ${n.title}.`);
    },
    onMarkAll: () => { if (!readOnly) markAll.mutate(null); },
  };
}

/* Desktop navigation stays in the left sidebar; phones use the same
 information architecture in a drawer, with a contextual quick-page bar. */
export function ShellView({ nav, roleLabel, viewingAs, account, canViewAs = false, inbox, who, onSignOut, onViewAs = () => {}, onEndViewAs }: {
  nav: NavGroup[]; roleLabel: string; viewingAs: string | null; account: MenuAccount; canViewAs?: boolean;
  /* the bell's inbox; read from the server when not given */
  inbox?: InboxState;
  /* who the app is showing: the account, and whoever it is viewing as */
  who?: string;
  onSignOut(): void; onViewAs?(personCode: string): void; onEndViewAs(): void;
}) {
  const { pathname, search } = useLocation();
  useHomeOnSwitch(who, nav, pathname);
  const [theme, toggleTheme] = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
  });
  const toggleSidebar = () => setSidebarCollapsed(collapsed => {
    const next = !collapsed;
    try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* sidebar state still applies this session */ }
    return next;
  });
  const current = nav.find(g => pathname.startsWith(`/${g.key}/`));
  const homeTab = universalHome(nav);
  const first = homeTab ?? nav[0]?.tabs[0];
  const stripTabs = stripTabsFor(current, pathname, search);
  const here = pathname + search;
  const activeTab = [...nav.flatMap(g => g.tabs), ...stripTabs].find(t => isHere(t, here));
  const sections = sidebarSections(nav, current, stripTabs);
  const profile = nav.find(g => g.key === 'work')?.tabs.find(t => t.view === 'profile');
  return (
    <div className={cn('min-h-dvh overflow-x-clip lg:grid', sidebarCollapsed ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-[256px_minmax(0,1fr)]')}>
      <SideNavigation sections={sections} homeTab={homeTab}
        profilePath={profile?.path} here={here} account={account} roleLabel={roleLabel} viewingAs={viewingAs} canViewAs={canViewAs}
        onSignOut={onSignOut} onViewAs={onViewAs} onEndViewAs={onEndViewAs}
        collapsed={sidebarCollapsed} onToggle={toggleSidebar} onHelp={() => setHelpOpen(true)} />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <TopBar homePath={first?.path ?? '/'}>
          <MobileNavigation homeTab={homeTab} sections={sections} profilePath={profile?.path} here={here}
            account={account} roleLabel={roleLabel} viewingAs={viewingAs} canViewAs={canViewAs}
            onSignOut={onSignOut} onViewAs={onViewAs} onEndViewAs={onEndViewAs} onHelp={() => setHelpOpen(true)} />
          <div className="ml-auto flex shrink-0 items-center gap-md max-md:gap-[2px]">
            <IconButton testId={tid.shell.theme} label={`${theme === 'dark' ? 'Light' : 'Dark'} theme`} onClick={toggleTheme}><Sun aria-hidden="true" /></IconButton>
            {inbox ? <NotificationBell inbox={inbox} /> : <ServerBell readOnly={viewingAs !== null} />}
          </div>
        </TopBar>
        {viewingAs && <div role="status" className="flex flex-wrap items-center gap-md border-b border-warn bg-warn-surface px-xl py-sm text-sm text-warn max-lg:px-md">
          <span>Looking at the app as <b>{viewingAs}</b>. Your own account is unchanged.</span>
          <button type="button" data-testid={tid.shell.viewAsEnd} className="inline-flex min-h-touch items-center font-semibold underline" onClick={onEndViewAs}>Return to my account</button></div>}
        <main className={cn('min-w-0 flex-1 lg:pb-10', stripTabs.length > 0 && 'max-lg:pb-[calc(72px+env(safe-area-inset-bottom,0px))]')}>
          <Routes>
            {nav.flatMap(g => g.tabs).map(t => {
              const Built = BUILT[t.view];
              return <Route key={t.path} path={t.path} element={Built ? <Built /> : <NotBuilt tab={t} />} />;
            })}
            <Route path="/" element={homeTab?.view === 'workspace-home' ? <WorkspaceHome sections={sections} roleLabel={roleLabel} /> : first ? <Navigate to={first.path} replace /> : <NothingAvailable />} />
            <Route path="*" element={first ? <PageUnavailable path={pathname} home={first} /> : <NothingAvailable />} />
          </Routes>
        </main>
        {stripTabs.length > 0 && <BottomBar tabs={stripTabs} here={here} />}
      </div>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} view={activeTab?.view} />
    </div>);
}

function ServerBell({ readOnly }: { readOnly: boolean }) {
  return <NotificationBell inbox={useInbox(readOnly)} />;
}

/* Switching account or who you view as starts from that person's first page
   when the page on screen is not theirs; a link opened on purpose to a page
   you cannot reach says so instead (PageUnavailable). */
function useHomeOnSwitch(who: string | undefined, nav: NavGroup[], pathname: string) {
  const navigate = useNavigate(), last = useRef(who);
  useEffect(() => {
    if (last.current === who) return;
    last.current = who;
    const home = universalHome(nav) ?? nav[0]?.tabs[0];
    if (home && !nav.some(g => g.tabs.some(t => t.path === pathname))) void navigate(home.path, { replace: true });
  }, [who, nav, pathname, navigate]);
}

/* .iconbtn (v15:307-315, 1549): a 34px round button in the pale shell ink
   with an 18px stroked icon, 44px on a phone. */
function IconButton({ testId, label, onClick, children }: { testId: string; label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" data-testid={testId} aria-label={label} onClick={onClick}
      className="relative grid size-[34px] shrink-0 place-items-center rounded-pill text-shell-ink transition-colors duration-(--qp-duration-fast) hover:bg-shell-hover max-md:size-11 [&>svg]:size-[18px]">
      {children}
    </button>);
}

/* buildNav never returns a group with no tabs (it filters those out before
   returning), so the first tab always exists; this still satisfies
   noUncheckedIndexedAccess without a non-null assertion, and fails loudly
   (rather than silently) if that invariant is ever broken. */
/* Setup is not one flat strip. At the index the strip holds the index's own
   tab alone, selected, as the prototype's does ("calm.ly setup"); inside a
   section it shows only that section's pages, plus a way back (ported from
   the prototype's SETUP_SECTIONS drill and its "‹ All setup" tab,
   calm.ly-workforce-v15.html:4075). Work and My Team are unaffected: their
   strip is just the group's tabs, as it always was. Inside Modules, opening
   a module (/setup/amods?m=<code>) drills in once more, as the prototype's
   NAV() does (v15:4059-4076): a way back to the module list, the module's
   features, and its setup page when this person can reach it. A module's
   setup page (mts, mrota, mleave) sits inside that drill-in, never on the
   Modules section's own strip (suite ADMIN LAYOUT: "‹ All modules |
   Timesheet features | Timesheet setup"). */
export function stripTabsFor(current: NavGroup | undefined, pathname: string, search = ''): NavTab[] {
  if (!current) return [];
  if (current.key !== 'setup') return current.tabs;
  const index = current.tabs.find(t => t.view === 'asetup');
  const active = current.tabs.find(t => t.path === pathname);
  const section = active?.section;
  if (!section) return index && active === index ? [index] : [];
  const m = moduleBy(active.module ?? (active.view === 'amods' ? new URLSearchParams(search).get('m') ?? '' : ''));
  const amods = current.tabs.find(t => t.view === 'amods');
  if (m && amods) {
    const own = current.tabs.find(t => t.view === m.setup);
    return [
      { view: 'amods', label: '‹ All modules', path: amods.path, built: true, back: true },
      { view: 'mfeat', label: `${m.name} features`, path: `${amods.path}?m=${m.code}`, built: true },
      ...(own && m.setupLabel ? [{ ...own, label: m.setupLabel }] : []),
    ];
  }
  const back: NavTab = { view: 'asetup', label: '‹ All setup', path: index?.path ?? '/setup/asetup', built: true, back: true };
  return [back, ...current.tabs.filter(t => t.section === section && !t.module)];
}
/* Whether a strip tab is the page on screen. A tab whose path carries a query
   (a module's features) matches only with that query; any other matches its
   path whatever the query, and a way back never does. */
export const isHere = (t: NavTab, here: string) => !t.back && (t.path.includes('?') ? here === t.path : here.split('?')[0] === t.path);

function useTheme(): ['light' | 'dark', () => void] {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage full or blocked: the theme still applies this session */ }
    return next;
  });
  return [theme, toggle];
}

/* A valid session whose capabilities resolve to nothing must not render an
   empty shell; the account control remains available in the sidebar footer. */
function NothingAvailable() {
  return (
    <Page testId={tid.page('none')} narrow>
      <PageHead title="Nothing available" />
      <Card><p className="text-text-secondary">Your account has no access to open here. Ask an administrator to grant a capability on calm.ly setup &rarr; Permissions.</p></Card>
    </Page>);
}

export const TAB_ICON: Record<string, ComponentType<{ 'aria-hidden'?: 'true' | 'false'; className?: string }>> = {
  home: Home, thome: Home, 'workspace-home': Home, ts: Clock3, tteam: ClipboardCheck, shifts: CalendarDays, tshifts: CalendarDays, trota: CalendarDays,
  leave: Sun, tleave: CalendarClock, tsick: HeartPulse, people: Users, apeople: Users, tpeople: Users, docs: FileText, notices: Megaphone,
  tnotices: Megaphone, hours: ChartColumn, thours: ChartColumn, texc: TriangleAlert, aperm: ShieldCheck, asetup: Settings,
  amods: Building2, aorg: Building2, acal: CalendarDays, anotif: Bell, aappr: ClipboardCheck,
  profile: UserRound, onb: ClipboardList, tonb: ClipboardCheck, tcover: UserRoundPlus, tpat: Workflow,
  mfeat: Puzzle, mts: Clock3, mrota: CalendarRange, mleave: CalendarCheck, monb: ClipboardList,
  atypes: BriefcaseBusiness, acon: FileSignature, aloc: MapPinned, iaudit: History, ibc: Link2,
  ipay: BadgeDollarSign, mpay: BadgeDollarSign, iit: Headset,
};

function WorkspaceHome({ sections, roleLabel }: { sections: SidebarSection[]; roleLabel: string }) {
  return <Page testId={tid.page('home')}>
    <PageHead title="Home" crumb={`${roleLabel} workspace`} />
    <p className="text-sm text-text-secondary">Choose an area to continue.</p>
    <div className="mt-xl grid gap-xl sm:grid-cols-2 xl:grid-cols-3">
      {sections.map(section => <section key={section.key} aria-labelledby={`workspace-home-${section.key}`}>
        <h2 id={`workspace-home-${section.key}`} className="mb-sm text-xs font-semibold tracking-[.12em] text-text-muted">{section.label}</h2>
        <nav aria-label={`${section.label} shortcuts`} className="divide-y divide-border border-y border-border">
          {section.tabs.map(tab => <NavLink key={`${tab.view}-${tab.path}`} to={tab.path} testId={`home-destination-${tab.view}`}
            className="group flex min-h-12 items-center gap-sm py-sm text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:shadow-focus">
            <TabIcon view={tab.view} />
            <span className="min-w-0 flex-1 truncate">{tab.label}</span>
            <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          </NavLink>)}
        </nav>
      </section>)}
    </div>
  </Page>;
}

type SidebarSection = { key: string; label: string; tabs: NavTab[] };

function universalHome(nav: NavGroup[]): NavTab | undefined {
  const teamHome = nav.find(g => g.key === 'team')?.tabs.find(t => t.view === 'thome');
  const personalHome = nav.find(g => g.key === 'work')?.tabs.find(t => t.view === 'home');
  const onboarding = nav.find(g => g.key === 'work')?.tabs.find(t => t.view === 'onb');
  return teamHome ?? personalHome ?? onboarding ?? (nav.length ? { view: 'workspace-home', label: 'Home', path: '/', built: true } : undefined);
}

function sidebarSections(nav: NavGroup[], current: NavGroup | undefined, stripTabs: NavTab[]): SidebarSection[] {
  const work = nav.find(g => g.key === 'work')?.tabs ?? [];
  const team = nav.find(g => g.key === 'team')?.tabs ?? [];
  const setup = nav.find(g => g.key === 'setup')?.tabs ?? [];
  const all = [...work, ...team, ...setup];
  const get = (view: string) => all.find(t => t.view === view);
  const section = (key: string, label: string, views: string[]): SidebarSection =>
    ({ key, label, tabs: views.flatMap(view => { const item = get(view); return item ? [item] : []; }) });
  const teamReports = get('thours');
  const personalHours = get('hours');
  const people = get('tpeople') ?? get('apeople');
  const adminPeople = get('apeople');
  const personalNotices = get('notices');
  const teamNotices = get('tnotices');
  const documents = get('docs');
  const teamOnboarding = get('tonb');
  const exceptions = get('texc');
  const settings = get('asetup');
  return [
    section('work', 'WORK', ['ts', 'tteam', 'shifts', 'trota', 'tcover', 'tshifts', 'tpat', 'leave', 'tleave', 'tsick', 'onb']),
    { key: 'people', label: 'PEOPLE', tabs: [
      ...(people ? [{ ...people, label: 'People' }] : []),
      ...(people?.view === 'tpeople' && adminPeople ? [{ ...adminPeople, label: 'People administration' }] : []),
      ...(documents ? [documents] : []),
      ...(personalNotices ? [personalNotices] : []),
      ...(teamNotices ? [{ ...teamNotices, label: personalNotices ? 'Manage notices' : 'Notices' }] : []),
      ...(teamOnboarding ? [teamOnboarding] : []),
    ] },
    { key: 'insights', label: 'INSIGHTS', tabs: [
      ...(teamReports ? [{ ...teamReports, label: 'Reports' }] : []),
      ...(personalHours ? [{ ...personalHours, label: 'My hours' }] : []),
      ...(exceptions ? [exceptions] : []),
    ] },
    { key: 'system', label: 'SYSTEM', tabs: [
      ...(settings ? [settings] : []),
      ...(current?.key === 'setup' ? stripTabs.filter(t => t.view !== 'asetup') : []),
    ] },
  ].filter(s => s.tabs.length);
}

function TabIcon({ view }: { view: string }) {
  const Icon = TAB_ICON[view];
  return Icon ? <Icon aria-hidden="true" className="size-[17px] shrink-0" /> : <span aria-hidden="true" className="size-[17px] shrink-0 text-center leading-[17px]">·</span>;
}

function SidebarItem({ tab, here, collapsed = false, onSelect, testId }: {
  tab: NavTab; here: string; collapsed?: boolean; onSelect?: () => void; testId: string;
}) {
  const active = isHere(tab, here);
  return <NavLink to={tab.path} testId={testId} onClick={onSelect} aria-current={active ? 'page' : undefined}
    aria-label={collapsed ? tab.label : undefined} title={collapsed ? tab.label : undefined}
    className={cn('group relative flex min-h-11 items-center rounded-md text-sm text-text-secondary transition-colors duration-(--qp-duration-fast) hover:bg-surface-subtle hover:text-text-primary focus-visible:shadow-focus',
      collapsed ? 'w-11 justify-center px-0' : 'gap-sm px-md',
      tab.back && 'ml-md text-xs',
      active && 'bg-brand-subtle font-semibold text-brand dark:text-text-primary')}>
    {tab.back ? <ChevronLeft aria-hidden="true" className="size-4 shrink-0" /> : <TabIcon view={tab.view} />}
    {!collapsed && <span className="min-w-0 truncate">{tab.label}</span>}
    {active && <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-brand" />}
  </NavLink>;
}

function SidebarSections({ sections, here, collapsed = false, onSelect, idPrefix }: {
  sections: SidebarSection[]; here: string; collapsed?: boolean; onSelect?: () => void; idPrefix: string;
}) {
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});
  return <div className="space-y-6">
    {sections.filter(s => s.key !== 'system').map(section => (
      <section key={section.key} aria-labelledby={!collapsed ? `${idPrefix}-${section.key}` : undefined}>
        {!collapsed && <h2 className="px-md pb-2">
          <button type="button" id={`${idPrefix}-${section.key}`} data-testid={`${idPrefix}-section-${section.key}`}
            aria-expanded={!closedSections[section.key]} aria-controls={`${idPrefix}-${section.key}-links`}
            onClick={() => setClosedSections(current => ({ ...current, [section.key]: !current[section.key] }))}
            className="flex min-h-11 w-full items-center justify-between gap-sm rounded-sm text-left text-[11px] font-semibold tracking-[.12em] text-text-muted transition-colors hover:text-text-primary focus-visible:shadow-focus">
            {section.label}
            <ChevronDown aria-hidden="true" className={cn('size-3.5 transition-transform', closedSections[section.key] && '-rotate-90')} />
          </button>
        </h2>}
        <nav id={`${idPrefix}-${section.key}-links`} aria-label={section.label}
          hidden={!collapsed && closedSections[section.key]}
          className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>
          {section.tabs.map(tab => <SidebarItem key={tab.view} tab={tab} here={here} collapsed={collapsed} onSelect={onSelect}
            testId={idPrefix === 'sidebar' ? tid.nav.tab(tab.view) : `mobile-nav-${tab.view}`} />)}
        </nav>
      </section>))}
  </div>;
}

function SidebarFooter({ settings, profilePath, account, roleLabel, viewingAs, canViewAs, collapsed, here, onHelp, onSelect, onSignOut, onViewAs, onEndViewAs, idPrefix }: {
  settings: NavTab[]; profilePath?: string; account: MenuAccount; roleLabel: string; viewingAs: string | null; canViewAs: boolean;
  collapsed: boolean; here: string; onHelp(): void; onSelect?: () => void;
  onSignOut(): void; onViewAs(personCode: string): void; onEndViewAs(): void; idPrefix: string;
}) {
  const settingRoot = settings.find(t => t.view === 'asetup' && !t.back);
  const settingChildren = settings.filter(t => t !== settingRoot);
  return <div className={cn('mt-auto border-t border-border pt-md pb-md', collapsed ? 'px-xs' : 'px-sm')}>
    {(settingRoot || settingChildren.length > 0) && <section className="mb-4" aria-labelledby={`${idPrefix}-system-label`}>
      {!collapsed && <h2 id={`${idPrefix}-system-label`} className="px-md pb-2 text-[11px] font-semibold tracking-[.12em] text-text-muted">SYSTEM</h2>}
      {settingRoot && <SidebarItem tab={{ ...settingRoot, label: 'Settings' }} here={here} collapsed={collapsed} onSelect={onSelect} testId={`${idPrefix}-settings`} />}
      {settingChildren.length > 0 && <nav aria-label="Settings pages" className={cn('mt-1 space-y-1', collapsed && 'flex flex-col items-center')}>
        {settingChildren.map(tab => <SidebarItem key={`${tab.view}-${tab.path}`} tab={tab} here={here} collapsed={collapsed} onSelect={onSelect} testId={`${idPrefix}-setting-${tab.view}`} />)}
      </nav>}
    </section>}
    <section className="mb-4" aria-labelledby={`${idPrefix}-support-label`}>
      {!collapsed && <h2 id={`${idPrefix}-support-label`} className="px-md pb-2 text-[11px] font-semibold tracking-[.12em] text-text-muted">SUPPORT</h2>}
      <button type="button" data-testid={`${idPrefix}-help`} onClick={onHelp} aria-label={collapsed ? 'Help & Support' : undefined} title={collapsed ? 'Help & Support' : undefined}
        className={cn('flex min-h-11 w-full items-center rounded-md text-sm text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:shadow-focus',
          collapsed ? 'justify-center px-0' : 'gap-sm px-md')}>
        <CircleHelp aria-hidden="true" className="size-[17px] shrink-0" />{!collapsed && 'Help & Support'}
      </button>
    </section>
    <section aria-label="User area" className={cn('border-t border-border pt-md', collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1')}>
      <div className={cn('flex min-h-11 items-center', collapsed ? 'flex-col gap-1' : 'gap-xs')}>
        {profilePath && <NavLink to={profilePath} testId={`${idPrefix}-profile-link`} onClick={onSelect} aria-current={here.split('?')[0] === profilePath ? 'page' : undefined}
          aria-label={collapsed ? `Profile: ${account.name}` : undefined} title={collapsed ? account.name : undefined}
          className={cn('flex min-h-11 min-w-0 flex-1 items-center rounded-md text-sm text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:shadow-focus',
            collapsed ? 'w-11 flex-none justify-center px-0' : 'gap-sm px-md', here.split('?')[0] === profilePath && 'bg-brand-subtle font-semibold text-brand')}>
          <UserRound aria-hidden="true" className="size-[17px] shrink-0" />
          {!collapsed && <span className="min-w-0"><span className="block truncate font-medium text-text-primary">{account.name}</span><span className="block truncate text-xs text-text-muted">Profile / Account</span></span>}
        </NavLink>}
        <AccountMenu account={account} viewingAs={viewingAs} canViewAs={canViewAs} onSignOut={onSignOut} onViewAs={onViewAs} onEndViewAs={onEndViewAs}
          testId={idPrefix === 'sidebar' ? tid.shell.account : `${idPrefix}-account`}
          side="top" align={idPrefix === 'sidebar' ? 'start' : 'end'} />
      </div>
      {!collapsed && <span className="block px-md text-xs text-text-muted">{roleLabel}</span>}
    </section>
  </div>;
}

function SideNavigation({ sections, homeTab, profilePath, here, account, roleLabel, viewingAs, canViewAs, onSignOut, onViewAs, onEndViewAs, collapsed, onToggle, onHelp }: {
  sections: SidebarSection[]; homeTab: NavTab | undefined; profilePath?: string; here: string; account: MenuAccount; roleLabel: string;
  viewingAs: string | null; canViewAs: boolean; onSignOut(): void; onViewAs(personCode: string): void; onEndViewAs(): void;
  collapsed: boolean; onToggle(): void; onHelp(): void;
}) {
  const settings = sections.find(s => s.key === 'system')?.tabs ?? [];
  return (
    <aside aria-label="Workspace" data-testid="shell-sidebar" data-collapsed={collapsed} className="sticky top-0 hidden h-dvh min-h-0 flex-col border-r border-border bg-surface-card lg:flex">
      <div className={cn('flex items-center pt-7 pb-6', collapsed ? 'flex-col gap-sm px-xs' : 'justify-between px-xl')}>
        <NavLink to={homeTab?.path ?? '/'} testId="shell-sidebar-home" aria-label="Go to Home" className="flex min-w-0 items-center justify-center">
          <Logo className={collapsed ? 'h-6' : 'h-10'} />
        </NavLink>
        <button type="button" data-testid="shell-sidebar-toggle" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed} onClick={onToggle} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="grid size-11 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:shadow-focus">
          {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-[18px]" /> : <PanelLeftClose aria-hidden="true" className="size-[18px]" />}
        </button>
      </div>
      <nav aria-label="Main navigation" className={cn('min-h-0 flex-1 overflow-y-auto', collapsed ? 'px-xs' : 'px-sm')}>
        {homeTab && <div className="mb-6"><SidebarItem tab={{ ...homeTab, label: 'Home' }} here={here} collapsed={collapsed} testId="sidebar-home" /></div>}
        <SidebarSections sections={sections} here={here} collapsed={collapsed} idPrefix="sidebar" />
      </nav>
      <SidebarFooter settings={settings} profilePath={profilePath} account={account} roleLabel={roleLabel} viewingAs={viewingAs} canViewAs={canViewAs}
        onSignOut={onSignOut} onViewAs={onViewAs} onEndViewAs={onEndViewAs}
        collapsed={collapsed} here={here} onHelp={onHelp} idPrefix="sidebar" />
    </aside>);
}

function MobileNavigation({ homeTab, sections, profilePath, here, account, roleLabel, viewingAs, canViewAs, onHelp, onSignOut, onViewAs, onEndViewAs }: {
  homeTab: NavTab | undefined; sections: SidebarSection[]; profilePath?: string; here: string; account: MenuAccount; roleLabel: string;
  viewingAs: string | null; canViewAs: boolean; onHelp(): void; onSignOut(): void; onViewAs(personCode: string): void; onEndViewAs(): void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" data-testid="shell-mobile-navigation" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-subtle focus-visible:shadow-focus lg:hidden">
      <Menu aria-hidden="true" className="size-5" />
    </button>
    <Modal open={open} onOpenChange={setOpen} title="Navigation">
      <div className="max-h-[min(68dvh,600px)] overflow-y-auto pr-xs">
        {homeTab && <div className="mb-6"><SidebarItem tab={{ ...homeTab, label: 'Home' }} here={here} onSelect={() => setOpen(false)} testId="mobile-nav-home" /></div>}
        <SidebarSections sections={sections} here={here} onSelect={() => setOpen(false)} idPrefix="mobile-navigation" />
        <SidebarFooter settings={sections.find(s => s.key === 'system')?.tabs ?? []} profilePath={profilePath} account={account}
          roleLabel={roleLabel} viewingAs={viewingAs} canViewAs={canViewAs}
          onSignOut={() => { setOpen(false); onSignOut(); }} onViewAs={code => { setOpen(false); onViewAs(code); }}
          onEndViewAs={() => { setOpen(false); onEndViewAs(); }}
          collapsed={false} here={here} onSelect={() => setOpen(false)} onHelp={() => { setOpen(false); onHelp(); }} idPrefix="mobile-navigation" />
      </div>
    </Modal>
  </>;
}

function HelpDialog({ open, onOpenChange, view }: { open: boolean; onOpenChange(open: boolean): void; view?: string }) {
  const guide = view ? GUIDES[view] : undefined;
  return <Modal open={open} onOpenChange={onOpenChange} title="Help & Support">
    <div className="space-y-md text-sm text-text-secondary">
      {guide ? <>
        <p className="font-medium text-text-primary">{guide.title}</p>
        {guide.sections.map(([heading, body]) => <section key={heading}>
          <h3 className="mb-xs font-semibold text-text-primary">{heading}</h3>
          <p className="leading-relaxed">{body}</p>
        </section>)}
      </> : <p>For guidance on a page, open its help button. For account access or organisation-specific support, contact your calm.ly administrator.</p>}
    </div>
  </Modal>;
}

/* The prototype's bottom bar glyphs (TAB_GLYPH, v15:10648-10653). The two
   that are emoji code points (a sun, a warning sign) come from the shared
   icon set instead, at the same 14px. Anything unlisted takes the dot. */
const GLYPH: Record<string, ReactNode> = {
  home: '⌂', ts: '◷', shifts: '▦', leave: <Sun />, hours: '◴', profile: '○', docs: '▤', onb: '◱', notices: '⚑', tnotices: '⚑',
  thome: '⌂', tteam: '◷', thours: '◴', trota: '▦', tcover: '◈', tleave: <Sun />, tsick: '⊕', tpeople: '○', tonb: '◱', texc: <TriangleAlert />,
  tshifts: '▥', tpat: '▧',
};
const BAR_ITEM = 'flex min-h-[52px] min-w-0 flex-1 flex-col items-center gap-[3px] px-[2px] pt-[9px] pb-[10px] text-xs leading-[1.25] font-semibold';
const barGlyph = (g: ReactNode) => <span aria-hidden="true" className="text-sm leading-none [&_svg]:size-[14px]">{g}</span>;
/* The first word of a tab's name, as the prototype shows it; the link's
   accessible name stays the whole name. */
const shortLabel = (label: string) => label.split(' ')[0] ?? label;

/* .btabs (v15:796-817): fixed to the foot of a phone screen above the page
   (80) and below any sheet (100+), the home-indicator inset added once, by
   the bar. Each destination is a 52px column: a glyph over a 12px/600 short
   label in muted ink, the one you are on in brand (the accent in dark). At
   most five items: five destinations, or four and More for the rest, from
   the same array the strip uses (v15:10654-10661; `tabs` here is Shell's
   `stripTabs`, so setup already arrives section-scoped with its "back to
   setup" entry first). More is lit while the page on screen is one the bar
   has no room for, and opens the Go to sheet listing every page (GoToSheet):
   a Dialog (Radix traps and restores focus, per Modal.tsx), a sheet from the
   bottom on a phone, closed by choosing a page. */
function BottomBar({ tabs, here }: { tabs: NavTab[]; here: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const overflow = tabs.length > 5;
  const destinations = overflow ? tabs.slice(0, 4) : tabs;
  const remaining = overflow ? tabs.slice(4) : [];
  if (!destinations.length) return null;
  const on = (active: boolean) => active ? 'text-brand dark:text-brand-accent' : 'text-text-muted';
  return (
    <nav aria-label="Quick pages" className="fixed inset-x-0 bottom-0 z-[80] flex border-t bg-surface-card pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      {destinations.map(t => <NavLink key={t.view} to={t.path} testId={tid.nav.bottom(t.view)} aria-label={t.label}
        aria-current={isHere(t, here) ? 'page' : undefined} className={cn(BAR_ITEM, on(isHere(t, here)))}>
        {barGlyph(GLYPH[t.view] ?? '●')}<span className="max-w-full truncate">{shortLabel(t.label)}</span></NavLink>)}
      {remaining.length > 0 && <>
        <button type="button" data-testid={tid.nav.more} aria-haspopup="dialog" aria-label="More sections" onClick={() => setMoreOpen(true)}
          className={cn(BAR_ITEM, on(remaining.some(t => isHere(t, here))))}>{barGlyph('⋯')}<span>More</span></button>
        <GoToSheet tabs={tabs} here={here} open={moreOpen} onOpenChange={setMoreOpen} />
      </>}
    </nav>);
}

/* The prototype's more-tabs sheet (v15:12072-12080): "Go to", every page of
   the strip in its order, one .att row each (the name, then on the right
   Current for the page you are on, Open for the rest). Choosing one goes
   there and closes the sheet. */
function GoToSheet({ tabs, here, open, onOpenChange }: { tabs: NavTab[]; here: string; open: boolean; onOpenChange(o: boolean): void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Go to">
      <ul data-testid={tid.nav.goToList} className="overflow-hidden rounded-card border bg-surface-card">
        {tabs.map(t => {
          const current = isHere(t, here);
          return (
            <li key={t.view} className="flex items-center gap-md border-b px-md py-[10px] text-sm last:border-b-0">
              <span className="min-w-0">{t.label}</span>
              <NavLink to={t.path} testId={tid.nav.goTo(t.view)} onClick={() => onOpenChange(false)}
                aria-current={current ? 'page' : undefined} aria-label={current ? `Current: ${t.label}` : `Open ${t.label}`}
                className={cn(buttonVariants({ variant: current ? 'secondary' : 'ghost', size: 'sm' }), 'ml-auto shrink-0')}>
                {current ? 'Current' : 'Open'}</NavLink>
            </li>);
        })}
      </ul>
    </Modal>);
}
