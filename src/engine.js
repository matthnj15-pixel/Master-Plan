/* ===== Master Plan engine: pure simulation, no DOM. Runs in the browser and in Node tests. ===== */
const N = 24;
// Feature flags come from the build (flags.json). In Node tests MP_BUILD is undefined, so every flag reads as off.
const FLAGS=(typeof MP_BUILD!=='undefined'&&MP_BUILD&&MP_BUILD.flags)||{};
const MAYOR_AUTHORITY = 300; // $K a mayor can approve without council

function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rand(seed,key){let a=(seed^hashStr(key))>>>0;a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const r1=v=>Math.round(v*10)/10;

/* ---------- people ---------- */
const PRESENTERS = {
  planner:{name:'Dana Ruiz',role:'Borough Planner',rel:65,comp:78,detail:82,flex:'high',
    persona:'Thoughtful, data-minded borough planner who wants Millbrook to grow without losing its character. Likes walkable design. Will trade features to save money but protects the memorial.'},
  merchants:{name:'Walt Kessler',role:'Millbrook Merchants Association',rel:55,comp:52,detail:45,flex:'medium',
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

/* ---------- map ---------- */
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
function genGrid(){
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
function nearRoad(g,c,r){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=c.x+dx,y=c.y+dy;if(x<0||y<0||x>=N||y>=N)continue;if(g[y*N+x].road)return true;}return false;}
function growthTiles(g){
  return g.filter(c=>c.t==='grass'&&!c.road&&!c.b&&!c.site&&c.x>=4&&c.x<=19&&c.y>=1&&c.y<=19&&nearRoad(g,c,1))
    .sort((a,b)=>(Math.hypot(a.x-10,a.y-11)-Math.hypot(b.x-10,b.y-11))||(a.var-b.var));
}

/* ---------- state ---------- */
function newGame(seed){
  seed=seed??(Date.now()%100000);
  const s={v:2,seed,year:1,maxYears:32,termYear:1,term:1,town:'Millbrook',
    pop:3200,cash:900,taxRate:'hold',prevTax:'hold',propIdx:1.0,
    meters:{walk:48,live:55,conf:58,approval:52,safety:62,afford:58},policies:{},
    capital:3,bonds:[],built:[],pending:[],decided:{},
    presenters:JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(PRESENTERS).map(([k,v])=>[k,{rel:v.rel}])))),
    council:Object.fromEntries(COUNCIL.map(m=>[m.id,{rel:m.rel}])),
    lobby:{},flags:{bridgeRisk:0.45,bridgeClosed:false,students:0,boutique:null,deficitYears:0,floodRisk:0.06},
    grid:genGrid(),proposals:[],chats:{},reports:[],phase:'agenda',election:null,history:[]};
  s.proposals=proposalsFor(s,1);
  s.history.push(snapshotStats(s));
  return s;
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

function makeProposal(id,year){const d=P_DEFS[id];return{id,...d,plan:defaultPlan(d.kind),year,status:'open'};}
function proposalsFor(s,year){
  const out=[];
  for(const p of s.proposals||[]) if(p.status==='tabled'){p.status='open';out.push(p);}
  for(const id of (SCHEDULE[year]||[])) if(!s.decided[id]&&!out.find(p=>p.id===id)) out.push(makeProposal(id,year));
  return out;
}

/* ---------- forecasting & scoring ---------- */
const SAFE_AFF={stripmall:p=>[-1,0],commerce:p=>[1,(p.stories-1)*0.8],studenthousing:p=>[-2,p.beds/150],subdivision:p=>[0,p.homes/30],park:p=>[1,0],boutique:p=>[0,0],bridge:p=>[p.scope==='full'?1:0,0]};
function effectsOf(p){const e=KINDS[p.kind].effects(p.plan);const pr=PRESENTERS[p.presenter];if(p.emergency)e.cost*=1.6;
  if(e.safety===undefined){const sa=(SAFE_AFF[p.kind]||(()=>[0,0]))(p.plan);e.safety=sa[0];e.afford=sa[1];}
  e.creek=0;const par=PARCELS[p.site];
  if(par&&par.traits.includes('creek')){const soft=p.kind==='park'||(p.kind==='initiative'&&!p.plan.homes&&!p.plan.shops&&p.plan.civic==='none'&&p.plan.parking<60);e.creek=soft?0:1;if(soft)e.storm=(e.storm||0)+0.5;}
  if(p.kind==='initiative'&&par){
    if(par.traits.includes('creek')){e.live+=1;e.notes=['Creek views, but anything built here sits in the floodplain'].concat(e.notes);}
    if(par.traits.includes('neighbors')&&(p.plan.parking>100||p.plan.safety==='police_substation'||p.plan.safety==='fire_station'||p.plan.shops>6||p.plan.stories>3)){e.approval-=1.5;e.notes=['Neighbors will object to something this big next door'].concat(e.notes);}
    if(par.traits.includes('main')&&p.plan.shops)e.walk+=1;
    if(par.traits.includes('edge')){e.walk-=1;}
  }
  if(p.grant)e.cost=e.cost*(1-p.grant);
  // low detail plans hide extra cost; shown as a range
  e.costHigh=Math.round(e.cost*(1+(100-pr.detail)/250));
  e.cost=Math.round(e.cost);return e;}
function deliveryOdds(s,p){const pr=PRESENTERS[p.presenter];let o=0.45+pr.comp*0.004+pr.detail*0.002+(s.presenters[p.presenter].rel-50)*0.001;
  if(p.kind==='boutique'&&p.plan.clawback)o-=0.18;return clamp(o,0.3,0.96);}
function effVector(s,p){const e=effectsOf(p);return{jobs:e.jobs/40,cost:e.cost/250,walk:e.walk,live:e.live,conf:e.conf,stores:e.units/3,prop:e.prop*400,approval:e.approval+(p.petition?2:0),farm:e.farm/2,downtown:e.downtown||0,housing:e.housing/100,safety:e.safety||0,afford:e.afford||0,flood:(e.creek||0)*2+e.parking/100-(e.storm||0)*2};}
function memberScore(s,m,p,champion){
  const v=effVector(s,p);let sc=0;
  for(const [k,w] of Object.entries(m.w))sc+=w*(v[k]||0);
  sc+=(s.council[m.id].rel-50)/10;
  if(p.petition)sc+=2.5; // public pressure
  if(m.rival&&p.presenter==='merchants')sc+=3;
  if(m.rival&&champion===p.id)sc-=3;
  const lb=(s.lobby[m.id]&&s.lobby[m.id][p.id])||0;sc+=lb;
  return sc;
}
function lean(sc){return Math.round(100/(1+Math.exp(-sc/3)));}
function hearingOptions(s,p){return p.group?s.proposals.filter(q=>q.group===p.group&&q.status==='open'):[p];}
function forecastVote(s,p,champion){
  const opts=hearingOptions(s,p);
  const votes=COUNCIL.map(m=>{
    const leans=opts.map(o=>({id:o.id,lean:lean(memberScore(s,m,o,champion))}));
    const best=leans.slice().sort((a,b)=>b.lean-a.lean)[0];
    return{member:m.id,leans,vote:best.lean>=50?best.id:'no'};
  });
  const tally={};for(const v of votes)tally[v.vote]=(tally[v.vote]||0)+1;
  const winner=opts.find(o=>(tally[o.id]||0)>=3);
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
  const m=COUNCIL.find(c=>c.id===memberId);const notes=[];let pts=0;
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
  const e=effectsOf(p),v=effVector(s,p);
  const say={
    jobs:x=>x>0?`adds about ${Math.round(e.jobs)} jobs`:'costs jobs',
    cost:()=>`costs the borough $${Math.round(e.cost)}K`,
    walk:x=>x>0?'makes Millbrook more walkable':'makes it harder to get around on foot',
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
    flood:x=>x>0?'adds flood risk on Kish Creek':'reduces flood risk on Kish Creek'};
  const lever={cost:'bring the cost down',walk:'cut the parking or add walking paths',farm:'keep it off farmland',downtown:'protect the Main Street shops',live:'add something for families',flood:'add stormwater work',safety:'add lighting or patrols',afford:'include homes people can afford',jobs:'bring real jobs with it',conf:'show how it helps local business',approval:'win over the neighbors',prop:'raise the design quality',stores:'add storefronts',housing:'add housing'};
  const parts=Object.entries(m.w).map(([k,w])=>({k,c:w*(v[k]||0),x:v[k]||0})).filter(o=>Math.abs(o.c)>0.3&&say[o.k]);
  const pos=parts.filter(o=>o.c>0).sort((a,b)=>b.c-a.c).slice(0,2),neg=parts.filter(o=>o.c<0).sort((a,b)=>a.c-b.c).slice(0,2);
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
function fundingOptions(s,p){const e=effectsOf(p);return{cash:s.cash>=e.cost,bondAnnual:Math.round(e.cost*0.125)};}
function approve(s,p,funding){
  const e=effectsOf(p);
  if(funding==='bond'){s.bonds.push({name:p.title,annual:Math.round(e.cost*0.125),left:10});}
  else s.cash-=e.cost;
  p.status='approved';s.decided[p.id]='approved';
  s.pending.push({id:p.id,kind:p.kind,title:p.title,presenter:p.presenter,site:p.site,plan:{...p.plan},cost:e.cost,costHigh:e.costHigh,funding,odds:deliveryOdds(s,p),year:s.year});
  s.presenters[p.presenter].rel=clamp(s.presenters[p.presenter].rel+8,0,100);
  for(const t of (SITES[p.site]||[])){const c=s.grid[t[1]*N+t[0]];c.b={type:'construction',for:p.kind};}
  if(p.group)for(const q of s.proposals.filter(q=>q.group===p.group&&q.id!==p.id&&q.status==='open')){q.status='rejected';s.decided[q.id]='rejected';s.presenters[q.presenter].rel=clamp(s.presenters[q.presenter].rel-10,0,100);s.shocks=(s.shocks||[]);if(q.petition)s.shocks.push({v:-2,r:`${q.title} supporters are upset their plan lost`});}
}
function reject(s,p){p.status='rejected';s.decided[p.id]='rejected';s.presenters[p.presenter].rel=clamp(s.presenters[p.presenter].rel-8,0,100);
  if(p.petition){s.shocks=s.shocks||[];s.shocks.push({v:-3,r:`You rejected ${p.title}, which 800 residents petitioned for`});}}
function table(s,p){p.status='tabled';s.presenters[p.presenter].rel=clamp(s.presenters[p.presenter].rel-3,0,100);}

/* ---------- year resolution ---------- */
function econ(s){
  const g=s.grid;let units=0,housing=0,jobs=1180,upkeep=150,parking=0;
  for(const c of g){if(!c.b)continue;const t=c.b.type;
    if(t==='shop')units+=2; if(t==='house')housing+=62; if(t==='apt')housing+=200;}
  for(const b of s.built){if(b.closed)continue;const e=KINDS[b.kind].effects(b.plan);units+=e.units;housing+=e.housing;jobs+=e.jobs;upkeep+=e.upkeep;parking+=e.parking;}
  for(const c of g)if(c.b&&c.b.type==='shop')jobs+=10;
  const demand=s.pop/100*(1+s.flags.students/3000);
  const roadCap=6500*(s.flags.bridgeClosed?0.65:1);
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
  for(const sh of (s.shocks||[]))add('approval',sh.v,sh.r);s.shocks=[];
  // complete projects
  for(const pj of s.pending){
    const roll=rand(s.seed,pj.id+':deliver');const ok=roll<pj.odds;const e=effectsOf(pj);
    if(!ok){
      const over=pj.costHigh-pj.cost+Math.round(pj.cost*0.08);s.cash-=over;
      causes.push({m:'cash',v:-over,r:`${pj.title} ran $${over}K over budget (${PRESENTERS[pj.presenter].name}'s team)`});
      add('approval',-2,`${pj.title} came in late and over budget`);
    }
    s.built.push({...pj,done:s.year});
    const tl=SITES[pj.site]||[];const roles=pj.kind==='initiative'?initiativeRoles(pj.plan,tl.length):[];
    tl.forEach((t,i)=>{const c=s.grid[t[1]*N+t[0]];c.b=pj.kind==='bridge'?null:{type:pj.kind,plan:pj.plan,role:roles[i]};});
    if(pj.kind==='initiative'&&pj.plan.policy!=='none')s.policies[pj.plan.policy]=s.year;
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
  if(!s.flags.bridgeClosed&&s.flags.bridgeRisk>0&&s.year>=2){
    if(rand(s.seed,'bridge:'+s.year)<s.flags.bridgeRisk){s.flags.bridgeClosed=true;
      add('live',-5,'Main St bridge closed after a failed inspection: 12-minute detours');add('approval',-5,'Bridge closure detours every commuter');add('conf',-4,'Downtown lost through-traffic when the bridge closed');
      s.reports.push({type:'event',text:'The Main Street bridge closed. Repairing it now costs more.'});
      s.extraNext=[{...makeProposal('bridge',s.year+1),id:'bridge2',title:'Emergency bridge reconstruction',blurb:'The bridge is closed. Rebuilding it now costs 60% more than repairing it would have.',plan:{scope:'full'},emergency:true}];
    }
  }
  // boutique viability
  const bq=s.flags.boutique;
  if(bq&&!bq.closed&&s.year>bq.opened){
    const viable=s.propIdx>=1.08&&s.pop>=5000;
    if(!viable&&rand(s.seed,'boutique:'+s.year)<0.85){bq.closed=s.year;const bb=s.built.find(b=>b.kind==='boutique');if(bb)bb.closed=true;
      for(const t of SITES.storefront){s.grid[t[1]*N+t[0]].b={type:'vacant',d:'downtown'};}
      add('conf',-6,'Halden & Pierce closed: Millbrook didn\'t have enough luxury shoppers');add('approval',-3,'The luxury store you subsidized closed after a year');
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
  let pr=0.004;for(const b of s.built){if(b.closed)continue;pr+=KINDS[b.kind].effects(b.plan).prop;}
  s.propIdx=r1(s.propIdx*1000*(1+pr))/1000;
  // population
  const jm=jobsMeter(s,ec);
  let rate=0.012+(jm-60)*0.0009+(M.live-55)*0.0007+(s.flags.students>0?0.006:0)+(M.conf-50)*0.0003+(M.safety-60)*0.0004-(s.policies.impact_fees?0.003:0);
  if(s.flags.bridgeClosed)rate-=0.01;
  let target=s.pop*(1+rate)+(s.newStudents||0);
  const studentsAdd=s.flags.students-(s.studentsCounted||0);if(studentsAdd>0){target+=studentsAdd;s.studentsCounted=s.flags.students;}
  // homes get built where demand exists (developers, not you)
  const wanted=target;let housing=ec.housing;const need=target-housing;let newHomes=0;
  if(need>0&&M.conf>30){const g=growthTiles(s.grid);const n=Math.min(g.length,Math.ceil(need/62),Math.round(4+M.conf/12));for(let i=0;i<n;i++){g[i].b={type:'house',new:s.year};newHomes++;}housing+=newHomes*62;}
  if(target>housing){causes.push({m:'pop',v:0,r:'Housing shortage: people wanted to move here but couldn\'t'});add('approval',-1.5,'Rents rising from the housing shortage');target=housing;}
  // mid-density upgrade downtown when conf high
  if(M.conf>(s.policies.downtown_apartments?55:62)&&rand(s.seed,'apt'+s.year)<(s.policies.downtown_apartments?0.95:0.7)){const h=s.grid.filter(c=>c.b&&c.b.type==='house'&&Math.hypot(c.x-10,c.y-11)<4.5);if(h.length){h[0].b={type:'apt',new:s.year};causes.push({m:'pop',v:0,r:'A builder replaced older homes near downtown with apartments'});}}
  // organic shop infill
  if(ratio>1.25&&M.conf>55){const g=s.grid.filter(c=>c.b&&c.b.type==='house'&&(s.grid[(c.y-1)*N+c.x]?.road||s.grid[(c.y+1)*N+c.x]?.road)&&c.y>=9&&c.y<=13&&c.x>=7&&c.x<=16);if(g.length){g[0].b={type:'shop',new:s.year};causes.push({m:'conf',v:0,r:'A house on Main Street converted to a shop'});}}
  const dPop=Math.round(target-s.pop);s.pop=Math.round(target);
  causes.push({m:'pop',v:dPop,r:dPop>=0?`${newHomes} new homes built; growth driven by jobs ${jm}/100 and livability ${Math.round(M.live)}/100`:'People left town'});
  // traffic
  const load=s.pop+ec.parking*3+s.flags.students*0.5;
  if(load>ec.roadCap)add('live',-Math.min(4,(load-ec.roadCap)/500),'Traffic is outgrowing the roads');
  if(s.policies.impact_fees&&newHomes){const f=newHomes*8;s.cash+=f;s.lastBudget.net+=f;causes.push({m:'cash',v:f,r:`Impact fees on ${newHomes} new homes`});}
  if(s.year>=2){const fr=floodRisk(s,ec);const exposure=fr.exposure,risk=fr.risk;s.flags.floodRisk=Math.round(risk*100)/100;
    if(rand(s.seed,'flood'+s.year)<risk){const dmg=60+exposure*130;s.cash-=dmg;causes.push({m:'cash',v:-dmg,r:`Kish Creek flooded${exposure?'. Creekside buildings took the worst of it':''}`});
      add('live',-3,'Flood cleanup closed streets for weeks');add('approval',exposure?-3:-1,'Residents blame the borough for the flooding');add('safety',-2,'Flood damage to roads and homes');
      s.reports.push({type:'event',text:'Kish Creek flooded.'});}}
  {let fx=0;for(const b of s.built){if(b.closed)continue;fx+=effectsOf(b).safety||0;}
   const vac=s.grid.filter(c=>c.b&&c.b.type==='vacant').length;const resid=Math.max(500,s.pop-s.flags.students);
   const cover=clamp((4300-resid)/250,-12,6);const parts=[[cover,cover<0?`Police coverage is stretched for ${resid.toLocaleString()} residents`:'Police coverage keeps up with the population'],[fx,'Safety facilities and programs'],[-vac*2,'Vacant storefronts attract trouble'],[-s.flags.students/400,'Late-night student activity'],[(M.walk-50)*0.08,'Busy sidewalks put eyes on the street'],[s.flags.bridgeClosed?-3:0,'Fire trucks detour around the closed bridge']];
   const tgt=clamp(62+parts.reduce((a,p)=>a+p[0],0),5,98);const d=r1((tgt-M.safety)*0.4);
   const why=parts.filter(p=>Math.sign(p[0])===Math.sign(d)&&p[0]).sort((a,b)=>Math.abs(b[0])-Math.abs(a[0]))[0];
   add('safety',d,why?why[1]:'Safety drifted');}
  {let fx=0;for(const b of s.built){if(b.closed)continue;fx+=effectsOf(b).afford||0;}
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
  s.reports.push(report);s.history.push(after);
  s.lobby={};s.lobbyCount={};s.capital=Math.min(5,s.capital+2);
  for(const p of s.proposals)if(p.status==='open'){p.status='lapsed';s.decided[p.id]='lapsed';}
  if(s.flags.deficitYears>=2){s.phase='bankrupt';return report;}
  if(s.year%4===0){s.phase='election';}
  for(const p of s.proposals)if(p.status==='tabled'&&p.grantPending){const g=p.grantPending;delete p.grantPending;
    if(rand(s.seed,'grant:'+p.id+':'+s.year)<g.odds){p.grant=g.share;causes.push({m:'cash',v:0,r:`Grant awarded: ${g.agency} will cover ${Math.round(g.share*100)}% of ${p.title}`});}
    else{p.grantDenied=true;causes.push({m:'cash',v:0,r:`Grant denied: ${g.agency} passed on ${p.title}`});}}
  s.year++;s.termYear=((s.year-1)%4)+1;
  s.proposals=proposalsFor(s,s.year).concat(s.extraNext||[]);s.extraNext=[];
  return report;
}

/* ---------- election ---------- */
const THEMES={economy:{label:'Jobs and growth',fit:s=>(s.meters.conf-55)/4+(jobsMeter(s,econ(s))-60)/5},
  quality:{label:'Quality of life',fit:s=>(s.meters.live-55)/4+(s.meters.walk-50)/5},
  fiscal:{label:'Responsible budgets',fit:s=>(s.cash-600)/250},
  safety:{label:'Safe streets',fit:s=>(s.meters.safety-60)/4}};
function recordFacts(s){const f=[];const r=s.reports.filter(x=>x.after);const first=s.history[0],last=s.history[s.history.length-1];
  f.push(`Population went from ${first.pop} to ${last.pop}.`);f.push(`Cash reserve is $${Math.round(s.cash)}K (started at $900K).`);
  if(s.bonds.length)f.push(`The borough owes ${s.bonds.length} bond(s), $${s.bonds.reduce((a,b)=>a+b.annual,0)}K a year.`);
  for(const b of s.built)f.push(`Approved and built: ${b.title}${b.closed?' (it has since closed)':''}.`);
  for(const [id,st] of Object.entries(s.decided))if(st==='rejected')f.push(`Rejected: ${P_DEFS[id]?.title||id}.`);
  if(s.flags.bridgeClosed)f.push('The Main Street bridge is closed.');
  f.push(`Approval rating: ${Math.round(s.meters.approval)}%. Walkability ${Math.round(s.meters.walk)}, livability ${Math.round(s.meters.live)}, business confidence ${Math.round(s.meters.conf)}, safety ${Math.round(s.meters.safety)}, housing affordability ${Math.round(s.meters.afford)}.`);
  return f;}
function electionResult(s,theme,debate){
  const themeBonus=clamp(THEMES[theme].fit(s),-3,4);
  const d=clamp(debate||0,-3,4);
  const noise=(rand(s.seed,'elect'+s.year)-0.5)*3;
  const share=r1(clamp(50+(s.meters.approval-50)*0.9+themeBonus+d+2+noise,20,80));
  return{share,won:share>=50,parts:[{r:'Approval rating',v:r1((s.meters.approval-50)*0.9)},{r:`Campaign theme: ${THEMES[theme].label}`,v:r1(themeBonus)},{r:'Debate with Greg Marsh',v:r1(d)},{r:'Incumbency',v:2},{r:'Turnout and late swings',v:r1(noise)}]};
}

function initiativeRoles(pl,n){const r=[];if(pl.civic!=='none')r.push('civic');if(pl.safety==='police_substation'||pl.safety==='fire_station')r.push('safety');
  for(let i=0;i<Math.ceil(pl.shops/4);i++)r.push('mixed');for(let i=0;i<Math.ceil(pl.homes/(pl.stories>2?60:30));i++)r.push('homes');
  if(pl.plaza)r.push('plaza');for(let i=0;i<Math.ceil(pl.parking/100);i++)r.push('parking');if(pl.stormwater)r.push('pond');
  const out=r.slice(0,n);while(out.length<n)out.push(pl.green>0?'green':'lawn');return out;}
function parcelsAvailable(s){return Object.entries(PARCELS).filter(([id,pa])=>{const tl=SITES[id]||[];if(!tl.length)return false;
  if(s.proposals.some(p=>p.site===id&&(p.status==='open'||p.status==='tabled'))||s.pending.some(p=>p.site===id))return false;
  return tl.every(([x,y])=>{const c=s.grid[y*N+x];return c.site===id&&(!c.b||c.b.type==='lot');});}).map(([id])=>id);}
function needsSite(pl){return !!(pl.homes||pl.shops||pl.green||pl.plaza||pl.parking||pl.civic!=='none'||pl.safety==='police_substation'||pl.safety==='fire_station'||pl.stormwater);}
function floodRisk(s,ec){ec=ec||econ(s);let exposure=0,storm=0;for(const b of s.built){if(b.closed)continue;const fe=effectsOf(b);exposure+=fe.creek||0;storm+=fe.storm||0;}
  return{risk:clamp(0.05+ec.parking/3500+exposure*0.05-storm*0.04,0.02,0.35),exposure,storm};}
function canProposeInitiative(s){return s.phase==='agenda'&&s.initiativeYear!==s.year;}
function makeInitiative(s,d){
  if(!canProposeInitiative(s))return null; // MP-030: one initiative per year
  const v=validatePlan('initiative',defaultPlan('initiative'),d.plan||{});const avail=parcelsAvailable(s);
  let site='none';if(needsSite(v.plan))site=avail.includes(d.site)?d.site:(avail[0]||'none');
  const p={id:'init'+s.year,kind:'initiative',title:String(d.title||'Mayor\'s initiative').slice(0,60),presenter:'planner',site,council:true,
    blurb:String(d.summary||'').slice(0,320),plan:v.plan,year:s.year,status:'open',mine:true,desc:String(d.desc||'').slice(0,800),outOfScope:d.outOfScope?String(d.outOfScope).slice(0,300):null};
  s.proposals=s.proposals.filter(q=>q.id!==p.id);s.proposals.push(p);s.initiativeYear=s.year;return p;}
function heuristicDraft(desc){const t=desc.toLowerCase();const pl={};const has=(...w)=>w.some(x=>t.includes(x));
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
  return{title:first.charAt(0).toUpperCase()+first.slice(1),summary:desc.trim().slice(0,220),plan:pl};}
function grantInfo(s,p){if(p.grant||p.grantPending||p.grantDenied)return null;let agency=null,share=0,odds=0;
  if(p.kind==='bridge'){agency='PennDOT bridge program';share=0.8;odds=0.55;}
  else if(p.kind==='park'){agency='DCNR community parks grant';share=0.5;odds=0.6;}
  else if(p.kind==='initiative'){const pl=p.plan;if(pl.green>0||pl.plaza||pl.stormwater||pl.safety==='streetlights'||pl.policy==='traffic_calming'||(pl.affordable&&pl.homes)){agency=pl.affordable&&pl.homes?'PHFA housing grant':pl.stormwater?'DEP stormwater grant':pl.policy==='traffic_calming'||pl.safety==='streetlights'?'PennDOT safety grant':'DCED community grant';share=0.5;odds=0.5;}}
  if(!agency)return null;if(p.emergency)odds-=0.2;
  return{agency,share,odds:clamp(odds+(s.presenters.planner.rel-50)/200,0.2,0.85)};}
function applyGrant(s,p){const g=grantInfo(s,p);if(!g)return null;p.grantPending={...g,year:s.year};p.status='tabled';return g;}
function migrate(s){if(!s)return s;if(s.v===1){s.meters.safety=62;s.meters.afford=58;s.policies={};s.flags.floodRisk=0.06;
  for(const [id,pa] of Object.entries(PARCELS))if(pa.tiles)for(const [x,y] of pa.tiles){const c=s.grid[y*N+x];if(!c.site&&!c.b)c.site=id;}
  for(const h of s.history){if(h.safety===undefined)h.safety=62;if(h.afford===undefined)h.afford=58;}s.v=2;}return s;}
const ENGINE={memberStatement,canProposeInitiative,floodRisk,FLAGS,defaultPlan,PARCELS,initiativeRoles,parcelsAvailable,needsSite,makeInitiative,heuristicDraft,grantInfo,applyGrant,migrate,N,KINDS,PRESENTERS,COUNCIL,P_DEFS,SITES,THEMES,MAYOR_AUTHORITY,newGame,effectsOf,deliveryOdds,validatePlan,forecastVote,memberScore,lean,hearingOptions,applyLobby,approve,reject,table,resolveYear,econ,jobsMeter,snapshotStats,fundingOptions,electionResult,recordFacts,rand,clamp};
if(typeof module!=='undefined')module.exports=ENGINE;
