# a11yview

Track the WCAG 2.1 AA accessibility of any website with almost zero effort:
clone this repo, point `site.json` at your site, done. Every run — from your
workstation or from GitHub Actions on a weekly schedule — produces a machine
readable report and a public dashboard, and the results are committed back to
**this same repo** (`reports/` history + `docs/` dashboard served by
GitHub Pages).

Built on [axe-core](https://github.com/dequelabs/axe-core) (Deque) +
[Playwright](https://playwright.dev). Automated tooling detects only a subset
of accessibility failures and does not replace manual or assistive-technology
testing.

## Quick start

### 1. Point it at your site

Edit `site.json` at the repo root — `name` + `domain` are the only required fields:

```json
{
  "name": "My Site",
  "domain": "example.com"
}
```

Optional fields:

| Field            | Meaning                                                    | Default                          |
|------------------|------------------------------------------------------------|----------------------------------|
| `baseUrl`        | Base URL for relative page paths                           | `https://<domain>`               |
| `pagesFile`      | Page list file (relative to repo root)                     | `audit/pages.json`               |
| `siteName`       | Name shown on the dashboard                                | `name`                           |
| `canonicalSiteUrl` | Published dashboard URL (shown in the footer)            | your repo's GitHub Pages URL     |

### 2. Pick the pages to audit

Edit `audit/pages.json` — each entry is a path (resolved against `baseUrl`),
a full URL, or `{ "path" | "url" }`:

```json
{
  "baseUrl": "https://example.com",
  "pages": ["/", "/about/", "/contact/"]
}
```

To generate a starting list automatically (crawls the homepage's links and
verifies each returns HTTP 200 — **review and trim the output before
committing**; it is a candidate list, not a curated scope):

```bash
node audit/discover-pages.mjs              # writes audit/pages.json.candidates
node audit/discover-pages.mjs --limit 25 --force --out audit/pages.json
```

### 3. Run an audit (local CLI)

```bash
npm ci
npx playwright install chromium            # --with-deps on Linux
npm run audit                              # audits every page in audit/pages.json
node audit/axe-audit.mjs https://example.com/specific-page   # audit specific URLs
```

Artifacts land in `audit/reports/` (gitignored): `axe-<timestamp>.json` (machine
readable summary for all pages) and `pages/<slug>.html` (standalone per-page
axe report). Exit code is 0 even when pages are blocked — check the summary
output.

### 4. Publish (GitHub Actions — fully cloud)

Results live in this repo, so no secrets are needed:

- **Weekly:** the workflow `.github/workflows/wcag-audit.yml` runs Mondays
  06:00 UTC (or any time via the Actions tab → *WCAG audit* → *Run workflow*).
- It audits, then commits the new report to `reports/`, rebuilds the dashboard
  into `docs/`, and pushes to `main` using the built-in `GITHUB_TOKEN`
  (the workflow sets `permissions: contents: write`). If the site blocks every
  page (WAF/404), the run logs a warning and skips publishing so the last good
  report stays live.
- **One-time Pages setup:** Settings → Pages → *Build and deployment* → Source:
  *Deploy from a branch* → Branch `main`, folder `/docs`. If you have a custom
  domain, keep/restore the `CNAME` file at the repo root (e.g. `a11yview.com`).
- The dashboard then lives at `https://<owner>.github.io/<repo>/` (or your
  custom domain). `reports/*.json` are browsable at
  `https://github.com/<owner>/<repo>/tree/main/reports`.

### Local publish (optional)

After a local `npm run audit`, replicate what the workflow does:

```bash
LATEST=$(ls -t audit/reports/axe-*.json | head -n 1)
cp "$LATEST" reports/
node site/build-site.mjs --report "$LATEST" --history-dir reports --out docs --pages-dir "${LATEST%/*}/pages"
git add reports docs && git commit -m "audit: $(date -u +%Y-%m-%d) local run" && git push
```

## What's in the repo

```
site.json                       the one config file
audit/pages.json                curated page scope
audit/config.mjs                config loader (single source of truth)
audit/axe-audit.mjs             Playwright + axe-core runner
audit/discover-pages.mjs        page-scope discovery aid (200-verified)
audit/reports/                  local run artifacts (gitignored)
site/build-site.mjs             zero-dep static dashboard builder
reports/                        committed report history (one axe-*.json per run)
docs/                           committed dashboard site (GitHub Pages root)
tests/                          node:test unit tests (no extra dependencies)
```

## Development

```bash
npm run audit                 # run the audit (the tool's own entry point)
node --test "tests/*.test.mjs"   # unit tests for config/target/slug/site-building
```

Pages that return non-2xx status codes (WAF 403s, 404s, 5xx) are recorded as
*blocked* in the report and shown as "Coverage caveats" on the dashboard instead
of being silently audited as error pages.
