# a11yview

Track the WCAG 2.1 AA accessibility of any website with almost zero effort:
get this repo, point `site.json` at your site, done. Every run — from your
workstation or from GitHub Actions on whatever schedule you pick — produces a
machine-readable report and a public dashboard, and the results are committed
back to **the same repo** you're running it in (`reports/` history + `docs/`
dashboard served by GitHub Pages). No separate "results" repo, no tokens to
generate.

Built on [axe-core](https://github.com/dequelabs/axe-core) (Deque) +
[Playwright](https://playwright.dev). Automated tooling detects only a subset
of accessibility failures and does not replace manual or assistive-technology
testing.

---

## Quick start — run it locally for any website

### 0. Get the code

Pick whichever matches your goal:

```bash
# I want to track MY OWN site: fork this repo on GitHub, then clone the fork.
# (Forking is what makes it "self-publish to my own repo" — see step 4.)
git clone https://github.com/<YOU>/a11yview.git
cd a11yview

# Or just try it locally without forking:
git clone https://github.com/ThirstyHead/a11yview.git
cd a11yview
```

### 1. Point it at your site

Edit `site.json` at the repo root — `name` + `domain` are the only required
fields:

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

If you omit `canonicalSiteUrl` it defaults to your repo's GitHub Pages URL
(`https://<owner>.github.io/<repo>/`) — you usually don't need to set it.

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

### 3. Install + run an audit (local CLI)

```bash
npm ci
npx playwright install chromium            # add --with-deps on Linux
npm run audit                              # audits every page in audit/pages.json
node audit/axe-audit.mjs https://example.com/specific-page   # audit specific URLs
```

Artifacts land in `audit/reports/` (gitignored): `axe-<timestamp>.json`
(machine-readable summary for all pages) and `pages/<slug>.html` (standalone
per-page axe report). Exit code is 0 even when pages are blocked — check the
summary output, which lists each page as audited or *blocked*.

### 3b. (Optional) Publish locally, exactly like the workflow does

```bash
LATEST=$(ls -t audit/reports/axe-*.json | head -n 1)
cp "$LATEST" reports/
node site/build-site.mjs \
  --report "$LATEST" \
  --history-dir reports \
  --out docs \
  --pages-dir "${LATEST%/*}/pages"
git add reports docs && git commit -m "audit: $(date -u +%Y-%m-%d) local run" && git push
```

---

## Automate it — GitHub Actions on your schedule, self-publishing

The workflow `.github/workflows/wcag-audit.yml` is already in the repo and
needs **no secrets**. Because the results are committed to the repo you're
running it in, the built-in `GITHUB_TOKEN` (the workflow sets
`permissions: contents: write`) pushes them. So:

- **If you forked this repo**, the workflow automatically audits *your* site
  and self-publishes the report + dashboard **to your fork** — nothing extra to
  configure. On a fork, GitHub won't run workflows until you open your fork's
  **Actions** tab once and click *"I understand my code, I want to run these
  workflows."*
- **If you made your own repo** using this as a template/base, the same
  workflow self-publishes to that repo.

### Set the schedule you want

Edit the `cron:` line at the top of `.github/workflows/wcag-audit.yml`. It's a
standard 5-field cron expression, **evaluated in UTC**:

```yaml
on:
  schedule:
    - cron: "0 6 * * 1"    # current default: Mondays 06:00 UTC
  workflow_dispatch:        # always also allows a manual "Run workflow" click
```

Examples:

| `cron`           | Meaning                                   |
|------------------|-------------------------------------------|
| `0 6 * * 1`      | Mondays 06:00 UTC (default)               |
| `0 0 * * 0`      | Sundays 00:00 UTC                         |
| `0 9 * * 1`      | Mondays 09:00 UTC                         |
| `0 6 * * *`      | Every day 06:00 UTC                       |
| `0 */12 * * *`   | Every 12 hours                            |

Tip: paste any expression into <https://crontab.guru> to read it in plain
English before committing. (GitHub's scheduled cron can be delayed during peak
load — fine for a weekly audit; use the Actions tab to trigger instantly.)

Each scheduled run audits every page in `audit/pages.json`, commits the new
report to `reports/`, rebuilds the dashboard into `docs/`, and pushes to
`main`. If the site blocks *every* page (WAF/404/captcha wall), the run logs a
warning and **skips publishing** so the last good report stays live.

### Publish the dashboard via GitHub Pages (one-time, on your repo)

On **your** repo (the fork, not this one):

1. **Settings → Pages → Build and deployment → Source:** *Deploy from a
   branch* → Branch `main`, folder `/docs`.
2. **Custom domain (optional):**
   - *No custom domain?* Do nothing — the dashboard is live at
     `https://<owner>.github.io/<repo>/`.
   - *Have a custom domain?* Put a `CNAME` file **in `docs/`** (next to
     `docs/index.html`) containing only your domain, e.g. `mydomain.com`, and
     point a `CNAME` DNS record at `ghs.<ip>` as usual. Delete the stock
     `a11yview.com` value first — that's *this* repo's domain, not yours.
     Set `canonicalSiteUrl` in `site.json` to your domain too.

> The CNAME belongs in `docs/` because that folder is the published site root
> when the Pages source is `/docs`. A CNAME at the repo root is ignored.

`reports/*.json` are always browsable at
`https://github.com/<owner>/<repo>/tree/main/reports`.

---

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
docs/.nojekyll                  tells Pages to serve docs/ byte-for-byte
docs/CNAME                      custom domain (docs/ is the published root)
tests/                          node:test unit tests (no extra dependencies)
```

## Development

```bash
npm run audit                 # run the audit (the tool's own entry point)
npm test                      # unit tests (node:test, no extra dependencies)
```

Pages that return non-2xx status codes (WAF 403s, 404s, 5xx) are recorded as
*blocked* in the report and shown as "Coverage caveats" on the dashboard
instead of being silently audited as error pages.
