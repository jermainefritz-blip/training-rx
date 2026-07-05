/* ════════════════════════════════════════════════════════════════════
   custom.js — custom exercises + base-lift swap-outs (per week, per day).
   store.custom[wk][dayId]  = [{id,name,type,sets,topRep,restSecs,replaces,...}]
   store.skipped[wk][dayId] = [baseEi, ...]   (base lifts swapped out)
   Logged sets for a custom lift use the ei key "c"+id in store.lifts.
   ════════════════════════════════════════════════════════════════════ */
import {store, persist} from './storage.js';
import {wKey} from './week.js';

export function customList(offset,dayId){const wk=wKey(offset);return store.custom[wk]?.[dayId]||[];}

export function customAdd(offset,dayId,obj){
  const wk=wKey(offset);
  if(!store.custom[wk])store.custom[wk]={};
  if(!store.custom[wk][dayId])store.custom[wk][dayId]=[];
  obj.id='x'+Date.now().toString(36);
  store.custom[wk][dayId].push(obj);
  if(obj.replaces!=null&&obj.replaces!==''){
    if(!store.skipped[wk])store.skipped[wk]={};
    if(!store.skipped[wk][dayId])store.skipped[wk][dayId]=[];
    if(!store.skipped[wk][dayId].includes(+obj.replaces))store.skipped[wk][dayId].push(+obj.replaces);
  }
  persist();return obj.id;
}

export function customDel(offset,dayId,id){
  const wk=wKey(offset);
  const arr=store.custom[wk]?.[dayId];if(!arr)return;
  const ex=arr.find(e=>e.id===id);
  store.custom[wk][dayId]=arr.filter(e=>e.id!==id);
  // un-skip the base lift it replaced, if no other custom lift still replaces it
  if(ex&&ex.replaces!=null&&ex.replaces!==''){
    const stillReplaced=store.custom[wk][dayId].some(e=>+e.replaces===+ex.replaces);
    if(!stillReplaced&&store.skipped[wk]?.[dayId])
      store.skipped[wk][dayId]=store.skipped[wk][dayId].filter(i=>i!==+ex.replaces);
  }
  // remove its logged sets
  if(store.lifts[wk]?.[dayId]?.['c'+id])delete store.lifts[wk][dayId]['c'+id];
  persist();
}

export function isSkipped(offset,dayId,baseEi){
  const wk=wKey(offset);return !!store.skipped[wk]?.[dayId]?.includes(baseEi);
}

/* custom lift logged sets for a week → array */
export function customLiftWeek(dayId,cid,offset){
  const wk=wKey(offset);const d=store.lifts[wk]?.[dayId]?.['c'+cid];
  if(!d)return [];return Object.keys(d).sort((a,b)=>a-b).map(si=>d[si]);
}
