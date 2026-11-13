/**
 * Renders the modding docs (content/modding/**.md) into static pages under mods/.
 * Every link between pages is checked; a broken link or missing field stops the build.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked, Renderer } from 'marked';
import { highlight } from './lib/highlight.mjs';

const root = resolve(import.meta.dirname, '..');
const docsDir = resolve(root, 'content/modding');
const outDir = resolve(root, 'mods');
const indexFile = resolve(root, 'public/mods/search-index.json');
const LEVELS = ['essential', 'intermediate', 'advanced'];

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** The anchor rule documented in content/modding/README.md. */
export const slugify = (text) =>
  plainText(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

function plainText(markdown) {
  return String(markdown)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseFrontMatter(source, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) throw new Error(`${file}: missing front matter (--- title: ... ---)`);
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon < 0) throw new Error(`${file}: front matter line without a colon: ${line}`);
    let value = line.slice(colon + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    data[line.slice(0, colon).trim()] = value;
  }
  return { data, body: source.slice(match[0].length) };
}

/** Reads every section and page. Synchronous so vite.config.js can list the routes. */
export function loadDocs() {
  const sections = JSON.parse(readFileSync(resolve(docsDir, 'sections.json'), 'utf8'));
  const site = JSON.parse(readFileSync(resolve(docsDir, 'site.json'), 'utf8'));
  const pages = [];
  const problems = [];
  for (const section of sections) {
    const folder = resolve(docsDir, section.id);
    section.pages = [];
    if (!existsSync(folder)) continue;
    for (const name of readdirSync(folder).filter((f) => f.endsWith('.md'))) {
      const file = `${section.id}/${name}`;
      try {
        const { data, body } = parseFrontMatter(readFileSync(resolve(folder, name), 'utf8'), file);
        for (const field of ['title', 'description', 'order', 'level'])
          if (!data[field]) problems.push(`${file}: front matter needs "${field}"`);
        if (data.level && !LEVELS.includes(data.level))
          problems.push(`${file}: level must be one of ${LEVELS.join(', ')}`);
        const page = {
          key: file,
          section,
          slug: name.replace(/\.md$/, ''),
          title: data.title || name,
          navTitle: data.nav_title || data.title || name,
          description: data.description || '',
          order: Number(data.order) || 999,
          level: LEVELS.includes(data.level) ? data.level : 'intermediate',
          planned: data.status === 'planned',
          body,
        };
        page.path = `mods/${section.id}/${page.slug}/`;
        section.pages.push(page);
      } catch (error) {
        problems.push(error.message);
      }
    }
    section.pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    pages.push(...section.pages);
  }
  pages.forEach((page, i) => {
    page.previous = pages[i - 1];
    page.next = pages[i + 1];
  });
  return { sections, site, pages, problems };
}

/** Output folders (relative to the site root) for vite.config.js. */
export function docRoutes() {
  const { sections, pages } = loadDocs();
  return [
    'mods/',
    ...sections.filter((s) => s.pages.length).map((s) => `mods/${s.id}/`),
    ...pages.map((p) => p.path),
  ];
}

