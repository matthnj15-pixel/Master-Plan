/* ===== Master Plan engine: pure simulation, no DOM. Runs in the browser and in Node tests. ===== */
const N = 24;
// Feature flags come from the build (flags.json). In Node tests MP_BUILD is undefined, so every flag reads as off.
const FLAGS=(typeof MP_BUILD!=='undefined'&&MP_BUILD&&MP_BUILD.flags)||{};
const MAYOR_AUTHORITY = 300; // $K a mayor can approve without council

function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rand(seed,key){let a=(seed^hashStr(key))>>>0;a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const r1=v=>Math.round(v*10)/10;

/* ---------- plan schemas per proposal kind ---------- */
const KINDS = {
  bridge:{
    params:{scope:{type:'enum',label:'Repair scope',options:['patch','full'],labels:{patch:'Patch the deck',full:'Full rehab'}}},
    chips:[{label:'Go full rehab',text:'Let\'s do the full rehab so we never deal with this again.',apply:p=>({scope:'full'})},
           {label:'Just patch it',text:'Can we patch it for now and save money?',apply:p=>({scope:'patch'})}],
    effects(p){const full=p.scope==='full';return{cost:full?260:120,upkeep:0,jobs:0,units:0,housing:0,walk:0,live:full?1:0,conf:0,prop:0,approval:1,farm:0,parking:0,bridgeRisk:full?0:0.25,notes:[full?'Fixes the Main St bridge for 30+ years':'Buys a few years; some risk remains']};}
  },
  stripmall:{
    params:{stores:{type:'int',label:'Stores',min:4,max:10,step:1},
            parking:{type:'int',label:'Parking spaces',min:60,max:200,step:20},
            landscaping:{type:'bool',label:'Landscaped buffer'},
            sidewalk:{type:'bool',label:'Sidewalk link to town'}},
    chips:[{label:'Add a sidewalk link',text:'I want a sidewalk connecting it to Pine Street so people can walk there.',apply:p=>({sidewalk:true})},
           {label:'Cut parking to 100',text:'160 spaces is a sea of asphalt. Can you live with 100?',apply:p=>({parking:100})},
           {label:'Add landscaping',text:'Add a landscaped buffer along Route 22.',apply:p=>({landscaping:true})}],
    effects(p){return{cost:110+(p.sidewalk?60:0)+(p.landscaping?35:0),upkeep:8,jobs:p.stores*8,units:p.stores,housing:0,
      walk:-(3+p.parking/80)+(p.sidewalk?3:0),live:1+(p.landscaping?1:0),conf:1,prop:p.landscaping?0:-0.003,approval:1,farm:2,parking:p.parking,downtown:-4,
      notes:['Developer builds it; the borough pays for road access','Pulls some shoppers away from Main Street']};}
  },
  park:{
    params:{memorial:{type:'bool',label:'Veterans memorial'},trees:{type:'int',label:'Tree canopy (1 to 3)',min:1,max:3,step:1},
            playground:{type:'bool',label:'Playground'},amphitheater:{type:'bool',label:'Amphitheater'},
            fountain:{type:'bool',label:'Fountain'},paths:{type:'bool',label:'Walking paths to Main St'},
            parking:{type:'int',label:'Parking spaces',min:0,max:40,step:10}},
    chips:[{label:'Add an amphitheater',text:'Add a small amphitheater for summer concerts.',apply:p=>({amphitheater:true})},
           {label:'Trim the cost',text:'Ellen Pryor will balk at the price. What can we cut without losing the memorial?',apply:p=>({fountain:false,trees:Math.max(1,p.trees-1),parking:0})},
           {label:'Add a fountain',text:'A fountain by the memorial would be beautiful.',apply:p=>({fountain:true})}],
    effects(p){const cost=260+(p.memorial?120:0)+p.trees*45+(p.playground?80:0)+(p.amphitheater?170:0)+(p.fountain?60:0)+(p.paths?40:0)+p.parking*2;
      return{cost,upkeep:20+(p.amphitheater?10:0)+(p.fountain?6:0),jobs:3,units:0,housing:0,
      walk:4+(p.paths?3:0)-p.parking/20,live:4+(p.playground?2:0)+(p.amphitheater?3:0)+p.trees*0.8,conf:p.amphitheater?2:0,
      prop:0.005+p.trees*0.002+(p.fountain?0.002:0)+(p.memorial?0.002:0),approval:p.memorial?2:0,farm:0,parking:p.parking,
      notes:['Raises nearby property values a little every year','Payoff is slow: most of the value shows up after year 3']};}
  },
  commerce:{
    params:{stores:{type:'int',label:'Storefronts',min:6,max:14,step:1},stories:{type:'int',label:'Stories (upper floors = apartments)',min:1,max:3,step:1},
            parking:{type:'int',label:'Parking spaces',min:0,max:160,step:20},anchor:{type:'enum',label:'Anchor tenant',options:['none','grocery','cinema'],labels:{none:'None',grocery:'Grocery store',cinema:'Small cinema'}},
            plaza:{type:'bool',label:'Public plaza'}},
    chips:[{label:'Add a public plaza',text:'Could we fit a small public plaza out front?',apply:p=>({plaza:true})},
           {label:'Cut parking to 40',text:'Downtown is walkable. Can we cut parking to 40 spaces?',apply:p=>({parking:40})},
           {label:'Fewer stores, lower cost',text:'This is expensive. What if we go with 8 storefronts?',apply:p=>({stores:8})}],
    effects(p){const anchorUnits=p.anchor==='none'?0:3;const cost=650+p.stores*25+p.parking*2.5+(p.stories-1)*80+(p.anchor==='grocery'?120:p.anchor==='cinema'?160:0)+(p.plaza?60:0);
      return{cost,upkeep:25+p.parking*0.1,jobs:p.stores*10+(p.anchor==='grocery'?45:p.anchor==='cinema'?30:0),units:p.stores+anchorUnits,housing:(p.stories-1)*60,
      walk:1+(p.stories>1?2:0)+(p.plaza?2:0)-p.parking/40,live:3+(p.anchor==='grocery'?2:p.anchor==='cinema'?3:0)+(p.plaza?1:0),conf:5,prop:0.004,approval:3,farm:0,parking:p.parking,
      notes:['Stores are in high demand downtown','Plan details are thin; real costs could run higher']};}
  },
  boutique:{
    params:{incentive:{type:'int',label:'Tax incentive ($K)',min:50,max:250,step:25},lease:{type:'int',label:'Lease commitment (years)',min:3,max:10,step:1},
            clawback:{type:'bool',label:'Clawback if they leave early'}},
    chips:[{label:'Demand a clawback',text:'If you leave early, the incentive comes back to the borough. That\'s non-negotiable.',apply:p=>({clawback:true})},
           {label:'Lower the incentive',text:'$200K is a lot for one store. How about $100K?',apply:p=>({incentive:100})},
           {label:'Longer lease',text:'Commit to 8 years and we have a deal.',apply:p=>({lease:8})}],
    effects(p){return{cost:p.incentive,upkeep:0,jobs:12,units:1,housing:0,walk:0,live:0,conf:4,prop:0,approval:1,farm:0,parking:0,
      notes:['A luxury brand in a town this size is a gamble','Lease length and clawback decide who carries the risk']};}
  },
  studenthousing:{
    params:{beds:{type:'int',label:'Beds',min:200,max:800,step:100},stories:{type:'int',label:'Stories',min:3,max:6,step:1},
            parking:{type:'int',label:'Parking spaces',min:0,max:300,step:50},retail:{type:'bool',label:'Ground-floor shops'}},
    chips:[{label:'Add ground-floor shops',text:'Put shops on the ground floor facing College Ave.',apply:p=>({retail:true})},
           {label:'Keep it 4 stories',text:'Neighbors on College Hill will riot over 5 stories. Cap it at 4.',apply:p=>({stories:4})},
           {label:'Cut parking',text:'Students walk. Cut parking to 50 spaces.',apply:p=>({parking:50})}],
    effects(p){return{cost:80+(p.retail?40:0),upkeep:10,jobs:15+(p.retail?20:0),units:p.retail?3:0,housing:p.beds,
      walk:(p.retail?2:0)-p.parking/150,live:-1-(p.stories>4?2:0),conf:2,prop:0.002,approval:p.stories>4?-3:-1,farm:0,parking:p.parking,students:p.beds,
      notes:['Students spend money downtown but neighbors worry about noise and traffic']};}
  },
  initiative:{
    params:{homes:{type:'int',label:'Homes',min:0,max:200,step:10},affordable:{type:'bool',label:'Priced for working families'},
      shops:{type:'int',label:'Storefronts',min:0,max:12,step:1},stories:{type:'int',label:'Stories',min:1,max:5,step:1},
      parking:{type:'int',label:'Parking spaces',min:0,max:300,step:20},green:{type:'int',label:'Green space (0 to 3)',min:0,max:3,step:1},
      plaza:{type:'bool',label:'Public plaza'},
      civic:{type:'enum',label:'Public building',options:['none','library','community_center','farmers_market','school_annex'],labels:{none:'None',library:'Library',community_center:'Community center',farmers_market:'Farmers market',school_annex:'School annex'}},
      safety:{type:'enum',label:'Safety facility',options:['none','police_substation','fire_station','streetlights'],labels:{none:'None',police_substation:'Police substation',fire_station:'Fire station',streetlights:'Streetlights'}},
      stormwater:{type:'bool',label:'Rain gardens and stormwater basin'},
      policy:{type:'enum',label:'Ordinance',options:['none','parking_reform','downtown_apartments','community_policing','traffic_calming','rental_inspections','impact_fees'],labels:{none:'None',parking_reform:'Drop parking minimums',downtown_apartments:'Allow apartments downtown',community_policing:'Community policing',traffic_calming:'Traffic calming',rental_inspections:'Rental inspections',impact_fees:'Developer impact fees'}},
      quality:{type:'int',label:'Design quality (1 to 3)',min:1,max:3,step:1}},
    chips:[{label:'Add streetlights',text:'Let\'s add streetlights to this.',apply:p=>({safety:p.safety==='none'?'streetlights':p.safety})},
           {label:'Add rain gardens',text:'Add rain gardens and a stormwater basin so this doesn\'t make flooding worse.',apply:p=>({stormwater:true})},
           {label:'Trim the cost',text:'What can we trim to bring the cost down?',apply:p=>({quality:Math.max(1,p.quality-1),parking:Math.max(0,p.parking-40)})},
           {label:'Homes above the shops',text:'Put apartments above the storefronts.',apply:p=>({stories:Math.max(2,p.stories),homes:Math.max(p.homes,20)})}],
    effects(p){
      const q=[0.85,1,1.25][p.quality-1]||1;
      const CIV={none:[0,0,0,0,0],library:[450,60,8,3,2],community_center:[380,45,6,3,2],farmers_market:[120,10,10,2,1],school_annex:[600,80,20,3,1]};
      const SAF={none:[0,0,0,0],police_substation:[420,140,12,9],fire_station:[650,120,14,7],streetlights:[150,10,0,4]};
      const POL={none:{},parking_reform:{cost:10,walk:2,conf:-1,afford:1},downtown_apartments:{cost:10,afford:3,walk:1,approval:-1},community_policing:{upkeep:60,safety:5,approval:1},traffic_calming:{cost:120,walk:3,safety:3,conf:-1},rental_inspections:{cost:20,upkeep:30,safety:2,live:1,afford:-1},impact_fees:{cost:10,conf:-3,afford:-1}};
      const c=CIV[p.civic]||CIV.none,sf=SAF[p.safety]||SAF.none,po=POL[p.policy]||{};
      const build=p.homes*4+p.shops*30+((p.shops||p.homes)?(p.stories-1)*40:0)+p.green*90+(p.plaza?60:0)+c[0]+sf[0]+(p.stormwater?140:0);
      const any=build>0||p.parking>0;
      const mixed=p.shops>0&&p.stories>1&&p.homes>0;
      const notes=[];if(p.policy!=='none')notes.push('The ordinance takes effect when the year ends');if(p.affordable&&p.homes)notes.push('Below-market homes cost the borough $10K each in subsidy');if(p.parking>120)notes.push('Big parking lots add runoff to Kish Creek');if(!notes.length)notes.push('Your proposal, drafted by the borough planner');
      return{cost:Math.round((any?60:0)+(build+p.parking*2.5)*q+(p.affordable?p.homes*10:0)+(po.cost||0)),
        upkeep:Math.round((any?10:0)+p.green*8+c[1]+sf[1]+(po.upkeep||0)+p.parking*0.1),
        jobs:p.shops*9+c[2]+sf[2]+(p.homes>0?3:0),units:p.shops+(p.civic==='farmers_market'?2:0),housing:p.homes*2.4,
        walk:p.green*1.5+(p.plaza?2:0)+(p.shops>0&&p.parking<=p.shops*10?2:0)-p.parking/40+(mixed?1:0)+(po.walk||0)+(p.safety==='streetlights'?1:0)+(p.civic==='farmers_market'?1:0),
        live:p.green*1.5+(p.plaza?1:0)+c[3]+(p.quality-2)+(p.stormwater?0.5:0)+(po.live||0),
        conf:(p.shops>0?2:0)+(p.civic==='farmers_market'?2:0)+(p.plaza?1:0)+(po.conf||0),
        prop:p.green*0.002+(p.quality-1)*0.0015+(p.plaza?0.001:0)+(p.civic!=='none'?0.002:0),
        approval:c[4]+(p.affordable&&p.homes?1:0)+(p.safety!=='none'?1:0)+(po.approval||0),farm:0,parking:p.parking,
        safety:sf[3]+(po.safety||0)+(mixed?1:0),afford:(p.homes/40)*(p.affordable?2.5:1)+(po.afford||0),storm:p.stormwater?1:0,notes};}
  },
  subdivision:{
    params:{homes:{type:'int',label:'Homes',min:20,max:80,step:10},lotSize:{type:'enum',label:'Lot size',options:['large','small'],labels:{large:'Large lots (sprawl)',small:'Small lots (compact)'}},
            preserve:{type:'bool',label:'Preserve a farmland buffer'}},
    chips:[{label:'Go compact',text:'Smaller lots, less farmland lost.',apply:p=>({lotSize:'small'})},
           {label:'Preserve a buffer',text:'Keep a farmland buffer along Ridge Road.',apply:p=>({preserve:true})}],
    effects(p){const farm=(p.lotSize==='large'?p.homes/8:p.homes/14)-(p.preserve?2:0);
      return{cost:150+(p.preserve?40:0),upkeep:15,jobs:5,units:0,housing:p.homes*2.6,walk:p.lotSize==='large'?-3:-1,live:1,conf:1,prop:0.001,approval:0,farm:Math.max(1,farm),parking:0,
      notes:['New families, but the borough maintains the new roads forever']};}
  }
};

function defaultPlan(kind){
  return {bridge:{scope:'full'},
    stripmall:{stores:8,parking:160,landscaping:false,sidewalk:false},
    park:{memorial:true,trees:2,playground:true,amphitheater:false,fountain:false,paths:true,parking:10},
    commerce:{stores:10,stories:2,parking:80,anchor:'grocery',plaza:false},
    boutique:{incentive:200,lease:3,clawback:false},
    studenthousing:{beds:600,stories:5,parking:150,retail:false},
    subdivision:{homes:60,lotSize:'large',preserve:false},
    initiative:{homes:0,affordable:false,shops:0,stories:1,parking:0,green:0,plaza:false,civic:'none',safety:'none',stormwater:false,policy:'none',quality:2}}[kind];
}

function validatePlan(kind,plan,changes){
  const sch=KINDS[kind].params, out={...plan}, applied={};
  for(const [k,v] of Object.entries(changes||{})){
    const s=sch[k]; if(!s) continue;
    if(s.type==='int'){let n=Number(v); if(!isFinite(n)) continue; n=clamp(Math.round((n-s.min)/s.step)*s.step+s.min,s.min,s.max); if(n!==out[k]){out[k]=n;applied[k]=n;}}
    else if(s.type==='bool'){const b=v===true||v==='true'; if(b!==out[k]){out[k]=b;applied[k]=b;}}
    else if(s.type==='enum'){if(s.options.includes(v)&&v!==out[k]){out[k]=v;applied[k]=v;}}
  }
  return {plan:out,applied};
}

function nearRoad(g,c,r,width=N,height=N){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=c.x+dx,y=c.y+dy;if(x<0||y<0||x>=width||y>=height)continue;if(g[y*width+x].road)return true;}return false;}
function growthTiles(g,map=MILLBROOKE.map){
  const b=map.growth.bounds,[cx,cy]=map.growth.center;
  if(map.growth.enabled===false)return[];
  return g.filter(c=>c.t==='grass'&&!c.road&&!c.b&&!c.site&&c.x>=b.minX&&c.x<=b.maxX&&c.y>=b.minY&&c.y<=b.maxY&&nearRoad(g,c,1,map.width,map.height))
    .sort((a,b)=>(Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy))||(a.var-b.var));
}

/* ---------- state ---------- */
function newGame(seed,definition=MILLBROOKE,options={}){
  seed=seed??(Date.now()%100000);
  const scenario=copy(definition),initial=scenario.initial;
  const grid=scenario.map.grid;delete scenario.map.grid;
  if(!scenario.id||!Number.isInteger(scenario.map.width)||!Number.isInteger(scenario.map.height)||
    !Array.isArray(grid)||grid.length!==scenario.map.width*scenario.map.height)throw new Error('Invalid scenario map');
  const s={v:3,seed,scenarioId:scenario.id,scenario,calendar:copy(scenario.calendar),year:1,maxYears:scenario.calendar.maxTurns,termYear:1,term:1,town:scenario.metadata.town,
    pop:initial.pop,cash:initial.cash,taxRate:'hold',prevTax:'hold',propIdx:1.0,
    meters:{walk:48,live:55,conf:58,approval:52,safety:62,afford:58,...initial.meters},policies:{},
    capital:3,bonds:[],built:[],pending:[],decided:{},
    presenters:Object.fromEntries(Object.entries(scenario.people.presenters).map(([k,v])=>[k,{rel:v.rel}])),
    council:Object.fromEntries(scenario.people.council.map(m=>[m.id,{rel:m.rel}])),
    lobby:{},flags:{bridgeRisk:0,bridgeClosed:false,students:0,boutique:null,deficitYears:0,floodRisk:0.06,...initial.flags},facts:copy(initial.facts||{}),
    grid,proposals:[],chats:{},reports:[],phase:'agenda',election:null,history:[]};
  if(FLAGS.compositionPlans){initializeComposition(s,options);installCompositionScenario(s);}
  s.proposals=proposalsFor(s,1);
  s.history.push(snapshotStats(s));
  return s;
}

function makeProposal(id,year,s){const d=scenarioOf(s).proposals.definitions[id];
  if(FLAGS.compositionPlans&&d.program){const r=previewProgram(s,{program:d.program,plots:d.plots||sitesOf(s)[d.site]||[],id,presenter:d.presenter});if(!r.ok)return null;return{...r.proposal,site:d.site||r.proposal.site,year,mine:false};}
  return{id,...copy(d),plan:validatePlan(d.kind,defaultPlan(d.kind),d.plan||{}).plan,year,status:'open'};}
function proposalsFor(s,year){
  const out=[];
  for(const p of s.proposals||[]) if(p.status==='tabled'){p.status='open';out.push(p);}
  for(const id of (scenarioOf(s).proposals.schedule[year]||[])) if(!s.decided[id]&&!out.find(p=>p.id===id)){const p=makeProposal(id,year,s);if(p)out.push(p);}
  if(FLAGS.compositionPlans&&s.v===4&&year>1){for(const o of programOpportunities(s).slice(0,2)){if(out.some(p=>p.id===o.id))continue;const r=previewProgram(s,{program:o.program,plots:o.plots,id:o.id,presenter:o.presenter});if(r.ok)out.push({...r.proposal,mine:false,opportunity:o.id});}}
  return out;
}

