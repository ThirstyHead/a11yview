// Page-list resolution: CLI args > audit/pages.json (baseUrl from the file,
// falling back to the configured site baseUrl). Pure + fs-injected for tests.
import fs from 'node:fs';

function resolvePageUrl(raw, baseUrl) {
  const p = String(raw).trim();
  if (/^https?:\/\//i.test(p)) return p;
  if (!baseUrl) throw new Error(`resolvePageUrl: no baseUrl to resolve relative path "${p}"`);
  const base = baseUrl.replace(/\/+$/, '');
  if (p.startsWith('/')) return `${base}${p}`;
  return `${base}/${p}`;
}

export function loadTargetUrls(cliArgs, { pagesFile, baseUrl } = {}) {
  if (cliArgs.length) return cliArgs.map(String);
  if (!pagesFile) return null;

  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));
  } catch {
    console.warn(`⚠️  Could not read ${pagesFile}`);
    return null;
  }

  const pages = Array.isArray(data.pages) ? data.pages : [];
  const effectiveBaseUrl = data.baseUrl || baseUrl || null;
  const seen = new Set();
  const urls = [];
  for (const raw of pages) {
    const p = typeof raw === 'string' ? raw : (raw?.url || raw?.path);
    if (!p) continue;
    const u = resolvePageUrl(p, effectiveBaseUrl);
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls.length ? urls : null;
}