function makeMarked() {
  const marked = new Marked({ gfm: true });
  const base = new Renderer();
  const state = { page: null, ids: null, problems: null, resolveLink: null, terms: null };
  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const inner = this.parser.parseInline(tokens);
        let id = slugify(text);
        const seen = state.ids.get(id) || 0;
        state.ids.set(id, seen + 1);
        if (seen) id = `${id}-${seen + 1}`;
        const level = Math.min(depth + (depth === 1 ? 1 : 0), 6);
        return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${level}>\n`;
      },
      code({ text, lang }) {
        const [language = '', ...rest] = (lang || '').trim().split(/\s+/);
        const caption = rest.join(' ');
        const label =
          caption ||
          { lumascript: 'LumaScript', sh: 'Shell', c: 'C', json: 'JSON', text: 'Text' }[
            language.toLowerCase()
          ] ||
          language;
        return `<figure class="code-block">${label ? `<figcaption>${escapeHtml(label)}</figcaption>` : ''}<pre tabindex="0"><code class="language-${escapeHtml(language || 'text')}">${highlight(text.replace(/\n$/, ''), language)}</code></pre></figure>\n`;
      },
      codespan({ text }) {
        if (state.terms && text.length < 60) state.terms.add(text);
        return `<code>${escapeHtml(text)}</code>`;
      },
      blockquote({ tokens }) {
        let html = this.parser.parse(tokens);
        const alert = /^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|PLANNED)\]\s*/i.exec(html);
        if (!alert) return `<blockquote>\n${html}</blockquote>\n`;
        const kind = alert[1].toLowerCase();
        html = html.slice(alert[0].length).replace(/^<\/p>\s*/, '');
        if (!html.startsWith('<')) html = `<p>${html}`;
        const titles = {
          note: 'Note',
          tip: 'Tip',
          important: 'Important',
          warning: 'Warning',
          caution: 'Caution',
          planned: 'Planned',
        };
        return `<div class="callout callout-${kind}" role="note"><p class="callout-title">${titles[kind]}</p>${html}</div>\n`;
      },
      table(token) {
        return `<div class="table-scroll" tabindex="0">${base.table.call(this, token)}</div>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const target = state.resolveLink(href);
        const external = /^https?:/.test(target);
        return `<a href="${escapeHtml(target)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' rel="noopener"' : ''}>${inner}</a>`;
      },
      html({ text }) {
        return escapeHtml(text);
      },
    },
  });
  return { marked, state };
}

function collectHeadings(marked, body) {
  const ids = new Map();
  const headings = [];
  for (const token of marked.lexer(body)) {
    if (token.type !== 'heading') continue;
    let id = slugify(token.text);
    const seen = ids.get(id) || 0;
    ids.set(id, seen + 1);
    if (seen) id = `${id}-${seen + 1}`;
    headings.push({ depth: token.depth, id, text: plainText(token.text) });
  }
  return headings;
}

const rel = (depth) => '../'.repeat(depth);

function header(site, depth) {
  const r = rel(depth);
  const links = site.header.links
    .map(
      (l) =>
        `<a href="${r}${l.href}"${l.href === 'mods/' ? ' aria-current="page"' : ''}>${escapeHtml(l.text)}</a>`,
    )
    .join('');
  return `<a class="skip" href="#main-content">${escapeHtml(site.header.skip)}</a>
<header class="site-header"><a class="brand" href="${r}" aria-label="${escapeHtml(site.header.brandLabel)}"><span class="brand-star">${site.header.brandStar}</span> ${escapeHtml(site.header.brandName)}</a><button class="nav-toggle" aria-expanded="false" aria-controls="main-navigation">${escapeHtml(site.header.menu)} <span aria-hidden="true">${site.header.menuIcon}</span></button><nav id="main-navigation" aria-label="${escapeHtml(site.header.navLabel)}">${links}</nav></header>`;
}

function footer(site, depth) {
  const r = rel(depth);
  const href = (h) => (/^https?:/.test(h) ? h : r + h);
  const columns = site.footer.columns
    .map(
      (c) =>
        `<div><h3>${escapeHtml(c.heading)}</h3>${c.links.map((l) => `<a class="text-link" href="${href(l.href)}">${escapeHtml(l.text)}</a>`).join('')}</div>`,
    )
    .join('');
  return `<footer class="site-footer"><div class="footer-top"><a class="brand" href="${r}">${escapeHtml(site.footer.brand)}</a><p>${escapeHtml(site.footer.tagline)}</p></div><div class="footer-links">${columns}</div><p class="legal-line">${escapeHtml(site.footer.legal)}</p></footer>`;
}

