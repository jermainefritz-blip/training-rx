/* ════════════════════════════════════════════════════════════════════
   progression.js — THE PROGRESSION ENGINE (unchanged rules).
   Compound (strength) = 2 consecutive weeks at top of rep range before +load.
   Isolation/core      = 1 week at top before +load.
   Bodyweight          = progress by reps.
   Deload flag after 5 consecutive loading weeks.
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
/* did every working set reach top of rep range that week? (and at least sets-1 logged) */
export function hitTopThatWeek(ex,dayId,ei,offset){
  const sets=liftWeek(dayId,ei,offset);
  if(sets.length<Math.max(2,ex.sets-1))return false; // need most sets logged
  return sets.every(s=>s.reps>=ex.topRep);
}
/* working weight used that week (max of logged lbs, ignoring bw=0) */
export function workWeight(dayId,ei,offset){
  const sets=liftWeek(dayId,ei,offset);
  if(!sets.length)return null;
  const ws=sets.map(s=>s.lbs);
  return Math.max(...ws);
}
/* count consecutive loading weeks ending at `offset` where the lift was logged */
export function consecutiveLoggedWeeks(dayId,ei,offset){
  let c=0;
  for(let w=offset;w>offset-8;w--){if(liftWeek(dayId,ei,w).length)c++;else break;}
  return c;
}

/* Decide recommendation for NEXT week based on results up to `offset`.
   Returns {status:'hold'|'up'|'deload'|'none', nextWeight, note, curWeight} */
export function recommend(ex,dayId,ei,offset){
  const cur=workWeight(dayId,ei,offset);
  const logged=liftWeek(dayId,ei,offset).length>0;
  if(!logged)return {status:'none',note:'Not logged yet',curWeight:cur};

  const streak=consecutiveLoggedWeeks(dayId,ei,offset);
  if(streak>=5)
    return {status:'deload',curWeight:cur,note:`${streak} loading weeks — deload due`,nextWeight:cur};

  const hitNow=hitTopThatWeek(ex,dayId,ei,offset);

  if(ex.bw && !(cur>0)){ // pure bodyweight (no added load): progress by reps
    if(hitNow)return {status:'up',curWeight:cur,note:`All sets at ${ex.topRep} reps`,nextNote:`Aim ${ex.topRep+1}+ reps or add load`,nextWeight:cur};
    return {status:'hold',curWeight:cur,note:`Below ${ex.topRep} reps`,nextWeight:cur};
  }
  /* weighted bodyweight (added load) falls through to the load-based logic below */

  if(ex.type==='strength'){ // compound: need 2 consecutive weeks at top
    const hitPrev=hitTopThatWeek(ex,dayId,ei,offset-1);
    const samePrevWeight=workWeight(dayId,ei,offset-1)===cur;
    if(hitNow&&hitPrev&&samePrevWeight){
      const nw=Math.round((cur+ex.inc)*2)/2;
      return {status:'up',curWeight:cur,note:'2nd week at top of range',nextWeight:nw};
    }
    if(hitNow)return {status:'hold',curWeight:cur,note:'1st week at top — hold',nextWeight:cur};
    return {status:'hold',curWeight:cur,note:'Building within range',nextWeight:cur};
  }

  // isolation/core: 1 week at top → add load
  if(hitNow){
    const nw=Math.round((cur+ex.inc)*2)/2;
    return {status:'up',curWeight:cur,note:'At top of range',nextWeight:nw};
  }
  return {status:'hold',curWeight:cur,note:'Building within range',nextWeight:cur};
}

/* The TARGET weight to pre-fill for a given week (as placeholder).
   Walk forward from the cut baseline applying recommendations week over week,
   but only across weeks that actually have data, so targets reflect real progress. */
export function targetWeight(ex,dayId,ei,offset){
  // start from baseline
  let target=ex.start;
  // find earliest logged week within a reasonable lookback
  let earliest=null;
  for(let w=offset-1;w>=offset-12;w--){if(liftWeek(dayId,ei,w).length){earliest=w;}}
  if(earliest===null)return ex.start; // no history → baseline
  // replay from earliest logged week up to offset-1, applying "up" bumps
  for(let w=earliest;w<offset;w++){
    if(!liftWeek(dayId,ei,w).length)continue;
    const rec=recommend(ex,dayId,ei,w);
    if(rec.status==='up'&&rec.nextWeight!=null)target=rec.nextWeight;
    else if(rec.status==='deload'&&rec.curWeight!=null)target=Math.round((rec.curWeight*0.9)*2)/2;
    else if(rec.curWeight!=null)target=rec.curWeight;
  }
  return target;
}
