/* ════════════════════════════════════════════════════════════════════
   nutrition.js — daily nutrition storage + weekly averaging.
   store.nutrition[weekKey][dowIdx] = {pro, carb, fat, cal}
   ════════════════════════════════════════════════════════════════════ */
import {store, persist} from './storage.js';
import {wKey} from './week.js';

export function nutGet(offset,dowIdx){
  const wk=wKey(offset);return store.nutrition[wk]?.[dowIdx]||null;
}
export function nutSet(offset,dowIdx,obj){
  const wk=wKey(offset);
  if(!store.nutrition[wk])store.nutrition[wk]={};
  store.nutrition[wk][dowIdx]=obj;persist();
}
export function nutDel(offset,dowIdx){
  const wk=wKey(offset);if(store.nutrition[wk]?.[dowIdx]){delete store.nutrition[wk][dowIdx];persist();}
}
export function nutWeek(offset){
  const wk=wKey(offset);const w=store.nutrition[wk]||{};
  const days=Object.keys(w).map(k=>w[k]).filter(Boolean);
  if(!days.length)return null;
  const sum=days.reduce((a,d)=>({cal:a.cal+(+d.cal||0),pro:a.pro+(+d.pro||0),fat:a.fat+(+d.fat||0),carb:a.carb+(+d.carb||0)}),{cal:0,pro:0,fat:0,carb:0});
  const n=days.length;
  return {n,avg:{cal:sum.cal/n,pro:sum.pro/n,fat:sum.fat/n,carb:sum.carb/n}};
}