function documentShell({ site, depth, title, description, bodyClass, content }) {
  const r = rel(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#050609" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<link rel="preload" href="${r}fonts/Delfino.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${r}style.css" />
<link rel="stylesheet" href="${r}reference-ui.css" />
<link rel="stylesheet" href="${r}player-site.css" />
<link rel="stylesheet" href="${r}docs.css" />
</head>
<body class="inner-page docs-page ${bodyClass}">
${header(site, depth)}
${content}
${footer(site, depth)}
<script type="module" src="${r}site.js"></script>
<script type="module" src="${r}docs.js"></script>
</body>
</html>
`;
}

function levelPill(site, level) {
  return `<span class="level-pill level-${level}" title="${escapeHtml(site.docs.levelHelp[level])}">${escapeHtml(site.docs.levels[level])}</span>`;
}

function sidebar({ site, sections, depth, current, currentSection }) {
  const r = rel(depth);
  const groups = sections
    .filter((s) => s.pages.length)
    .map((s) => {
      const open = s === currentSection ? ' open' : '';
      const items = s.pages
        .map((p) => {
          const here = p === current ? ' aria-current="page"' : '';
          const tag = p.planned
            ? `<span class="nav-tag">${escapeHtml(site.docs.planned)}</span>`
            : p.level === 'advanced'
              ? `<span class="nav-tag">${escapeHtml(site.docs.levels.advanced)}</span>`
              : '';
          return `<li><a href="${r}${p.path}"${here}>${escapeHtml(p.navTitle)}${tag}</a></li>`;
        })
        .join('');
      const sectionHere = s === currentSection && !current ? ' aria-current="page"' : '';
      return `<details class="docs-nav-group"${open}><summary><span class="docs-nav-icon" aria-hidden="true">${escapeHtml(s.icon || '✦')}</span>${escapeHtml(s.title)}</summary><ul><li><a class="docs-nav-overview" href="${r}mods/${s.id}/"${sectionHere}>${escapeHtml(site.docs.sectionOverview || 'Overview')}</a></li>${items}</ul></details>`;
    })
    .join('');
  return `<aside class="docs-sidebar" id="docs-sidebar" aria-label="${escapeHtml(site.docs.sidebarLabel)}">
<div class="docs-sidebar-top"><a class="docs-home-link" href="${r}mods/">✦ ${escapeHtml(site.docs.home)}</a><button class="docs-close" type="button" aria-controls="docs-sidebar">${escapeHtml(site.docs.close)} <span aria-hidden="true">✕</span></button></div>
${searchBox(site, depth)}
<nav class="docs-nav" aria-label="${escapeHtml(site.docs.sidebarLabel)}">${groups}</nav>
</aside>`;
}

function searchBox(site, depth, extraClass = '') {
  const r = rel(depth);
  return `<div class="docs-search ${extraClass}" role="search" data-index="${r}mods/search-index.json" data-root="${r}"><label class="sr-only" for="docs-search-${extraClass || 'side'}">${escapeHtml(site.docs.searchLabel)}</label><input id="docs-search-${extraClass || 'side'}" type="search" placeholder="${escapeHtml(site.docs.searchPlaceholder)}" autocomplete="off" spellcheck="false" aria-controls="docs-results-${extraClass || 'side'}" aria-describedby="docs-search-hint" /><kbd class="docs-search-key" aria-hidden="true">/</kbd><ul class="docs-results" id="docs-results-${extraClass || 'side'}" hidden></ul><p class="docs-results-empty" hidden>${escapeHtml(site.docs.searchEmpty)}</p></div>`;
}

function breadcrumb(site, depth, section, page) {
  const r = rel(depth);
  const parts = [
    `<a href="${r}">${escapeHtml(site.docs.breadcrumbRoot)}</a>`,
    `<a href="${r}mods/">${escapeHtml(site.docs.home)}</a>`,
  ];
  if (section && page)
    parts.push(`<a href="${r}mods/${section.id}/">${escapeHtml(section.title)}</a>`);
  return `<nav class="docs-breadcrumb" aria-label="Breadcrumb">${parts.join('<span aria-hidden="true">/</span>')}</nav>`;
}

function card(site, depth, page, extra = '') {
  return `<a class="docs-card" href="${rel(depth)}${page.path}"><span class="docs-card-top">${levelPill(site, page.level)}${page.planned ? `<span class="level-pill level-planned">${escapeHtml(site.docs.planned)}</span>` : ''}${extra}</span><strong>${escapeHtml(page.title)}</strong><span class="docs-card-text">${escapeHtml(page.description)}</span></a>`;
}

function renderPage(ctx, page) {
  const { site, sections, marked, state } = ctx;
  const depth = 3;
  state.page = page;
  state.ids = new Map();
  state.terms = new Set();
  const html = marked.parse(page.body);
  const toc = page.headings.filter((h) => h.depth === 2 || h.depth === 3);
  const tocHtml = toc.length
    ? `<nav class="docs-toc" aria-labelledby="toc-title"><p class="docs-toc-title" id="toc-title">${escapeHtml(site.docs.onThisPage)}</p><ol>${toc.map((h) => `<li class="toc-${h.depth}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}</ol></nav>`
    : '';
  const pager = [
    page.previous
      ? `<a class="docs-pager-prev" href="${rel(depth)}${page.previous.path}" rel="prev"><span>← ${escapeHtml(site.docs.previous)}</span><strong>${escapeHtml(page.previous.navTitle)}</strong></a>`
      : '<span></span>',
    page.next
      ? `<a class="docs-pager-next" href="${rel(depth)}${page.next.path}" rel="next"><span>${escapeHtml(site.docs.next)} →</span><strong>${escapeHtml(page.next.navTitle)}</strong></a>`
      : '<span></span>',
  ].join('');
  const content = `<div class="docs-shell${toc.length ? '' : ' no-toc'}">
${sidebar({ site, sections, depth, current: page, currentSection: page.section })}
<div class="docs-head"><button class="docs-menu-toggle" type="button" aria-expanded="false" aria-controls="docs-sidebar"><span aria-hidden="true">☰</span> ${escapeHtml(site.docs.browse)}</button>${breadcrumb(site, depth, page.section, page)}<p class="eyebrow">${escapeHtml(page.section.title.toUpperCase())}</p><h1>${escapeHtml(page.title)}</h1><p class="docs-lead">${escapeHtml(page.description)}</p><p class="docs-meta">${levelPill(site, page.level)}${page.planned ? `<span class="level-pill level-planned">${escapeHtml(site.docs.planned)}</span>` : ''}</p></div>
${tocHtml}
<main id="main-content" class="docs-article" tabindex="-1">
${html}
</main>
<nav class="docs-pager" aria-label="Previous and next pages">${pager}</nav>
</div>`;
  page.terms = [...state.terms];
  return documentShell({
    site,
    depth,
    title: page.title + site.metadata.titleSuffix,
    description: page.description,
    bodyClass: `docs-section-${page.section.id}`,
    content,
  });
}

function renderSection(ctx, section) {
  const { site, sections } = ctx;
  const depth = 2;
  const groups = LEVELS.map((level) => {
    const list = section.pages.filter((p) => p.level === level);
    if (!list.length) return '';
    return `<section class="docs-level-group" aria-labelledby="level-${level}"><h2 id="level-${level}">${escapeHtml(site.docs.levels[level])} <small>${escapeHtml(site.docs.levelHelp[level])}</small></h2><div class="docs-card-grid">${list.map((p) => card(site, depth, p)).join('')}</div></section>`;
  }).join('');
  const first = section.pages[0];
  const content = `<div class="docs-shell no-toc">
${sidebar({ site, sections, depth, current: null, currentSection: section })}
<div class="docs-head"><button class="docs-menu-toggle" type="button" aria-expanded="false" aria-controls="docs-sidebar"><span aria-hidden="true">☰</span> ${escapeHtml(site.docs.browse)}</button>${breadcrumb(site, depth)}<p class="eyebrow">${escapeHtml(section.pages.length + ' ' + site.docs.pagesIn.toUpperCase())}</p><h1>${escapeHtml(section.title)}</h1><p class="docs-lead">${escapeHtml(section.description)}</p>${first ? `<p class="docs-meta"><a class="button primary" href="${rel(depth)}${first.path}">${escapeHtml(site.docs.sectionStart)}: ${escapeHtml(first.navTitle)} →</a></p>` : ''}</div>
<main id="main-content" class="docs-article docs-index" tabindex="-1">${groups}</main>
</div>`;
  return documentShell({
    site,
    depth,
    title: section.title + site.metadata.titleSuffix,
    description: section.description,
    bodyClass: `docs-section-${section.id} docs-section-index`,
    content,
  });
}

function renderHub(ctx) {
  const { site, sections, byKey } = ctx;
  const depth = 1;
  const r = rel(depth);
  const hub = site.hub;
  const start = sections.find((s) => s.id === 'start');
  const tutorials = sections.find((s) => s.id === 'tutorials');
  const startSteps = (start?.pages || [])
    .filter((p) => p.level === 'essential')
    .map(
      (p, i) =>
        `<li><span>${String(i + 1).padStart(2, '0')}</span><div><h3><a href="${r}${p.path}">${escapeHtml(p.title)}</a></h3><p>${escapeHtml(p.description)}</p></div></li>`,
    )
    .join('');
  const tutorialCards = (tutorials?.pages || [])
    .slice(0, 6)
    .map((p) => card(site, depth, p))
    .join('');
  const sectionCards = sections
    .filter((s) => s.pages.length && s.id !== 'start' && s.id !== 'tutorials')
    .map(
      (s) =>
        `<article class="docs-section-card"><a class="docs-section-link" href="${r}mods/${s.id}/"><span class="docs-section-icon" aria-hidden="true">${escapeHtml(s.icon)}</span><strong>${escapeHtml(s.title)}</strong><span class="docs-card-text">${escapeHtml(s.description)}</span></a><ul>${s.pages
          .slice(0, 4)
          .map((p) => `<li><a href="${r}${p.path}">${escapeHtml(p.navTitle)}</a></li>`)
          .join(
            '',
          )}<li><a class="docs-more" href="${r}mods/${s.id}/">${escapeHtml(`All ${s.pages.length} ${site.docs.pagesIn}`)} →</a></li></ul></article>`,
    )
    .join('');
  const popular = hub.popular
    .map((key) => byKey.get(key))
    .filter(Boolean)
    .map((p) => `<a href="${r}${p.path}">${escapeHtml(p.title)}</a>`)
    .join('');
  const content = `<main id="main-content" class="inner-main docs-hub">
<div class="page-heading"><nav class="docs-breadcrumb" aria-label="Breadcrumb"><a href="${r}">${escapeHtml(site.docs.breadcrumbRoot)}</a></nav><p class="eyebrow">${escapeHtml(hub.eyebrow)}</p><h1>${escapeHtml(hub.title)}</h1><p>${escapeHtml(hub.intro)}</p>
${searchBox(site, depth, 'hub')}
${popular ? `<p class="docs-popular"><span>${escapeHtml(hub.popularLabel)}:</span> ${popular}</p>` : ''}
<p class="version-notice"><strong>${escapeHtml(site.docs.preview)}</strong> ${escapeHtml(site.docs.previewText)} ${escapeHtml(hub.playerTip)} <a class="text-link" href="${r}play/mods/">${escapeHtml(hub.playerTipLink)}</a>.</p></div>
${startSteps ? `<section class="content" id="start-here"><div class="section-label">${escapeHtml(hub.startLabel)}</div><div class="section-body"><h2>${escapeHtml(hub.startHeading)}</h2><p>${escapeHtml(hub.startIntro)}</p><ol class="setup-steps docs-steps">${startSteps}</ol></div></section>` : ''}
${tutorialCards ? `<section class="content" id="tutorials"><div class="section-label">${escapeHtml(hub.tutorialsLabel)}</div><div class="section-body"><h2>${escapeHtml(hub.tutorialsHeading)}</h2><p>${escapeHtml(hub.tutorialsIntro)}</p><div class="docs-card-grid">${tutorialCards}</div><a class="text-link" href="${r}mods/tutorials/">${escapeHtml(hub.tutorialsAll)} →</a></div></section>` : ''}
<section class="content" id="reference"><div class="section-label">${escapeHtml(hub.referenceLabel)}</div><div class="section-body"><h2>${escapeHtml(hub.referenceHeading)}</h2><p>${escapeHtml(hub.referenceIntro)}</p><div class="docs-section-grid">${sectionCards}</div></div></section>
</main>`;
  return documentShell({
    site,
    depth,
    title: site.metadata.title,
    description: site.metadata.description,
    bodyClass: 'docs-hub-page',
    content,
  });
}

/** Builds every docs page in memory. Returns { files, problems }. */
export function buildDocs() {
  const { sections, site, pages, problems } = loadDocs();
  const { marked, state } = makeMarked();
  const byKey = new Map(pages.map((p) => [p.key, p]));
  for (const page of pages) page.headings = collectHeadings(marked, page.body);
  const sitePaths = new Set([
    '',
    ...JSON.parse(readFileSync(resolve(root, 'content/pages.json'), 'utf8')).map((p) => p.path),
  ]);

  state.resolveLink = (href) => {
    const page = state.page;
    if (/^(https?:|mailto:)/.test(href)) return href;
    if (href.startsWith('#')) {
      if (!page.headings.some((h) => h.id === href.slice(1)))
        problems.push(`${page.key}: no heading for link ${href}`);
      return href;
    }
    const [path, anchor] = href.split('#');
    if (path.endsWith('.md')) {
      const clean = path.replace(/^(\.\.?\/)+/, '').replace(/^content\/modding\//, '');
      const target = byKey.get(clean) || byKey.get(`${page.section.id}/${clean}`);
      if (!target) {
        problems.push(`${page.key}: link to missing page ${href}`);
        return '#';
      }
      if (anchor && !target.headings.some((h) => h.id === anchor))
        problems.push(`${page.key}: link ${href} has no heading #${anchor} in ${target.key}`);
      return `${rel(3)}${target.path}${anchor ? `#${anchor}` : ''}`;
    }
    const sitePath = path.replace(/^\//, '');
    if (sitePaths.has(sitePath) || sitePath === 'mods/')
      return `${rel(3)}${sitePath}${anchor ? `#${anchor}` : ''}`;
    problems.push(`${page.key}: unrecognised link ${href} (use section/page.md)`);
    return href;
  };

  const ctx = { site, sections, marked, state, byKey };
  const files = new Map();
  for (const page of pages) files.set(`${page.path}index.html`, renderPage(ctx, page));
  for (const section of sections.filter((s) => s.pages.length))
    files.set(`mods/${section.id}/index.html`, renderSection(ctx, section));
  for (const key of site.hub.popular)
    if (!byKey.has(key)) problems.push(`site.json: hub.popular lists missing page ${key}`);
  files.set('mods/index.html', renderHub(ctx));

  const index = pages.map((p) => ({
    t: p.title,
    n: p.navTitle !== p.title ? p.navTitle : undefined,
    s: p.section.title,
    u: p.path.slice('mods/'.length),
    d: p.description,
    l: p.level,
    h: p.headings.filter((h) => h.depth <= 3).map((h) => [h.text, h.id]),
    k: p.terms.join(' '),
  }));
  return { files, index, problems, pages, sections };
}

export async function renderDocs({ strict = !process.env.DOCS_DRAFT } = {}) {
  const { files, index, problems } = buildDocs();
  if (problems.length && !strict)
    console.warn(`Modding docs: ${problems.length} problem(s) ignored (DOCS_DRAFT).`);
  else if (problems.length)
    throw new Error(`Modding docs have ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
  // Write only what changed and remove only pages that no longer exist: the dev server
  // watches these files, and rewriting or deleting all of them at once would flood it.
  const wanted = new Set([...files.keys()].map((path) => resolve(root, path)));
  const removeStale = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        removeStale(path);
        if (!readdirSync(path).length) rmSync(path, { recursive: true });
      } else if (!wanted.has(path)) rmSync(path);
    }
  };
  removeStale(outDir);
  let written = 0;
  const writeIfChanged = (file, text) => {
    if (existsSync(file) && readFileSync(file, 'utf8') === text) return;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    written++;
  };
  for (const [path, html] of files) writeIfChanged(resolve(root, path), html);
  writeIfChanged(indexFile, JSON.stringify(index));
  console.log(`Rendered ${files.size} modding docs pages (${written} files changed).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await renderDocs();
}
