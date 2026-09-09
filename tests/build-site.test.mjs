// Smoke test: run the real build-site.mjs (zero-dep, no browser) against a
// synthetic two-run history and check the emitted dashboard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'site', 'build-site.mjs');

function makeReport(stamp, url, title, violations, pagesHtml) {
  const v = violations.map(([id, impact, nodes, help]) => ({ id, impact, help, helpUrl: 'https://dequeuniversity.com/rules/axe/4/' + id, wcag: ['wcag21aa'], nodes, firstTargets: ['a[target]'] }));
  return JSON.stringify({
    generated: `${stamp}T06:00:00.000Z`,
    tags: ['wcag2a', 'wcag2aa'],
    pages: [{ url, title, finalUrl: url, slug: 'home', violations: v, violationTotal: v.reduce((n, x) => n + x.nodes, 0), incomplete: [] }],
    pagesHtml,
  });
}

test('builds a working dashboard with no "undefined" in the output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-'));
  const hist = path.join(dir, 'reports');
  fs.mkdirSync(hist);
  fs.writeFileSync(
    path.join(hist, 'axe-2026-09-01T06-00-00-000Z.json'),
    makeReport('2026-09-01', 'https://thirstyhead.com/', 'ThirstyHead', [['image-alt', 'serious', 3, 'Images must have alternate text']], {}),
  );
  fs.writeFileSync(
    path.join(hist, 'axe-2026-09-08T06-00-00-000Z.json'),
    makeReport('2026-09-08', 'https://thirstyhead.com/', 'ThirstyHead', [['color-contrast', 'moderate', 1, 'Elements must have sufficient color contrast']], { 'https://thirstyhead.com/': 'pages/home.html' }),
  );

  const out = path.join(dir, 'docs');
  execFileSync('node', [BUILD, '--report', path.join(hist, 'axe-2026-09-08T06-00-00-000Z.json'), '--history-dir', hist, '--out', out], { cwd: ROOT, stdio: 'pipe' });

  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  // Site branding comes from the repo's site.json (ThirstyHead — the audited site) — proves config flow.
  assert.match(html, /<title>WCAG 2\.1 AA Audit — ThirstyHead \(https:\/\/thirstyhead\.com\)<\/title>/);
  // No dangling config keys rendered into the page.
  assert.doesNotMatch(html, />undefined</);
  // Two-run history: trend chart present, delta shown.
  assert.match(html, /<svg[^>]*class="spark"/);
  // Node counts: run 1 = 3, run 2 = 1 → delta = 1 − 3 = −2 → green "▼ 2".
  assert.match(html, /▼ 2 vs last run/);
  assert.match(html, /<a class="pgrep" href="pages\/home\.html">Audit report<\/a>/);
  const latest = JSON.parse(fs.readFileSync(path.join(out, 'latest.json'), 'utf8'));
  assert.equal(latest.report.pages[0].violationTotal, 1);
  const history = JSON.parse(fs.readFileSync(path.join(out, 'history.json'), 'utf8'));
  assert.equal(history.series.length, 2);
});
