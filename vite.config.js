import { renderPages } from './scripts/render-pages.mjs';
import { renderDocs, docRoutes } from './scripts/render-docs.mjs';
import { defineConfig } from 'vite';
import { resolve, sep } from 'node:path';
import { readFileSync } from 'node:fs';
const pages = JSON.parse(readFileSync(new URL('./content/pages.json', import.meta.url), 'utf8'));
const routes = [...pages.map((p) => p.path), ...docRoutes()];
export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'page-text-preview',
      async handleHotUpdate({ file, server }) {
        const normalized = file.split(sep).join('/');
        if (normalized.includes('/content/modding/')) {
          try {
            await renderDocs();
          } catch (error) {
            server.config.logger.error(error.message);
          }
          server.ws.send({ type: 'full-reload' });
          return [];
        }
        if (!normalized.includes('/content/pages/') && !normalized.includes('/templates/pages/'))
          return;
        await renderPages({ refreshDownloads: false });
        server.ws.send({ type: 'full-reload' });
        return [];
      },
    },
  ],
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        routes.map((path) => [
          path.replace(/\/$/, '').replaceAll('/', '-') || 'home',
          resolve(import.meta.dirname, path, 'index.html'),
        ]),
      ),
    },
  },
});
