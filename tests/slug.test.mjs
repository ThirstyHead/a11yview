import test from 'node:test';
import assert from 'node:assert/strict';
import { slugFor } from '../audit/slug.mjs';

test('strips slashes, dots, query strings -> dash slug', () => {
  assert.equal(slugFor('https://example.com/about/team.html'), 'about-team');
});

test('home page and bare path -> "home"', () => {
  assert.equal(slugFor('https://example.com/'), 'home');
  assert.equal(slugFor('https://example.com'), 'home');
});

test('underscore/space runs collapse to single dash', () => {
  assert.equal(slugFor('https://example.com/a/b_c/d e/'), 'a-b-c-d-e');
});
