import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8');
const tokens = readFileSync(resolve(__dirname, 'ui/tokens.css'), 'utf8');
const darkBlockMatch = css.match(/\[data-theme="dark"\]\s*\{[^}]*\}/);
const darkBlock = darkBlockMatch ? darkBlockMatch[0] : '';

test('a [data-theme="dark"] block exists in the theme file', () => {
  expect(darkBlockMatch).not.toBeNull();
});

test('the CALM.LY palette exposes semantic ramps and the requested brand anchors', () => {
  expect(css).not.toContain('@import "../textile-ui-design-tokens.css";');
  expect(css).toMatch(/--color-primary-500:\s*#313A97/);
  expect(css).toMatch(/--color-success-500:\s*#3D683B/);
  expect(css).toMatch(/--color-danger-500:\s*#AE3F37/);
  expect(css).toMatch(/--color-danger-400:\s*#BF7170/);
  expect(css).toMatch(/--color-info-500:\s*#798794/);
  expect(css).toMatch(/--color-neutral-500:\s*#B9AEB2/);
  expect(css).toMatch(/--color-neutral-900:\s*#312C2D/);
  for (const family of ['primary', 'neutral', 'success', 'danger', 'warning', 'info']) {
    for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
      expect(css).toContain(`--color-${family}-${step}:`);
    }
  }
  for (const semantic of ['background', 'surface', 'surface-subtle', 'surface-raised', 'border', 'border-strong', 'text',
    'text-secondary', 'text-muted', 'text-disabled', 'primary', 'primary-hover', 'primary-active', 'success', 'success-subtle',
    'danger', 'danger-subtle', 'warning', 'warning-subtle', 'focus']) {
    expect(css).toContain(`--color-${semantic}:`);
  }
});

test('the product uses the locally bundled Lexend Deca variable font for body and display text', () => {
  expect(css).toContain('@import "@fontsource-variable/lexend-deca/wght.css";');
  expect(tokens).toMatch(/--qp-font-display:\s*"Lexend Deca"/);
  expect(tokens).toMatch(/--qp-font-body:\s*"Lexend Deca"/);
  expect(tokens).not.toContain('"Inter"');
});

test('dark theme uses intentional charcoal surfaces and keeps CALM.LY blue as the primary action', () => {
  expect(darkBlock).toMatch(/--color-background:\s*#11151F/);
  expect(darkBlock).toMatch(/--color-surface:\s*#1A202B/);
  expect(darkBlock).toMatch(/--primary:\s*var\(--color-primary\)/);
  expect(darkBlock).toMatch(/--primary-foreground:\s*#FFFFFF/);
  expect(darkBlock).toMatch(/--ring:\s*var\(--color-primary\)/);
});

test('the dark theme block is declared after :root, so it wins the tie in specificity on <html data-theme="dark">', () => {
  const rootIndex = css.indexOf(':root {');
  const darkIndex = css.indexOf('[data-theme="dark"] {');
  expect(rootIndex).toBeGreaterThanOrEqual(0);
  expect(darkIndex).toBeGreaterThan(rootIndex);
});

test('the @theme block aliases --max-width-{xs..3xl} to the container scale, so max-w-* is not hijacked by the named --spacing-* scale', () => {
  /* Tailwind resolves a named max-w-<key> utility against --max-width-<key>,
     then --spacing-<key>, then --container-<key>. This file also defines
     --spacing-xs/sm/md/lg/xl/2xl/3xl (for p-md, gap-lg, etc.), which share
     their names with Tailwind's built-in container scale; without an explicit
     --max-width-<key> alias, max-w-md (and Modal/Dialog's sm:max-w-lg) would
     silently resolve to the small spacing value instead of a container width.
     See src/index.css's @theme inline block for the fix and full explanation. */
  for (const key of ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']) {
    const re = new RegExp(`--max-width-${key}:\\s*var\\(--container-${key}\\)`);
    expect(css).toMatch(re);
  }
});