/* ---------- forecasting & scoring ---------- */
const SAFE_AFF={stripmall:p=>[-1,0],commerce:p=>[1,(p.stories-1)*0.8],studenthousing:p=>[-2,p.beds/150],subdivision:p=>[0,p.homes/30],park:p=>[1,0],boutique:p=>[0,0],bridge:p=>[p.scope==='full'?1:0,0]};
function effectsOf(p,s){if(FLAGS.compositionPlans&&p.program)return compositionEffects(p,s);
  const e=KINDS[p.kind].effects(p.plan);const pr=presentersOf(s)[p.presenter];if(p.emergency)e.cost*=1.6;
  const labels=scenarioOf(s).labels;e.notes=e.notes.map(n=>n.replaceAll('Kish Creek',labels.creek).replaceAll('Main St bridge',labels.bridgeShort||labels.bridge));
  if(e.safety===undefined){const sa=(SAFE_AFF[p.kind]||(()=>[0,0]))(p.plan);e.safety=sa[0];e.afford=sa[1];}
  e.creek=0;const par=p.traits?{traits:p.traits}:parcelsOf(s)[p.site];
  if(par&&par.traits.includes('creek')){const soft=p.kind==='park'||(p.kind==='initiative'&&!p.plan.homes&&!p.plan.shops&&p.plan.civic==='none'&&p.plan.parking<60);e.creek=soft?0:1;if(soft)e.storm=(e.storm||0)+0.5;}
  if(p.kind==='initiative'&&par){
    if(par.traits.includes('creek')){e.live+=1;e.notes=['Creek views, but anything built here sits in the floodplain'].concat(e.notes);}
    if(par.traits.includes('neighbors')&&(p.plan.parking>100||p.plan.safety==='police_substation'||p.plan.safety==='fire_station'||p.plan.shops>6||p.plan.stories>3)){e.approval-=1.5;e.notes=['Neighbors will object to something this big next door'].concat(e.notes);}
    if(par.traits.includes('main')&&p.plan.shops)e.walk+=1;
    if(par.traits.includes('edge')){e.walk-=1;}
  }
  if(p.kind==='initiative'&&p.plots&&p.plots.length)e.cost+=p.plots.length*15; // MP-033: site prep for every plot
  const d=p.demo;
  if(d&&(d.cost||d.residents||d.landmarks.length||d.projects.length)){ // MP-034: demolition and acquisition
    e.cost+=d.cost;e.approval+=d.approval;e.live+=d.live;e.conf+=d.conf;e.jobs-=d.untrackedJobs;e.farm+=d.farm;
    if(d.warning)e.notes=[d.warning].concat(e.notes);
    if(d.residents)e.notes=[`Displaces about ${d.residents} residents`].concat(e.notes);}
  if(p.grant)e.cost=e.cost*(1-p.grant);
  // low detail plans hide extra cost; shown as a range
  e.costHigh=Math.round(e.cost*(1+(100-pr.detail)/250));
  e.cost=Math.round(e.cost);return e;}
function deliveryOdds(s,p){const pr=presentersOf(s)[p.presenter];let o=0.45+pr.comp*0.004+pr.detail*0.002+(s.presenters[p.presenter].rel-50)*0.001;
  if(p.kind==='boutique'&&p.plan.clawback)o-=0.18;return clamp(o,0.3,0.96);}
function effVector(s,p){const e=effectsOf(p,s);return{jobs:e.jobs/40,cost:e.cost/250,walk:e.walk,live:e.live,conf:e.conf,stores:e.units/3,prop:e.prop*400,approval:e.approval+(p.petition?2:0),farm:e.farm/2,downtown:e.downtown||0,housing:e.housing/100,safety:e.safety||0,afford:e.afford||0,flood:(e.creek||0)*2+e.parking/100-(e.storm||0)*2,
  demolish:p.demo?(p.demo.residents/120+p.demo.landmarks.length*2+p.demo.projects.length*1.5+(p.demo.infeasible?8:0)):0};}
function memberScore(s,m,p,champion){
  const v=effVector(s,p);let sc=0;
  for(const [k,w] of Object.entries(m.w))sc+=w*(v[k]||0);
  sc-=v.demolish||0; // MP-034/035: nobody on the council likes tearing things down
  sc+=(s.council[m.id].rel-50)/10;
  if(p.petition)sc+=2.5; // public pressure
  if(m.rival&&p.presenter==='merchants')sc+=3;
  if(m.rival&&champion===p.id)sc-=3;
  const lb=(s.lobby[m.id]&&s.lobby[m.id][p.id])||0;sc+=lb;
  return sc;
}
function lean(sc){return Math.round(100/(1+Math.exp(-sc/3)));}
function hearingOptions(s,p){const options=p.group?s.proposals.filter(q=>q.group===p.group&&q.status==='open'):[p];return FLAGS.compositionPlans?options.map(q=>q.id===p.id?p:q):options;}
function forecastVote(s,p,champion){
  const opts=hearingOptions(s,p);
  const votes=councilOf(s).map(m=>{
    const leans=opts.map(o=>({id:o.id,lean:lean(memberScore(s,m,o,champion))}));
    const best=leans.slice().sort((a,b)=>b.lean-a.lean)[0];
    return{member:m.id,leans,vote:best.lean>=50?best.id:'no'};
  });
  const tally={};for(const v of votes)tally[v.vote]=(tally[v.vote]||0)+1;
  const winner=opts.find(o=>(tally[o.id]||0)>=scenarioOf(s).decisionRoute.votesRequired);
  return{votes,tally,winner:winner?winner.id:null,options:opts.map(o=>o.id)};
}

/* ---------- lobbying (engine prices what the AI extracted) ---------- */
// MP-025: the engine prices every pitch. Credit depends on how specific the pitch was (judged by the AI
// for typed pitches; quick-tap pitches are always "quick"), and each part has a cap on how far it can
// move this member's lean on the plan the mayor backs.
const PITCH={strong:{per:2.5,max:5,lean:10},weak:{per:0.75,max:1,lean:3},quick:{per:0.5,max:1,lean:3},none:{per:0,max:0,lean:0}};
function lobbyLeanAt(s,m,p,targetId,pts){s.lobby[m.id]=s.lobby[m.id]||{};const keep=s.lobby[m.id][targetId]||0;s.lobby[m.id][targetId]=keep+pts;const l=lean(memberScore(s,m,p,targetId));s.lobby[m.id][targetId]=keep;return l;} // the same rounded lean the player sees
function capPoints(s,m,p,targetId,pts,leanCap,base){
  if(!p||pts<=0)return pts;if(base==null)base=lobbyLeanAt(s,m,p,targetId,0);
  if(lobbyLeanAt(s,m,p,targetId,pts)-base<=leanCap)return pts;
  let lo=0,hi=pts;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(lobbyLeanAt(s,m,p,targetId,mid)-base<=leanCap)lo=mid;else hi=mid;}return lo;}
function applyLobby(s,memberId,targetId,ex){
  const m=councilOf(s).find(c=>c.id===memberId);const notes=[];let pts=0;
  const p=(s.proposals||[]).find(q=>q.id===targetId);
  const before=p?lobbyLeanAt(s,m,p,targetId,0):null;
  if(ex.tone!=='hostile'&&ex.tone!=='pushy')s.council[memberId].rel=clamp(s.council[memberId].rel+1,0,100); // a respectful conversation helps the relationship a little
  const add=(raw,leanCap,base)=>{const got=capPoints(s,m,p,targetId,raw,leanCap,base);s.lobby[memberId]=s.lobby[memberId]||{};s.lobby[memberId][targetId]=(s.lobby[memberId][targetId]||0)+got;pts+=got;return got;};
  const addressed=[...new Set((ex.addressed||[]).filter(k=>m.pri[k]))];
  const credit=PITCH[ex.credit]?ex.credit:'weak';const rule=PITCH[credit];
  const raw=Math.min(rule.max,addressed.length*rule.per);
  let ref=before; // each part's cap is measured from the lean just before it, counting the relationship boost
  if(raw>0){const got=add(raw,rule.lean,ref);ref=null;notes.push(`${credit==='strong'?'Specific pitch':credit==='quick'?'Talking point':'Vague pitch'} on ${addressed.map(k=>m.pri[k]).join(' and ')} (+${r1(got)})`);}
  else if(addressed.length===0||credit==='none')notes.push('The pitch did not speak to what they care about');
  for(const o of (ex.offers||[]).slice(0,2)){
    if(o.type==='favor'){if(s.capital>0){s.capital--;const got=add(5,15,ref);ref=null;notes.push(`Political favor, 1 spent (+${r1(got)})`);}else notes.push('No favors left to spend');}
    if(o.type==='earmark'){const amt=clamp(Math.round(Number(o.amount_k)||0),0,150);if(amt>0){if(s.cash>=amt){s.cash-=amt;const got=add(Math.min(5,amt/25),8,ref);ref=null;notes.push(`$${amt}K earmarked for ${m.seat} (+${r1(got)})`);}else notes.push('Not enough cash to earmark that');}}
  }
  if(ex.tone==='hostile'){s.lobby[memberId]=s.lobby[memberId]||{};s.lobby[memberId][targetId]=(s.lobby[memberId][targetId]||0)-4;pts-=4;s.council[memberId].rel=clamp(s.council[memberId].rel-6,0,100);notes.push('That came across as hostile (-4)');}
  else if(ex.tone==='pushy'){s.lobby[memberId]=s.lobby[memberId]||{};s.lobby[memberId][targetId]=(s.lobby[memberId][targetId]||0)-1;pts-=1;notes.push('A bit pushy (-1)');}
  s.lobby[memberId]=s.lobby[memberId]||{};
  s.lobbyCount=s.lobbyCount||{};s.lobbyCount[memberId]=(s.lobbyCount[memberId]||0)+1;
  return{points:r1(pts),notes,credit};
}

// MP-028: each member's on-the-record statement on a plan, built from their priorities and the plan's numbers.
function memberStatement(s,m,p,champion){
  const e=effectsOf(p,s),v=effVector(s,p);
  const say={
    jobs:x=>x>0?`adds about ${Math.round(e.jobs)} jobs`:'costs jobs',
    cost:()=>`costs the borough ${e.cost>=1000?'$'+(e.cost/1000).toFixed(1)+'M':'$'+Math.round(e.cost)+'K'}`,
    walk:x=>x>0?`makes ${s.town} more walkable`:'makes it harder to get around on foot',
    live:x=>x>0?'improves quality of life':'hurts quality of life',
    conf:x=>x>0?'boosts local business':'hurts business confidence',
    stores:()=>`adds ${Math.round(e.units)} storefronts`,
    prop:x=>x>0?'raises property values over time':'drags property values down',
    approval:x=>x>0?'is what residents are asking for':'is not what residents want',
    farm:()=>'paves over farmland',
    downtown:()=>'pulls shoppers off Main Street',
    housing:()=>`adds homes for about ${Math.round(e.housing)} people`,
    safety:x=>x>0?'makes streets safer':'raises safety concerns',
    afford:x=>x>0?'helps with housing costs':'pushes housing costs up',
    flood:x=>x>0?`adds flood risk on ${scenarioOf(s).labels.creek}`:`reduces flood risk on ${scenarioOf(s).labels.creek}`};
  const lever={demolish:'leave what is already there alone',cost:'bring the cost down',walk:'cut the parking or add walking paths',farm:'keep it off farmland',downtown:'protect the Main Street shops',live:'add something for families',flood:'add stormwater work',safety:'add lighting or patrols',afford:'include homes people can afford',jobs:'bring real jobs with it',conf:'show how it helps local business',approval:'win over the neighbors',prop:'raise the design quality',stores:'add storefronts',housing:'add housing'};
  const parts=Object.entries(m.w).map(([k,w])=>({k,c:w*(v[k]||0),x:v[k]||0})).filter(o=>Math.abs(o.c)>0.3&&say[o.k]);
  if(v.demolish>0.3){const d=p.demo;const what=d.landmarks.concat(d.projects);
    say.demolish=()=>what.length?`demolishes ${what.slice(0,2).join(' and ')}`:`displaces about ${d.residents} residents`;
    lever.demolish='leave what is already there alone';parts.push({k:'demolish',c:-v.demolish*1.5,x:v.demolish});}
  const pos=parts.filter(o=>o.c>0).sort((a,b)=>b.c-a.c).slice(0,2),neg=parts.filter(o=>o.c<0).sort((a,b)=>(b.k==='demolish')-(a.k==='demolish')||a.c-b.c).slice(0,2); // what gets torn down always leads
  const supports=pos.map(o=>say[o.k](o.x)),opposes=neg.map(o=>say[o.k](o.x));
  const l=lean(memberScore(s,m,p,champion));
  const stance=l>=60?'support':l<=40?'oppose':'undecided';
  let wouldChange;
  if(m.rival&&champion===p.id&&stance!=='support')wouldChange='Not much, as long as it is the mayor\'s plan.';
  else if(stance==='support')wouldChange=neg.length?`I'd feel better if you ${lever[neg[0].k]}.`:'Nothing. I am voting yes.';
  else wouldChange=neg.length?`I could get to yes if you ${lever[neg[0].k]}.`:`Give me a reason: ${Object.values(m.pri)[0]}.`;
  const join=a=>a.length>1?a[0]+' and '+a[1]:a[0];
  const text=`${stance==='support'?'I support this.':stance==='oppose'?'I oppose this.':'I have not decided.'}${supports.length?` It ${join(supports)}.`:''}${opposes.length?` ${supports.length?'But it':'It'} ${join(opposes)}.`:''} ${wouldChange}`;
  return{stance,supports,opposes,wouldChange,text,lean:l};
}

/* ---------- decisions ---------- */
function fundingOptions(s,p){const e=effectsOf(p,s);return{cash:s.cash>=e.cost,bondAnnual:Math.round(e.cost*0.125)};}
function approve(s,p,funding,authorityId){
  if(FLAGS.compositionPlans&&p?.program)return approveProgram(s,p,funding,authorityId);
  const eligibility=proposalEligibility(s,p);
  if(!eligibility.ok)return eligibility;
  const route=approvalRoute(s,p);
  if(scenarioOf(s).decisionRoute.requireAuthority&&authorityId!==route.id)return{ok:false,reasons:[`Approval requires ${route.name}`]};
  const e=effectsOf(p,s);
  if(funding==='bond'){s.bonds.push({name:p.title,annual:Math.round(e.cost*0.125),left:10});}
  else s.cash-=e.cost;
  p.status='approved';s.decided[p.id]='approved';
  s.pending.push({id:p.id,kind:p.kind,title:p.title,presenter:p.presenter,site:p.site,plots:p.plots,traits:p.traits,demo:p.demo,plan:{...p.plan},cost:e.cost,costHigh:e.costHigh,funding,odds:deliveryOdds(s,p),year:s.year,...(scenarioOf(s).proposals.definitions[p.id]?.completionFacts?{completionFacts:copy(scenarioOf(s).proposals.definitions[p.id].completionFacts)}:{})});
  s.presenters[p.presenter].rel=clamp(s.presenters[p.presenter].rel+8,0,100);
  const d=p.demo;
  if(d){ // MP-034: what gets torn down stops counting now; people move out when construction starts
    for(const b of s.built)if(!b.closed&&plotsOf(b,s).some(([x,y])=>plotsOf(p,s).some(([a,c])=>a===x&&c===y))){b.closed=true;b.demolished=s.year;}
    if(d.collegeTiles){s.flags.collegeLost=(s.flags.collegeLost||0)+d.collegeTiles;}
    s.shocks=s.shocks||[];
    if(d.residents)s.shocks.push({v:0,r:`Displaced about ${d.residents} residents to build ${p.title}`,m:'pop'});
    for(const t of d.landmarks.concat(d.projects))s.shocks.push({v:0,r:`Tore down ${t} for ${p.title}`,m:'approval'});}
  for(const t of plotsOf(p,s)){const c=cellAt(s,t[0],t[1]);c.b={type:'construction',for:p.kind};}
  if(p.group)for(const q of s.proposals.filter(q=>q.group===p.group&&q.id!==p.id&&q.status==='open')){q.status='rejected';s.decided[q.id]='rejected';s.presenters[q.presenter].rel=clamp(s.presenters[q.presenter].rel-10,0,100);s.shocks=(s.shocks||[]);if(q.petition)s.shocks.push({v:-2,r:`${q.title} supporters are upset their plan lost`});}
  return{ok:true,reasons:[]};
}
function reject(s,p){p.status='rejected';s.decided[p.id]='rejected';s.presenters[p.presenter].rel=clamp(s.presenters[p.presenter].rel-8,0,100);
  if(p.petition){s.shocks=s.shocks||[];s.shocks.push({v:-3,r:`You rejected ${p.title}, which 800 residents petitioned for`});}}
function table(s,p){p.status='tabled';s.presenters[p.presenter].rel=clamp(s.presenters[p.presenter].rel-3,0,100);}

/* ---------- year resolution ---------- */
function econ(s){
  const g=s.grid;let units=0,housing=0,jobs=scenarioOf(s).economy.jobs,upkeep=scenarioOf(s).economy.upkeep,parking=0;
  for(const c of g){if(!c.b)continue;const t=c.b.type;
    if(t==='shop')units+=2; if(t==='house')housing+=62; if(t==='apt')housing+=200;}
  for(const b of s.built){if(b.closed)continue;const e=FLAGS.compositionPlans&&b.program?programOperatingEffects(b,s):KINDS[b.kind].effects(b.plan);units+=e.units;housing+=e.housing;jobs+=e.jobs;upkeep+=e.upkeep;parking+=e.parking;}
  for(const c of g)if(c.b&&c.b.type==='shop')jobs+=10;
  jobs-=(s.flags.collegeLost||0)*30; // college buildings torn down take their jobs with them
  const demand=s.pop/100*(1+s.flags.students/3000);
  const roadCap=scenarioOf(s).economy.roadCap*(s.flags.bridgeClosed?0.65:1);
  return{units,housing,jobs,upkeep,parking,demand,roadCap};
}
function jobsMeter(s,ec){return clamp(Math.round(ec.jobs/(Math.max(500,s.pop-s.flags.students)*0.48)*78),0,100);}
function snapshotStats(s){const ec=econ(s);return{year:s.year,pop:Math.round(s.pop),cash:Math.round(s.cash),jobs:jobsMeter(s,ec),...s.meters};}

