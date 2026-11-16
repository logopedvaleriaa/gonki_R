import {WORDS,shuffled} from './speech.js';
const ANIMALS=['korova','baran','vorona','rak','krab','komar'];
const FOOD=['syr','pomidor','grusha'];
const MACHINES=['raketa','traktor','kran','robot'];
const ODD_SETS=[
 {same:ANIMALS,odd:'traktor'},{same:FOOD,odd:'samovar'},
 {same:MACHINES,odd:'baran'},{same:ANIMALS,odd:'rama'},
 {same:FOOD,odd:'kran'},{same:MACHINES,odd:'grusha'},
 {same:ANIMALS,odd:'robot'},{same:FOOD,odd:'rama'},
 {same:MACHINES,odd:'pomidor'},{same:ANIMALS,odd:'samovar'},
];
export function oddRounds(){let previous=-1;return shuffled(ODD_SETS).map((s,round)=>{
 const count=round<3?6:round<6?8:round<8?10:12;
 const items=[];while(items.length<count-1)items.push(...shuffled(s.same));
 const positions=Array.from({length:count},(_,i)=>i).filter(i=>i!==previous);
 const position=positions[Math.floor(Math.random()*positions.length)];
 const choices=shuffled(items.slice(0,count-1));choices.splice(position,0,s.odd);previous=position;
 return {...s,choices:choices.map(id=>WORDS.find(w=>w.id===id))};
})}
export function fragmentChoices(target,pool,count=6){
 const groups=[ANIMALS,FOOD,MACHINES,['samovar','rama','shar','gora']];
 const near=groups.find(g=>g.includes(target.id))||[];
 const preferred=shuffled(pool.filter(w=>w.id!==target.id&&near.includes(w.id))),other=shuffled(pool.filter(w=>w.id!==target.id&&!near.includes(w.id)));
 return shuffled([target,...preferred,...other].slice(0,count));
}
export function missingRound(){const words=shuffled(WORDS).slice(0,4),shown=words.slice(0,3),missing=Math.floor(Math.random()*3);return {shown,missing,answer:shown[missing],choices:shuffled(words)}}
