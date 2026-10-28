// Builds the single-file game page published as the claude.ai artifact.
// Usage: node scripts/build.mjs   ->  dist/master-plan.html (claude.ai artifact) and dist/index.html (GitHub Pages)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const template = read('src/index.html');
for (const marker of ['/*ENGINE*/', '/*UI*/']) {
  if (!template.includes(marker)) throw new Error(`src/index.html is missing the ${marker} marker`);
}
const html = template.replace('/*ENGINE*/', () => read('src/engine.js')).replace('/*UI*/', () => read('src/ui.js'));

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/master-plan.html'), html);
// GitHub Pages serves dist/index.html. Pages has no claude.ai runtime, so AI characters fall back to quick options and saves stay in the browser.
writeFileSync(join(root, 'dist/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style></head><body>${html}</body></html>`);
console.log(`Built dist/master-plan.html (${(html.length / 1024).toFixed(0)} KB)`);
