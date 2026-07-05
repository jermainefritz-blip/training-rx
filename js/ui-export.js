/* ════════════════════════════════════════════════════════════════════
   ui-export.js — the Data & Backup modal: storage status, copy-for-coach
   summary, save-code export/restore, and clear-all.
   STEP 1 NOTE: save-code format stays "TRXV6:" for full back-compat.
   ════════════════════════════════════════════════════════════════════ */
import {DAYS, BGOAL} from './data.js';
import {state} from './state.js';
import {store, replaceStore, persist, storageAvailable, flags, setLastBackup, daysSinceBackup} from './storage.js';
import {weekDates} from './week.js';
import {liftWeek, workWeight, recommend} from './progression.js';
import {nutWeek} from './nutrition.js';
import {bodyLatest} from './body.js';
import {customList, isSkipped, customLiftWeek} from './custom.js';
import {buildFindings} from './ui-dashboard.js';
import {renderAll} from './ui-core.js';

export function openModal(){
  const liftWeeks=Object.keys(store.lifts).length;
  const nutDays=Object.values(store.nutrition).reduce((a,w)=>a+Object.keys(w).length,0);
  // live storage check — data is safe if EITHER durable store works
  const lsOK=storageAvailable()&&!flags.lastSaveFailed;
  const anyOK=lsOK||flags.idbOK;
  const statusColor=anyOK?'var(--good)':'var(--bad)';
  const statusText=anyOK?'Saving works ✓':'Saving BLOCKED ⚠';
  const savedTo=flags.idbOK?'Database + device':(lsOK?'Device only':'Not saving');

  // backup freshness → the "last backed up N days ago" nudge
  const d=daysSinceBackup();
  let backupText,backupColor='var(--ink)';
  if(d===null){backupText='Never';backupColor='var(--warn)';}
  else if(d===0){backupText='Today ✓';backupColor='var(--good)';}
  else if(d===1){backupText='Yesterday';}
  else {backupText=`${d} days ago`;if(d>=7)backupColor='var(--warn)';}
  const overdue=(d===null||d>=7);

  document.getElementById('statsContent').innerHTML=`
    <div class="srow"><span>Storage status</span><span style="color:${statusColor};font-weight:700">${statusText}</span></div>
    <div class="srow"><span>Saved to</span><span>${savedTo}</span></div>
    <div class="srow"><span>Last save code</span><span style="color:${backupColor};font-weight:600">${backupText}</span></div>
    <div class="srow"><span>Weeks of lifts</span><span>${liftWeeks}</span></div>
    <div class="srow"><span>Days of food logged</span><span>${nutDays}</span></div>
    <div class="srow"><span>Body readings</span><span>${store.body.length}</span></div>
    <div class="srow"><span>Viewing</span><span>${weekDates(state.wo)}</span></div>
    ${overdue?`<div style="margin-top:12px;padding:11px 13px;background:var(--warn-soft);color:var(--warn);border-radius:10px;font-size:12.5px;font-weight:600;line-height:1.4">💾 Time to back up. Tap “Copy save code” below and paste it somewhere safe (Notes, or email it to yourself).</div>`:''}`;
  document.getElementById('modal').classList.add('open');
}
export function closeModal(){document.getElementById('modal').classList.remove('open');}
export function closeOuter(e){if(e.target.id==='modal')closeModal();}

function showCfm(id){const el=document.getElementById(id);el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);}
function copyText(t){if(navigator.clipboard)return navigator.clipboard.writeText(t).catch(()=>fb(t));fb(t);
  function fb(x){const ta=document.createElement('textarea');ta.value=x;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}}

export function copySaveCode(){copyText('TRXV6:'+btoa(unescape(encodeURIComponent(JSON.stringify(store)))));setLastBackup();showCfm('cfmSave');openModal();/* refresh the "last backup" line + clear the nudge */}
export function restoreData(){
  const raw=document.getElementById('importBox').value.trim();if(!raw){alert('Paste your save code first.');return;}
  try{const j=raw.startsWith('TRXV6:')?decodeURIComponent(escape(atob(raw.slice(6)))):raw;
    const p=JSON.parse(j);replaceStore(p);
    persist();renderAll();document.getElementById('importBox').value='';showCfm('cfmRestore');
  }catch(e){alert('Invalid save code.');}
}
export function clearData(){if(confirm('Clear ALL data — lifts, food, and body readings? This cannot be undone.')){replaceStore({});persist();renderAll();closeModal();}}

export function copySummary(){
  const nw=nutWeek(state.wo);
  let out=`=== TRAINING RX v6 — WEEK SUMMARY ===\n${weekDates(state.wo)}\n`;
  out+=`Goal: visual leanness by Aug 13 · target ${BGOAL.wLo}–${BGOAL.wHi} lb\n\n`;
  // findings
  out+=`-- FINDINGS --\n`;
  buildFindings(nw).forEach(f=>{out+=`  ${f.text.replace(/<[^>]+>/g,'')}\n`;});
  // nutrition
  if(nw){const a=nw.avg;out+=`\n-- NUTRITION (avg of ${nw.n} days) --\n  Calories ${Math.round(a.cal)} (t 1800-1900)\n  Protein ${Math.round(a.pro)}g (t 180-200)\n  Carbs ${Math.round(a.carb)}g (t 100-130)\n  Fat ${Math.round(a.fat)}g (t <60)\n`;}
  // lifts
  out+=`\n-- LIFTS & NEXT TARGETS --\n`;
  DAYS.forEach(day=>{
    let printed=false;
    const head=()=>{if(!printed){out+=`  [${day.name}]\n`;printed=true;}};
    day.exercises.forEach((ex,ei)=>{
      if(isSkipped(state.wo,day.id,ei)){
        return;
      }
      const sets=liftWeek(day.id,ei,state.wo);if(!sets.length)return;
      head();
      const rec=recommend(ex,day.id,ei,state.wo);
      const ws=ex.bw?(workWeight(day.id,ei,state.wo)>0?`+${workWeight(day.id,ei,state.wo)}`:'BW'):`${workWeight(day.id,ei,state.wo)}lb`;
      const reps=sets.map(s=>s.reps).join(',');
      let nx=rec.status==='up'?(ex.bw?`→ ${ex.topRep+1}+ reps`:`→ ${rec.nextWeight}lb`):rec.status==='deload'?'→ DELOAD':'→ hold';
      out+=`    ${ex.name}: ${ws} x[${reps}] ${nx} (${rec.note})\n`;
    });
    customList(state.wo,day.id).forEach(cx=>{
      const sets=customLiftWeek(day.id,cx.id,state.wo);if(!sets.length)return;
      head();
      const w=Math.max(...sets.map(s=>s.lbs));
      const reps=sets.map(s=>s.reps).join(',');
      const repl=cx.replaces!=null&&cx.replaces!==''?` (swap for ${day.exercises[+cx.replaces]?.name||'?'})`:'';
      out+=`    ${cx.name} [custom${repl}]: ${w>0?w+'lb':'BW'} x[${reps}]\n`;
    });
  });
  // body
  const latest=bodyLatest();
  if(latest){out+=`\n-- BODY (latest) --\n  Weight ${latest.w??'-'}lb · BF ${latest.bf??'-'}% · SMM ${latest.smm??'-'}lb · ECW ${latest.ecw??'-'}\n`;}
  out+=`\n=== END — paste into chat for coach review ===`;
  copyText(out);showCfm('cfmSum');
}
