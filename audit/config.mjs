/**
 * Shared config for the audit pipeline. The single config file is site.json
 * at the repo root — every other script reads defaults from here, so a new
 * site instance needs only site.json (+ audit/pages.json), no code changes.
 *
 * site.json fields (name + domain required, or baseUrl):
 *   name           Display name of the audited site (default: repo name)
 *   domain         Audited domain, e.g. "example.com"
 *   baseUrl        Base URL for relative pages.json entries (default: https://<domain>)
 *   pagesFile      Page list file, relative to repo root (default: audit/pages.json)
 *   siteName       Name shown on the report site (default: name)
 *   canonicalSiteUrl  Published dashboard URL (default: GitHub Pages URL)
 *
 * Repo identity is derived at runtime (GITHUB_REPOSITORY env in CI,
 * `git remote get-url origin` locally) — never hardcoded, so any
 * owner/repo clone works unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// "owner/repo" from CI env, else from the origin remote, else null.
function repoSlug(env, root) {
  if (env.GITHUB_REPOSITORY) return env.GITHUB_REPOSITORY;
  try {
    const url = execSync('git remote get-url origin', {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    const m = url.match(/:([^/]+\/[^/]+?)(?:\.git)?$/);
    if (m) return m[1];
  } catch {}
  return null;
}

export function loadConfig({ root = ROOT, env = process.env } = {}) {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(path.join(root, 'site.json'), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(`config: cannot parse site.json: ${err.message}`);
    }
  }

  const repo = repoSlug(env, root);
  const name = raw.name || (repo ? repo.split('/')[1] : null);
  const domain = raw.domain || null;
  const baseUrl = raw.baseUrl || (domain ? `https://${domain}` : null);

  if (!name || !baseUrl) {
    throw new Error(
      'config: site.json at the repo root must set "name" and "domain" (or "baseUrl"). ' +
        'Example: { "name": "My Site", "domain": "example.com" }',
    );
  }

  const [owner, namePart] = repo ? repo.split('/') : [null, null];
  return {
    name,
    slug: raw.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    domain: domain || new URL(baseUrl).hostname,
    baseUrl,
    pagesFile: path.join(root, raw.pagesFile || 'audit/pages.json'),
    siteName: raw.siteName || name,
    canonicalSiteUrl:
      raw.canonicalSiteUrl ||
      (owner && namePart
        ? `https://${owner.toLowerCase()}.github.io/${namePart.toLowerCase()}/`
        : baseUrl),
    repoSlug: repo,
    repoUrl: repo ? `https://github.com/${repo}` : null,
    rawReportsUrl: repo ? `https://github.com/${repo}/tree/main/reports` : null,
  };
}

// Import-time load for the scripts (axe-audit, build-site, discover-pages).
// A missing/broken config is a hard error — there is deliberately NO
// hardcoded fallback site: a generic tool must fail loudly, not audit
// someone else's website by accident.
let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
export default config;
