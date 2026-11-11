/* Deterministic plan exhibits. The engine supplies accepted fields, sites and prices.
 * Geometry uses the town's actual grid; interiors are illustrative plot assignments.
 * No provider calls, event handlers, randomness, or save writes live in this module. */
const PLAN_RENDERER = (() => {
  const TILE = 50;
  const C = {paper:'#f4f0e5',land:'#dce3cc',forest:'#b9c9a3',farm:'#dfd0a2',water:'#94b7b6',
    road:'#b5b0a1',ink:'#2e3c32',outline:'#886c29',roof:'#b47e5d',wall:'#e1c3a0',tree:'#6d8958',
    path:'#eee0b8',parking:'#a6a393',plaza:'#d4c6a7'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rect = (x,y,w,h,fill,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const tree = (x,y,r=7) => `<g data-feature="tree"><circle cx="${x+1}" cy="${y+2}" r="${r}" fill="#49643d" opacity=".18"/><circle cx="${x}" cy="${y}" r="${r}" fill="${C.tree}" stroke="#a7b48c" stroke-width="1.2"/><path d="M${x-3} ${y+2}l6-5" stroke="#91a477" stroke-width="1.2"/></g>`;
  const key = p => p.join(',');
  const fmt = amount => `$${Math.round(amount).toLocaleString('en-US')}K`;
  const pill = (label, value) => `<span><b>${esc(value)}</b> ${esc(label)}</span>`;
  const feature = (name, content) => `<g data-feature="${name}">${content}</g>`;
  const fingerprint = value => {let h=2166136261;for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
  const labelFor = (E, field, value) => E.KINDS.initiative.params[field]?.labels?.[value] || value;

  function footprint(x,y,w,h,stories=1,storefronts=0) {
    const shopWidth = w / Math.max(1,storefronts);
    let out = rect(x+2,y+3,w,h,'#334333','opacity=".16"') + rect(x,y,w,h,C.roof,'stroke="#865f48" stroke-width="1.1"');
    out += `<path d="M${x+2} ${y+h/2}h${w-4}M${x+w/2} ${y+2}v${h-4}" fill="none" stroke="#dbad82" stroke-width="1"/>`;
    for(let i=0;i<storefronts;i++) out += feature('storefront', rect(x+i*shopWidth+1,y+h-5,shopWidth-2,5,i%2?'#687b64':'#e7c990'));
    // A line per accepted upper story identifies height; the exhibit is a plan view.
    for(let i=1;i<stories;i++) out += `<path d="M${x+4} ${y+3+i*3}h${w-8}" stroke="#f5dfbd" stroke-width="1.3"/>`;
    return out;
  }
  function parking(x=5,y=32,w=40,h=13) {
    let out = rect(x,y,w,h,C.parking,'rx="1" stroke="#888879" stroke-width=".6"');
    for(let i=1;i<7;i++) out += `<path d="M${x+i*w/7} ${y+1}v${h*.4}m0 ${h*.2}v${h*.3}" stroke="#eee8d8" stroke-width=".7"/>`;
    return feature('parking',out);
  }
  function plaza(compact=false) {
    return feature('plaza',compact?rect(6,33,17,12,C.plaza,'stroke="#b4a987" stroke-width="1"')+'<path d="M8 38h13m-13 4h13m-7-8v10" stroke="#e7ddc6" stroke-width="1"/>':rect(6,33,38,12,C.plaza,'stroke="#b4a987" stroke-width="1"') + '<path d="M8 38h34M8 42h34M18 34v10M31 34v10" stroke="#e7ddc6" stroke-width="1"/>');
  }
  function pond() {
    return feature('stormwater','<path d="M7 21Q14 5 33 11T44 31Q31 45 15 38T7 21Z" fill="#91ad80" stroke="#667f58" stroke-width="1.2"/><path d="M13 25Q21 16 31 20T36 30Q25 37 13 25Z" fill="#a1c0b6"/><path d="M9 27l3-9m25 17 4-9M18 37l2-8" stroke="#4d7153" stroke-width="1.3"/>');
  }
  function parkTile(pl,index) {
    let out = '';
    if(pl.paths) out += feature('path','<path d="M25 0V50M0 25H50" fill="none" stroke="#cdbd95" stroke-width="5"/><path d="M25 0V50M0 25H50" fill="none" stroke="#efe0b8" stroke-width="3.4"/>');
    for(let j=0;j<pl.trees;j++) out += tree(8+(j%2)*29,9+Math.floor(j/2)*31,6+j);
    if(index===0 && pl.memorial) out += feature('memorial','<circle cx="31" cy="33" r="11" fill="#d7ccb2" stroke="#aa9877" stroke-width="1.2"/><path d="M28 39V28l3-4 3 4v11Z" fill="#eee6d1" stroke="#8b816d" stroke-width=".9"/>');
    if(index===1 && pl.playground) out += feature('playground',rect(12,30,28,13,'#cfb390','rx="6"') + '<path d="M17 41V28h15v13m-16-13 9-8 9 8M25 28v13" fill="none" stroke="#8d674e" stroke-width="2"/>');
    if(index===2 && pl.fountain) out += feature('fountain','<circle cx="28" cy="31" r="11" fill="#9cbbb8" stroke="#eee0c5" stroke-width="3"/><circle cx="28" cy="31" r="3" fill="#eee0c5"/>');
    if(index===3 && pl.amphitheater) out += feature('amphitheater','<g transform="translate(0 -6)"><path d="M8 27Q25 5 42 27M12 30Q25 12 38 30M16 33Q25 21 34 33" fill="none" stroke="#c6b18a" stroke-width="3"/><path d="M18 36h14v6H18Z" fill="#ae9474"/></g>');
    if(index===3 && pl.parking) out += parking(7,33,36,12);
    return out;
  }
  function commerceTile(pl,index,n) {
    const shops = Math.floor(pl.stores/n) + (index < pl.stores%n ? 1 : 0);
    let out = shops ? feature('building',footprint(6,8,38,23,pl.stories,shops)) : '';
    if(index===0 && pl.anchor!=='none') out += feature('anchor', rect(9,10,12,9,'#566c55','rx="1"'));
    if(index===n-1 && pl.plaza) out += plaza(pl.parking>0);
    if(index===n-1 && pl.parking) out += pl.plaza?parking(27,33,17,12):parking();
    return out;
  }
  function initiativeTile(pl,role,index,roles,E) {
    let out = '';
    if(role==='mixed') {
      const allocation = roles.slice(0,index).filter(r=>r==='mixed').length;
      const shops = Math.min(4,Math.max(0,pl.shops-allocation*4));
      out += feature('building',footprint(6,8,38,29,pl.stories,shops));
    } else if(role==='homes') out += feature('homes',footprint(7,10,36,28,pl.stories));
    else if(role==='civic') out += feature('civic',footprint(7,10,36,29,1,pl.civic==='farmers_market'?3:0));
    else if(role==='safety') out += feature('safety',footprint(7,10,36,29));
    else if(role==='plaza') out += plaza();
    else if(role==='parking') out += parking(6,8,38,34);
    else if(role==='pond') out += pond();
    else if(role==='green') for(let j=0;j<pl.green;j++) out += tree(12+(j%2)*25,13+Math.floor(j/2)*25,7+j);
    // Green is a canopy intensity field, even when every plot also has a use.
    if(pl.green>0&&role!=='green')for(let j=0;j<pl.green;j++)out+=tree(j===1?45:4,j===2?44:5,3.2);
    if(pl.safety==='streetlights')out+=feature('streetlights','<path d="M42 33V18h-6" fill="none" stroke="#515c4c" stroke-width="1.6"/><circle cx="36" cy="18" r="3.5" fill="#eee0a3" stroke="#8c845f" stroke-width="1"/>');
    return out;
  }
  function contextTile(cell,suppressBuilding) {
    const x=cell.x*TILE,y=cell.y*TILE;
    const terrain=cell.t==='water'?C.water:cell.t==='forest'?C.forest:cell.t==='farm'?C.farm:C.land;
    let out=rect(0,0,TILE,TILE,terrain,'stroke="#f2eedf" stroke-width=".5"');
    if(cell.t==='water') out += '<path d="M7 17h18m2 18h16M8 37h9m16-28h12" stroke="#d9e7dd" stroke-width="1.1" opacity=".7"/>';
    if(cell.t==='farm') out += '<path d="M6 5v40m9-40v40m9-40v40m9-40v40m9-40v40" stroke="#c4b47f" stroke-width=".8"/>';
    if(cell.road) {
      out=rect(0,0,TILE,TILE,C.road);
      if(cell.y===11||cell.y===16||cell.y===20) out+='<path d="M0 25h50" stroke="#eee8d7" stroke-width="1.1" stroke-dasharray="6 5"/>';
      else out+='<path d="M25 0v50" stroke="#eee8d7" stroke-width="1.1" stroke-dasharray="6 5"/>';
      if(cell.t==='bridge') out+='<path d="M0 8h50M0 42h50" stroke="#7b8075" stroke-width="2"/>';
    }
    if(cell.b && !suppressBuilding) {
      const kind=cell.b.type;
      if(kind==='lot') out += rect(4,4,42,42,'#d2c9b1','stroke="#aca08a" stroke-width=".8"') + '<path d="m7 8 11 7m9 13 14-6M12 35l12 4" stroke="#b4a88d" stroke-width="2"/>';
      else if(kind==='park'||kind==='quad') out += '<circle cx="16" cy="18" r="8" fill="#7b9563"/><circle cx="33" cy="32" r="9" fill="#6e875a"/>';
      else if(kind==='construction') out += rect(7,7,36,36,'#e2cf9c','stroke="#b8a373" stroke-width="1" stroke-dasharray="3 3"');
      else out += footprint(8,9,34,31,kind==='apt'?3:1,kind==='shop'||kind==='vacant'?1:0).replaceAll('data-feature=', 'data-context-feature=');
    }
    return `<g data-context="${cell.x},${cell.y}" data-terrain="${esc(cell.t)}" data-road="${!!cell.road}" data-building="${esc(cell.b?.type||'')}" transform="translate(${x} ${y})">${out}</g>`;
  }
  function boundary(plots) {
    const selected=new Set(plots.map(key));let d='';
    for(const [x,y] of plots) {
      const a=x*TILE,b=y*TILE;
      if(!selected.has(`${x},${y-1}`))d+=`M${a} ${b}h50`;
      if(!selected.has(`${x+1},${y}`))d+=`M${a+TILE} ${b}v50`;
      if(!selected.has(`${x},${y+1}`))d+=`M${a+TILE} ${b+TILE}h-50`;
      if(!selected.has(`${x-1},${y}`))d+=`M${a} ${b+TILE}v-50`;
    }
    return d;
  }
  function counts(E,p,existing,plots,state) {
    if(existing) {
      const map=E.mapSize(state),kinds={};for(const [x,y] of plots){const cell=state.grid[y*map.width+x],k=cell?.b?.type||'open plots';kinds[k]=(kinds[k]||0)+1;}
      const names={lot:'vacant mill plots',house:'house plots',apt:'apartment plots',shop:'store plots',farm:'farm plots'};
      return Object.entries(kinds).map(([k,n])=>pill(names[k]||k.replaceAll('_',' '),n)).join('');
    }
    const pl=p.plan;let out='';
    if(p.kind==='commerce') {
      out += pill('storefronts',pl.stores) + pill('stories',pl.stories) + pill('parking spaces',pl.parking);
      if(pl.anchor!=='none')out += pill('anchor',E.KINDS.commerce.params.anchor.labels[pl.anchor]);
      if(pl.plaza)out += pill('public plaza',1);
    } else if(p.kind==='park') {
      out += pill('canopy level',`${pl.trees}/3`) + pill('parking spaces',pl.parking);
      for(const [field,label] of [['memorial','memorial'],['paths','walking paths'],['playground','playground'],['amphitheater','amphitheater'],['fountain','fountain']])if(pl[field])out+=pill(label,'✓');
    } else {
      if(pl.homes)out+=pill('homes',pl.homes);
      if(pl.shops)out+=pill('storefronts',pl.shops);
      if(pl.shops||pl.homes)out+=pill('stories',pl.stories);
      if(pl.parking)out+=pill('parking spaces',pl.parking);
      if(pl.green)out+=pill('green-space level',`${pl.green}/3`);
      if(pl.plaza)out+=pill('public plaza',1);
      if(pl.stormwater)out+=pill('rain gardens and basin','✓');
      for(const field of ['civic','safety','policy'])if(pl[field]!=='none')out+=pill(labelFor(E,field,pl[field]),'✓');
      if(pl.affordable&&pl.homes)out+=pill('priced for working families','✓');
      out+=pill('design-quality level',`${pl.quality}/3`);
    }
    return out;
  }
  function render({state,proposal:p,engine:E,existing=false}) {
    if(p?.program)return renderProgram({state,proposal:p,engine:E,existing});
    if(!E||!p||!['park','commerce','initiative'].includes(p.kind))return null;
    const map=E.mapSize(state),plots=E.plotsOf(p,state),effects=E.effectsOf(p,state);
    const revision=fingerprint({plan:Object.fromEntries(Object.entries(p.plan).sort(([a],[b])=>a.localeCompare(b))),plots,existing});
    const price=existing?'':` data-plan-cost="${effects.cost}"`;
    if(!plots.length) return `<section class="plan-no-site"${price}><b>No site · program or ordinance</b><p>${esc(p.title)}</p><div class="plan-counts">${counts(E,p,false,plots,state)}</div><p class="plan-caption">Applies borough-wide. No parcel or construction footprint is implied. Engine cost ${fmt(effects.cost)}; upkeep ${fmt(effects.upkeep)}/year.</p></section>`;
    const xs=plots.map(t=>t[0]),ys=plots.map(t=>t[1]);
    const left=Math.max(0,Math.min(...xs)-1),right=Math.min(map.width-1,Math.max(...xs)+1);
    const top=Math.max(0,Math.min(...ys)-1),bottom=Math.min(map.height-1,Math.max(...ys)+1);
    const locatorLeft=Math.max(0,Math.min(...xs)-4),locatorRight=Math.min(map.width-1,Math.max(...xs)+3);
    const locatorTop=Math.max(0,Math.min(...ys)-3),locatorBottom=Math.min(map.height-1,Math.max(...ys)+3);
    const selected=new Set(plots.map(key));
    let context='';
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
      const cell=state.grid[y*map.width+x];if(cell)context+=contextTile(cell,!existing&&selected.has(`${x},${y}`));
    }
    let locatorContext='';
    for(let y=locatorTop;y<=locatorBottom;y++)for(let x=locatorLeft;x<=locatorRight;x++){
      const cell=state.grid[y*map.width+x];if(cell)locatorContext+=contextTile(cell,false).replaceAll('data-context=', 'data-locator-context=');
    }
    const locator=`<div class="plan-locator-row" style="display:flex;align-items:center;gap:14px;margin-top:14px"><svg class="plan-locator" viewBox="${locatorLeft*TILE} ${locatorTop*TILE} ${(locatorRight-locatorLeft+1)*TILE} ${(locatorBottom-locatorTop+1)*TILE}" role="img" aria-label="Site locator in the current town grid" style="display:block;flex:0 0 120px;width:120px;height:auto;border-radius:4px">${locatorContext}${plots.map(([x,y])=>`<rect data-locator-plot="${x},${y}" x="${x*TILE}" y="${y*TILE}" width="50" height="50" fill="${C.outline}" fill-opacity=".22"/>`).join('')}<path d="${boundary(plots)}" fill="none" stroke="${C.outline}" stroke-width="5"/></svg><p class="plan-caption" style="min-width:0;margin:0"><b>Town context</b><br>Same north-up grid; outlined site highlighted. One square is one town plot. Water and streets follow the current town.</p></div>`;
    const roles=p.kind==='initiative'?E.initiativeRoles(p.plan,plots.length):[];
    let overlays='';
    plots.forEach(([x,y],i)=>{
      let detail='';if(!existing){
        detail=rect(1,1,48,48,p.kind==='park'||roles[i]==='green'?'#b5c893':'#d4d6b7');
        if(p.kind==='park')detail+=parkTile(p.plan,i);
        else if(p.kind==='commerce')detail+=commerceTile(p.plan,i,plots.length);
        else detail+=initiativeTile(p.plan,roles[i],i,roles,E);
      }
      overlays+=`<g data-plot="${x},${y}" data-role="${esc(roles[i]||p.kind)}" transform="translate(${x*TILE} ${y*TILE})">${detail}</g>`;
    });
    const width=(right-left+1)*TILE,height=(bottom-top+1)*TILE;
    const arrowX=(right+1)*TILE-30,arrowY=top*TILE+30;
    const scaleX=(right+1)*TILE-85,scaleY=(bottom+1)*TILE-25;
    const roads=(top<=11&&bottom>=11)?`<text x="${left*TILE+15}" y="${11*TILE+32}" fill="#354239" font-size="12" font-weight="600">MAIN ST</text>`:'';
    const caption=existing?'Current town grid. The outlined plots are the site being compared.':`Plot boundaries and context follow the town grid. Interior placement is illustrative; symbols represent accepted fields, not surveyed footprints${p.kind==='park'?', and tree symbols indicate canopy level':''}.`;
    const legend=`<span><i style="background:${C.outline}"></i> Site boundary</span><span><i style="background:${C.water}"></i> Water</span><span><i style="background:${C.road}"></i> Road</span><span><i style="background:${C.roof}"></i> Building</span>${!existing?`<span><i style="background:${C.tree}"></i> Green space</span>`:''}`;
    return `<figure class="plan-exhibit"${price} data-plan-id="${esc(p.id)}" data-existing="${!!existing}"><div class="plan-exhibit-head"><b>${existing?'Existing conditions':esc(p.title)}</b><span>North up · plot grid</span></div><svg class="plan-illustration" data-revision="${revision}" xmlns="http://www.w3.org/2000/svg" viewBox="${left*TILE} ${top*TILE} ${width} ${height}" role="img" aria-label="${esc((existing?'Existing conditions at ': 'Site plan for ')+p.title)}" style="display:block;width:100%;height:auto;background:${C.paper}"><title>${esc(existing?'Existing conditions':p.title)}</title><desc>${esc(caption)}</desc>${context}${overlays}<path data-site-outline="true" d="${boundary(plots)}" fill="none" stroke="${C.outline}" stroke-width="3" stroke-dasharray="7 4" stroke-linejoin="round"/>${roads}<g transform="translate(${arrowX} ${arrowY})"><rect x="-17" y="-22" width="34" height="62" rx="5" fill="${C.paper}" fill-opacity=".9"/><text x="0" y="0" text-anchor="middle" font-size="12" font-family="system-ui,sans-serif" font-weight="600" fill="${C.ink}">N</text><path d="m0 7-7 23 7-5 7 5Z" fill="${C.ink}"/></g><g transform="translate(${scaleX} ${scaleY})"><rect x="-9" y="-16" width="78" height="34" rx="4" fill="${C.paper}" fill-opacity=".92"/><path d="M0 0v6h50V0" fill="none" stroke="${C.ink}" stroke-width="2"/><text x="25" y="-3" text-anchor="middle" font-size="12" fill="${C.ink}">1 plot</text></g></svg><figcaption><div class="plan-legend">${legend}</div><div class="plan-counts">${counts(E,p,existing,plots,state)}</div>${locator}${existing?'':`<p class="plan-price">Engine cost <b>${fmt(effects.cost)}</b> · upkeep <b>${fmt(effects.upkeep)}/year</b></p>`}<p class="plan-caption">${esc(caption)}</p></figcaption></figure>`;
  }
  const ROLE_COLORS={homes:'#b47e5d',workshop:'#a77555',mixed:'#caad72',civic:'#9ba69a',recreation:'#b6c987',event:'#d5bc89',farm:'#d3be7c',storage:'#969c94',path:'#e2d1a6',parking:'#a6a393',green:'#7f9e68',pond:'#8cb5b3',policy:'#c0b8a5',buffer:'#88a477',retained:'#d5d7b9',unused:'#e3e4ce'};
  // Both SVG exhibits and the town canvas consume these exact engine strips.
  // This is a projection only; it never allocates, fits or reconstructs a layout.
  function layoutShapes(p){
    if(!p?.layout)return[];
    const shapes=[];
    for(const allocation of p.layout.allocations)for(const segment of allocation.segments)shapes.push({...segment,componentId:allocation.componentId,role:allocation.role,label:allocation.label,sharedWith:allocation.sharedWith});
    for(const [field,role] of [['buffer','buffer'],['preserved','retained'],['unused','unused']])for(const segment of p.layout[field]||[])shapes.push({...segment,componentId:null,role,label:role,sharedWith:null});
    return shapes;
  }
  function programSymbol(shape,x,y,w,h){
    const role=shape.role,cx=x+w/2,cy=y+h/2;
    if(w<4)return'';
    if(['homes','workshop','mixed','civic','storage'].includes(role)){
      let out=rect(x+Math.min(3,w/5),y+6,Math.max(.5,w-Math.min(6,w/3)),h-12,ROLE_COLORS[role],'stroke="#6e6756" stroke-width=".8"');
      if(role==='workshop')out+=`<path d="M${x+2} ${y+15}h${Math.max(0,w-4)}m-${Math.max(0,w-4)} 10h${Math.max(0,w-4)}" stroke="#ead9ba" stroke-width="2"/>`;
      if(role==='homes')out+=`<path d="M${cx} ${y+9}v${h-18}" stroke="#f5dec4" stroke-width="1.5"/>`;
      if(role==='mixed')out+=rect(x+2,y+h-13,Math.max(0,w-4),5,'#567c6b');
      if(role==='storage')out+=`<path d="M${x+2} ${y+14}h${Math.max(0,w-4)}m-${Math.max(0,w-4)} 9h${Math.max(0,w-4)}m-${Math.max(0,w-4)} 9h${Math.max(0,w-4)}" stroke="#d9dfd0"/>`;
      return out;
    }
    if(['farm','parking'].includes(role))return Array.from({length:5},(_,i)=>`<path d="M${x+1} ${y+7+i*8}h${Math.max(0,w-2)}" stroke="${role==='farm'?'#9d8c55':'#f4f0dc'}" stroke-width="1"/>`).join('');
    if(role==='pond')return `<ellipse cx="${cx}" cy="${cy}" rx="${w*.38}" ry="${h*.31}" fill="#a9d1ca" stroke="#5f8e7c"/>`;
    if(['green','buffer'].includes(role))return [y+12,y+35].map(yy=>tree(cx,yy,Math.min(7,w*.3))).join('');
    if(role==='path')return `<path d="M${cx} ${y}v${h}" stroke="#f9efd4" stroke-width="${Math.min(w*.6,8)}" stroke-dasharray="4 2"/>`;
    if(role==='event')return `<ellipse cx="${cx}" cy="${cy}" rx="${w*.36}" ry="${h*.32}" fill="#e9d9af" stroke="#9f8153" stroke-width="2"/>`;
    if(role==='recreation')return rect(x+2,y+5,Math.max(0,w-4),h-10,'none','stroke="#f2f0d5" stroke-width="1.5"')+`<path d="M${x+2} ${cy}h${Math.max(0,w-4)}" stroke="#f2f0d5"/>`;
    return'';
  }
  function renderProgram({state,proposal:p,engine:E,existing=false}){
    if(!p.layout||!p.programRevision)return `<p class="plan-no-site" role="status">The accepted engine layout is unavailable. Re-preview before confirming.</p>`;
    const e=E.effectsOf(p,state),plots=p.layout.plots,map=E.mapSize(state),defs=new Map(E.capabilities().map(d=>[d.id,d]));
    const quantities=p.program.components.map(c=>pill(`${c.label} · ${defs.get(c.capability)?.unit||c.capability}${c.sharedWith?' · shared with '+(p.program.components.find(host=>host.id===c.sharedWith)?.label||'another activity'):''}`,c.quantity)).join('');
    if(!plots.length)return `<section class="plan-no-site" data-program-revision="${esc(p.programRevision)}" data-plan-cost="${e.cost}"><b>${esc(p.title)} · borough-wide program</b><div class="plan-counts">${quantities}</div><p class="plan-caption">No construction footprint. Fictional engine estimate ${fmt(e.cost)}; upkeep ${fmt(e.upkeep)}/year.</p></section>`;
    const xs=plots.map(p=>p[0]),ys=plots.map(p=>p[1]),left=Math.max(0,Math.min(...xs)-1),right=Math.min(map.width-1,Math.max(...xs)+1),top=Math.max(0,Math.min(...ys)-1),bottom=Math.min(map.height-1,Math.max(...ys)+1);
    let context='';
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
      const cell=state.grid[y*map.width+x],allocation=p.layout.cells.find(c=>c.plot[0]===x&&c.plot[1]===y);
      if(cell)context+=contextTile(cell,!existing&&allocation?.usedArea>0);
    }
    const shapes=existing?[]:layoutShapes(p);
    const strips=shapes.map(shape=>{
      const x=(shape.plot[0]+shape.offset)*TILE,y=shape.plot[1]*TILE,w=shape.area*TILE,h=TILE,color=ROLE_COLORS[shape.role]||'#c1b8a1';
      return `<g data-layout-segment="true" data-plot="${shape.plot.join(',')}" data-component-id="${esc(shape.componentId||'')}" data-role="${esc(shape.role)}" data-shared-with="${esc(shape.sharedWith||'')}" data-offset="${shape.offset}" data-area="${shape.area}"><title>${esc(shape.label)} · ${shape.area} plot${shape.sharedWith?' · shared floor space':''}</title>${rect(x,y,w,h,color,`fill-opacity="${shape.sharedWith?.28:shape.role==='retained'?.1:.85}" stroke="#626e55" stroke-width=".7" ${shape.sharedWith?'stroke-dasharray="3 2"':''}`)}${shape.sharedWith?rect(x,y+1,w,4,color):programSymbol(shape,x,y,w,h)}</g>`;
    }).join('');
    const caption='Engine allocations on the exact selected boundary. Strips preserve plot-equivalent areas; shared activities overlap their named host. Interior symbols and fractional plot use are schematic game assumptions.';
    return `<figure class="plan-exhibit" data-plan-id="${esc(p.id)}" data-program-revision="${esc(p.programRevision)}" data-plan-cost="${e.cost}"><div class="plan-exhibit-head"><b>${existing?'Existing conditions':esc(p.title)}</b><span>North up · exact plot grid</span></div><svg class="plan-illustration" data-revision="${esc(p.programRevision)}" xmlns="http://www.w3.org/2000/svg" viewBox="${left*TILE} ${top*TILE} ${(right-left+1)*TILE} ${(bottom-top+1)*TILE}" role="img" aria-label="${esc((existing?'Existing conditions: ':'Site plan: ')+p.title)}"><title>${esc(p.title)}</title><desc>${caption}</desc>${context}${strips}<path data-site-outline="true" d="${boundary(plots)}" fill="none" stroke="${C.outline}" stroke-width="2.5" stroke-dasharray="6 3"/></svg><figcaption><div class="plan-counts">${quantities}${pill('allocated plots',p.layout.usedArea)}${pill('retained plots',p.layout.preservedArea)}${pill('unused plots',p.layout.freeArea)}</div><p class="plan-price">Engine cost <b>${fmt(e.cost)}</b> · upkeep <b>${fmt(e.upkeep)}/year</b></p><p class="plan-caption">${caption}</p></figcaption></figure>`;
  }
  function drawLayout(ctx,p,project){
    for(const s of layoutShapes(p)){
      if(s.role==='retained'||s.role==='unused')continue;
      const [x,y]=s.plot,points=[[x+s.offset,y],[x+s.offset+s.area,y],[x+s.offset+s.area,y+1],[x+s.offset,y+1]].map(v=>project(...v));
      ctx.save();ctx.globalAlpha=s.sharedWith?.4:.9;ctx.fillStyle=ROLE_COLORS[s.role]||'#c1b8a1';ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fill();ctx.strokeStyle='#40533d';ctx.lineWidth=.8;if(s.sharedWith)ctx.setLineDash([2,2]);ctx.stroke();
      if(['farm','parking','workshop','storage'].includes(s.role)){
        ctx.strokeStyle=s.role==='parking'?'#f4efdd':'#75684b';
        for(let i=1;i<5;i++){const a=project(x+s.offset,y+i/5),b=project(x+s.offset+s.area,y+i/5);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
      }
      if(['green','buffer','pond','recreation','event'].includes(s.role)){const a=project(x+s.offset+s.area/2,y+.5);ctx.fillStyle=s.role==='pond'?'#b1ddd6':s.role==='event'?'#f0dcb3':'#446f45';ctx.beginPath();ctx.arc(...a,Math.max(1,Math.min(5,Math.abs(points[1][0]-points[0][0])*.3)),0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
  }
  return {render,layoutShapes,drawLayout};
})();
if(typeof module!=='undefined')module.exports=PLAN_RENDERER;
