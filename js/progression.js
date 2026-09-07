/* ════════════════════════════════════════════════════════════════════
   progression.js — historical lift lookups.
   The app never invents a heavier weight — it only ever surfaces what
   was actually logged before. These are pure lookups against past
   weeks; there is no rule here that adds load on its own. You decide
   when to go heavier, log it, and from then on that becomes the history.
   These functions take an explicit week `offset`, so they carry no UI state.
   ════════════════════════════════════════════════════════════════════ */
import {store} from './storage.js';
import {wKey} from './week.js';

/* get logged sets for a lift in a given week → array of {lbs,reps} or [] */
export function liftWeek(dayId,ei,offset){
  const wk=wKey(offset);
  const d=store.lifts[wk]?.[dayId]?.[ei];
  if(!d)return [];
  return Object.keys(d).sort((a,b)=>a-b).map(si=>d[si]);
}
/* working weight used that week (max of logged lbs, ignoring bw=0) */
export function workWeight(dayId,ei,offset){
  const sets=liftWeek(dayId,ei,offset);
  if(!sets.length)return null;
  const ws=sets.map(s=>s.lbs);
  return Math.max(...ws);
}
/* the most recent weight actually logged before `offset` (looking back up
   to a year), or null if this lift has no history yet. Never adjusted. */
export function lastWeight(dayId,ei,offset){
  for(let w=offset-1;w>offset-52;w--){
    const ww=workWeight(dayId,ei,w);
    if(ww!=null)return ww;
  }
  return null;
}
