// Normal-entry dev presentation checks, separate from real Qwen/Duo evidence.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import { chromium } from 'playwright';
const root=new URL('..',import.meta.url).pathname;
const out=mkdtempSync(join(tmpdir(),'mp-plan-ui-'));
execFileSync('node',['scripts/build.mjs','--channel','dev','--out',out],{cwd:root,stdio:'pipe'});
let browser;
before(async()=>{browser=await chromium.launch();});
after(async()=>{await browser?.close();rmSync(out,{recursive:true,force:true});});
async function open(width,flagOff=false){
  const ctx=await browser.newContext({viewport:{width,height:951},hasTouch:true,isMobile:true});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('file://'+join(out,'index.html'));
  await page.evaluate(off=>{
    const s=ENGINE.newGame(71717);ENGINE.resolveYear(s);
    localStorage.setItem('masterplan.dev.save',JSON.stringify(s));
    if(off)localStorage.setItem('mp.flagOverrides',JSON.stringify({planRequests:false,planDrawings:false}));
  },flagOff);
  await page.reload();return{ctx,page,errors};
}

test('MP-022 MP-026 MP-053 MP-054 MP-055 Old Mill preview is explicit, anchored and read-only at both portrait widths',async()=>{
  for(const width of [400,669]){
    const {ctx,page,errors}=await open(width);
    const saved=await page.evaluate(()=>localStorage.getItem('masterplan.dev.save'));
    await page.click('[data-compare="park"]');
    assert.match(await page.textContent('.plan-comparison'),/Reviewing: Old Mill Memorial Park/);
    const position=await page.evaluate(()=>({top:document.querySelector('.plan-reviewed').getBoundingClientRect().top,header:document.querySelector('.sh-head').getBoundingClientRect().bottom}));
    assert.ok(position.top>=position.header && position.top<position.header+100,'agenda comparison brings the reviewed/preview controls into view');
    const boxes=[],outlines=[];
    for(const id of ['park','commerce','existing','commerce','park']){
      await page.click(`[data-plan-preview="${id}"]`);
      const svg=page.locator('.plan-comparison svg.plan-illustration');
      boxes.push(await svg.getAttribute('viewBox'));
      outlines.push(await svg.locator('[data-plot]').evaluateAll(es=>es.map(e=>e.getAttribute('data-plot')).sort()));
      assert.equal(await page.locator(`[data-plan-preview="${id}"]`).getAttribute('aria-pressed'),'true');
      assert.match(await page.textContent('.plan-comparison'),new RegExp('Preview: '+({park:'Old Mill Memorial Park',commerce:'Old Mill Commons',existing:'Existing conditions'}[id])));
    }
    assert.equal(new Set(boxes).size,1);for(const p of outlines)assert.deepEqual(p,outlines[0]);
    assert.equal(await page.evaluate(()=>localStorage.getItem('masterplan.dev.save')),saved);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const small=await page.locator('.plan-comparison button').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44;}).map(e=>e.textContent));
    assert.deepEqual(small,[]);
    await page.click('[data-act="close"]');await page.click('[data-open="commerce"]');
    assert.match(await page.textContent('.plan-comparison'),/Reviewing: Old Mill Commons/);
    await page.click('[data-plan-preview="park"]');
    assert.match(await page.textContent('.plan-comparison'),/Reviewing: Old Mill Commons/);
    assert.deepEqual(errors,[]);await ctx.close();
  }
});

test('MP-026 MP-062 MP-064 dev flags off retain the quick asks and existing plan drawing',async()=>{
  const {ctx,page,errors}=await open(400,true);
  await page.click('[data-open="park"]');await page.locator('.plan-details summary').click();
  assert.equal(await page.locator('canvas.plan').count(),1);
  assert.equal(await page.locator('.plan-comparison').count(),0);
  await page.click('[data-chip="2"]');
  const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('masterplan.dev.save')).proposals.find(p=>p.id==='park'));
  assert.equal(p.plan.fountain,true);assert.deepEqual(errors,[]);await ctx.close();
});
