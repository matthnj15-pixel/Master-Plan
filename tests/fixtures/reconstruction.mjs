// A test input, not a second campaign. It deliberately has no Millbrooke IDs or geography.
export const reconstruction = {
  id: 'alder-recovery-test',
  metadata: {displayName:'Alder recovery test',town:'Alder',region:'Fictional district'},
  calendar: {startYear:1946,yearsPerTurn:1,electionEvery:4,maxTurns:8},
  map: {
    width:5,height:4,
    grid:Array.from({length:20},(_,i)=>({x:i%5,y:Math.floor(i/5),t:'grass',b:i===18?{type:'house'}:null,road:Math.floor(i/5)===0,site:i===6?'utility':i===13?'housing':null,var:i%7})),
    sites:{utility:[[1,1]],housing:[[3,2]]},
    parcels:{utility:{name:'Damaged pumping station',traits:[],blurb:'Service is interrupted'},housing:{name:'Displaced families housing',traits:[],blurb:'Needs restored water service'}},
    places:{utility:{name:'Damaged pumping station',kw:['pumping station']},housing:{name:'Recovery housing',kw:['recovery housing']}},
    growth:{enabled:false,center:[2,2],bounds:{minX:0,maxX:4,minY:0,maxY:3},main:{minX:0,maxX:4,minY:0,maxY:3}}
  },
  people:{
    presenters:{planner:{name:'Mara Voss',role:'Recovery engineer',rel:65,comp:78,detail:82,flex:'high',persona:'Restores essential services.'}},
    council:[]
  },
  initial:{pop:62,cash:900,flags:{bridgeRisk:0},facts:{waterReady:false}},
  decisionRoute:{id:'recovery-authority',name:'Alder Recovery Authority',requireAuthority:true,executiveId:'recovery-authority',executiveName:'Alder Recovery Authority',executiveLimit:1000,votesRequired:1},
  proposals:{
    definitions:{
      repair:{kind:'initiative',title:'Restore the pumping station',presenter:'planner',site:'utility',council:false,blurb:'Repair damaged water service.',plan:{stormwater:true},completionFacts:{waterReady:true}},
      housing:{kind:'initiative',title:'Recovery housing',presenter:'planner',site:'housing',council:false,blurb:'Homes for displaced families.',plan:{homes:20,affordable:true},requires:{waterReady:true}}
    },
    schedule:{1:['repair','housing'],2:['housing']}
  },
  events:{bridge:false,boutique:false,flood:false},
  economy:{jobs:20,upkeep:0,roadCap:200},
  labels:{creek:'Alder Brook',bridge:'Alder crossing',school:'Alder school',college:'Alder college',luxuryStore:'Alder retailer'},
  ownership:{}
};
