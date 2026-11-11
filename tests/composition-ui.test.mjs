// Renderer contract checks. Browser lifecycle checks below use the integrated
// C2 engine/workspace/provider; fixtures are identified separately from live AI.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../src/engine.js'),R=require('../src/plan-renderer.js');
function exhibit(){
  const state=E.newGame(312),plots=[[1,2],[4,2]],program={version:2,title:'A new activity name',intent:'Work with shared classes and retained land',
    components:[{id:'work',capability:'workplace',label:'Work activity',quantity:4,area:.7,sharedWith:null},{id:'class',capability:'community',label:'Classes',quantity:10,area:.3,sharedWith:'work'}],
    conditions:{hours:8,deliveries:'daytime',access:true,buffer:.2,preserve:.4,affordable:false},assumptions:[],omissions:[]};
  const proposal={id:'composition-render-test',kind:'initiative',title:program.title,plan:E.defaultPlan('initiative'),program,programRevision:'accepted-program-1',plots,
    layout:{plots,allocations:[{componentId:'work',label:'Work activity',role:'workshop',sharedWith:null,segments:[{plot:[1,2],offset:0,area:.7}]},{componentId:'class',label:'Classes',role:'civic',sharedWith:'work',segments:[{plot:[1,2],offset:0,area:.3}]}],
      cells:[{plot:[1,2],usedArea:.9},{plot:[4,2],usedArea:0}],buffer:[{plot:[1,2],offset:.7,area:.2}],preserved:[{plot:[4,2],offset:.6,area:.4}],unused:[{plot:[1,2],offset:.9,area:.1},{plot:[4,2],offset:0,area:.6}],usedArea:.9,preservedArea:.4,freeArea:.7}};
  const engine={...E,capabilities:()=>[{id:'workplace',unit:'staffed places'},{id:'community',unit:'daily participants'}],effectsOf:()=>({cost:124,upkeep:10})};
  return {state,proposal,engine};
}
test('MP-026 MP-033 MP-070 composition exhibit preserves exact engine strips, gaps and shared space without reallocation',()=>{
  const f=exhibit(),before=JSON.stringify(f),html=R.render(f);
  assert.match(html,/data-revision="accepted-program-1"/);
  assert.match(html,/data-component-id="class"[^>]*data-role="civic"[^>]*data-shared-with="work"[^>]*data-offset="0"[^>]*data-area="0.3"/);
  assert.match(html,/x="50" y="100" width="35" height="50"/);
  assert.match(html,/data-role="retained"[^>]*data-offset="0.6"[^>]*data-area="0.4"/);
  assert.doesNotMatch(html,/data-plot="2,2"|data-plot="3,2"/);
  assert.match(html,/data-plan-cost="124"/);assert.match(html,/shared with work/);
  assert.equal(JSON.stringify(f),before,'rendering never mutates the accepted proposal');
});
test('MP-026 MP-072 SVG and map projection consume the identical accepted component layout through delivery',()=>{
  const f=exhibit(),accepted=R.layoutShapes(f.proposal),paths=[];let current=[];
  const context={save(){},restore(){},setLineDash(){},beginPath(){current=[];},moveTo(x,y){current.push([x,y]);},lineTo(x,y){current.push([x,y]);},closePath(){paths.push(current);},fill(){},stroke(){},arc(){}};
  R.drawLayout(context,f.proposal,(x,y)=>[x*50,y*50]);
  assert.deepEqual(paths[0],[[50,100],[85,100],[85,150],[50,150]]);
  assert.deepEqual(paths[1],[[50,100],[65,100],[65,150],[50,150]],'shared allocation retains its exact overlap');
  const delivered=JSON.parse(JSON.stringify({...f.proposal,status:'built',done:2}));
  assert.deepEqual(R.layoutShapes(delivered),accepted,'delivery consumes the saved layout');
  assert.match(R.render({...f,proposal:delivered}),/data-revision="accepted-program-1"/);
});
test('MP-031 MP-070 renamed composition labels preserve geometry and unavailable layouts are explicit',()=>{
  const f=exhibit(),original=R.layoutShapes(f.proposal);f.proposal.title='Uncatalogued name';f.proposal.program.title=f.proposal.title;
  assert.deepEqual(R.layoutShapes(f.proposal),original);assert.match(R.render(f),/Uncatalogued name/);
  delete f.proposal.layout;assert.match(R.render(f),/accepted engine layout is unavailable/);
});
