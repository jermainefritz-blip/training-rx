/* ════════════════════════════════════════════════════════════════════
   ui-core.js — primary tabs, navigation, week bar, and the top-level
   renderAll() that refreshes everything for the current week.
   ════════════════════════════════════════════════════════════════════ */
import {TABS, SUBS} from './data.js';
import {state} from './state.js';
import {weekDates} from './week.js';
import {renderWorkout} from './ui-workout.js';
import {renderDash} from './ui-dashboard.js';
import {renderInsights} from './ui-insights.js';

/* build the two primary tab buttons (Train / Dashboard) */
export function buildTabs(){
  const tabsEl=document.getElementById('tabs');
  TABS.forEach(t=>{
    const b=document.createElement('button');
    b.className='tab'+(t.id===state.activeTab?' active':'');
    b.textContent=t.label;b.id='tab-'+t.id;b.setAttribute('role','tab');
    b.onclick=()=>switchTab(t.id);
    tabsEl.appendChild(b);
  });
}

export function switchTab(id){
  state.activeTab=id;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+id));
  TABS.forEach(t=>{const p=document.getElementById('panel-'+t.id);if(p)p.classList.toggle('active',t.id===id);});
  document.getElementById('tbar').classList.toggle('hide',id!=='workout'); // rest timer only on Train
  if(id==='dash')renderDash();
  else if(id==='insights')renderInsights();
}
export function switchDay(i){
  state.activeDay=i;
  document.querySelectorAll('.subtab[id^="wsub-"]').forEach((t,idx)=>t.classList.toggle('active',idx===i));
  document.querySelectorAll('#workoutDays .subpanel').forEach((p,idx)=>p.classList.toggle('active',idx===i));
}
export function switchSub(id){
  state.activeSub=id;
  SUBS.forEach(s=>document.getElementById('dsub-'+s.id).classList.toggle('active',s.id===id));
  document.querySelectorAll('#panel-dash .subpanel').forEach(p=>p.classList.toggle('active',p.id==='sub-'+id));
  renderDash();
}
export function changeWeek(dir){
  if(state.wo+dir>0)return;
  state.wo+=dir;renderAll();
}

export function renderWeekBar(){
  const isNow=state.wo===0;
  document.getElementById('wlabel').textContent=weekDates(state.wo);
  const sub=document.getElementById('wsub');
  sub.textContent=isNow?'This week':(state.wo===-1?'Last week':`${-state.wo} weeks ago`);
  sub.className='wsub '+(isNow?'now':'past');
  document.getElementById('wnext').disabled=isNow;
}

export function renderAll(){
  renderWeekBar();
  renderWorkout();
  if(state.activeTab==='dash')renderDash();
  else if(state.activeTab==='insights')renderInsights();
}
