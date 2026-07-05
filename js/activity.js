/* ════════════════════════════════════════════════════════════════════
   activity.js — Apple Watch / Health data (prior-day steps + workouts).
   store.activity['YYYY-MM-DD'] = { steps, restingHR, active, workouts:[
     { type, mins, avgHR, kcal } ] }

   Data arrives as a pasted code produced by an Apple Shortcut, e.g.:
     TRXA1|d=2026-07-03|steps=9432|rhr=54|w=Strength~52~131~415|w=Cycling~20~122~180
   (fields after the tag are order-independent; workouts use ~ separators;
    any field may be omitted.)
   ════════════════════════════════════════════════════════════════════ */
import {store, persist} from './storage.js';

/* local YYYY-MM-DD (avoids UTC off-by-one at midnight) */
export function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

export function activityGet(date){return store.activity[date]||null;}
export function activitySet(date,obj){store.activity[date]=obj;return persist();}
export function activityDel(date){if(store.activity[date]){delete store.activity[date];persist();}}
export function activitySorted(){return Object.keys(store.activity).sort().map(d=>({date:d,...store.activity[d]}));}

/* parse a pasted Shortcut code → activity object; throws on bad input */
export function parseActivityCode(raw){
  const s=(raw||'').trim();
  if(!s)throw new Error('empty');
  const parts=s.split('|').map(x=>x.trim()).filter(Boolean);
  if(!parts.length||!/^TRXA1$/i.test(parts[0]))throw new Error('bad tag');
  const out={date:null,steps:null,restingHR:null,active:null,workouts:[]};
  const num=v=>{const n=parseFloat(v);return isNaN(n)?null:n;};
  for(let i=1;i<parts.length;i++){
    const eq=parts[i].indexOf('=');if(eq<0)continue;
    const k=parts[i].slice(0,eq).trim().toLowerCase();
    const v=parts[i].slice(eq+1).trim();
    if(k==='d'||k==='date')out.date=v;
    else if(k==='steps')out.steps=num(v)==null?null:Math.round(num(v));
    else if(k==='rhr')out.restingHR=num(v);
    else if(k==='active')out.active=num(v)==null?null:Math.round(num(v));
    else if(k==='w'){
      const f=v.split('~');
      out.workouts.push({
        type:(f[0]||'Workout').trim(),
        mins:num(f[1])==null?null:Math.round(num(f[1])),
        avgHR:num(f[2])==null?null:Math.round(num(f[2])),
        kcal:num(f[3])==null?null:Math.round(num(f[3]))
      });
    }
  }
  if(!out.date||!/^\d{4}-\d{2}-\d{2}$/.test(out.date))throw new Error('bad date');
  return out;
}

/* activity entries within the last `days` calendar days (excludes today) */
export function recentActivity(days=7){
  const out=[];const today=new Date();
  for(let i=1;i<=days;i++){
    const d=new Date(today);d.setDate(today.getDate()-i);
    const a=store.activity[ymd(d)];
    if(a)out.push({date:ymd(d),...a});
  }
  return out;
}

/* rolling steps summary for Insights/Summary (band 8–12k) */
export function stepsStats(days=7){
  const a=recentActivity(days).filter(x=>x.steps!=null);
  if(!a.length)return null;
  const vals=a.map(x=>x.steps);
  const avg=Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
  const inBand=vals.filter(v=>v>=8000&&v<=12000).length;
  const low=vals.filter(v=>v<8000).length;
  return {n:vals.length,avg,inBand,low};
}
