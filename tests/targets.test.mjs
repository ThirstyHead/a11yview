// loadTargetUrls is pure (fs-injected via opts) so it's testable without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadTargetUrls } from '../audit/targets.mjs';

function tmpPages(doc) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pages-')), 'pages.json');
  fs.writeFileSync(file, JSON.stringify(doc));
  return file;
}

test('CLI args win over everything', () => {
  assert.deepEqual(loadTargetUrls(['https://a.example/'], { pagesFile: '/nonexistent', baseUrl: 'https://x.example' }), ['https://a.example/']);
});

test('resolves relative paths against pages.json baseUrl, dedupes, keeps absolute urls', () => {
  const f = tmpPages({ baseUrl: 'https://x.example', pages: ['/', '/a', 'https://other.example/b', '/a?ref=x'] });
  // NOTE: '/a?ref=x' vs '/a' are DIFFERENT URLs (query strings preserved) — dedupe only exact matches.
  assert.deepEqual(loadTargetUrls([], { pagesFile: f, baseUrl: 'https://ignored.example' }), [
    'https://x.example/',
    'https://x.example/a',
    'https://other.example/b',
    'https://x.example/a?ref=x',
  ]);
});

test('object entries {path} and {url} both work', () => {
  const f = tmpPages({ baseUrl: 'https://x.example', pages: [{ path: '/one' }, { url: 'https://two.example/' }] });
  assert.deepEqual(loadTargetUrls([], { pagesFile: f, baseUrl: null }), ['https://x.example/one', 'https://two.example/']);
});

test('empty pages list -> null (caller exits with a helpful error)', () => {
  const f = tmpPages({ baseUrl: 'https://x.example', pages: [] });
  assert.equal(loadTargetUrls([], { pagesFile: f, baseUrl: 'https://x.example' }), null);
  assert.equal(loadTargetUrls([], { pagesFile: '/nonexistent', baseUrl: 'https://x.example' }), null);
});