function resolveYear(s){
  const causes=[];const before={...snapshotStats(s)};
  const M=s.meters;const add=(k,v,r)=>{if(!v)return;M[k]=clamp(M[k]+v,0,100);causes.push({m:k,v:r1(v),r});};
  // tax
  const taxMult={lower:0.92,hold:1,raise:1.08}[s.taxRate];
  if(s.taxRate!==s.prevTax){add('approval',s.taxRate==='raise'?-4:s.taxRate==='lower'?3:0,s.taxRate==='raise'?'Property tax increase':'Property tax cut');}
  s.prevTax=s.taxRate;
  // shocks from decisions
  for(const sh of (s.shocks||[])){if(sh.v)add('approval',sh.v,sh.r);else causes.push({m:sh.m||'approval',v:0,r:sh.r});}s.shocks=[];
  // complete projects
  for(const pj of s.pending){
    const roll=rand(s.seed,pj.id+':deliver');const ok=roll<pj.odds;const e=effectsOf(pj,s);
    if(!ok){
      const over=pj.costHigh-pj.cost+Math.round(pj.cost*0.08);s.cash-=over;
      causes.push({m:'cash',v:-over,r:`${pj.title} ran $${over}K over budget (${presentersOf(s)[pj.presenter].name}'s team)`});
      add('approval',-2,`${pj.title} came in late and over budget`);
    }
    s.built.push({...pj,done:s.year});
    const tl=plotsOf(pj,s);const roles=pj.kind==='initiative'?initiativeRoles(pj.plan,tl.length):[];
    if(FLAGS.compositionPlans&&pj.program)completeProgram(s,pj,e,ok,causes);
    else tl.forEach((t,i)=>{const c=cellAt(s,t[0],t[1]);c.b=pj.kind==='bridge'?null:{type:pj.kind,plan:pj.plan,role:roles[i]};});
    if(pj.completionFacts)Object.assign(s.facts,pj.completionFacts);
    if(pj.kind==='initiative'&&!pj.program&&pj.plan.policy!=='none')s.policies[pj.plan.policy]=s.year;
    if(e.safety)add('safety',e.safety*0.5,`${pj.title} opened`);if(e.afford)add('afford',e.afford*0.5,`${pj.title} opened`);
    add('walk',e.walk,`${pj.title} opened`);add('live',e.live,`${pj.title} opened`);add('conf',e.conf,`${pj.title} opened`);
    add('approval',e.approval+1,`Ribbon cutting: ${pj.title}`);
    if(e.downtown){add('conf',e.downtown/2,`${pj.title} pulls shoppers off Main Street`);}
    if(pj.kind==='bridge'){s.flags.bridgeRisk=e.bridgeRisk;s.flags.bridgeClosed=false;}
    if(pj.kind==='studenthousing')s.flags.students+=pj.plan.beds;
    if(pj.kind==='boutique')s.flags.boutique={opened:s.year,plan:pj.plan};
    if(pj.kind==='subdivision'||pj.kind==='stripmall')s.farmLost=(s.farmLost||0)+e.farm;
  }
  s.pending=[];
  // bridge event
  if(scenarioOf(s).events.bridge&&!s.flags.bridgeClosed&&s.flags.bridgeRisk>0&&s.year>=2){
    if(rand(s.seed,'bridge:'+s.year)<s.flags.bridgeRisk){s.flags.bridgeClosed=true;
      add('live',-5,'Main St bridge closed after a failed inspection: 12-minute detours');add('approval',-5,'Bridge closure detours every commuter');add('conf',-4,'Downtown lost through-traffic when the bridge closed');
      s.reports.push({type:'event',text:'The Main Street bridge closed. Repairing it now costs more.'});
      s.extraNext=[{...makeProposal('bridge',s.year+1,s),id:'bridge2',title:'Emergency bridge reconstruction',blurb:'The bridge is closed. Rebuilding it now costs 60% more than repairing it would have.',plan:{scope:'full'},emergency:true}];
    }
  }
  // boutique viability
  const bq=s.flags.boutique;
  if(scenarioOf(s).events.boutique&&bq&&!bq.closed&&s.year>bq.opened){
    const viable=s.propIdx>=1.08&&s.pop>=5000;
    if(!viable&&rand(s.seed,'boutique:'+s.year)<0.85){bq.closed=s.year;const bb=s.built.find(b=>b.kind==='boutique');if(bb)bb.closed=true;
      for(const t of sitesOf(s).storefront||[]){cellAt(s,t[0],t[1]).b={type:'vacant',d:'downtown'};}
      add('conf',-6,`${scenarioOf(s).labels.luxuryStore} closed: ${s.town} didn't have enough luxury shoppers`);add('approval',-3,'The luxury store you subsidized closed after a year');
      if(bq.plan.clawback){const back=Math.round(bq.plan.incentive*clamp((bq.plan.lease-(s.year-bq.opened))/bq.plan.lease,0,1));s.cash+=back;causes.push({m:'cash',v:back,r:`Clawback recovered $${back}K of the incentive`});}
      else causes.push({m:'cash',v:0,r:`No clawback: the $${bq.plan.incentive}K incentive is gone`});
    }
  }
  // economy
  const ec=econ(s);
  const ratio=ec.demand/Math.max(1,ec.units);
  if(ratio>1.15)add('conf',2.5,`Stores are in demand: ${Math.round(ec.demand)} units of demand vs ${ec.units} storefronts`);
  else if(ratio<0.85)add('conf',-4,`Too many storefronts for this many shoppers (${ec.units} vs ${Math.round(ec.demand)} demand)`);
  if(ratio>1.3)add('live',-1,'Residents drive out of town to shop');
  const propTax=s.pop*0.30*s.propIdx*taxMult;const comTax=Math.min(ec.units,ec.demand)*14+Math.max(0,ec.units-ec.demand)*4;
  const services=s.pop*0.27+(s.flags.students*0.08);
  const bondPay=s.bonds.reduce((a,b)=>a+(b.left>0?b.annual:0),0);s.bonds.forEach(b=>b.left--);s.bonds=s.bonds.filter(b=>b.left>0);
  const net=Math.round(propTax+comTax-services-ec.upkeep-bondPay);
  s.cash+=net;s.lastBudget={propTax:Math.round(propTax),comTax:Math.round(comTax),services:Math.round(services),upkeep:Math.round(ec.upkeep),bonds:bondPay,net};
  // property values
  let pr=0.004;for(const b of s.built){if(b.closed)continue;pr+=(FLAGS.compositionPlans&&b.program?programOperatingEffects(b,s):KINDS[b.kind].effects(b.plan)).prop;}
  s.propIdx=r1(s.propIdx*1000*(1+pr))/1000;
  // population
  const jm=jobsMeter(s,ec);
  let rate=0.012+(jm-60)*0.0009+(M.live-55)*0.0007+(s.flags.students>0?0.006:0)+(M.conf-50)*0.0003+(M.safety-60)*0.0004-(s.policies.impact_fees?0.003:0);
  if(s.flags.bridgeClosed)rate-=0.01;
  let target=s.pop*(1+rate)+(s.newStudents||0);
  const studentsAdd=s.flags.students-(s.studentsCounted||0);if(studentsAdd>0){target+=studentsAdd;s.studentsCounted=s.flags.students;}
  // homes get built where demand exists (developers, not you)
  const wanted=target;let housing=ec.housing;const need=target-housing;let newHomes=0;
  if(need>0&&M.conf>30){const g=growthTiles(s.grid,scenarioOf(s).map);const n=Math.min(g.length,Math.ceil(need/62),Math.round(4+M.conf/12));for(let i=0;i<n;i++){g[i].b={type:'house',new:s.year};newHomes++;}housing+=newHomes*62;}
  if(target>housing){causes.push({m:'pop',v:0,r:'Housing shortage: people wanted to move here but couldn\'t'});add('approval',-1.5,'Rents rising from the housing shortage');target=housing;}
  // mid-density upgrade downtown when conf high
  if(scenarioOf(s).map.growth.enabled!==false&&M.conf>(s.policies.downtown_apartments?55:62)&&rand(s.seed,'apt'+s.year)<(s.policies.downtown_apartments?0.95:0.7)){const h=s.grid.filter(c=>c.b&&c.b.type==='house'&&Math.hypot(c.x-scenarioOf(s).map.growth.center[0],c.y-scenarioOf(s).map.growth.center[1])<4.5);if(h.length){h[0].b={type:'apt',new:s.year};causes.push({m:'pop',v:0,r:'A builder replaced older homes near downtown with apartments'});}}
  // organic shop infill
  if(scenarioOf(s).map.growth.enabled!==false&&ratio>1.25&&M.conf>55){const g=s.grid.filter(c=>c.b&&c.b.type==='house'&&(cellAt(s,c.x,c.y-1)?.road||cellAt(s,c.x,c.y+1)?.road)&&inBounds(c,scenarioOf(s).map.growth.main));if(g.length){g[0].b={type:'shop',new:s.year};causes.push({m:'conf',v:0,r:'A house on Main Street converted to a shop'});}}
  const dPop=Math.round(target-s.pop);s.pop=Math.round(target);
  causes.push({m:'pop',v:dPop,r:dPop>=0?`${newHomes} new homes built; growth driven by jobs ${jm}/100 and livability ${Math.round(M.live)}/100`:'People left town'});
  // traffic
  const load=s.pop+ec.parking*3+s.flags.students*0.5;
  if(load>ec.roadCap)add('live',-Math.min(4,(load-ec.roadCap)/500),'Traffic is outgrowing the roads');
  if(s.policies.impact_fees&&newHomes){const f=newHomes*8;s.cash+=f;s.lastBudget.net+=f;causes.push({m:'cash',v:f,r:`Impact fees on ${newHomes} new homes`});}
  if(scenarioOf(s).events.flood&&s.year>=2){const fr=floodRisk(s,ec);const exposure=fr.exposure,risk=fr.risk;s.flags.floodRisk=Math.round(risk*100)/100;
    if(rand(s.seed,'flood'+s.year)<risk){const dmg=60+exposure*130;s.cash-=dmg;causes.push({m:'cash',v:-dmg,r:`${scenarioOf(s).labels.creek} flooded${exposure?'. Creekside buildings took the worst of it':''}`});
      add('live',-3,'Flood cleanup closed streets for weeks');add('approval',exposure?-3:-1,'Residents blame the borough for the flooding');add('safety',-2,'Flood damage to roads and homes');
      s.reports.push({type:'event',text:scenarioOf(s).labels.creek+' flooded.'});}}
  {let fx=0;for(const b of s.built){if(b.closed)continue;fx+=effectsOf(b,s).safety||0;}
   const vac=s.grid.filter(c=>c.b&&c.b.type==='vacant').length;const resid=Math.max(500,s.pop-s.flags.students);
   const cover=clamp((4300-resid)/250,-12,6);const parts=[[cover,cover<0?`Police coverage is stretched for ${resid.toLocaleString()} residents`:'Police coverage keeps up with the population'],[fx,'Safety facilities and programs'],[-vac*2,'Vacant storefronts attract trouble'],[-s.flags.students/400,'Late-night student activity'],[(M.walk-50)*0.08,'Busy sidewalks put eyes on the street'],[s.flags.bridgeClosed?-3:0,'Fire trucks detour around the closed bridge']];
   const tgt=clamp(62+parts.reduce((a,p)=>a+p[0],0),5,98);const d=r1((tgt-M.safety)*0.4);
   const why=parts.filter(p=>Math.sign(p[0])===Math.sign(d)&&p[0]).sort((a,b)=>Math.abs(b[0])-Math.abs(a[0]))[0];
   add('safety',d,why?why[1]:'Safety drifted');}
  {let fx=0;for(const b of s.built){if(b.closed)continue;fx+=effectsOf(b,s).afford||0;}
   const shortage=Math.max(0,(wanted-housing)/Math.max(1,housing));
   const parts=[[-shortage*350,'More people want to live here than there are homes'],[-s.flags.students/150,'Students compete with families for rentals'],[fx,'New homes eased the market'],[-(s.propIdx-1)*60,'Rising property values push rents up'],[s.policies.downtown_apartments?2:0,'Apartments now allowed downtown']];
   const tgt=clamp(60+parts.reduce((a,p)=>a+p[0],0),5,95);const d=r1((tgt-M.afford)*0.4);
   const why=parts.filter(p=>Math.sign(p[0])===Math.sign(d)&&p[0]).sort((a,b)=>Math.abs(b[0])-Math.abs(a[0]))[0];
   add('afford',d,why?why[1]:'Housing costs held steady');}
  // approval drift
  const ec2=econ(s);const jm2=jobsMeter(s,ec2);
  const tgt=50+0.3*(M.live-55)+0.3*(jm2-60)+0.12*(M.walk-50)+0.18*(M.conf-55)+0.2*(M.safety-60)+0.2*(M.afford-55)+(s.taxRate==='lower'?2:s.taxRate==='raise'?-2:0)+(s.cash<0?-6:0);
  const drift=r1((tgt-M.approval)*0.35);add('approval',drift,'Overall mood of the town');
  // bankruptcy
  if(s.cash<0){s.flags.deficitYears++;causes.push({m:'cash',v:0,r:`Borough is in deficit (${s.flags.deficitYears} of 2 years before state oversight)`});}else s.flags.deficitYears=0;
  // wrap
  const after=snapshotStats(s);
  const report={year:s.year,before,after,causes,budget:s.lastBudget};
  if(FLAGS.compositionPlans)report.projects=copy((s.projectRecords||[]).filter(p=>p.stage==='built'&&p.deliveryYear===s.year));
  s.reports.push(report);s.history.push(after);
  s.lobby={};s.lobbyCount={};s.capital=Math.min(5,s.capital+2);
  for(const p of s.proposals)if(p.status==='open'){p.status='lapsed';s.decided[p.id]='lapsed';}
  if(s.flags.deficitYears>=2){s.phase='bankrupt';return report;}
  if(s.year%s.calendar.electionEvery===0){s.phase='election';}
  for(const p of s.proposals)if(p.status==='tabled'&&p.grantPending){const g=p.grantPending;delete p.grantPending;
    if(rand(s.seed,'grant:'+p.id+':'+s.year)<g.odds){p.grant=g.share;causes.push({m:'cash',v:0,r:`Grant awarded: ${g.agency} will cover ${Math.round(g.share*100)}% of ${p.title}`});}
    else{p.grantDenied=true;causes.push({m:'cash',v:0,r:`Grant denied: ${g.agency} passed on ${p.title}`});}}
  s.year++;s.termYear=((s.year-1)%s.calendar.electionEvery)+1;
  s.proposals=proposalsFor(s,s.year).concat(s.extraNext||[]);s.extraNext=[];
  return report;
}

/* ---------- election ---------- */
const THEMES={economy:{label:'Jobs and growth',fit:s=>(s.meters.conf-55)/4+(jobsMeter(s,econ(s))-60)/5},
  quality:{label:'Quality of life',fit:s=>(s.meters.live-55)/4+(s.meters.walk-50)/5},
  fiscal:{label:'Responsible budgets',fit:s=>(s.cash-600)/250},
  safety:{label:'Safe streets',fit:s=>(s.meters.safety-60)/4}};
function recordFacts(s){const f=[];const r=s.reports.filter(x=>x.after);const first=s.history[0],last=s.history[s.history.length-1];
  f.push(`Population went from ${first.pop} to ${last.pop}.`);f.push(`Cash reserve is $${Math.round(s.cash)}K (started at $${scenarioOf(s).initial.cash}K).`);
  if(s.bonds.length)f.push(`The borough owes ${s.bonds.length} bond(s), $${s.bonds.reduce((a,b)=>a+b.annual,0)}K a year.`);
  for(const b of s.built)f.push(`Approved and built: ${b.title}${b.closed?' (it has since closed)':''}.`);
  for(const [id,st] of Object.entries(s.decided))if(st==='rejected')f.push(`Rejected: ${scenarioOf(s).proposals.definitions[id]?.title||id}.`);
  if(s.flags.bridgeClosed)f.push('The Main Street bridge is closed.');
  f.push(`Approval rating: ${Math.round(s.meters.approval)}%. Walkability ${Math.round(s.meters.walk)}, livability ${Math.round(s.meters.live)}, business confidence ${Math.round(s.meters.conf)}, safety ${Math.round(s.meters.safety)}, housing affordability ${Math.round(s.meters.afford)}.`);
  return f;}
function electionResult(s,theme,debate){
  const themeBonus=clamp(THEMES[theme].fit(s),-3,4);
  const d=clamp(debate||0,-3,4);
  const noise=(rand(s.seed,'elect'+s.year)-0.5)*3;
  const share=r1(clamp(50+(s.meters.approval-50)*0.9+themeBonus+d+2+noise,20,80));
  return{share,won:share>=50,parts:[{r:'Approval rating',v:r1((s.meters.approval-50)*0.9)},{r:`Campaign theme: ${THEMES[theme].label}`,v:r1(themeBonus)},{r:`Debate with ${councilOf(s).find(m=>m.rival)?.name||'the challenger'}`,v:r1(d)},{r:'Incumbency',v:2},{r:'Turnout and late swings',v:r1(noise)}]};
}

function initiativeRoles(pl,n){const r=[];if(pl.civic!=='none')r.push('civic');if(pl.safety==='police_substation'||pl.safety==='fire_station')r.push('safety');
  for(let i=0;i<Math.ceil(pl.shops/4);i++)r.push('mixed');for(let i=0;i<Math.ceil(pl.homes/(pl.stories>2?60:30));i++)r.push('homes');
  if(pl.plaza)r.push('plaza');for(let i=0;i<Math.ceil(pl.parking/100);i++)r.push('parking');if(pl.stormwater)r.push('pond');
  const out=r.slice(0,n);while(out.length<n)out.push(pl.green>0?'green':'lawn');return out;}
function parcelsAvailable(s){return Object.entries(parcelsOf(s)).filter(([id,pa])=>{const tl=sitesOf(s)[id]||[];if(!tl.length)return false;
  if(s.proposals.some(p=>p.site===id&&(p.status==='open'||p.status==='tabled'))||s.pending.some(p=>p.site===id))return false;
  return tl.every(([x,y])=>{const c=cellAt(s,x,y);return c.site===id&&(!c.b||c.b.type==='lot');});}).map(([id])=>id);}
function needsSite(pl){return !!(pl.homes||pl.shops||pl.green||pl.plaza||pl.parking||pl.civic!=='none'||pl.safety==='police_substation'||pl.safety==='fire_station'||pl.stormwater);}
function floodRisk(s,ec){ec=ec||econ(s);let exposure=0,storm=0;for(const b of s.built){if(b.closed)continue;const fe=effectsOf(b,s);exposure+=fe.creek||0;storm+=fe.storm||0;}
  return{risk:clamp(0.05+ec.parking/3500+exposure*0.05-storm*0.04,0.02,0.35),exposure,storm};}
function canProposeInitiative(s){return s.phase==='agenda'&&s.initiativeYear!==s.year;}
// ---------- MP-033 to MP-035: any plots, named places, capacity, demolition ----------
function plotsOf(p,s){return(p.plots&&p.plots.length)?p.plots:(sitesOf(s)[p.site]||[]);}
function canBuildOn(s,x,y){const c=cellAt(s,x,y);if(!c)return false;return !c.road&&c.t!=='water'&&c.t!=='bridge'&&!(c.b&&c.b.type==='construction');}
function placePlots(s,id){
  const query=placesOf(s)[id]?.query;
  if(query)return s.grid.filter(c=>c.b&&query.buildings.includes(c.b.type)&&(!query.rows||query.rows.includes(c.y))&&(!query.bounds||inBounds(c,query.bounds))).map(c=>[c.x,c.y]);
  return(sitesOf(s)[id]||[]).map(t=>t.slice());}
function describePlace(s,id){const tl=placePlots(s,id);const kinds={};for(const [x,y] of tl){const b=cellAt(s,x,y).b;const k=b?(b.type==='initiative'?'your project':b.type):'open land';kinds[k]=(kinds[k]||0)+1;}
  return`${placesOf(s)[id].name} (${tl.length} plots: ${Object.entries(kinds).map(([k,n])=>`${n} ${k}`).join(', ')})`;}
function plotTraits(s,plots){const t=new Set();
  for(const [x,y] of plots){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=cellAt(s,x+dx,y+dy);if(!n)continue;if(n.t==='water')t.add('creek');if(n.b&&(n.b.type==='house'||n.b.type==='apt'))t.add('neighbors');}
    const g=scenarioOf(s).map.growth;if(inBounds({x,y},g.traitsMain||g.main))t.add('main');if(Math.hypot(x-g.center[0],y-g.center[1])>7.5)t.add('edge');}
  return[...t];}
// What it takes to clear the chosen plots. Owner, cost ($K), people, and what's lost.
function demolitionOf(s,plots){
  const d={cost:0,residents:0,storefronts:0,untrackedJobs:0,farm:0,live:0,conf:0,approval:0,landmarks:[],projects:[],infeasible:false,warning:null,collegeTiles:0};
  const seen=new Set();
  for(const [x,y] of plots){const c=cellAt(s,x,y),b=c.b;
    if(c.t==='farm'&&!b){d.cost+=20;d.farm+=0.5;continue;}
    if(c.t==='forest'&&!b){d.cost+=10;d.live-=0.3;continue;}
    if(!b){d.cost+=10;continue;}
    switch(b.type){
      case'house':d.cost+=45;d.residents+=62;break;
      case'apt':d.cost+=160;d.residents+=200;break;
      case'shop':case'boutique':d.cost+=80;d.storefronts+=2;d.conf-=0.5;break;
      case'vacant':case'lot':d.cost+=30;break;
      case'civic':d.cost+=900;if(!seen.has('hall')){seen.add('hall');d.landmarks.push('Borough Hall');d.approval-=6;}break;
      case'school':d.cost+=1200;if(!seen.has('school')){seen.add('school');d.landmarks.push(scenarioOf(s).labels.school);d.approval-=8;d.infeasible=true;}break;
      case'college':case'quad':d.cost+=1800;d.collegeTiles++;d.untrackedJobs+=b.type==='college'?40:10;if(!seen.has('college')){seen.add('college');d.landmarks.push(scenarioOf(s).labels.college);d.infeasible=true;}d.approval-=1.5;break;
      default:{const bt=s.built.find(q=>!q.closed&&plotsOf(q,s).some(([a,c2])=>a===x&&c2===y));const title=bt?bt.title:'an existing building';
        d.cost+=50;if(!seen.has(title)){seen.add(title);d.projects.push(title);d.approval-=3;if(b.type==='park'){d.live-=4;}}}
    }}
  d.approval-=d.residents/100;d.approval=Math.max(-25,d.approval);
  const owners=[...new Set(plots.map(([x,y])=>cellAt(s,x,y).b&&scenarioOf(s).ownership[cellAt(s,x,y).b.type]).filter(Boolean))];
  if(owners.length)d.warning=`The borough doesn't own this. ${owners.join(' and ')} would have to sell, or the borough would have to acquire it by eminent domain.`;
  d.cost=Math.round(d.cost);return d;}
// Plans that don't fit the plots get scaled down, and the player is told why.
function plotsNeeded(pl){return(pl.civic!=='none'?1:0)+((pl.safety==='police_substation'||pl.safety==='fire_station')?1:0)+Math.ceil(pl.shops/4)+Math.ceil(pl.homes/(pl.stories>2?60:30))+(pl.plaza?1:0)+Math.ceil(pl.parking/100)+(pl.stormwater?1:0);}
function fitPlanToPlots(plan,n){
  const pl={...plan},before={...plan},notes=[];if(!n)return{plan:pl,notes};
  const steps=[()=>pl.parking>0&&(pl.parking=Math.max(0,pl.parking-20)),()=>pl.stormwater&&!(pl.stormwater=false),()=>pl.plaza&&!(pl.plaza=false),
    ()=>pl.homes>0&&(pl.homes=Math.max(0,pl.homes-10)),()=>pl.shops>0&&(pl.shops=pl.shops-1),
    ()=>(pl.safety==='police_substation'||pl.safety==='fire_station')&&(pl.safety='none'),()=>pl.civic!=='none'&&(pl.civic='none')];
  let guard=0;while(plotsNeeded(pl)>n&&guard++<200){let did=false;for(const st of steps){if(plotsNeeded(pl)<=n)break;if(st()){did=true;break;}}if(!did)break;}
  const sch=KINDS.initiative.params;
  for(const k of Object.keys(pl))if(pl[k]!==before[k]){const s=sch[k];const f=v=>s.type==='bool'?(v?'yes':'no'):s.type==='enum'?s.labels[v]:v;notes.push(`${s.label} ${f(before[k])} → ${f(pl[k])}`);}
  if(notes.length)notes.unshift(`${n} plot${n>1?'s':''} can't hold all of that, so the plan was scaled down`);
  return{plan:pl,notes};}
