import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocs, slugify } from '../scripts/render-docs.mjs';
import { highlight } from '../scripts/lib/highlight.mjs';

const { files, problems, pages, sections, index } = buildDocs();

test('modding docs build with no broken links, missing fields or unknown pages', () => {
  assert.deepEqual(problems, []);
  assert.ok(pages.length > 50, 'expected the full set of modding pages');
});

test('every planned section has pages, and every page has a home in the sidebar', () => {
  for (const section of sections) assert.ok(section.pages.length, `${section.id} has no pages`);
  for (const [path, html] of files) {
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
    assert.match(html, /<meta name="description" content="[^"]+"/, path);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `Duplicate ID in ${path}`);
  }
});

test('in-page links point at headings that exist', () => {
  for (const [path, html] of files) {
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g))
      assert.ok(ids.has(anchor), `${path} links to missing #${anchor}`);
  }
});

test('published pages contain no internal review notes', () => {
  const internal =
    /INBOX-|agents\/luma|PLANS-UNSTARTED|Nebula-L\d|DECISIONS \d|\bB: [FGHJ]\.|State: generated from|contracts\/docs\.md/;
  for (const page of pages) assert.doesNotMatch(page.body, internal, page.key);
});

test('search index covers every page', () => {
  assert.equal(index.length, pages.length);
  for (const entry of index) assert.ok(entry.t && entry.u && entry.d, entry.u);
});

test('anchors and highlighting are stable and safe', () => {
  assert.equal(slugify('Timers and `counters`'), 'timers-and-counters');
  assert.equal(slugify('A mod’s life'), 'a-mod-s-life');
  assert.equal(
    highlight('let x = "<b>" // hi', 'lumascript'),
    '<span class="tk-kw">let</span> x = <span class="tk-st">"&lt;b&gt;"</span> <span class="tk-cm">// hi</span>',
  );
  assert.equal(highlight('<script>', 'unknown'), '&lt;script&gt;');
});
