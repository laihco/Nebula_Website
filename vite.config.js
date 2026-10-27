import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const pages=JSON.parse(readFileSync(new URL('./content/pages.json',import.meta.url),'utf8'));
export default defineConfig({
 base:'./',
 build:{rollupOptions:{input:Object.fromEntries(pages.map(p=>[p.path||'home',resolve(import.meta.dirname,p.path,'index.html')]))}}
});