function refitInitiative(s,p){const f=fitPlanToPlots(p.plan,plotsOf(p,s).length);p.plan=f.plan;if(f.notes.length)p.fitNotes=f.notes;return f.notes;}
function makeInitiative(s,d){
  if(!canProposeInitiative(s))return null; // MP-030: one initiative per year
  const v=validatePlan('initiative',defaultPlan('initiative'),d.plan||{});
  const key=([x,y])=>x+','+y;const uniq=a=>{const m=new Map();for(const t of a||[])if(Array.isArray(t)&&canBuildOn(s,t[0],t[1]))m.set(key(t),[t[0],t[1]]);return[...m.values()];};
  let plots=uniq(d.plots);
  if(!plots.length&&d.place&&placesOf(s)[d.place])plots=uniq(placePlots(s,d.place));
  if(!plots.length&&!d.place&&d.site&&sitesOf(s)[d.site])plots=uniq(sitesOf(s)[d.site]);
  if(!plots.length&&needsSite(v.plan)){const a=parcelsAvailable(s);if(a.length)plots=uniq(sitesOf(s)[a[0]]);}
  if(!needsSite(v.plan)&&!(d.plots&&d.plots.length)&&!d.place)plots=[];
  const fit=fitPlanToPlots(v.plan,plots.length);
  const demo=demolitionOf(s,plots);
  const p={id:'init'+s.year,kind:'initiative',title:String(d.title||'Mayor\'s initiative').slice(0,60),presenter:'planner',site:plots.length?'custom':'none',plots,traits:plotTraits(s,plots),demo,
    council:true,blurb:String(d.summary||'').slice(0,320),plan:fit.plan,fitNotes:fit.notes,year:s.year,status:'open',mine:true,desc:String(d.desc||'').slice(0,800),
    outOfScope:[d.outOfScope?String(d.outOfScope).slice(0,300):null,demo.warning].filter(Boolean).join(' ')||null};
  s.proposals=s.proposals.filter(q=>q.id!==p.id);s.proposals.push(p);s.initiativeYear=s.year;return p;}
function guessPlace(desc,s){const t=desc.toLowerCase();for(const [id,pl] of Object.entries(placesOf(s)))if(pl.kw.some(k=>t.includes(k)))return id;return null;}
function heuristicDraft(desc,s){const t=desc.toLowerCase();const pl={};const has=(...w)=>w.some(x=>t.includes(x));
  if(has('park','green','garden','tree','lawn','trail'))pl.green=2;if(has('plaza','square','string light','food truck'))pl.plaza=true;
  if(has('library'))pl.civic='library';else if(has('community center','rec center','youth center'))pl.civic='community_center';else if(has('farmers market','market'))pl.civic='farmers_market';else if(has('school'))pl.civic='school_annex';
  if(has('police','substation','cops'))pl.safety='police_substation';else if(has('fire station','firehouse','fire company'))pl.safety='fire_station';else if(has('light','lamp'))pl.safety='streetlights';
  if(has('flood','rain garden','stormwater','drainage'))pl.stormwater=true;
  if(has('home','housing','apartment','townhouse','condo','senior'))pl.homes=40;if(has('afford','workforce','senior','starter'))pl.affordable=true;
  if(has('shop','store','retail','cafe','restaurant','brewery'))pl.shops=6;if(pl.shops&&pl.homes)pl.stories=3;
  if(has('garage'))pl.parking=240;else if(has('parking'))pl.parking=60;
  if(has('speed','traffic calming','crosswalk','bike lane'))pl.policy='traffic_calming';else if(has('parking minimum','parking reform'))pl.policy='parking_reform';else if(has('community policing'))pl.policy='community_policing';else if(has('inspection','landlord'))pl.policy='rental_inspections';else if(has('impact fee'))pl.policy='impact_fees';else if(has('allow apartments','zoning'))pl.policy='downtown_apartments';
  if(!Object.keys(pl).length)pl.green=1;
  let first=desc.trim().split(/[.!?\n,]/)[0].split(/\s+(?:on|in|at|behind|by|near|along|for|to|so)\s+/i)[0];if(first.length>44)first=first.slice(0,44).replace(/\s+\S*$/,'');first=first||'Mayor\'s initiative';
  return{title:first.charAt(0).toUpperCase()+first.slice(1),summary:desc.trim().slice(0,220),plan:pl,place:guessPlace(desc,s)};}
function grantInfo(s,p){if(p.grant||p.grantPending||p.grantDenied)return null;let agency=null,share=0,odds=0;
  if(p.kind==='bridge'){agency='PennDOT bridge program';share=0.8;odds=0.55;}
  else if(p.kind==='park'){agency='DCNR community parks grant';share=0.5;odds=0.6;}
  else if(p.kind==='initiative'){const pl=p.plan;if(pl.green>0||pl.plaza||pl.stormwater||pl.safety==='streetlights'||pl.policy==='traffic_calming'||(pl.affordable&&pl.homes)){agency=pl.affordable&&pl.homes?'PHFA housing grant':pl.stormwater?'DEP stormwater grant':pl.policy==='traffic_calming'||pl.safety==='streetlights'?'PennDOT safety grant':'DCED community grant';share=0.5;odds=0.5;}}
  if(!agency)return null;if(p.emergency)odds-=0.2;
  return{agency,share,odds:clamp(odds+(s.presenters.planner.rel-50)/200,0.2,0.85)};}
function applyGrant(s,p){const g=grantInfo(s,p);if(!g)return null;p.grantPending={...g,year:s.year};p.status='tabled';return g;}
function migrate(s,options={}){const checked=validateSave(s);if(!checked.ok)return checked;if(FLAGS.compositionPlans)s=copy(s);if(s.v===1){s.meters.safety=62;s.meters.afford=58;s.policies={};s.flags.floodRisk=0.06;
  for(const [id,pa] of Object.entries(PARCELS))if(pa.tiles)for(const [x,y] of pa.tiles){const c=s.grid[y*N+x];if(!c.site&&!c.b)c.site=id;}
  for(const h of s.history){if(h.safety===undefined)h.safety=62;if(h.afford===undefined)h.afford=58;}s.v=2;}
  if(s.v===2){const scenario=copy(MILLBROOKE);delete scenario.map.grid;s.scenarioId=MILLBROOKE.id;s.scenario=scenario;s.calendar=copy(MILLBROOKE.calendar);s.facts={};
    if(s.town==='Millbrook'||!s.town)s.town=MILLBROOKE.metadata.town;s.v=3;}
  if(FLAGS.compositionPlans&&s.v===3)initializeComposition(s,options);
  return s;}

/* ---------- Scenario 01 · Millbrooke: campaign content, not shared rules ---------- */

const PRESENTERS = {
  planner:{name:'Dana Ruiz',role:'Borough Planner',rel:65,comp:78,detail:82,flex:'high',
    persona:'Thoughtful, data-minded borough planner who wants Millbrooke to grow without losing its character. Likes walkable design. Will trade features to save money but protects the memorial.'},
  merchants:{name:'Walt Kessler',role:'Millbrooke Merchants Association',rel:55,comp:52,detail:45,flex:'medium',
    persona:'Folksy hardware-store owner speaking for downtown merchants. Beloved in town, big-hearted, a little vague on numbers. Wants lots of stores and enough parking so customers come back.'},
  keystone:{name:'Brent Hollis',role:'Keystone Ridge Development',rel:35,comp:88,detail:80,flex:'low',
    persona:'Polished regional developer. Competent and fast, but protects his margins. Resists anything that cuts leasable space or parking unless the borough gives something back.'},
  engineer:{name:'Sam Yoder',role:'Borough Engineer',rel:60,comp:70,detail:70,flex:'high',
    persona:'Plainspoken engineer. Gives straight answers about risk and cost.'},
  brand:{name:'Celeste Varga',role:'Halden & Pierce (luxury retail)',rel:40,comp:85,detail:70,flex:'low',
    persona:'Smooth corporate site-selection director for a national luxury handbag brand. Wants a big incentive and short commitments. Very wary of clawback clauses.'}
};

const COUNCIL = [
  {id:'marsh',name:'Greg Marsh',seat:'Ward 1',rival:true,rel:25,
   blurb:'Wants your job. Pro-growth, low taxes, loves a ribbon cutting.',
   w:{jobs:1.2,conf:1.0,stores:0.6,cost:-0.4,live:0.3,walk:0.1,housing:0.5,safety:0.3},
   pri:{jobs:'new jobs',conf:'business growth',stores:'more stores',cost:'keeping costs reasonable'}},
  {id:'pryor',name:'Ellen Pryor',seat:'Ward 2',rel:42,
   blurb:'Retired accountant. Guards the reserve fund.',
   w:{cost:-1.5,prop:0.5,live:0.2},
   pri:{cost:'lower cost to the borough',prop:'long-term property values and tax base',live:'quality of life'}},
  {id:'okafor',name:'Rev. James Okafor',seat:'Ward 3',rel:55,
   blurb:'Pastor at First Methodist. Neighborhoods first.',
   w:{live:1.3,walk:0.8,approval:0.5,stores:0.5,safety:0.7,afford:0.6},
   pri:{live:'quality of life',walk:'walkability and safe streets',approval:'what residents want',stores:'places for families to shop',safety:'safe neighborhoods',afford:'housing families can afford'}},
  {id:'brandt',name:'Tina Brandt',seat:'At-large',rel:45,
   blurb:'Owns the Main Street diner. Watches foot traffic.',
   w:{conf:1.0,walk:0.6,stores:0.8,downtown:1.0,safety:0.5},
   pri:{conf:'business confidence',walk:'foot traffic downtown',stores:'more stores',downtown:'protecting downtown businesses',safety:'safe streets downtown'}},
  {id:'weaver',name:'Hal Weaver',seat:'Ward 4 (east)',rel:50,
   blurb:'Dairy farmer. Protects farmland, hates waste.',
   w:{farm:-1.5,cost:-0.7,live:0.4,flood:-0.8},
   pri:{farm:'protecting farmland',cost:'not wasting money',live:'quality of life',flood:'flood risk along the creek'}}
];


function creekX(y){return 3+Math.round(Math.sin(y*0.45)*1.3);}
const SITES = {
  oldmill:[[6,12],[7,12],[6,13],[7,13]],
  route22:[[13,21],[14,21],[15,21],[13,22],[14,22],[15,22]],
  campus_s:[[15,9],[16,9],[17,9],[15,10],[16,10],[17,10]],
  storefront:[[13,12]],
  ridge:[[20,13],[21,13],[22,13],[20,14],[21,14],[22,14],[20,15],[21,15],[22,15],[20,16],[21,16],[22,16]],
  bridge:[[creekX(11),11]]
};
const PARCELS={
  oldmill:{name:'Old Mill lot',traits:['creek','main'],blurb:'Downtown on Kish Creek'},
  school_lot:{name:'Lot behind the elementary school',tiles:[[13,13],[14,13],[13,14],[14,14]],traits:['neighbors'],blurb:'Next to homes and the school'},
  creekside:{name:'Kish Creek bank',tiles:[[4,13],[5,13],[4,14],[5,14]],traits:['creek','neighbors'],blurb:'Floodplain with creek views'},
  east_end:{name:'East End field',tiles:[[16,13],[17,13],[18,13],[16,14],[17,14],[18,14]],traits:['edge'],blurb:'Open field on the east side'},
  pine_south:{name:'Pine Street field',tiles:[[15,17],[16,17],[17,17],[15,18],[16,18],[17,18]],traits:['edge','neighbors'],blurb:'South of Pine Street, near homes'}
};
for(const [k,v] of Object.entries(PARCELS))if(v.tiles)SITES[k]=v.tiles;
function genMillbrookeGrid(){
  const g=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)g.push({x,y,t:'grass',b:null,road:false,site:null,var:hashStr(x+','+y)%7});
  const at=(x,y)=>g[y*N+x];
  for(let y=0;y<N;y++){
    for(let x=0;x<N;x++){
      const c=at(x,y);
      if(x<creekX(y)&&(y<9||((x*7+y*3)%5)<3)) c.t='forest';
      if(x>=19&&y>=12) c.t='farm';
      if(y>=21) c.t='farm';
      if(x>=20&&y<12&&y>2) c.t='farm';
    }
    const cx=creekX(y); at(cx,y).t='water';
  }
  const road=(x,y)=>{const c=at(x,y);c.road=true;if(c.t==='water'){c.t='bridge';}else c.t='grass';};
  for(let x=0;x<N;x++)road(x,11);
  for(let y=1;y<11;y++)road(14,y);
  for(let y=4;y<20;y++)road(9,y);
  for(let x=5;x<19;x++)road(x,16);
  for(let x=0;x<N;x++)road(x,20);
  for(let y=11;y<20;y++)road(19,y);
  for(let x=7;x<14;x++)road(x,6);
  for(const [k,tiles] of Object.entries(SITES))for(const [x,y] of tiles){const c=at(x,y);c.site=k;}
  // downtown shops
  for(const y of [10,12])for(let x=8;x<=13;x++){const c=at(x,y);if(c.road||c.site)continue;c.b={type:'shop',d:'downtown'};}
  at(13,12).b={type:'vacant',d:'downtown'};
  at(10,10).b={type:'civic'};
  at(11,14).b={type:'school'};at(12,14).b={type:'school'};
  for(let y=2;y<=7;y++)for(let x=15;x<=19;x++){const c=at(x,y);c.t='grass';c.b={type:(x+y)%3===0?'quad':'college'};}
  at(6,12).b={type:'lot'};at(7,12).b={type:'lot'};at(6,13).b={type:'lot'};at(7,13).b={type:'lot'};
  // starting homes
  const cand=growthTiles(g).slice(0,53);
  for(const c of cand)c.b={type:'house'};
  return g;
}
const P_DEFS = {
  bridge:{kind:'bridge',title:'Main Street bridge repair',presenter:'engineer',site:'bridge',council:false,
    blurb:'The 1958 bridge over Kish Creek failed its last inspection. It carries every car into downtown.'},
  stripmall:{kind:'stripmall',title:'Route 22 Shopping Plaza',presenter:'keystone',site:'route22',council:true,
    blurb:'A strip mall on farmland at Route 22. Fast to build, cheap stores, lots of parking.'},
  park:{kind:'park',title:'Old Mill Memorial Park',presenter:'planner',site:'oldmill',council:true,group:'oldmill',
    blurb:'Turn the vacant Old Mill lot into a veterans memorial park on the creek.'},
  commerce:{kind:'commerce',title:'Old Mill Commons',presenter:'merchants',site:'oldmill',council:true,group:'oldmill',
    blurb:'Merchants want new storefronts on the Old Mill lot. Stores downtown are always full.',petition:800},
  boutique:{kind:'boutique',title:'Halden & Pierce flagship',presenter:'brand',site:'storefront',council:true,
    blurb:'A luxury handbag brand wants the vacant Main Street storefront, with a tax incentive.'},
  studenthousing:{kind:'studenthousing',title:'College Ave Student Lofts',presenter:'keystone',site:'campus_s',council:true,
    blurb:'Penns Valley College is growing. Keystone wants to build student apartments south of campus.'},
  subdivision:{kind:'subdivision',title:'Ridge Road Estates',presenter:'keystone',site:'ridge',council:true,
    blurb:'Subdivide the old Bowers dairy on Ridge Road into single-family homes.'}
};
const SCHEDULE={1:['bridge','stripmall'],2:['park','commerce'],3:['boutique','studenthousing'],4:['subdivision']};

const PLACES={
  oldmill:{name:'Old Mill lot',kw:['old mill','mill lot','mill commons','commons']},
  downtown:{name:'Main Street storefronts',kw:['downtown','main street'],query:{buildings:['shop','vacant','boutique'],rows:[10,12],bounds:{minX:8,maxX:13,minY:0,maxY:23}}},
  borough_hall:{name:'Borough Hall',kw:['borough hall','town hall','city hall'],query:{buildings:['civic']}},
  school:{name:'Millbrooke Elementary',kw:['elementary','demolish the school','tear down the school'],query:{buildings:['school']}},
  school_lot:{name:'Lot behind the elementary school',kw:['behind the school','school lot']},
  college:{name:'Penns Valley College campus',kw:['college','campus','university'],query:{buildings:['college','quad']}},
  campus_s:{name:'South of campus on College Ave',kw:['college ave','south of campus']},
  creekside:{name:'Kish Creek bank',kw:['creek','riverfront','waterfront']},
  east_end:{name:'East End field',kw:['east end','east side']},
  pine_south:{name:'Pine Street field',kw:['pine street','pine st']},
  route22:{name:'Route 22 frontage',kw:['route 22','highway']},
  ridge:{name:'Ridge Road farmland',kw:['ridge road','farmland','dairy']}};
const OWNED={school:'the Millbrooke Area School District',college:'Penns Valley College',quad:'Penns Valley College'};

const MILLBROOKE={
  id:'millbrooke',metadata:{displayName:'Scenario 01 · Millbrooke',town:'Millbrooke',region:'Pennsylvania'},
  calendar:{startYear:2027,yearsPerTurn:1,electionEvery:4,maxTurns:32},
  map:{width:N,height:N,sites:SITES,parcels:PARCELS,places:PLACES,
    growth:{enabled:true,center:[10,11],bounds:{minX:4,maxX:19,minY:1,maxY:19},main:{minX:7,maxX:16,minY:9,maxY:13},traitsMain:{minX:5,maxX:14,minY:10,maxY:12}}},
  people:{presenters:PRESENTERS,council:COUNCIL},initial:{pop:3200,cash:900,flags:{bridgeRisk:0.45}},
  proposals:{definitions:P_DEFS,schedule:SCHEDULE},
  decisionRoute:{id:'borough-council',name:'Millbrooke Borough Council',executiveId:'mayor',executiveName:'Mayor of Millbrooke',executiveLimit:MAYOR_AUTHORITY,votesRequired:3,requireAuthority:false},
  events:{bridge:true,boutique:true,flood:true},economy:{jobs:1180,upkeep:150,roadCap:6500},
  labels:{creek:'Kish Creek',bridge:'Main Street bridge',bridgeShort:'Main St bridge',school:'Millbrooke Elementary',college:'Penns Valley College',luxuryStore:'Halden & Pierce'},ownership:OWNED
};
MILLBROOKE.map.grid=genMillbrookeGrid();

