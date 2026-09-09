// Testable config loading: loadConfig({root, env}) resolves site.json from a
// caller-supplied directory so tests never touch the real repo config.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../audit/config.mjs';

function tmpSite(doc) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  fs.writeFileSync(path.join(dir, 'site.json'), JSON.stringify(doc));
  return dir;
}

test('defaults: domain -> https baseUrl, name slug, siteName = name', () => {
  const dir = tmpSite({ name: 'Example Co', domain: 'example.com' });
  const c = loadConfig({ root: dir, env: {} });
  assert.equal(c.baseUrl, 'https://example.com');
  assert.equal(c.domain, 'example.com');
  assert.equal(c.slug, 'example-co');
  assert.equal(c.siteName, 'Example Co');
});

test('explicit baseUrl wins over domain', () => {
  const dir = tmpSite({ name: 'X', domain: 'example.com', baseUrl: 'https://staging.example.com' });
  assert.equal(loadConfig({ root: dir, env: {} }).baseUrl, 'https://staging.example.com');
});

test('repo identity derived from GITHUB_REPOSITORY env (CI)', () => {
  const dir = tmpSite({ name: 'X', domain: 'example.com' });
  const c = loadConfig({ root: dir, env: { GITHUB_REPOSITORY: 'alice/widgets' } });
  assert.equal(c.repoSlug, 'alice/widgets');
  assert.equal(c.repoUrl, 'https://github.com/alice/widgets');
  assert.equal(c.canonicalSiteUrl, 'https://alice.github.io/widgets/');
  assert.equal(c.rawReportsUrl, 'https://github.com/alice/widgets/tree/main/reports');
});

test('throws a helpful error when name/domain/baseUrl are missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-')); // no site.json
  assert.throws(() => loadConfig({ root: dir, env: {} }), /site\.json/);
});

test('malformed site.json throws a parse error, not ENOENT silence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  fs.writeFileSync(path.join(dir, 'site.json'), '{oops');
  assert.throws(() => loadConfig({ root: dir, env: {} }), /cannot parse site\.json/);
});
