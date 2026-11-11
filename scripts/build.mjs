// Builds the game for one release channel.
// Usage: node scripts/build.mjs [--channel stable|dev] [--out dist]
//   <out>/master-plan.html  claude.ai artifact (full game with AI characters and cloud saves)
//   <out>/index.html        GitHub Pages page with browser saves and optional offline AI
import { cpSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
let commit = 'local', commitFull = 'local';
try { commitFull = execSync('git rev-parse HEAD', { cwd: root }).toString().trim(); commit = commitFull.slice(0, 7); } catch {}
const flagDefs = JSON.parse(read('flags.json')).flags;
const flags = Object.fromEntries(Object.entries(flagDefs).map(([k, v]) => [k, !!v[channel]]));
const build = { channel, version, commit, commitFull, flags, flagInfo: Object.fromEntries(Object.entries(flagDefs).map(([k, v]) => [k, v.description])) };

// Build info runs before the engine. On dev, flags can be overridden from the in-game menu.
const prelude = `var MP_BUILD=${JSON.stringify(build)};
(function(){if(MP_BUILD.channel!=='dev')return;try{var o=JSON.parse(localStorage.getItem('mp.flagOverrides')||'{}');for(var k in o)if(k in MP_BUILD.flags)MP_BUILD.flags[k]=!!o[k];}catch(e){}})();
`;

const template = read('src/index.html');
for (const marker of ['/*ENGINE*/', '/*UI*/', '/*HOST_GROTESK*/', '/*HOST_GROTESK_LICENSE*/']) {
  if (!template.includes(marker)) throw new Error(`src/index.html is missing the ${marker} marker`);
}
// Embed the UI font so Pages and the single-file artifact render offline alike.
const font = readFileSync(join(root, 'src/fonts/host-grotesk-latin.woff2')).toString('base64');
let html = template.replace('/*HOST_GROTESK_LICENSE*/', () => '/*\n' + read('src/fonts/OFL.txt') + '\n*/')
  .replace('/*HOST_GROTESK*/', () => font)
  .replace('/*ENGINE*/', () => prelude + read('src/engine.js')).replace('/*UI*/', () => ['src/composition-requests.js', 'src/workspace.js', 'src/plan-requests.js', 'src/plan-renderer.js', 'src/ui.js'].map(read).join('\n'));
if (channel === 'dev') html = html.replace('<title>Master Plan</title>', '<title>Master Plan Dev</title>');

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'master-plan.html'), html);
// The diagnostics module is local to Dev Pages. Embedding it in the shell keeps
// file export available offline even when Qwen is off or its module cannot load.
const webAI = flags.offlineAI ? '<script>window.MP_WEB_BUILD=true;\n' +
  (channel === 'dev' ? read('src/qwen-diagnostics.js') : '') + '\n</script>' : '';
if (flags.offlineAI) {
  writeFileSync(join(out, 'offline-ai.js'), read('src/offline-ai.js'));
  writeFileSync(join(out, 'offline-worker.js'), read('src/offline-worker.js').replace('/*BUILD_COMMIT*/', commit));
}
writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>${webAI}</head><body>${html}</body></html>`);
cpSync(join(root, 'site'), join(out, 'about'), { recursive: true });
console.log(`Built ${channel} v${version} (${commit}) into ${out} (${(html.length / 1024).toFixed(0)} KB). Flags on: ${Object.keys(flags).filter(k => flags[k]).join(', ') || 'none'}`);
