import { test, expect } from './support/fixtures';
import { tid } from '../src/testids';

test('NV Manager navigation has calm work, people and insight sections with a role-adaptive Home', async ({ page, signInAs }) => {
  await signInAs('manager');
  const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const section of ['WORK', 'PEOPLE', 'INSIGHTS']) {
    await expect(page.getByRole('navigation', { name: section })).toBeVisible();
  }
  await expect(page.getByTestId('sidebar-home')).toHaveAttribute('href', '/team/thome');
  for (const view of ['tteam', 'trota', 'tleave', 'tpeople']) {
    await expect(mainNav.getByTestId(tid.nav.tab(view))).toBeVisible();
  }
  await expect(page.getByTestId('sidebar-settings')).toHaveCount(0);
  const account = page.getByTestId(tid.shell.account);
  expect(await account.evaluate(node => Boolean(node.closest('[aria-label="User area"]')))).toBe(true);
  await account.click();
  await expect(page.getByTestId(tid.shell.menuAccount)).toContainText('Rachel Hussain');
  await expect(page.getByTestId(tid.shell.signOut)).toBeVisible();
  await page.keyboard.press('Escape');
});

test('NV An admin without personal or team home still lands on a useful Home', async ({ page, signInAs }) => {
  await signInAs('admin');
  await page.goto('/');
  await expect(page.getByTestId(tid.page('home'))).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.getByTestId('sidebar-home')).toHaveAttribute('href', '/');
  await expect(page.getByTestId('home-destination-apeople')).toBeVisible();
  await expect(page.getByTestId('home-destination-asetup')).toBeVisible();
});

