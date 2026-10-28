// Builds the game for one release channel.
// Usage: node scripts/build.mjs [--channel stable|dev] [--out dist]
//   <out>/master-plan.html  claude.ai artifact (full game with AI characters and cloud saves)
//   <out>/index.html        GitHub Pages page (no claude.ai runtime: quick options, browser saves)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : dflt; };

const channel = arg('channel', 'stable');
if (!['stable', 'dev'].includes(channel)) throw new Error(`Unknown channel "${channel}". Use stable or dev.`);
const out = resolve(root, arg('out', 'dist'));

const { version } = JSON.parse(read('package.json'));
let commit = 'local';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch {}
const flagDefs = JSON.parse(read('flags.json')).flags;
const flags = Object.fromEntries(Object.entries(flagDefs).map(([k, v]) => [k, !!v[channel]]));
const build = { channel, version, commit, flags, flagInfo: Object.fromEntries(Object.entries(flagDefs).map(([k, v]) => [k, v.description])) };

// Build info runs before the engine. On dev, flags can be overridden from the in-game menu.
const prelude = `var MP_BUILD=${JSON.stringify(build)};
(function(){if(MP_BUILD.channel!=='dev')return;try{var o=JSON.parse(localStorage.getItem('mp.flagOverrides')||'{}');for(var k in o)if(k in MP_BUILD.flags)MP_BUILD.flags[k]=!!o[k];}catch(e){}})();
`;

const template = read('src/index.html');
for (const marker of ['/*ENGINE*/', '/*UI*/']) {
  if (!template.includes(marker)) throw new Error(`src/index.html is missing the ${marker} marker`);
}
let html = template.replace('/*ENGINE*/', () => prelude + read('src/engine.js')).replace('/*UI*/', () => read('src/ui.js'));
if (channel === 'dev') html = html.replace('<title>Master Plan</title>', '<title>Master Plan Dev</title>');

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'master-plan.html'), html);
writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style></head><body>${html}</body></html>`);
console.log(`Built ${channel} v${version} (${commit}) into ${out} (${(html.length / 1024).toFixed(0)} KB). Flags on: ${Object.keys(flags).filter(k => flags[k]).join(', ') || 'none'}`);