// year (also in reports/projects/history) is the legacy one-based turn ordinal, never the calendar year.
const copy=o=>JSON.parse(JSON.stringify(o));
function scenarioOf(s){return s?.scenario||MILLBROOKE;}
function scenarioMeta(s){const d=scenarioOf(s);return copy({id:d.id,...d.metadata});}
function calendarYear(s,ordinal=s.year){return s.calendar.startYear+(ordinal-1)*s.calendar.yearsPerTurn;}
function mapSize(s){const m=scenarioOf(s).map;return{width:m.width,height:m.height};}
function cellAt(s,x,y){const {width,height}=mapSize(s);return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<width&&y<height?s.grid[y*width+x]:undefined;}
function sitesOf(s){return scenarioOf(s).map.sites;}
function parcelsOf(s){return scenarioOf(s).map.parcels;}
function placesOf(s){return scenarioOf(s).map.places;}
function presentersOf(s){return scenarioOf(s).people.presenters;}
function councilOf(s){return scenarioOf(s).people.council;}
function inBounds(c,b){return c.x>=b.minX&&c.x<=b.maxX&&c.y>=b.minY&&c.y<=b.maxY;}
function isSupportedSave(s){return validateSave(s).ok;}
function approvalRoute(s,p){const d=scenarioOf(s).decisionRoute;return p.council?{id:d.id,name:d.name}:{id:d.executiveId,name:d.executiveName};}
function proposalEligibility(s,p){
  if(FLAGS.compositionPlans&&p?.program)return programEligibility(s,p);
  const reasons=[];
  if(!p||!KINDS[p.kind])return{ok:false,reasons:['Unknown proposal kind']};
  if(!p.plan||typeof p.plan!=='object')return{ok:false,reasons:['Missing plan']};
  if(!presentersOf(s)[p.presenter]||!s.presenters[p.presenter])reasons.push('Unknown presenter');
  const validated=validatePlan(p.kind,defaultPlan(p.kind),p.plan);
  if(Object.keys(KINDS[p.kind].params).some(k=>validated.plan[k]!==p.plan[k]))reasons.push('Plan fields are outside their allowed values');
  for(const [fact,value] of Object.entries(scenarioOf(s).proposals.definitions[p.id]?.requires||{}))if(s.facts[fact]!==value)reasons.push(`Requires ${fact} = ${value}`);
  for(const [x,y] of plotsOf(p,s))if(!cellAt(s,x,y))reasons.push('Site is outside the scenario map');
  return{ok:!reasons.length,reasons};
}
/* ---------- MP-076..079 composition: trusted vocabulary, never title dispatch ---------- */
// All coefficients are fictional game balance, in $K / plot equivalents / annual capacity.
// See docs/composition-balance.md. No source document supplies measured effect sizes.
const COMPOSITION_RECEIPTS=64;
const CAPABILITIES=[
  {id:'housing',family:'housing',unit:'homes',max:200,minArea:.1,density:60,role:'homes',price:[4,40,.12,2],fx:{housing:2.4,afford:.025,live:.015,prop:.000025}},
  {id:'workplace',family:'commercial',unit:'staffed work places',max:400,minArea:.1,density:40,role:'workshop',price:[4,60,.25,3],fx:{jobs:1,conf:.06,live:.015,prop:.00001}},
  {id:'shop',family:'commercial',unit:'storefronts',max:24,minArea:.25,density:4,role:'mixed',price:[30,20,1,2],fx:{jobs:9,units:1,conf:.4,walk:.2,prop:.0002}},
  {id:'community',family:'civic',unit:'daily participants',max:500,minArea:.1,density:100,role:'civic',price:[1.5,80,.1,8],fx:{jobs:.08,live:.06,approval:.02,walk:.01,prop:.00002}},
  {id:'recreation',family:'recreation',unit:'daily participants',max:500,minArea:.1,density:100,role:'recreation',price:[1,45,.06,5],fx:{jobs:.025,live:.04,safety:.01,prop:.00001}},
  {id:'event',family:'recreation',unit:'peak attendees',max:1000,minArea:.1,density:200,role:'event',price:[.6,60,.035,6],fx:{jobs:.03,live:.02,conf:.015,approval:.005}},
  {id:'agriculture',family:'land',unit:'productive plot equivalents',max:64,minArea:.1,density:1,role:'farm',fractional:true,price:[8,12,1,1],fx:{jobs:2,live:.2,conf:.15,storm:.05}},
  {id:'storage',family:'commercial',unit:'pallet bays',max:1000,minArea:.1,density:100,role:'storage',price:[.8,60,.03,3],fx:{jobs:.08,conf:.015}},
  {id:'access',family:'infrastructure',unit:'daily passages',max:2000,minArea:.1,density:1000,role:'path',price:[.05,45,.005,2],fx:{walk:.004,safety:.002}},
  {id:'parking',family:'infrastructure',unit:'spaces',max:400,minArea:.01,density:100,role:'parking',price:[2.5,0,.1,0],fx:{parking:1,walk:-.025,creek:.001}},
  {id:'green',family:'land',unit:'landscaped plot equivalents',max:64,minArea:.1,density:1,role:'green',fractional:true,price:[45,15,3,2],fx:{walk:.6,live:1.5,storm:.15,prop:.002}},
  {id:'stormwater',family:'infrastructure',unit:'treated plot equivalents',max:64,minArea:.1,density:1,role:'pond',fractional:true,price:[70,30,2,2],fx:{storm:1,live:.25,safety:.2}},
  {id:'policy',family:'policy',unit:'operating program',max:1,minArea:0,density:null,role:'policy',price:[10,0,5,0],fx:{walk:1,safety:1,afford:.5,approval:-.25}}
].map(d=>({id:d.id,label:d.id[0].toUpperCase()+d.id.slice(1),family:d.family,unit:d.unit,
  quantity:{min:d.fractional?.1:1,max:d.max,step:d.fractional?null:1},area:{min:d.minArea,max:d.id==='policy'?0:64},capacityPerArea:d.density,
  shareable:['housing','workplace','shop','community','recreation','event','storage'].includes(d.id),
  pricing:{quantity:d.price[0],area:d.price[1],upkeepQuantity:d.price[2],upkeepArea:d.price[3]},effects:d.fx,render:{role:d.role,symbol:d.id},
  supportsReuse:false,limitations:['Retained assets are excluded from active allocations. Adaptive reuse inside an existing building requires an unsupported scope acknowledgment.'],schema:{type:'object',additionalProperties:false,required:['id','capability','label','quantity','area','sharedWith'],properties:{
    id:{type:'string',pattern:'^[A-Za-z][A-Za-z0-9_-]{0,47}$'},capability:{const:d.id},label:{type:'string',minLength:1,maxLength:120},
    quantity:{type:d.fractional?'number':'integer',minimum:d.fractional?.1:1,maximum:d.max},area:{type:'number',minimum:d.minArea,maximum:d.id==='policy'?0:64},sharedWith:{type:['string','null']}}}}));
const CAPABILITY_BY_ID=Object.fromEntries(CAPABILITIES.map(d=>[d.id,d]));
const record=v=>!!v&&Object.prototype.toString.call(v)==='[object Object]';
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const boundedText=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
function closed(v,allowed,required=allowed){return record(v)&&Object.keys(v).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(v,k));}
function ownRecord(table,id){return boundedText(id,1,120)&&record(table)&&Object.hasOwn(table,id)&&record(table[id]);}
function trustedPresenter(s,id){
  const definitions=presentersOf(s),people=s?.presenters;
  return ownRecord(definitions,id)&&ownRecord(people,id)&&finite(definitions[id].comp,0,100)&&finite(definitions[id].detail,0,100)&&finite(people[id].rel,0,100);
}
function trustedMember(s,id){return ownRecord(s?.council,id)&&finite(s.council[id].rel,0,100)&&councilOf(s).some(m=>record(m)&&m.id===id&&record(m.pri)&&record(m.w));}
// This is a structural save boundary, not a repair/normalization pass. Invalid
// input stays untouched, and v1 omissions are admitted only where migration fills them.
function validateSave(s){
  const fail=reason=>({ok:false,reasons:[reason]});
  if(!record(s)||!(FLAGS.compositionPlans?[1,2,3,4]:[1,2,3]).includes(s.v))return fail('save_version_unsupported');
  const positive=n=>Number.isSafeInteger(n)&&n>0,nonnegative=n=>Number.isSafeInteger(n)&&n>=0,number=n=>typeof n==='number'&&Number.isFinite(n);
  if(!positive(s.year)||!positive(s.maxYears)||!number(s.cash)||!number(s.pop)||!number(s.propIdx)||!number(s.capital)||!boundedText(s.phase,1,40))return fail('save_state_invalid');
  for(const key of ['meters','flags','presenters','council','decided','chats','lobby'])if(!record(s[key]))return fail('save_object_invalid:'+key);
  if(s.v>=2&&!record(s.policies))return fail('save_object_invalid:policies');
  if(Object.values(s.meters).some(v=>!number(v))||!number(s.flags.students)||!number(s.flags.bridgeRisk))return fail('save_numbers_invalid');
  let scenario=MILLBROOKE;
  if(s.v>=3){
    if(!record(s.scenario)||!record(s.calendar)||!record(s.facts)||!boundedText(s.scenarioId,1,120))return fail('save_scenario_invalid');scenario=s.scenario;
    if(!record(scenario.map)||!record(scenario.map.growth)||!record(scenario.map.sites)||!record(scenario.map.parcels)||!record(scenario.map.places)||!record(scenario.people)||!record(scenario.people.presenters)||!Array.isArray(scenario.people.council)||!record(scenario.proposals)||!record(scenario.proposals.definitions)||!record(scenario.proposals.schedule)||!record(scenario.decisionRoute))return fail('save_scenario_invalid');
    if(!positive(s.calendar.electionEvery)||!positive(s.calendar.yearsPerTurn)||!number(s.calendar.startYear))return fail('save_calendar_invalid');
  }
  const {width,height}=scenario.map;
  if(!positive(width)||!positive(height)||!Array.isArray(s.grid)||s.grid.length!==width*height)return fail('save_grid_invalid');
  const point=p=>Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&Number.isInteger(p[1])&&p[0]>=0&&p[0]<width&&p[1]>=0&&p[1]<height;
  for(let i=0;i<s.grid.length;i++){const c=s.grid[i];if(!record(c)||c.x!==i%width||c.y!==Math.floor(i/width)||!boundedText(c.t,1,40)||typeof c.road!=='boolean'||!(c.b===null||record(c.b)&&boundedText(c.b.type,1,80)))return fail('save_grid_entry_invalid');}
  const definitions=scenario.people.presenters,memberIds=new Set();
  for(const m of scenario.people.council){if(!record(m)||!boundedText(m.id,1,120)||memberIds.has(m.id)||!record(m.w)||!record(m.pri)||!ownRecord(s.council,m.id)||!finite(s.council[m.id].rel,0,100))return fail('save_council_invalid');memberIds.add(m.id);}
  for(const [id,p] of Object.entries(s.presenters))if(!ownRecord(definitions,id)||!record(p)||!finite(p.rel,0,100)||!finite(definitions[id].comp,0,100)||!finite(definitions[id].detail,0,100))return fail('save_presenter_invalid');
  for(const [id,m] of Object.entries(s.council))if(!memberIds.has(id)||!record(m)||!finite(m.rel,0,100))return fail('save_council_invalid');
  const project=p=>{
    if(!record(p)||!boundedText(p.id,1,120)||typeof p.kind!=='string'||!Object.hasOwn(KINDS,p.kind)||!ownRecord(definitions,p.presenter)||!ownRecord(s.presenters,p.presenter)||!record(p.plan)||!boundedText(p.site,1,120))return false;
    if(p.plots!==undefined&&(!Array.isArray(p.plots)||p.plots.some(t=>!point(t))))return false;
    if(p.demo!==undefined&&(!record(p.demo)||!Array.isArray(p.demo.landmarks)||!Array.isArray(p.demo.projects)))return false;
    if(p.program!==undefined){if(!validateProgram(p.program).ok||!record(p.layout)||!Array.isArray(p.layout.cells)||p.layout.cells.some(c=>!record(c)||!point(c.plot))||!Array.isArray(p.layout.allocations)||p.layout.allocations.some(a=>!record(a)))return false;}
    else if(!strictLegacyPlan(p.kind,p.plan))return false;
    return true;
  };
  for(const key of ['proposals','pending','built','bonds','reports','history'])if(!Array.isArray(s[key]))return fail('save_collection_invalid:'+key);
  for(const key of ['proposals','pending','built'])for(const p of s[key])if(!project(p)||key==='proposals'&&!boundedText(p.status,1,40)||key!=='proposals'&&(!number(p.cost)||!number(p.costHigh)||!number(p.odds)||!positive(p.year)))return fail('save_collection_entry_invalid:'+key);
  if(s.bonds.some(b=>!record(b)||!boundedText(b.name,1,120)||!number(b.annual)||!nonnegative(b.left)))return fail('save_collection_entry_invalid:bonds');
  if(s.reports.some(r=>!record(r)||(r.type==='event'?!boundedText(r.text,1,4000):!positive(r.year)||!record(r.before)||!record(r.after)||!Array.isArray(r.causes)||r.causes.some(c=>!record(c)||!number(c.v)||!boundedText(c.r,1,4000)))))return fail('save_collection_entry_invalid:reports');
  if(s.history.some(h=>!record(h)||!positive(h.year)||!['pop','cash','jobs','walk','live','conf','approval'].every(k=>number(h[k]))))return fail('save_collection_entry_invalid:history');
  for(const key of ['shocks','extraNext','receipts','projectRecords','persuasionHistory'])if(s[key]!==undefined&&(!Array.isArray(s[key])||s[key].some(v=>!record(v))))return fail('save_collection_entry_invalid:'+key);
  if(s.shocks?.some(v=>!number(v.v)||!boundedText(v.r,1,4000)))return fail('save_collection_entry_invalid:shocks');
  if(s.extraNext?.some(p=>!project(p)))return fail('save_collection_entry_invalid:extraNext');
  if(s.projectRecords?.some(r=>!boundedText(r.proposalId,1,120)||!boundedText(r.stage,1,40)||!Array.isArray(r.revisions)||r.revisions.some(v=>!record(v))))return fail('save_collection_entry_invalid:projectRecords');
  if(s.persuasionHistory?.some(h=>!memberIds.has(h.memberId)||!boundedText(h.proposalId,1,120)||!boundedText(h.claimKey,1,120)||!positive(h.year)))return fail('save_collection_entry_invalid:persuasionHistory');
  if(s.v===4){
    if(!(s.gameId===null||boundedText(s.gameId,1,120))||!nonnegative(s.revision)||!nonnegative(s.actionHighWater)||!Array.isArray(s.receipts)||s.receipts.length>COMPOSITION_RECEIPTS||!Array.isArray(s.projectRecords)||!Array.isArray(s.persuasionHistory))return fail('save_command_state_invalid');
    if(s.receipts.some(r=>!positive(r.id)||r.id>s.actionHighWater||!boundedText(r.fingerprint,1,120)||!record(r.originalResult)))return fail('save_collection_entry_invalid:receipts');
  }
  return {ok:true,reasons:[]};
}
const CONDITION_PROPERTIES={hours:{type:'number',minimum:0,maximum:24},deliveries:{enum:['none','daytime','anytime']},access:{type:'boolean'},
  buffer:{type:'number',minimum:0,maximum:64},preserve:{type:'number',minimum:0,maximum:64},affordable:{type:'boolean'},operations:{type:'array',maxItems:24,items:{type:'object',additionalProperties:false,
    required:['componentId','stage','loadingRoute','publicSales','onSiteConsumption'],properties:{componentId:{type:'string'},stage:{const:'operation'},loadingRoute:{type:['string','null'],maxLength:80},publicSales:{type:'boolean'},onSiteConsumption:{type:'boolean'}}}}};
const CONDITION_KEYS=['hours','deliveries','access','buffer','preserve','affordable'];
function capabilities(){return copy(CAPABILITIES);}
function programSchema(){return copy({type:'object',additionalProperties:false,required:['version','title','intent','components','conditions','assumptions','omissions'],properties:{
  version:{const:2},title:{type:'string',minLength:1,maxLength:120},intent:{type:'string',minLength:1,maxLength:4000},
  components:{type:'array',minItems:1,maxItems:24,items:{oneOf:CAPABILITIES.map(d=>d.schema)}},
  conditions:{type:'object',additionalProperties:false,required:CONDITION_KEYS,properties:CONDITION_PROPERTIES},
  assumptions:{type:'array',maxItems:16,items:{type:'string',minLength:1,maxLength:500}},omissions:{type:'array',maxItems:16,items:{type:'string',minLength:1,maxLength:500}}}});}
function patchSchema(){return copy({type:'object',additionalProperties:false,properties:{upsert:programSchema().properties.components,remove:{type:'array',maxItems:24,items:{type:'string'}},
  title:programSchema().properties.title,conditions:{type:'object',additionalProperties:false,properties:CONDITION_PROPERTIES}}});}
function claimsSchema(){
  const evidence={type:'object',additionalProperties:false,required:['start','end','quote'],properties:{start:{type:'integer',minimum:0},end:{type:'integer',minimum:1},quote:{type:'string',minLength:1,maxLength:4000}}};
  const claim={type:'object',additionalProperties:false,required:['id','type','field','operator','value','evidence'],properties:{id:{type:'string',minLength:1,maxLength:48},type:{enum:['effect','condition','component','town']},field:{type:'string',minLength:1,maxLength:80},operator:{enum:['eq','gte','lte']},value:{type:['number','boolean','string']},evidence}};
  return copy({type:'object',additionalProperties:false,required:['argument','source','programRevision','claims'],properties:{argument:{type:'string',minLength:1,maxLength:4000},source:{enum:['typed','quick']},programRevision:{type:'string'},claims:{type:'array',maxItems:8,items:claim}}});
}

function canonical(value){
  const seen=new Set();
  function encode(v){
    if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
    if(typeof v==='number'){if(!Number.isFinite(v))throw new TypeError('canonical_nonfinite');return JSON.stringify(v);}
    if(typeof v!=='object'||seen.has(v))throw new TypeError('canonical_invalid');
    seen.add(v);let out;
    if(Array.isArray(v)){if(Object.keys(v).length!==v.length)throw new TypeError('canonical_sparse_array');out='['+Array.from(v,encode).join(',')+']';}
    else {if(!record(v)||Object.getOwnPropertySymbols(v).length)throw new TypeError('canonical_invalid');out='{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+encode(v[k])).join(',')+'}';}
    seen.delete(v);return out;
  }
  return encode(value);
}
// Portable synchronous SHA-256: works in the offline browser and a VM without Node APIs.
function fingerprint(value){
  const str=canonical(value),bytes=[];
  for(let i=0;i<str.length;i++){let n=str.charCodeAt(i);if(n>=0xd800&&n<=0xdbff&&i+1<str.length){const low=str.charCodeAt(i+1);if(low>=0xdc00&&low<=0xdfff){n=0x10000+((n-0xd800)<<10)+low-0xdc00;i++;}}
    if(n<128)bytes.push(n);else if(n<2048)bytes.push(192|(n>>6),128|(n&63));else if(n<65536)bytes.push(224|(n>>12),128|((n>>6)&63),128|(n&63));else bytes.push(240|(n>>18),128|((n>>12)&63),128|((n>>6)&63),128|(n&63));}
  const length=bytes.length*8;bytes.push(128);while(bytes.length%64!==56)bytes.push(0);const hi=Math.floor(length/4294967296),lo=length>>>0;for(let shift=24;shift>=0;shift-=8)bytes.push((hi>>>shift)&255);for(let shift=24;shift>=0;shift-=8)bytes.push((lo>>>shift)&255);
  const constants=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],rotr=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let at=0;at<bytes.length;at+=64){const w=[];for(let i=0;i<16;i++)w[i]=(bytes[at+4*i]<<24)|(bytes[at+4*i+1]<<16)|(bytes[at+4*i+2]<<8)|bytes[at+4*i+3];
    for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rotr(x,7)^rotr(x,18)^(x>>>3))+w[i-7]+(rotr(y,17)^rotr(y,19)^(y>>>10)))|0;}
    let [a,b,c,d,e,f,g,k]=h;for(let i=0;i<64;i++){const t1=(k+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+constants[i]+w[i])|0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))|0;k=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
    [a,b,c,d,e,f,g,k].forEach((v,i)=>h[i]=(h[i]+v)|0);
  }
  return h.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
}
function validateConditions(c,partial=false){
  const reasons=[];if(!closed(c,Object.keys(CONDITION_PROPERTIES),partial?[]:CONDITION_KEYS))return ['conditions_unknown_or_missing_field'];
  for(const [k,v] of Object.entries(c)){
    if(['access','affordable'].includes(k)&&typeof v!=='boolean')reasons.push('condition_type:'+k);
    if(['hours','buffer','preserve'].includes(k)&&!finite(v,0,k==='hours'?24:64))reasons.push('condition_bounds:'+k);
    if(k==='deliveries'&&!['none','daytime','anytime'].includes(v))reasons.push('delivery_period_invalid');
    if(k==='operations'){
      if(!Array.isArray(v)||v.length>24){reasons.push('operations_invalid');continue;}
      const ids=new Set();for(const op of v){if(!record(op)){reasons.push('operation_invalid');continue;}if(!closed(op,['componentId','stage','loadingRoute','publicSales','onSiteConsumption'])||!boundedText(op.componentId,1,48)||op.stage!=='operation'||!(op.loadingRoute===null||boundedText(op.loadingRoute,1,80))||typeof op.publicSales!=='boolean'||typeof op.onSiteConsumption!=='boolean'||ids.has(op.componentId))reasons.push('operation_invalid');ids.add(op.componentId);}
    }
  }
  return reasons;
}
function validateProgram(input){
  const reasons=[];
  if(!closed(input,['version','title','intent','components','conditions','assumptions','omissions']))return {ok:false,reasons:['program_unknown_or_missing_field']};
  if(input.version!==2)reasons.push('program_version');
  if(!boundedText(input.title,1,120)||!boundedText(input.intent,1,4000))reasons.push('program_text_bounds');
  for(const k of ['assumptions','omissions'])if(!Array.isArray(input[k])||input[k].length>16||input[k].some(v=>!boundedText(v,1,500)))reasons.push('program_text_list:'+k);
  reasons.push(...validateConditions(input.conditions));
  if(!Array.isArray(input.components)||!input.components.length||input.components.length>24)return {ok:false,reasons:[...reasons,'component_count']};
  const ids=new Map();
  for(const c of input.components){
    if(!closed(c,['id','capability','label','quantity','area','sharedWith'])){reasons.push('component_unknown_or_missing_field');continue;}
    if(typeof c.id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(c.id)||ids.has(c.id)){reasons.push('component_id_invalid');continue;}ids.set(c.id,c);
    if(!boundedText(c.label,1,120))reasons.push('component_label');
    const d=typeof c.capability==='string'&&Object.hasOwn(CAPABILITY_BY_ID,c.capability)&&CAPABILITY_BY_ID[c.capability];if(!d){reasons.push('unsupported_capability');continue;}
    if(!finite(c.quantity,d.quantity.min,d.quantity.max)||(d.quantity.step===1&&!Number.isInteger(c.quantity)))reasons.push('quantity_bounds:'+c.id);
    if(!finite(c.area,d.area.min,d.area.max)||d.capacityPerArea!==null&&c.quantity>c.area*d.capacityPerArea+1e-8)reasons.push('area_capacity:'+c.id);
    if(c.sharedWith!==null&&!boundedText(c.sharedWith,1,48))reasons.push('shared_reference:'+c.id);
  }
  if(reasons.length)return {ok:false,reasons};
  if(input.components.filter(c=>c.capability==='policy').reduce((n,c)=>n+c.quantity,0)>1)reasons.push('policy_capacity_exceeded');
  const shared=new Map();
  for(const c of input.components){if(!record(c)||c.sharedWith===null)continue;const primary=ids.get(c.sharedWith),def=CAPABILITY_BY_ID[c.capability],host=primary&&CAPABILITY_BY_ID[primary.capability];
    if(!primary||primary===c||primary.sharedWith!==null||!def?.shareable||!host?.shareable){reasons.push('shared_reference:'+c.id);continue;}
    shared.set(primary.id,(shared.get(primary.id)||0)+c.area);if(shared.get(primary.id)>primary.area+1e-8)reasons.push('shared_capacity:'+primary.id);
  }
  for(const op of Array.isArray(input.conditions?.operations)?input.conditions.operations:[]){if(!record(op))continue;const c=ids.get(op.componentId);if(!c)reasons.push('operation_component_missing');
    else if((op.publicSales||op.onSiteConsumption)&&!['shop','storage','event','community'].includes(c.capability))reasons.push('operation_not_supported:'+c.id);}
  return reasons.length?{ok:false,reasons}:{ok:true,program:copy(input),reasons:[]};
}

