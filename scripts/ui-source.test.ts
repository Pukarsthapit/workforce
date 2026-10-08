// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

/* Rules from the prototype suite that are about the source as a whole, not
   one screen: each test names the suite rows it ports. */
const SRC = resolve(__dirname, '../src');
const files = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : [p];
});
const product = files(SRC).filter(f => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes(`${join('src', 'test')}`));
const rel = (f: string) => relative(resolve(__dirname, '..'), f).replace(/\\/g, '/');

/* Native titles are reserved for disabled-control explanations and collapsed
   sidebar controls, whose visible labels are hidden but remain aria-labeled. */
const TITLED = new Set(['Button', 'NavLink']);
test('native titles are limited to disabled-control explanations and collapsed navigation labels', () => {
  const bad: string[] = [];
  for (const f of product.filter(x => x.endsWith('.tsx'))) {
    const text = readFileSync(f, 'utf8');
    const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n: ts.Node) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = n.tagName.getText(sf);
        const attrs = n.attributes.properties.filter(ts.isJsxAttribute);
        const named = (a: string) => attrs.find(x => x.name.getText(sf) === a);
        if ((/^[a-z]/.test(tag) || TITLED.has(tag)) && named('title') && !named('disabled')) {
          const testId = named('data-testid')?.initializer?.getText(sf) ?? named('testId')?.initializer?.getText(sf) ?? '';
          const collapsedNavLabel = rel(f) === 'src/shell/Shell.tsx' &&
            (testId.includes('testId') || testId.includes('idPrefix') || testId.includes('shell-sidebar-toggle'));
          if (!collapsedNavLabel)
            bad.push(`${rel(f)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1} <${tag}>`);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  expect(bad).toEqual([]);
});

/* MOBILE FOUNDATION: "One helper decides what counts as a phone". Only
   useNarrow asks the browser about the phone breakpoint; anything that only
   restyles uses max-md:. */
test('one helper decides what counts as a phone', () => {
  const asking = product.filter(f => /matchMedia\s*\(/.test(readFileSync(f, 'utf8'))).map(rel);
  expect(asking).toEqual(['src/ui/useNarrow.ts']);
  expect(readFileSync(resolve(SRC, 'ui/useNarrow.ts'), 'utf8')).toContain("'(max-width: 767px)'");
});

/* HEADER PILLS REMOVED: "The \"applies immediately\" pill is gone from page
   headers" and "It is gone from every admin page, not just this one". */
test('no page carries an "Applies immediately" pill', () => {
  expect(product.filter(f => /Applies immediately/i.test(readFileSync(f, 'utf8'))).map(rel)).toEqual([]);
});