test('NV The sidebar transforms into a drawer below desktop widths', async ({ page, signInAs }) => {
  await signInAs('manager');
  for (const width of [768, 1023]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await expect(page.getByTestId('shell-mobile-navigation')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Quick pages' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByTestId('shell-mobile-navigation').click();
  await expect(page.getByRole('dialog').getByRole('navigation', { name: 'WORK' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('navigation', { name: 'PEOPLE' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByTestId('shell-mobile-navigation')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Quick pages' })).toBeHidden();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(page.getByRole('navigation', { name: 'WORK' })).toBeVisible();
  await expect(nav.getByTestId(tid.nav.tab('trota'))).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});

test('NV Sidebar collapses, preserves destinations, and remembers its state', async ({ page, signInAs }) => {
  await signInAs('manager');
  const sidebar = page.getByTestId('shell-sidebar');
  await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  await expect(page.getByTestId('shell-sidebar-home')).toBeVisible();
  const rail = await sidebar.boundingBox();
  const account = await page.getByTestId(tid.shell.account).boundingBox();
  expect(account && rail && account.x >= rail.x && account.x + account.width <= rail.x + rail.width).toBe(true);
  await expect(page.getByTestId(tid.nav.tab('trota'))).toHaveAttribute('aria-label', 'Rota');
  await expect(page.getByTestId(tid.nav.tab('trota'))).toHaveAttribute('title', 'Rota');
  await expect(page.getByTestId(tid.nav.tab('tleave'))).toBeVisible();
  await page.getByTestId(tid.nav.tab('tleave')).click();
  await expect(page.getByTestId(tid.page('tleave'))).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('shell-sidebar')).toHaveAttribute('data-collapsed', 'true');
  await page.getByRole('button', { name: 'Expand navigation' }).click();
  await expect(page.getByTestId('shell-sidebar')).toHaveAttribute('data-collapsed', 'false');
});

test('NV The brand mark returns to the home page on desktop and mobile', async ({ page, signInAs }) => {
  await signInAs('employee');
  await page.getByTestId(tid.nav.tab('leave')).click();
  await page.getByTestId('shell-sidebar-home').click();
  await expect(page.getByTestId(tid.page('home'))).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId(tid.nav.bottom('leave')).click();
  await page.getByTestId('shell-mobile-home').click();
  await expect(page.getByTestId(tid.page('home'))).toBeVisible();
});

test('NV Timesheet has one prominent page title and starts closer to the utility header', async ({ page, signInAs }) => {
  await signInAs('employee');
  await page.getByTestId(tid.nav.tab('ts')).click();
  const title = page.getByRole('heading', { name: 'Timesheet', exact: true });
  await expect(title).toBeVisible();
  await expect(page.locator('header[data-shell-topbar]').getByText('Timesheet')).toHaveCount(0);
  const box = await title.boundingBox();
  expect(box?.y).toBeLessThan(180);
});

test('NV A view from a later sub-project says so and names it', async ({ page, signInAs }) => {
  await signInAs('employee');
  await page.getByTestId(tid.nav.tab('hours')).click();
  await expect(page.getByTestId(tid.notBuilt.subProject)).toHaveText('Payroll and Business Central');
});

/* Shared by every traversal test below: after any navigation, exactly one
   page-<view> container is present, no test id is duplicated anywhere on the
   page, and every button/link/input/select/textarea inside <main> carries
   one. */
const checkCurrentPage = async (page: import('@playwright/test').Page) => {
  await expect(page.locator('[data-testid^="page-"]')).toHaveCount(1);
  const result = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid'));
    const missing = [...document.querySelectorAll('main button, main a[href], main input, main select, main textarea')]
      .filter(e => !e.getAttribute('data-testid')).length;
    return { dup: ids.filter((x, i) => ids.indexOf(x) !== i), missing };
  });
  expect(result).toEqual({ dup: [], missing: 0 });
};

/* Module features remain contextual in the SYSTEM footer; module setup pages
   remain within that drill-in. */
async function walkModules(page: import('@playwright/test').Page, via: 'tab' | 'bottom') {
  const cards = page.locator('main a[data-testid^="amods-card-"]');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  if (via === 'tab') {
    const setupModules = [['TS', 'mts'], ['R', 'mrota'], ['L', 'mleave']] as const;
    for (const [module, view] of setupModules) {
      await page.getByTestId(tid.amods.card(module)).click();
      await checkCurrentPage(page);
      await expect(page.getByTestId('sidebar-setting-mfeat')).toHaveAttribute('aria-current', 'page');
      await page.getByTestId(`sidebar-setting-${view}`).click();
      await checkCurrentPage(page);
      await page.getByTestId('sidebar-setting-amods').click();
      await expect(page.getByTestId(tid.page('amods'))).toBeVisible();
    }
    return;
  }

  const link = tid.nav.bottom;
  const strip = 'nav[aria-label="Quick pages"] > a[data-testid^="nav-bottom-"]';
  for (let c = 0; c < n; c++) {
    await cards.nth(c).click();
    await checkCurrentPage(page);
    const others = page.locator(`${strip}:not([data-testid="${link('amods')}"])`);
    const count = await others.count();
    for (let i = 0; i < count; i++) { await others.nth(i).click(); await checkCurrentPage(page); }
    await page.getByTestId(link('amods')).click(); // "‹ All modules"
    await expect(page.getByTestId(tid.page('amods'))).toBeVisible();
  }
}

/* Module feature/setup destinations remain reachable from the sidebar and
   every module returns to the list without leaving the setup area. */
test('NV Module features and setup remain reachable from the sidebar', async ({ page, signInAs }) => {
  await signInAs('admin');
  await page.getByTestId('sidebar-settings').click();
  await page.getByTestId(tid.setup.card('mods')).click();
  await expect(page.getByTestId(tid.page('amods'))).toBeVisible();
  await walkModules(page, 'tab');
});

/* Visits every page an admin can reach: every page link nested under its
   area, and every setup section card plus each page inside that section.
   Each page it lands on must carry its own page-<view>
   container and full test id coverage: no duplicate test id anywhere on the
   page, and no untagged button/link/input/select/textarea inside <main>. */
test('NV Every page an admin can reach has full test id coverage', async ({ page, signInAs }) => {
  test.setTimeout(60_000);
  await signInAs('admin');

  const stripTab = (excludeTestId?: string) =>
    excludeTestId
      ? `nav[aria-label="Settings pages"] a[data-testid^="sidebar-setting-"]:not([data-testid="${excludeTestId}"])`
      : 'nav[aria-label="Settings pages"] a[data-testid^="sidebar-setting-"]';

  const visitPlainTabs = async (excludeTestId?: string) => {
    const sel = stripTab(excludeTestId);
    const count = await page.locator(sel).count();
    for (let i = 0; i < count; i++) { await page.locator(sel).nth(i).click(); await checkCurrentPage(page); }
  };

  for (const section of ['WORK', 'PEOPLE', 'INSIGHTS']) {
    const links = page.locator(`nav[aria-label="${section}"] a[data-testid^="nav-tab-"]`);
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      await links.nth(i).click();
      await checkCurrentPage(page);
    }
  }
  await page.getByTestId('sidebar-settings').click();
  await checkCurrentPage(page);
  const cardSel = '[data-testid^="setup-card-"]';
  const cardCount = await page.locator(cardSel).count();
  for (let c = 0; c < cardCount; c++) {
    await page.locator(cardSel).nth(c).click();
    await checkCurrentPage(page);
    await visitPlainTabs('sidebar-setting-asetup');
    if (await page.getByTestId(tid.page('amods')).count()) await walkModules(page, 'tab');
    await page.getByTestId('sidebar-settings').click();
    await checkCurrentPage(page);
  }
});

/* Spec §10.3: no horizontal overflow, topbar and bottom-nav touch targets at least 44px. Ported
   from the prototype's phone breakpoint (calm.ly-workforce-v15.html:1552-1582,
   791-818): brand name hidden, the tab strip hidden in favour
   of the bottom bar, everything on one line that fits. */
test('NV At 390px the header and bottom bar fit with no horizontal overflow and 44px touch targets', async ({ page, signInAs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs('admin');

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);

  const heights = await page.evaluate(() => {
    const els = [...document.querySelectorAll('header[data-shell-topbar] button, header[data-shell-topbar] a[href], nav[aria-label="Quick pages"] button, nav[aria-label="Quick pages"] a[href]')]
      .filter(e => (e as HTMLElement).offsetParent !== null); // visible only
    return els.map(e => e.getBoundingClientRect().height);
  });
  expect(heights.length).toBeGreaterThan(0);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
});

/* Mobile uses the same global IA in a drawer, not a separate area switcher. */
test('NV At phone width the drawer preserves role-aware navigation and footer destinations', async ({ page, signInAs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const persona of ['admin', 'manager'] as const) {
    await signInAs(persona);
    await page.getByTestId('shell-mobile-navigation').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('navigation', { name: 'PEOPLE' })).toBeVisible();
    await expect(drawer.getByTestId('mobile-navigation-help')).toBeVisible();
    const navigationTargets = await drawer.locator('[data-testid^="mobile-nav-"], [data-testid^="mobile-navigation-"]').evaluateAll(
      elements => elements.map(element => element.getBoundingClientRect().height),
    );
    expect(navigationTargets.length).toBeGreaterThan(0);
    expect(navigationTargets.filter(height => height < 44)).toEqual([]);
    await expect(drawer.getByTestId('mobile-navigation-settings')).toHaveCount(persona === 'admin' ? 1 : 0);
    if (persona === 'manager') {
      await expect(drawer.getByRole('navigation', { name: 'WORK' })).toBeVisible();
      await expect(drawer.getByTestId('mobile-navigation-profile-link')).toBeVisible();
    } else {
      await expect(drawer.getByRole('navigation', { name: 'WORK' })).toHaveCount(0);
      await expect(drawer.getByTestId('mobile-navigation-account')).toHaveAccessibleName('Account: Dee Fitzgerald');
    }
    await expect(drawer.getByTestId('mobile-navigation-account')).toBeVisible();
    if (persona === 'admin') {
      await drawer.getByTestId('mobile-navigation-settings').click();
      await expect(drawer).toHaveCount(0);
      await expect(page.getByTestId(tid.page('asetup'))).toBeVisible();
    } else {
      await drawer.getByTestId('mobile-navigation-profile-link').click();
      await expect(drawer).toHaveCount(0);
      await expect(page.getByTestId(tid.page('profile'))).toBeVisible();
    }
  }
});