const precise=n=>Math.round(n*1e8)/1e8;
function programLayout(program,plots){
  const allocations=[],primary=new Map();let cursor=0;
  const slices=(start,size)=>{const segments=[];let left=size,at=start;while(left>1e-8){const index=Math.floor(at+1e-8),offset=precise(at-index),area=precise(Math.min(left,1-offset));if(!plots[index]||area<=0)break;segments.push({plot:plots[index].slice(),offset,area});at=precise(at+area);left=precise(left-area);}return segments;};
  for(const c of program.components.filter(c=>c.sharedWith===null)){
    const segments=slices(cursor,c.area),a={componentId:c.id,capability:c.capability,label:c.label,quantity:c.quantity,area:c.area,sharedWith:null,role:CAPABILITY_BY_ID[c.capability].render.role,segments};
    primary.set(c.id,{start:cursor,next:0});allocations.push(a);cursor=precise(cursor+c.area);
  }
  for(const c of program.components.filter(c=>c.sharedWith!==null)){
    const host=primary.get(c.sharedWith),segments=slices(host.start+host.next,c.area);host.next=precise(host.next+c.area);
    allocations.push({componentId:c.id,capability:c.capability,label:c.label,quantity:c.quantity,area:c.area,sharedWith:c.sharedWith,role:CAPABILITY_BY_ID[c.capability].render.role,segments});
  }
  // Presentation order is the accepted component order, even when hosts appear later.
  allocations.sort((a,b)=>program.components.findIndex(c=>c.id===a.componentId)-program.components.findIndex(c=>c.id===b.componentId));
  const buffer=slices(cursor,program.conditions.buffer),usedArea=precise(cursor+program.conditions.buffer),preservedArea=program.conditions.preserve,
    preserved=slices(plots.length-preservedArea,preservedArea),unused=slices(usedArea,Math.max(0,plots.length-preservedArea-usedArea));
  const cells=plots.map(plot=>{const match=segment=>segment.plot[0]===plot[0]&&segment.plot[1]===plot[1],on=allocations.filter(a=>a.segments.some(match)),primaryOn=on.filter(a=>a.sharedWith===null),sum=ss=>precise(ss.filter(match).reduce((n,a)=>n+a.area,0)),occupied=precise(primaryOn.reduce((n,a)=>n+sum(a.segments),0)+sum(buffer));
    return {plot:plot.slice(),componentIds:on.map(a=>a.componentId),role:primaryOn[0]?.role||(sum(buffer)?'buffer':'retained'),usedArea:occupied,bufferArea:sum(buffer),preservedArea:sum(preserved),freeArea:precise(1-occupied-sum(preserved))};});
  return {plots:copy(plots),allocations,cells,capacity:plots.length,usedArea,freeArea:precise(plots.length-usedArea-preservedArea),preservedArea,bufferArea:program.conditions.buffer,buffer,preserved,unused,illustrativeInterior:true};
}
function programDemolition(s,layout){
  const changed=layout.cells.filter(c=>c.usedArea>1e-8).map(c=>c.plot),d=demolitionOf(s,changed);
  d.lostJobs=0;d.lostHousing=0;d.lostUnits=0;
  for(const plot of changed){const b=cellAt(s,...plot).b;if(b?.type==='house')d.lostHousing+=62;if(b?.type==='apt')d.lostHousing+=200;if(b?.type==='shop'){d.lostJobs+=10;d.lostUnits+=2;}if(b&&['college','quad'].includes(b.type))d.lostJobs+=30;}
  const touched=new Set(changed.map(p=>p.join(',')));
  for(const prior of s.built||[]){if(prior.closed)continue;const footprint=prior.layout?prior.layout.cells.filter(c=>c.usedArea>1e-8).map(c=>c.plot):plotsOf(prior,s);if(!footprint.some(p=>touched.has(p.join(','))))continue;
    const old=prior.program?programOperatingEffects(prior,s):KINDS[prior.kind].effects(prior.plan);d.lostJobs+=old.jobs;d.lostHousing+=old.housing;d.lostUnits+=old.units;
  }
  // Working agriculture and landscape management keep the underlying land in service.
  let farmKept=0;for(const cell of layout.cells){if(!cell.usedArea)continue;const c=cellAt(s,...cell.plot);if(c.t==='farm'&&!c.b){const destructive=layout.allocations.filter(a=>a.sharedWith===null&&!['agriculture','green','stormwater','access'].includes(a.capability)).reduce((n,a)=>n+a.segments.filter(t=>t.plot[0]===c.x&&t.plot[1]===c.y).reduce((v,t)=>v+t.area,0),0)+cell.bufferArea;farmKept+=.5*(1-Math.min(1,destructive));}}
  d.farm=precise(Math.max(0,d.farm-farmKept));
  d.retained=layout.cells.filter(c=>!c.usedArea).map(c=>({plot:c.plot.slice(),building:copy(cellAt(s,...c.plot).b||null),terrain:cellAt(s,...c.plot).t}));
  d.changedPlots=changed;return d;
}
function trustedLoadingRoute(s,id){
  const routes=scenarioOf(s).composition?.routes;
  if(!boundedText(id,1,80)||!record(routes)||!Object.hasOwn(routes,id))return null;
  const route=routes[id];
  return record(route)&&Object.hasOwn(route,'id')&&route.id===id?route:null;
}
function programBaseEffects(p,s){
  const program=p.program,c=program.conditions,e={cost:0,upkeep:0,jobs:0,units:0,housing:0,walk:0,live:0,conf:0,prop:0,approval:0,farm:0,parking:0,safety:0,afford:0,storm:0,downtown:0,creek:0,activity:0,noise:0,freight:0,notes:[]};
  for(const part of program.components){const d=CAPABILITY_BY_ID[part.capability],price=d.pricing,operates=!['housing','green','stormwater','policy','agriculture','access','parking'].includes(part.capability),factor=operates?c.hours/10:1;
    e.cost+=part.quantity*price.quantity+part.area*price.area*(part.sharedWith?.5:1);e.upkeep+=part.quantity*price.upkeepQuantity+part.area*price.upkeepArea;
    for(const [field,value] of Object.entries(d.effects))e[field]+=value*part.quantity*(operates&&['jobs','conf','live','approval'].includes(field)?factor:1);
    if(operates){e.activity+=part.quantity*factor;e.noise+=part.quantity*factor*(part.capability==='event'?.02:.005);}
    if(part.capability==='storage')e.freight+=part.quantity/20;
  }
  const physical=program.components.some(c=>c.area>0);
  if(physical){e.cost+=30;if(c.access){e.cost+=25;e.upkeep+=1;e.walk+=1;e.safety+=1;}
    else{e.walk-=1;e.safety-=1;}
    e.cost+=c.buffer*40+c.preserve*8;e.upkeep+=c.buffer*2+c.preserve*.5;e.live+=c.buffer*.7;e.storm+=c.buffer*.2;
    if(c.deliveries==='daytime'&&e.freight){e.cost+=12;e.upkeep+=1;e.noise*=.7;}
    if(c.deliveries==='none'&&e.freight)e.conf-=e.freight*.2;
  }
  const homes=program.components.filter(c=>c.capability==='housing').reduce((n,c)=>n+c.quantity,0);
  if(c.affordable&&homes){e.cost+=homes*10;e.afford+=homes*.0625;e.approval+=1;}
  const traits=p.traits||[],nearHomes=traits.includes('neighbors');
  if(nearHomes){const disturbance=e.noise*Math.max(0,c.hours-8)/8/(1+c.buffer);e.live-=disturbance;e.approval-=disturbance*.5;}
  if(traits.includes('creek'))e.creek+=Math.max(0,(p.layout?.usedArea||0)-c.buffer)*.1;
  if(traits.includes('edge')&&physical)e.walk-=.5;
  for(const op of c.operations||[]){const route=trustedLoadingRoute(s,op.loadingRoute);if(route){e.cost+=route.costK||0;e.upkeep+=route.upkeepK||0;if(route.crossingConflict&&e.freight){e.safety-=.8;e.live-=.4;}}
    if(op.publicSales){e.activity+=5;e.walk+=.1;}}
  for(const k of Object.keys(e))if(typeof e[k]==='number')e[k]=precise(e[k]);return e;
}
function programOperatingEffects(p,s){return p.operatingEffects?copy(p.operatingEffects):programBaseEffects(p,s);}
function compositionEffects(p,s){
  const e=programBaseEffects(p,s),d=p.demo,pr=presentersOf(s)[p.presenter]||PRESENTERS.planner;
  e.cost+=(p.layout?.cells.filter(c=>c.usedArea>1e-8).length||0)*15;
  if(d){e.cost+=d.cost;e.jobs-=d.lostJobs??d.untrackedJobs;e.housing-=d.lostHousing||0;e.units-=d.lostUnits||0;e.farm+=d.farm;e.live+=d.live;e.conf+=d.conf;e.approval+=d.approval;
    if(d.residents)e.notes.push(`Displaces about ${d.residents} residents`);if(d.warning)e.notes.push(d.warning);}
  if(p.grant)e.cost*=1-p.grant;
  e.cost=Math.round(e.cost);e.costHigh=Math.round(e.cost*(1+(100-pr.detail)/250));e.upkeep=r1(e.upkeep);
  // Identity text is separate from numerical notes so renaming cannot change effects.
  e.notes.push('Fictional balance estimates; plot allocations and shared activity are schematic.');return e;
}
function compatiblePlan(program){
  const out=defaultPlan('initiative'),sum=id=>program.components.filter(c=>c.capability===id).reduce((n,c)=>n+c.quantity,0);
  out.homes=Math.min(200,Math.round(sum('housing')));out.shops=Math.min(12,Math.round(sum('shop')));out.parking=Math.min(300,Math.round(sum('parking')));out.affordable=program.conditions.affordable;
  out.green=Math.min(3,Math.ceil(sum('green')));out.stormwater=sum('stormwater')>0;out.plaza=sum('event')>0;out.civic=sum('community')>0?'community_center':'none';return out;
}
function forecastProgram(s,p,base=null){
  const e=effectsOf(p,s),vote=forecastVote(s,p,p.id),support=councilOf(s).map(m=>({memberId:m.id,lean:lean(memberScore(s,m,p,p.id)),statement:memberStatement(s,m,p,p.id)}));
  const money={costK:e.cost,costHighK:e.costHigh,annualUpkeepK:e.upkeep,reserveAfterCashK:s.cash-e.cost,bondAnnualK:Math.round(e.cost*.125)},effects=copy(e);
  delete effects.cost;delete effects.costHigh;delete effects.upkeep;
  const result={programRevision:p.programRevision||fingerprint({kind:p.kind,plan:p.plan,plots:plotsOf(p,s)}),money,effects,demolition:{costK:p.demo?.cost||0,displacedResidents:p.demo?.residents||0,lostStorefronts:p.demo?.storefronts||0,acquisitionWarning:p.demo?.warning||null},support,votes:vote,funding:fundingOptions(s,p),deliveryOdds:deliveryOdds(s,p)};
  if(base){const old=forecastProgram(s,base),delta={money:{},effects:{},support:[]};for(const k of Object.keys(money))delta.money[k]=precise(money[k]-old.money[k]);for(const k of new Set([...Object.keys(effects),...Object.keys(old.effects)]))if(typeof effects[k]==='number'||typeof old.effects[k]==='number')delta.effects[k]=precise((effects[k]||0)-(old.effects[k]||0));delta.support=support.map(m=>({memberId:m.memberId,lean:m.lean-(old.support.find(v=>v.memberId===m.memberId)?.lean||0)}));result.delta=delta;}
  return result;
}
function previewProgram(s,input){
  const reasons=[];if(!FLAGS.compositionPlans)return {ok:false,reasons:['composition_disabled']};
  if(!s||!closed(input,['program','plots','id','presenter'],['program','plots']))return {ok:false,reasons:['preview_unknown_or_missing_field']};
  const valid=validateProgram(input.program);if(!valid.ok)return valid;const program=valid.program,plots=input.plots,seen=new Set();
  if(!Array.isArray(plots)||plots.length>mapSize(s).width*mapSize(s).height)return {ok:false,reasons:['plots_invalid']};
  for(const plot of plots){if(!Array.isArray(plot)||plot.length!==2||!Number.isInteger(plot[0])||!Number.isInteger(plot[1])){reasons.push('plot_invalid');continue;}
    const key=plot.join(',');if(seen.has(key))reasons.push('plot_duplicate');seen.add(key);if(!canBuildOn(s,...plot))reasons.push('plot_not_buildable');}
  const presenter=Object.hasOwn(input,'presenter')?input.presenter:'planner',id=Object.hasOwn(input,'id')?input.id:'init'+s.year;
  if(!boundedText(id,1,100)||!trustedPresenter(s,presenter))reasons.push('proposal_identity_invalid');
  const used=program.components.reduce((n,c)=>n+(c.sharedWith===null?c.area:0),0)+program.conditions.buffer;
  if(program.components.some(c=>c.capability==='policy')&&[...(s.built||[]),...(s.pending||[])].some(p=>p.id!==id&&!p.closed&&p.program?.components.some(c=>c.capability==='policy')))reasons.push('policy_program_already_active');
  if(used+program.conditions.preserve>plots.length+1e-8)reasons.push('site_capacity_exceeded');
  for(const op of program.conditions.operations||[]){if(op.loadingRoute!==null){const route=trustedLoadingRoute(s,op.loadingRoute);if(!route||route.plots&&!plots.some(p=>route.plots.some(q=>canonical(p)===canonical(q))))reasons.push('loading_route_unavailable');}}
  if(reasons.length)return {ok:false,reasons};
  const layout=programLayout(program,plots),demo=programDemolition(s,layout),changed=new Set(demo.changedPlots.map(p=>p.join(',')));
  for(const cell of layout.cells){if(cell.usedArea>1e-8&&cell.preservedArea>1e-8&&cellAt(s,...cell.plot).b)reasons.push('retained_building_cannot_be_split');}
  for(const b of s.built||[]){if(b.closed)continue;const old=b.layout?b.layout.cells.filter(c=>c.usedArea>1e-8).map(c=>c.plot):plotsOf(b,s);if(old.some(p=>changed.has(p.join(',')))&&old.some(p=>!changed.has(p.join(','))))reasons.push('existing_project_partial_demolition');}
  if(reasons.length)return {ok:false,reasons};
  const proposal={id,kind:'initiative',title:program.title,presenter,site:plots.length?'custom':'none',plots:copy(plots),traits:plotTraits(s,plots),demo,plan:compatiblePlan(program),
    program,programRevision:fingerprint({program,plots,presenter,id}),layout,conditions:copy(program.conditions),council:true,blurb:program.intent,desc:program.intent,year:s.year,status:'open',mine:presenter==='planner',outOfScope:program.omissions.join(' ')||null};
  return {ok:true,proposal,forecast:forecastProgram(s,proposal),layout,reasons:[]};
}
function reviseProgram(s,p,patch){
  if(!p?.program)return closed(patch,['changes'])?previewLegacyRevision(s,p,patch.changes):{ok:false,reasons:['legacy_changes_required']};
  if(!closed(patch,['upsert','remove','conditions','title'],[]))return {ok:false,reasons:['patch_unknown_field']};
  if(patch.upsert!==undefined&&(!Array.isArray(patch.upsert)||patch.upsert.length>24)||patch.remove!==undefined&&(!Array.isArray(patch.remove)||patch.remove.length>24||patch.remove.some(x=>!boundedText(x,1,48))||new Set(patch.remove).size!==patch.remove.length))return {ok:false,reasons:['patch_components_invalid']};
  if(patch.conditions!==undefined){const invalid=validateConditions(patch.conditions,true);if(invalid.length)return {ok:false,reasons:invalid};}
  const program=copy(p.program),remove=new Set(patch.remove||[]),upsert=patch.upsert||[];
  if([...remove].some(id=>!program.components.some(c=>c.id===id))||new Set(upsert.map(c=>c?.id)).size!==upsert.length||upsert.some(c=>!record(c)||remove.has(c.id)))return {ok:false,reasons:['patch_id_invalid']};
  program.components=program.components.filter(c=>!remove.has(c.id));for(const c of upsert){const at=program.components.findIndex(old=>old.id===c.id);if(at>=0)program.components[at]=copy(c);else program.components.push(copy(c));}
  if(patch.conditions)Object.assign(program.conditions,patch.conditions);if(patch.title!==undefined)program.title=patch.title;
  const result=previewProgram(s,{program,plots:plotsOf(p,s),id:p.id,presenter:p.presenter});
  if(result.ok){result.proposal={...copy(p),...result.proposal,site:p.site,mine:p.mine};result.forecast=forecastProgram(s,result.proposal,p);}return result;
}

