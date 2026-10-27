import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const pages=JSON.parse(readFileSync(resolve(root,'content/pages.json'),'utf8'));
const documents=new Map(pages.map(p=>[resolve(root,p.path,'index.html'),readFileSync(resolve(root,p.path,'index.html'),'utf8')]));
test('player pages have valid local links, anchors and unique IDs',()=>{
 for(const [file,html] of documents){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,`Duplicate ID in ${file}`);
  for(const match of html.matchAll(/\bhref="([^"]+)"/g)){
   const href=match[1];if(/^(https?:|mailto:)/.test(href))continue;
   const [path,anchor]=href.split('#');let target=path?resolve(dirname(file),path):file;
   assert.ok(existsSync(target),`Missing link ${href} in ${file}`);
   if(statSync(target).isDirectory())target=resolve(target,'index.html');
   assert.ok(existsSync(target),`Missing index ${href} in ${file}`);
   if(anchor)assert.ok(documents.get(target)?.includes(`id="${anchor}"`),`Missing anchor ${href} in ${file}`);
  }
 }
});
test('player pages exclude draft instructions and developer-only navigation',()=>{
 for(const [file,html] of documents){
  assert.doesNotMatch(html,/\[CONFIRM|\[PLACEHOLDER|FAN CONCEPT|unofficial design demo|href="[^"]*\/dev\//,file);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
  assert.match(html,/<meta name="description" content="[^"]+"/);
 }
});
test('v2 is upcoming, downloads identify the current release, and reference lists are complete',()=>{
 const d=JSON.parse(readFileSync(resolve(root,'content/site.json'),'utf8'));
 assert.equal(d.errors.length,20);
 assert.equal(d.release.stage,'upcoming');
 assert.match(documents.get(resolve(root,'download/index.html')),/v2 is coming soon and is not included in this download/);
 assert.equal(d.links.discord,'https://discord.gg/2fJEdhAw2f');
});
