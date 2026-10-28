import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { fetchDownloadStats } from '../download-stats.js';
import { renderPageText } from './lib/page-text.mjs';

const root = resolve(import.meta.dirname, '..');

export async function renderPages({ refreshDownloads = true } = {}) {
  const routes = JSON.parse(await readFile(resolve(root, 'content/pages.json'), 'utf8'));
  const formatOptions = JSON.parse(await readFile(resolve(root, '.prettierrc.json'), 'utf8'));
  let downloads = null;
  try {
    downloads = JSON.parse(await readFile(resolve(root, 'content/downloads.json'), 'utf8'));
  } catch {
    /* A missing cache should not prevent content edits. */
  }
  if (refreshDownloads) {
    try {
      downloads = await fetchDownloadStats();
      await writeFile(
        resolve(root, 'content/downloads.json'),
        JSON.stringify(downloads, null, 2) + '\n',
      );
    } catch {
      console.warn('GitHub downloads unavailable; using the saved count.');
    }
  }
  for (const route of routes) {
    const copy = JSON.parse(await readFile(resolve(root, route.copy), 'utf8'));
    const template = await readFile(resolve(root, route.template), 'utf8');
    const html = renderPageText(template, copy, downloads);
    await writeFile(
      resolve(root, route.path, 'index.html'),
      await format(html, { ...formatOptions, parser: 'html' }),
    );
  }
  console.log(`Rendered ${routes.length} player pages from their text JSON files.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await renderPages();
}