function initializeComposition(s,options={}){
  s.v=4;s.gameId=s.gameId||options.gameId||null;s.revision=Number.isSafeInteger(s.revision)?s.revision:0;
  s.actionHighWater=Number.isSafeInteger(s.actionHighWater)?s.actionHighWater:0;s.receipts=s.receipts||[];s.projectRecords=s.projectRecords||[];s.persuasionHistory=s.persuasionHistory||[];
}
const authoredProgram=(title,intent,components,conditions={})=>({version:2,title,intent,components,conditions:{hours:10,deliveries:'daytime',access:true,buffer:0,preserve:0,affordable:false,...conditions},assumptions:['Fictional operating facts are authored for this new campaign.'],omissions:[]});
const authoredPart=(id,capability,quantity,area,sharedWith=null)=>({id,capability,label:id.replaceAll('_',' '),quantity,area,sharedWith});
function installCompositionScenario(s){
  if(s.scenarioId!=='millbrooke'||s.scenario.composition)return;
  const farmPlots=copy(sitesOf(s).ridge),campusPlots=copy(sitesOf(s).campus_s),source='docs/reference/frozen-C/docs/contracts/proposal-council-v1/sources/approved-review/persona-dossier.md';
  const profiles={
    bowers_operator:{version:1,controller:'bowers_operator',authority:'own-proposal operating arrangement; no authority to sell leased land',source,interests:['working land','equipment and feed access','continuity under a recorded lease'],beliefs:['Fragmentation may make succession harder.'],
      affectedPlots:farmPlots,prerequisites:[{fact:'bowersLeaseValid',value:true,reason:'The operating arrangement requires the recorded farm lease.'}],
      hard:[{field:'component.agriculture',min:2,reason:'working_fields_removed: the proposal must keep productive fields in operation.'}],
      preferences:[{field:'condition.access',equals:true,reason:'farm_access: keep equipment and feed access open.',concession:{conditions:{access:true}}},{field:'condition.preserve',min:3,reason:'farm_land: retain the leased field margin.',concession:{conditions:{preserve:3}}}],voice:'Explain a day of deliveries and field work; distinguish operation from title.'},
    freight_operator:{version:1,controller:'freight_operator',authority:'own distribution proposal and loading schedule; no alcohol licensing power',source,interests:['usable storage','safe service access','reliable daytime loading'],
      affectedPlots:campusPlots,prerequisites:[{fact:'campusLoadingDelegated',value:true,reason:'The service-lane arrangement requires a recorded operating delegation.'}],
      hard:[{field:'component.storage',min:10,reason:'operating_viability: retain at least the authored minimum storage capacity.'},{field:'operation.onSiteConsumption',equals:false,reason:'consumption_scope: a drinking venue is outside this operator’s submitted distribution program.'}],
      preferences:[{field:'condition.deliveries',equals:'daytime',reason:'delivery_conflict: daytime loading is the agreed operating window.',concession:{conditions:{deliveries:'daytime'}}}],voice:'Discuss loading and storage, without promising permits or council votes.'},
    college_liaison:{version:1,controller:null,authority:'stakeholder statement only; cannot authorize neighboring business edits',source,interests:['campus pedestrian access','delivery conflict','student-facing sales safeguards'],beliefs:['Public-facing alcohol sales may create pressures; this is a concern, not a measured effect.'],
      affectedPlots:campusPlots,prerequisites:[],hard:[{field:'operation.onSiteConsumption',equals:false,reason:'consumption_scope: the college does not endorse a drinking venue on the presented operating facts.'}],
      preferences:[{field:'operation.crossingConflict',equals:false,reason:'delivery_conflict: loading crosses the authored campus entrance.'},{field:'operation.publicSales',equals:false,reason:'public_sales: customer-facing sales require a separately reviewed access and safeguards plan.'}],voice:'Ask concrete questions about loading and customers. A concern is not a veto.'}
  };
  s.scenario.composition={version:1,profiles,routes:{
    'campus-entrance':{id:'campus-entrance',plots:campusPlots,crossingConflict:true,costK:0,upkeepK:0,source:'scenario-authored access conflict'},
    'service-lane':{id:'service-lane',plots:campusPlots,crossingConflict:false,costK:25,upkeepK:2,source:'scenario-authored delegated service route'}},
    authoredFacts:{bowersLeaseValid:{value:true,recordId:'bowers-lease-2027',source:'scenario-authored'},campusLoadingDelegated:{value:true,recordId:'campus-service-agreement-2027',source:'scenario-authored'}}};
  Object.assign(s.facts,{bowersLeaseValid:true,campusLoadingDelegated:true});
  for(const [id,name,role] of [['bowers_operator','Ruth Bowers','Working-farm tenant operator'],['freight_operator','Alex Moreno','Distribution operator'],['college_liaison','Dr. Leena Shah','College community liaison']]){
    profiles[id].researchAmendment='docs/persona-research-v2.md';
    s.scenario.people.presenters[id]={name,role,rel:55,comp:80,detail:85,flex:'medium',persona:profiles[id].voice};s.presenters[id]={rel:55};
  }
  const farm=authoredProgram('Bowers farm access and stand','Keep a leased working farm productive while adding a small stand and equipment access.',[
    authoredPart('fields','agriculture',4,4),authoredPart('stand','shop',1,.25),authoredPart('lane','access',100,.25)],{preserve:4}),
    campus=authoredProgram('College Avenue distribution loading','A freight-only storage operation with a delegated service lane, not a drinking venue.',[
      authoredPart('warehouse','storage',40,1),authoredPart('loading','access',100,.25)],{buffer:.5,operations:[{componentId:'warehouse',stage:'operation',loadingRoute:'service-lane',publicSales:false,onSiteConsumption:false}]});
  s.scenario.proposals.definitions['farm-access']={kind:'initiative',title:farm.title,presenter:'bowers_operator',site:'ridge',program:farm,controller:'bowers_operator',profileId:'bowers_operator',stakeholders:[],council:true};
  s.scenario.proposals.definitions['campus-loading']={kind:'initiative',title:campus.title,presenter:'freight_operator',site:'campus_s',program:campus,controller:'freight_operator',profileId:'freight_operator',stakeholders:['college_liaison'],council:true};
  s.scenario.proposals.schedule[1]=[...(s.scenario.proposals.schedule[1]||[]),'farm-access','campus-loading'];
  s.scenario.programDefinitions={...(s.scenario.programDefinitions||{}),'working-farm-stand':{id:'working-farm-stand',label:'Working farm and stand',program:copy(farm)},'freight-storage':{id:'freight-storage',label:'Freight storage and access',program:copy(campus)}};
}
function programDefinitions(s){
  const result=[];for(const [id,def] of Object.entries(scenarioOf(s).programDefinitions||{})){
    if(!closed(def,['id','label','program'])||id!==def.id||!boundedText(id,1,80)||!boundedText(def.label,1,120))continue;
    const checked=validateProgram(def.program);if(checked.ok)result.push({id,label:def.label,program:checked.program});
  }return result;
}

function strictLegacyPlan(kind,plan){
  if(!KINDS[kind]||!closed(plan,Object.keys(KINDS[kind].params)))return false;
  return Object.entries(KINDS[kind].params).every(([k,rule])=>rule.type==='bool'?typeof plan[k]==='boolean':rule.type==='enum'?rule.options.includes(plan[k]):finite(plan[k],rule.min,rule.max)&&Number.isInteger(plan[k])&&Math.abs((plan[k]-rule.min)/rule.step-Math.round((plan[k]-rule.min)/rule.step))<1e-8);
}
function legacyRevision(p,s){return fingerprint({id:p.id,kind:p.kind,plan:p.plan,plots:plotsOf(p,s),presenter:p.presenter});}
function previewLegacyRevision(s,p,changes){
  if(!FLAGS.compositionPlans||!p||p.program||!KINDS[p.kind]||!closed(changes,Object.keys(KINDS[p.kind].params),[]))return {ok:false,reasons:['legacy_patch_invalid']};
  const plan={...p.plan,...changes};if(!strictLegacyPlan(p.kind,plan))return {ok:false,reasons:['legacy_plan_out_of_bounds']};
  if(p.kind==='initiative'&&needsSite(plan)&&plotsNeeded(plan)>plotsOf(p,s).length)return {ok:false,reasons:['site_capacity_exceeded']};
  const candidate={...copy(p),plan};candidate.programRevision=legacyRevision(candidate,s);
  return {ok:true,proposal:candidate,forecast:forecastProgram(s,candidate,p),layout:p.layout?copy(p.layout):null,reasons:[]};
}
function residentProfile(s,p,actorId){
  const def=scenarioOf(s).proposals.definitions[p.id]||{},controller=def.controller||p.presenter;
  const profiles=scenarioOf(s).composition?.profiles||{},id=actorId||def.profileId||controller;
  const trusted=profiles[id]||(!actorId&&def.profile)||presentersOf(s)[id]?.profile;
  if(trusted)return {profile:trusted,controller};
  const pr=presentersOf(s)[p.presenter],profile={version:1,controller,authority:'own submitted proposal only',prerequisites:[],hard:[],preferences:[]};
  if(!p.program){
    for(const [field,rule] of Object.entries(KINDS[p.kind].params))if(rule.type==='int'&&p.plan[field]>0&&pr.flex==='low'&&['homes','beds','stores'].includes(field))profile.hard.push({field:'plan.'+field,min:p.plan[field]*.5,reason:'submitted_capacity: the proposer will not remove most of the submitted capacity.'});
    if(p.kind==='park'&&p.plan.memorial)profile.preferences.push({field:'plan.memorial',equals:true,reason:'memorial_commitment: retain the submitted memorial.',concession:{changes:{memorial:true}}});
  }
  return {profile,controller};
}
function residentMetric(s,p,field){
  const [type,...rest]=field.split('.'),name=rest.join('.');
  if(type==='condition')return p.program?.conditions[name];if(type==='plan')return p.plan?.[name];
  if(type==='component')return p.program?.components.filter(c=>c.capability===name).reduce((n,c)=>n+c.quantity,0)||0;
  if(type==='effect')return effectsOf(p,s)[name];
  if(type==='operation'){
    const ops=p.program?.conditions.operations||[];
    if(name==='crossingConflict')return ops.some(op=>trustedLoadingRoute(s,op.loadingRoute)?.crossingConflict===true);
    return ops.some(op=>op[name]===true);
  }
  return undefined;
}
function ruleFails(s,p,rule){const v=residentMetric(s,p,rule.field);return v===undefined||Object.hasOwn(rule,'equals')&&v!==rule.equals||Object.hasOwn(rule,'min')&&v<rule.min||Object.hasOwn(rule,'max')&&v>rule.max;}
function trustedPrerequisite(s,gate){
  if(!gate||typeof gate.fact!=='string'||s.facts?.[gate.fact]!==gate.value)return false;
  const authored=scenarioOf(s).composition?.authoredFacts?.[gate.fact];
  if(authored&&authored.value===gate.value&&authored.source==='scenario-authored'&&authored.recordId)return true;
  return (s.built||[]).some(b=>!b.closed&&b.completionFacts?.[gate.fact]===gate.value&&scenarioOf(s).proposals.definitions[b.id]?.completionFacts?.[gate.fact]===gate.value);
}
function evaluateResident(s,proposal,candidate){
  const fail=reasons=>({stance:'refuse',reasons,controller:null,prerequisites:[],stakeholders:[],authorizedRevision:null});
  if(!FLAGS.compositionPlans||!proposal||!candidate)return fail(['resident_candidate_invalid']);
  const p=s.proposals.find(q=>q.id===proposal.id)||proposal,option=candidate.proposal||candidate;
  if(option.id!==p.id||option.presenter!==p.presenter||canonical(plotsOf(option,s))!==canonical(plotsOf(p,s))||option.kind!==p.kind)return fail(['resident_subject_or_site_mismatch']);
  const checked=p.program?previewProgram(s,{program:option.program,plots:plotsOf(p,s),id:p.id,presenter:p.presenter}):previewLegacyRevision(s,p,option.plan);
  if(!checked.ok)return fail(checked.reasons);const desired=checked.proposal,{profile,controller}=residentProfile(s,p),prerequisites=(profile.prerequisites||[]).map(g=>({...copy(g),satisfied:trustedPrerequisite(s,g)}));
  const binding={controller,profileVersion:profile.version||1,programRevision:desired.programRevision,stateRevision:s.revision,prerequisites};
  const def=scenarioOf(s).proposals.definitions[p.id]||{},stakeholders=(def.stakeholders||[]).map(id=>{
    const other=residentProfile(s,p,id).profile,hard=(other.hard||[]).filter(r=>ruleFails(s,desired,r)),preferences=(other.preferences||[]).filter(r=>ruleFails(s,desired,r));
    return {actorId:id,controller:false,stance:hard.length?'refuse':preferences.length?'counter':'agree',reasons:[...hard,...preferences].map(r=>r.reason)};
  });
  if(!controller||!presentersOf(s)[controller]&&controller!=='mayor')return {...fail(['controlling_authority_missing']),...binding,stakeholders};
  if(prerequisites.some(g=>!g.satisfied))return {stance:'refuse',reasons:prerequisites.filter(g=>!g.satisfied).map(g=>g.reason||'condition_unresolved:'+g.fact),...binding,stakeholders,authorizedRevision:null};
  const hard=(profile.hard||[]).filter(r=>ruleFails(s,desired,r));if(hard.length)return {stance:'refuse',reasons:hard.map(r=>r.reason),...binding,stakeholders,authorizedRevision:null};
  const preferences=(profile.preferences||[]).filter(r=>ruleFails(s,desired,r));
  if(preferences.length){let counter=desired;for(const rule of preferences){if(!rule.concession)return {stance:'refuse',reasons:preferences.map(r=>r.reason),...binding,stakeholders,authorizedRevision:null};
      const result=counter.program?reviseProgram(s,counter,rule.concession):previewLegacyRevision(s,counter,rule.concession.changes);if(!result.ok)return {stance:'refuse',reasons:[rule.reason,...result.reasons],...binding,stakeholders,authorizedRevision:null};counter=result.proposal;}
    if((profile.hard||[]).some(r=>ruleFails(s,counter,r))||(profile.preferences||[]).some(r=>ruleFails(s,counter,r)))return {...fail(['counter_not_authorized']),...binding,stakeholders};
    return {stance:'counter',reasons:preferences.map(r=>r.reason),counter,...binding,stakeholders,authorizedRevision:counter.programRevision};
  }
  return {stance:'agree',reasons:['The requested revision respects the proposer’s recorded interests and operating authority.'],...binding,stakeholders,authorizedRevision:desired.programRevision};
}

const CLAIM_ALIASES={jobs:['jobs','work places','workers'],housing:['housing','homes','residents'],units:['stores','shops','storefronts'],cost:['cost','reserve','budget'],costHigh:['cost','budget'],upkeep:['upkeep','annual'],parking:['parking','spaces'],walk:['walk','paths','access'],live:['livability','quality of life','recreation','green'],conf:['business','confidence'],prop:['property','values'],approval:['approval','support'],farm:['farm','fields','land'],safety:['safe','safety'],afford:['affordable','affordability','housing'],storm:['stormwater','runoff','rain'],creek:['creek','flood'],hours:['hours'],deliveries:['deliveries','loading'],access:['access','lane','path'],buffer:['buffer','screening'],preserve:['preserve','retain','land'],affordable:['affordable','working families']};
function claimPriority(type,field,value,e,s){
  if(type==='effect'){
    const priority={units:'stores',storm:'flood',creek:'flood',upkeep:'cost',costHigh:'cost'}[field]||field;
    const useful=['cost','costHigh','upkeep'].includes(field)?value<=s.cash/2:['farm','creek','parking'].includes(field)?value<=0:value>0;
    return useful?priority:null;
  }
  if(type==='condition')return {access:value?'walk':null,buffer:value>0?'live':null,preserve:value>0?'farm':null,affordable:value?'afford':null,hours:value<=12?'live':null,deliveries:value==='daytime'?'safety':null}[field]||null;
  if(type==='component')return value>0?({housing:'housing',workplace:'jobs',shop:'stores',community:'live',recreation:'live',event:'conf',agriculture:'farm',storage:'jobs',access:'walk',parking:null,green:'live',stormwater:'flood',policy:'safety'}[field]||null):null;
  return null;
}
function evaluateClaims(s,p,memberId,input){
  const invalid=reason=>({ok:false,reasons:[reason],claims:[],addressed:[],credit:'none',tone:'respectful',notes:[reason],offers:[]});
  if(!FLAGS.compositionPlans||!p||!trustedMember(s,memberId))return invalid('claim_subject_invalid');
  if(!closed(input,['argument','source','programRevision','claims'])||!boundedText(input.argument,1,4000)||!['typed','quick'].includes(input.source)||!Array.isArray(input.claims)||input.claims.length>8)return invalid('claim_input_invalid');
  const current=s.proposals.find(q=>q.id===p.id)||p,revision=current.programRevision||legacyRevision(current,s);
  if(input.programRevision!==revision)return invalid('claim_revision_stale');
  const e=effectsOf(current,s),m=councilOf(s).find(m=>m.id===memberId),addressed=[],results=[],seen=new Set(),notes=[];
  for(const c of input.claims){
    if(!closed(c,['id','type','field','operator','value','evidence'])||!boundedText(c.id,1,48)||seen.has(c.id)||!['effect','condition','component','town'].includes(c.type)||!boundedText(c.field,1,80)||!['eq','gte','lte'].includes(c.operator)||!(typeof c.value==='boolean'||boundedText(c.value,1,120)||finite(c.value,-1e9,1e9))||!closed(c.evidence,['start','end','quote']))return invalid('claim_schema_invalid');
    seen.add(c.id);const span=c.evidence,quote=span.quote;
    let code='verified',actual,valid=true;
    if(!Number.isInteger(span.start)||!Number.isInteger(span.end)||span.start<0||span.end<=span.start||span.end>input.argument.length||typeof quote!=='string'||input.argument.slice(span.start,span.end)!==quote){valid=false;code='claim_evidence_mismatch';}
    if(c.type==='effect'&&typeof e[c.field]==='number')actual=e[c.field];
    if(c.type==='condition'&&CONDITION_KEYS.includes(c.field))actual=current.program?.conditions[c.field];
    if(c.type==='component'&&Object.hasOwn(CAPABILITY_BY_ID,c.field))actual=current.program?.components.filter(p=>p.capability===c.field).reduce((n,c)=>n+c.quantity,0)||0;
    if(c.type==='town'&&['pop','cash','farmLost'].includes(c.field))actual=s[c.field]||0;
    if(valid){const equality=typeof c.value==='number'&&typeof actual==='number'?Math.abs(actual-c.value)<1e-7:actual===c.value;
      if(actual===undefined||c.operator==='eq'&&!equality||c.operator==='gte'&&!(typeof actual==='number'&&typeof c.value==='number'&&actual>=c.value)||c.operator==='lte'&&!(typeof actual==='number'&&typeof c.value==='number'&&actual<=c.value)){valid=false;code=actual===undefined?'claim_unsupported':'claim_false';}}
    if(valid){const lower=quote.toLowerCase(),aliases=CLAIM_ALIASES[c.field]||[CAPABILITY_BY_ID[c.field]?.label.toLowerCase()||c.field.toLowerCase()];
      if(!aliases.some(a=>lower.includes(a))){valid=false;code='claim_evidence_unrelated';}
      if(typeof c.value==='number'){const normalized=lower.replaceAll(',',''),number=String(c.value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(!new RegExp('(^|[^0-9.])'+number+'($|[^0-9.])').test(normalized)){valid=false;code='claim_quantity_not_in_argument';}}
      if(c.value!==false&&/\b(no|without|not|never|doesn’t|doesn't|won't|cannot)\b/.test(lower)){valid=false;code='claim_evidence_negated';}
      if(/\b(may|might|could|possibly|unknown|unclear)\b/.test(lower)){valid=false;code='claim_evidence_ambiguous';}
      if(c.value===false&&!/\b(no|without|not|never|closed|absent|off|false)\b/.test(lower)){valid=false;code='claim_polarity_not_in_argument';}
      if(typeof c.value==='string'&&!lower.includes(c.value.toLowerCase())){valid=false;code='claim_value_not_in_argument';}
    }
    const key=fingerprint({proposalId:p.id,type:c.type,field:c.field,actual:actual??null}),priority=valid?claimPriority(c.type,c.field,actual,e,s):null,
      repeated=(s.persuasionHistory||[]).some(h=>h.memberId===memberId&&h.proposalId===p.id&&(h.claimKey===key||(s.receipts||[]).some(r=>r.type==='persuade'&&r.memberId===memberId&&r.proposalId===p.id&&Array.isArray(r.originalResult?.claims)&&r.originalResult.claims.some(previous=>record(previous)&&previous.creditEligible&&previous.claimKey===h.claimKey&&previous.type===c.type&&previous.field===c.field&&previous.actual===actual))));
    let creditEligible=valid&&!!priority&&!!m.pri[priority];if(valid&&!creditEligible)code='claim_irrelevant';if(valid&&repeated){creditEligible=false;code='claim_repeated';}
    if(creditEligible)addressed.push(priority);results.push({id:c.id,type:c.type,field:c.field,claimedValue:c.value,valid,code,actual:actual??null,priority,creditEligible,claimKey:key});notes.push(c.id+': '+code);
  }
  const tone=/\b(idiot|stupid|moron|corrupt|hate you)\b/i.test(input.argument)?'hostile':/\b(you must|or else|do as i say)\b/i.test(input.argument)?'pushy':'respectful',unique=[...new Set(addressed)];
  return {ok:true,reasons:[],claims:results,addressed:unique,credit:unique.length?(input.source==='quick'?'quick':'strong'):'none',tone,notes,offers:[],memberId,programRevision:revision,remainingConcerns:memberStatement(s,m,current,current.id).opposes};
}
function readReactionContext(s,ref){
  const fail=reason=>({ok:false,reasons:[reason]});if(!closed(ref,['id','fingerprint','memberId']))return fail('reaction_reference_invalid');
  const receipt=(s.receipts||[]).find(r=>r.id===ref.id);if(!receipt)return fail('receipt_not_found');if(receipt.type!=='persuade')return fail('reaction_type_mismatch');
  if(receipt.memberId!==ref.memberId)return fail('reaction_member_mismatch');if(receipt.fingerprint!==ref.fingerprint)return fail('command_mismatch');
  return {ok:true,receipt:copy(receipt),result:copy(receipt.originalResult),memberId:receipt.memberId,reasons:[]};
}

function programEligibility(s,p){
  if(!record(p.layout)||!record(p.demo))return {ok:false,reasons:['proposal_layout_missing']};
  const r=previewProgram(s,{program:p.program,plots:plotsOf(p,s),id:p.id,presenter:p.presenter});if(!r.ok)return {ok:false,reasons:r.reasons};
  const reasons=[];if(p.programRevision!==r.proposal.programRevision||canonical(p.layout)!==canonical(r.layout)||canonical(p.demo)!==canonical(r.proposal.demo))reasons.push('proposal_changed_repreview_required');
  for(const [fact,value] of Object.entries(scenarioOf(s).proposals.definitions[p.id]?.requires||{}))if(s.facts[fact]!==value)reasons.push('condition_unresolved:'+fact);
  return {ok:!reasons.length,reasons};
}
function projectRecord(s,p){
  let record=(s.projectRecords||[]).find(r=>r.proposalId===p.id);
  if(!record){record={proposalId:p.id,title:p.title,intent:p.program?.intent||p.desc||p.blurb||'',originalProgram:p.program?copy(p.program):null,originalPlan:copy(p.plan),plots:copy(plotsOf(p,s)),presenter:p.presenter,stage:'agenda',postedYear:s.year,revisions:[]};s.projectRecords.push(record);}
  return record;
}
function approveProgram(s,p,funding,route){
  const eligibility=programEligibility(s,p);if(!eligibility.ok)return eligibility;
  if(s.phase!=='agenda'||p.status!=='open'||s.decided[p.id]==='approved'||s.pending.some(q=>q.id===p.id)||s.built.some(q=>q.id===p.id))return {ok:false,reasons:['proposal_not_open']};
  const required=approvalRoute(s,p);if(route!==required.id)return {ok:false,reasons:['decision_route_invalid']};
  if(!['cash','bond'].includes(funding))return {ok:false,reasons:['funding_invalid']};
  const resident=evaluateResident(s,p,p);if(resident.stance!=='agree')return {ok:false,reasons:resident.reasons};
  const e=effectsOf(p,s);if(funding==='cash'&&s.cash<e.cost)return {ok:false,reasons:['insufficient_cash']};
  const votes=forecastVote(s,p,p.id);if(p.council&&votes.winner!==p.id)return {ok:false,reasons:['council_no_majority']};
  if(!p.council&&e.cost>scenarioOf(s).decisionRoute.executiveLimit)return {ok:false,reasons:['executive_limit_exceeded']};
  if(funding==='bond')s.bonds.push({name:p.title,annual:Math.round(e.cost*.125),left:10});else s.cash-=e.cost;
  const accepted={...copy(p),cost:e.cost,costHigh:e.costHigh,funding,odds:deliveryOdds(s,p),year:s.year,operatingEffects:programBaseEffects(p,s),decision:{action:p.council?'vote':'approve',route,funding,year:s.year,votes:copy(votes)}};
  p.status='approved';s.decided[p.id]='approved';s.pending.push(accepted);s.presenters[p.presenter].rel=clamp(s.presenters[p.presenter].rel+8,0,100);
  const d=p.demo,changed=new Set(d.changedPlots.map(p=>p.join(',')));
  for(const built of s.built)if(!built.closed&&(built.layout?built.layout.cells.filter(c=>c.usedArea>1e-8).map(c=>c.plot):plotsOf(built,s)).some(p=>changed.has(p.join(',')))){built.closed=true;built.demolished=s.year;const old=(s.projectRecords||[]).find(r=>r.proposalId===built.id);if(old){old.stage='demolished';old.demolishedYear=s.year;}}
  if(d.collegeTiles)s.flags.collegeLost=(s.flags.collegeLost||0)+d.collegeTiles;
  if(d.residents)s.pop=Math.max(0,s.pop-d.residents);
  s.shocks=s.shocks||[];if(d.residents)s.shocks.push({v:0,m:'pop',r:`Displaced about ${d.residents} residents to build ${p.title}`});
  for(const cell of p.layout.cells){if(!cell.usedArea)continue;const c=cellAt(s,...cell.plot);c.b={type:'construction',for:p.kind,projectId:p.id,programRevision:p.programRevision,role:cell.role};}
  for(const q of s.proposals)if(q.id!==p.id&&q.status==='open'&&p.group&&q.group===p.group){q.status='rejected';s.decided[q.id]='rejected';}
  const record=projectRecord(s,p);Object.assign(record,{stage:'construction',title:p.title,program:copy(p.program),programRevision:p.programRevision,layout:copy(p.layout),conditions:copy(p.program.conditions),commitments:copy(p.program.conditions),decision:copy(accepted.decision),estimatedCostK:e.cost,annualUpkeepK:e.upkeep,controller:resident.controller});
  return {ok:true,reasons:[],votes};
}
function completeProgram(s,p,e,onBudget,causes){
  for(const cell of p.layout.cells){if(!cell.usedArea)continue;const c=cellAt(s,...cell.plot);
    c.b={type:'initiative',projectId:p.id,title:p.title,plan:copy(p.plan),programRevision:p.programRevision,role:cell.role,componentIds:cell.componentIds.slice(),allocation:copy(cell)};
    if(c.t==='farm'&&p.program.components.some(part=>!['agriculture','green','stormwater','access','policy'].includes(part.capability)&&p.layout.allocations.find(a=>a.componentId===part.id)?.segments.some(segment=>canonical(segment.plot)===canonical(cell.plot))))c.t='grass';
  }
  for(const part of p.program.components)if(part.capability==='policy')s.policies['composition:'+p.id+':'+part.id]=s.year;
  s.farmLost=precise((s.farmLost||0)+e.farm);const over=onBudget?0:p.costHigh-p.cost+Math.round(p.cost*.08),record=projectRecord(s,p);
  Object.assign(record,{stage:'built',program:copy(p.program),programRevision:p.programRevision,layout:copy(p.layout),conditions:copy(p.program.conditions),deliveryYear:s.year,actualCostK:p.cost+over,overrunK:over,annualUpkeepK:e.upkeep,observedEffects:copy(e),onBudget});
  causes.push({m:'cash',v:0,r:`${p.title}: approved $${p.cost}K, delivered $${p.cost+over}K; annual upkeep $${e.upkeep}K.`});
  if(e.farm)causes.push({m:'farm',v:e.farm,r:`${p.title} converted ${e.farm} abstract farmland units`});
}
function programOpportunities(s){
  if(!FLAGS.compositionPlans||!s||s.phase==='bankrupt'||s.year>s.maxYears)return [];
  const ec=econ(s),open=s.grid.filter(c=>canBuildOn(s,c.x,c.y)&&!c.b&&!c.site&&c.t==='grass').map(c=>[c.x,c.y]),rural=s.grid.filter(c=>canBuildOn(s,c.x,c.y)&&!c.b&&c.t==='farm').map(c=>[c.x,c.y]),result=[];
  const add=(key,title,reason,components,plots,conditions={})=>{const program=authoredProgram(title,reason,components,conditions),id='opportunity-'+s.year+'-'+key,r=previewProgram(s,{program,plots,id,presenter:'planner'});if(r.ok)result.push({id,key,title,reason,presenter:'planner',program,plots:copy(plots),forecast:r.forecast,layout:r.layout});};
  if(open.length&&ec.housing<s.pop*1.15)add('homes','Homes near existing services','Housing capacity and current population indicate room for compact infill.',[authoredPart('homes','housing',10,.5)],open.slice(0,1),{affordable:s.meters.afford<55});
  if(open.length&&ec.units<ec.demand*1.15)add('local-services','Neighborhood work and services','Current commercial demand exceeds the spare local supply.',[authoredPart('shops','shop',1,.25),authoredPart('work','workplace',3,.25)],open.slice(0,1));
  if(open.length&&(s.flags.floodRisk>.05||ec.parking>100))add('water','Rain gardens and safer paths','Current runoff exposure and parking support preventive infrastructure.',[authoredPart('water','stormwater',.5,.5),authoredPart('path','access',100,.1)],open.slice(0,1));
  if(rural.length&&(s.farmLost||0)>0)add('working-land','Keep working land connected','Recorded farmland conversion creates a reason to protect remaining productive access.',[authoredPart('fields','agriculture',.5,.5),authoredPart('lane','access',100,.1)],rural.slice(0,1));
  if(s.built.some(p=>p.program&&!p.closed)&&open.length)add('follow-up','Follow through on public space','Completed projects create ongoing needs for neighborhood gathering and maintenance.',[authoredPart('gather','community',10,.2),authoredPart('green','green',.2,.2)],open.slice(0,1));
  // There is always an eligible operating choice, including a built-out town.
  add('operations','Review town operating commitments','Review access and operating commitments without acquiring another site.',[authoredPart('review','policy',1,0)],[]);
  if(!result.length)result.push({id:'wait-'+s.year,key:'wait',title:'Let current commitments operate',reason:'Existing operating programs are already active; wait for delivery, changing demand, or an available site.',action:'wait',program:null,plots:[],presenter:'planner'});
  return result;
}

function applyCommand(state,command){
  const fail=(...reasons)=>({ok:false,applied:false,state,receipt:null,reasons});
  if(!FLAGS.compositionPlans)return fail('composition_disabled');
  if(!state||state.v!==4||!boundedText(state.gameId,1,120))return fail('game_identity_required');
  const checked=validateSave(state);if(!checked.ok)return fail(...checked.reasons);
  if(!closed(command,['id','gameId','expectedRevision','expectedGeneration','type','payload'])||!Number.isSafeInteger(command.id)||command.id<=0||!boundedText(command.gameId,1,120)||!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision<0||!Number.isSafeInteger(command.expectedGeneration)||command.expectedGeneration<0||!record(command.payload))return fail('command_schema_invalid');
  let digest;try{digest=fingerprint(command);}catch{return fail('command_not_canonical');}
  if(command.gameId!==state.gameId)return fail('game_mismatch');
  const old=(state.receipts||[]).find(r=>r.id===command.id);
  if(old)return old.fingerprint===digest?{ok:true,applied:false,state,receipt:copy(old),reasons:[]}:fail('command_mismatch');
  if(command.id<=state.actionHighWater)return fail('duplicate_action');
  if(command.id!==state.actionHighWater+1)return fail('command_sequence_invalid');
  if(command.expectedRevision!==state.revision)return fail('state_revision_stale');
  const supported=['postProgram','reviseProposal','persuade','decision','resolveYear','offer','grant'];if(!supported.includes(command.type))return fail('command_type_invalid');
  if(state.phase!=='agenda')return fail('phase_not_agenda');
  const s=copy(state),payload=command.payload,year=s.year;let result,proposalId=null,memberId=null,actorId='mayor',controller=null;
  if(command.type==='postProgram'){
    if(!closed(payload,['program','plots','acknowledgedScope'])||typeof payload.acknowledgedScope!=='boolean')return fail('post_payload_invalid');
    if(!canProposeInitiative(s))return fail('initiative_used');
    const r=previewProgram(s,{program:payload.program,plots:payload.plots});if(!r.ok)return fail(...r.reasons);
    if(r.proposal.program.omissions.length&&!payload.acknowledgedScope)return fail('scope_ack_required');
    if(s.proposals.some(p=>p.id===r.proposal.id)||s.pending.some(p=>p.id===r.proposal.id)||s.built.some(p=>p.id===r.proposal.id))return fail('proposal_id_used');
    s.proposals.push(r.proposal);s.initiativeYear=s.year;proposalId=r.proposal.id;controller='mayor';projectRecord(s,r.proposal);
    result={proposalId,programRevision:r.proposal.programRevision,forecast:r.forecast,stage:'agenda'};
  }else if(command.type==='resolveYear'){
    if(!closed(payload,[]))return fail('year_payload_invalid');
    result=resolveYear(s);
  }else{
    proposalId=payload.proposalId;const p=s.proposals.find(q=>q.id===proposalId);
    if(!p||p.status!=='open'||s.decided[p.id]==='approved')return fail('proposal_not_open');
    if(command.type==='reviseProposal'){
      const hasProgram=Object.hasOwn(payload,'program');
      if(!closed(payload,hasProgram?['proposalId','program','confirmed']:['proposalId','plan','confirmed'])||payload.confirmed!==true||!!p.program!==hasProgram)return fail('revision_payload_invalid');
      const r=hasProgram?previewProgram(s,{program:payload.program,plots:plotsOf(p,s),id:p.id,presenter:p.presenter}):previewLegacyRevision(s,p,payload.plan);if(!r.ok)return fail(...r.reasons);
      const resident=evaluateResident(s,p,r.proposal);if(resident.stance!=='agree'||resident.authorizedRevision!==r.proposal.programRevision)return fail('resident_revision_not_authorized',...resident.reasons);
      controller=resident.controller;actorId=controller;const record=projectRecord(s,p),candidate={...copy(p),...r.proposal,site:p.site,mine:p.mine,council:p.council,group:p.group};
      // Undefined is never introduced into canonical save data.
      if(candidate.group===undefined)delete candidate.group;
      record.revisions.push({year:s.year,from:p.programRevision||legacyRevision(p,s),to:candidate.programRevision,program:candidate.program?copy(candidate.program):null,plan:copy(candidate.plan),controller});
      Object.assign(p,candidate);record.title=p.title;record.programRevision=p.programRevision;result={proposalId,programRevision:p.programRevision,controller,prerequisites:resident.prerequisites,forecast:forecastProgram(s,p)};
    }else if(command.type==='persuade'){
      if(!closed(payload,['proposalId','memberId','argument','source','programRevision','claims']))return fail('persuasion_payload_invalid');
      memberId=payload.memberId;if(!trustedMember(s,memberId))return fail('member_invalid');
      if((s.lobbyCount?.[memberId]||0)>=2)return fail('quota_used');
      const evaluation=evaluateClaims(s,p,memberId,{argument:payload.argument,source:payload.source,programRevision:payload.programRevision,claims:payload.claims});if(!evaluation.ok)return fail(...evaluation.reasons);
      const m=councilOf(s).find(m=>m.id===memberId),leanBefore=lean(memberScore(s,m,p,p.id)),relationshipBefore=s.council[memberId].rel,applied=applyLobby(s,memberId,p.id,evaluation);
      for(const claim of evaluation.claims)if(claim.creditEligible)s.persuasionHistory.push({memberId,proposalId:p.id,claimKey:claim.claimKey,year:s.year});
      s.persuasionHistory=s.persuasionHistory.slice(-256);
      result={proposalId,memberId,programRevision:evaluation.programRevision,credit:evaluation.credit,tone:evaluation.tone,addressed:evaluation.addressed,claims:evaluation.claims,points:applied.points,
        notes:[...evaluation.notes,...applied.notes],leanBefore,leanAfter:lean(memberScore(s,m,p,p.id)),relationshipBefore,relationshipAfter:s.council[memberId].rel,pitchesUsed:s.lobbyCount[memberId],remainingConcerns:memberStatement(s,m,p,p.id).opposes};
    }else if(command.type==='offer'){
      if(!closed(payload,['proposalId','memberId','offer'])||!trustedMember(s,payload.memberId))return fail('offer_payload_invalid');
      memberId=payload.memberId;const offer=payload.offer;
      if(offer?.type==='favor'){if(!closed(offer,['type'])||s.capital<=0)return fail('favor_unavailable');}
      else if(offer?.type==='earmark'){if(!closed(offer,['type','amount_k'])||!Number.isInteger(offer.amount_k)||!finite(offer.amount_k,1,150)||s.cash<offer.amount_k)return fail('earmark_unavailable');}
      else return fail('offer_type_invalid');
      const used=s.lobbyCount?.[memberId]||0,capital=s.capital,cash=s.cash,r=applyLobby(s,memberId,p.id,{addressed:[],credit:'none',tone:'respectful',offers:[offer]});s.lobbyCount[memberId]=used;
      result={proposalId,memberId,offer:copy(offer),capitalSpent:capital-s.capital,cashSpentK:cash-s.cash,...r};
    }else if(command.type==='grant'){
      if(!closed(payload,['proposalId']))return fail('grant_payload_invalid');const grant=applyGrant(s,p);if(!grant)return fail('grant_unavailable');result={proposalId,grant:copy(grant),stage:'tabled'};
    }else if(command.type==='decision'){
      if(!closed(payload,['proposalId','action','funding','route'])||!['vote','approve','reject','table'].includes(payload.action))return fail('decision_payload_invalid');
      const route=approvalRoute(s,p);if(payload.route!==route.id)return fail('decision_route_invalid');
      if(['reject','table'].includes(payload.action)){
        if(payload.funding!==null)return fail('funding_not_applicable');if(payload.action==='reject')reject(s,p);else table(s,p);projectRecord(s,p).stage=p.status;result={proposalId,outcome:p.status};
      }else{
        if(!['cash','bond'].includes(payload.funding))return fail('funding_invalid');
        if(payload.action==='approve'&&p.council||payload.action==='vote'&&!p.council)return fail('decision_action_wrong_route');
        const eligibility=proposalEligibility(s,p);if(!eligibility.ok)return fail(...eligibility.reasons);
        const cost=effectsOf(p,s).cost;if(payload.funding==='cash'&&s.cash<cost)return fail('insufficient_cash');
        if(!p.council&&cost>scenarioOf(s).decisionRoute.executiveLimit)return fail('executive_limit_exceeded');
        const votes=forecastVote(s,p,p.id);
        if(p.council&&votes.winner&&votes.winner!==p.id)return fail('winning_option_requires_funding_review:'+votes.winner);
        if(p.council&&!votes.winner){
          const options=hearingOptions(s,p);if(p.group){for(const option of options){table(s,option);projectRecord(s,option).stage='tabled';}}else {reject(s,p);projectRecord(s,p).stage='rejected';}
          result={proposalId,outcome:p.group?'tabled':'rejected',reason:'failed-vote',votes};projectRecord(s,p).lastVote={year:s.year,...copy(votes)};
        }
        else{
          const approved=approve(s,p,payload.funding,payload.route);if(!approved.ok)return fail(...approved.reasons);
          if(!p.program){const record=projectRecord(s,p);Object.assign(record,{stage:'construction',decision:{action:payload.action,route:payload.route,funding:payload.funding,year:s.year,votes},plan:copy(p.plan)});}
          result={proposalId,outcome:'approved',funding:payload.funding,costK:cost,votes,programRevision:p.programRevision||legacyRevision(p,s)};
        }
      }
    }
  }
  s.revision=state.revision+1;s.actionHighWater=command.id;
  const receipt={id:command.id,gameId:s.gameId,type:command.type,fingerprint:digest,commandFingerprint:digest,proposalId,memberId,actorId,controller,
    subject:{proposalId,memberId,actorId},year,revision:s.revision,originalResult:copy(result)};
  s.receipts=[...s.receipts,receipt].slice(-COMPOSITION_RECEIPTS);
  return {ok:true,applied:true,state:s,receipt:copy(receipt),reasons:[]};
}

function scenarioContext(s){
  const map=mapSize(s),sites=Object.entries(sitesOf(s)).map(([id,plots])=>({id,name:parcelsOf(s)[id]?.name||id,plots}));
  return copy({scenarioId:s.scenarioId,turn:s.year,calendarYear:calendarYear(s),map,
    sites,legalPlots:s.grid.filter(c=>canBuildOn(s,c.x,c.y)).map(c=>[c.x,c.y]),
    facts:{population:s.pop,reserve:s.cash,meters:snapshotStats(s),...s.facts},
    proposals:s.proposals.map(p=>({id:p.id,kind:p.kind,site:p.site,plots:plotsOf(p,s),status:p.status,plan:p.plan,eligibility:proposalEligibility(s,p),authority:approvalRoute(s,p)})),
    editableFields:Object.fromEntries(Object.entries(KINDS).map(([id,kind])=>[id,kind.params]))});
}

const ENGINE={applyCommand,readReactionContext,evaluateClaims,evaluateResident,previewLegacyRevision,programOpportunities,COMPOSITION_RECEIPTS,capabilities,programSchema,patchSchema,claimsSchema,validateProgram,previewProgram,reviseProgram,canonical,fingerprint,programDefinitions,MILLBROOKE,scenarioMeta,calendarYear,mapSize,sitesOf,parcelsOf,placesOf,presentersOf,councilOf,isSupportedSave,approvalRoute,proposalEligibility,scenarioContext,plotsOf,canBuildOn,PLACES,placePlots,describePlace,plotTraits,demolitionOf,plotsNeeded,fitPlanToPlots,refitInitiative,guessPlace,memberStatement,canProposeInitiative,floodRisk,FLAGS,defaultPlan,PARCELS,initiativeRoles,parcelsAvailable,needsSite,makeInitiative,heuristicDraft,grantInfo,applyGrant,migrate,N,KINDS,PRESENTERS,COUNCIL,P_DEFS,SITES,THEMES,MAYOR_AUTHORITY,newGame,effectsOf,deliveryOdds,validatePlan,forecastVote,memberScore,lean,hearingOptions,applyLobby,approve,reject,table,resolveYear,econ,jobsMeter,snapshotStats,fundingOptions,electionResult,recordFacts,rand,clamp};
if(typeof module!=='undefined')module.exports=ENGINE;
