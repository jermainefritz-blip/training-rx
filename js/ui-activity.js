/* ════════════════════════════════════════════════════════════════════
   ui-activity.js — Activity sub-tab (Apple Watch data).
   Morning paste-import of yesterday's steps + workouts (via Apple Shortcut),
   a manual steps fallback, a weekly steps summary, and a recent-days list.
   ════════════════════════════════════════════════════════════════════ */
import {STEPS} from './data.js';
import {activityGet, activitySet, activityDel, activitySorted, parseActivityCode, stepsStats, ymd} from './activity.js';
import {escapeHtml} from './util.js';

let actHelpOpen=false;

function stepColor(v){
  if(v==null)return 'var(--ink)';
  if(v>=STEPS.lo)return 'var(--good)';
  if(v<STEPS.lo*0.75)return 'var(--bad)';
  return 'var(--warn)';
}
function fmt(n){return n==null?'—':Number(n).toLocaleString();}

const HELP=`
  <div style="margin-top:10px;padding:12px 13px;background:var(--tint);border:1px solid var(--line2);border-radius:10px;font-size:12.5px;color:var(--ink2);line-height:1.5">
    <b style="color:var(--ink)">One-time setup — build the Shortcut</b><br>
    Open the <b>Shortcuts</b> app → <b>+</b> → add these actions, then run it each morning and paste the result here.
    <ol style="margin:8px 0 0 18px;padding:0">
      <li>Get Current Date → Format Date <code>yyyy-MM-dd</code> → Get Dates from Input → <b>TodayMidnight</b></li>
      <li>Adjust Date (TodayMidnight − 1 day) → <b>YdayMidnight</b>; Format it <code>yyyy-MM-dd</code> → <b>DateStr</b></li>
      <li>Find Health Samples → <b>Steps</b>, where Start Date is after YdayMidnight &amp; before TodayMidnight → Calculate Statistics → <b>Sum</b> → <b>Steps</b></li>
      <li>Find Health Samples → <b>Resting Heart Rate</b> (same dates) → Calculate Statistics → <b>Average</b> → <b>RHR</b></li>
      <li>Find Health Samples → <b>Workouts</b> (same dates). Repeat with Each: build text <code>|w=[Type]~[Duration in min]~~[Active Energy]</code> into a variable <b>WLines</b></li>
      <li>Text action:<br><code>TRXA1|d=[DateStr]|steps=[Steps]|rhr=[RHR][WLines]</code></li>
      <li>Copy to Clipboard (and/or Show). Run it, then paste above.</li>
    </ol>
    <span style="color:var(--muted)">No workout yesterday? It still works — you'll just get steps. Average heart-rate per workout is optional; leave it blank (the <code>~~</code>) if it's fiddly. Stuck? Use the manual steps box below, and I can help fine-tune the Shortcut.</span>
  </div>`;

export function renderActivity(){
  const el=document.getElementById('sub-activity');
  const list=activitySorted().reverse(); // recent first
  const yday=new Date();yday.setDate(yday.getDate()-1);
  const yStr=ymd(yday);
  const ss=stepsStats(7);

  // week summary
  let summary='';
  if(ss){
    const avgColor=stepColor(ss.avg);
    summary=`<div class="card">
      <div class="card-title">This week's steps<span class="ct-tag">${ss.n} day${ss.n>1?'s':''} logged</span></div>
      <div class="avgrow"><div class="an">Average steps</div><div class="av" style="color:${avgColor}">${fmt(ss.avg)}</div><div class="at">${STEPS.lo/1000}–${STEPS.hi/1000}k</div><div class="ad"><span class="dot ${ss.avg>=STEPS.lo?'good':'warn'}"></span></div></div>
      <div class="avgrow"><div class="an">Days in band</div><div class="av">${ss.inBand}/${ss.n}</div></div>
      <div class="avgrow"><div class="an">Days below 8k</div><div class="av" style="color:${ss.low?'var(--warn)':'var(--good)'}">${ss.low}</div></div>
    </div>`;
  }

  // recent list
  let listHtml;
  if(list.length){
    listHtml=`<div class="card"><div class="card-title">Recent days<span class="ct-tag">tap ✕ to remove</span></div><div class="bc-readings">`;
    list.slice(0,14).forEach(a=>{
      const dt=new Date(a.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      const wk=(a.workouts||[]);
      const totMin=wk.reduce((s,w)=>s+(+w.mins||0),0);
      const wtxt=wk.length?`${wk.length} workout${wk.length>1?'s':''}${totMin?` · ${totMin} min`:''}`:'no workout';
      listHtml+=`<div class="bc-reading">
        <div class="brd">${dt}</div>
        <div class="brvals">
          <span class="brv"><b style="color:${stepColor(a.steps)}">${fmt(a.steps)}</b> steps</span>
          <span class="brv">${escapeHtml(wtxt)}</span>
          ${a.restingHR!=null?`<span class="brv"><b>${a.restingHR}</b> rhr</span>`:''}
        </div>
        <button class="bc-del" onclick="delActivity('${a.date}')" aria-label="Delete day">✕</button>
      </div>`;
    });
    listHtml+='</div></div>';
  }else{
    listHtml=`<div class="card"><div class="empty"><div class="ee">⌚️</div>No activity imported yet.<br>Run your Shortcut and paste yesterday's code above.</div></div>`;
  }

  el.innerHTML=`
    <div class="sec-eyebrow">Apple Watch · morning import</div>
    <h2 class="sec-title">Activity</h2>
    <p class="sec-desc">Each morning, run your Shortcut and paste yesterday's code. Steps target ${STEPS.lo.toLocaleString()}–${STEPS.hi.toLocaleString()}.</p>

    <div class="nut-entry">
      <h4>Import yesterday</h4>
      <textarea class="import-area" id="act-paste" placeholder="Paste the code from your Shortcut (starts with TRXA1…)"></textarea>
      <div class="nut-actions"><button class="nbtn save" onclick="importActivity()">Import</button></div>
      <div class="nut-cfm" id="actCfm">Imported ✓</div>
      <div class="htoggle" style="margin:8px 2px 0" onclick="toggleActHelp()">⚙️ <span>${actHelpOpen?'Hide setup steps':'How to set up the Shortcut'}</span></div>
      ${actHelpOpen?HELP:''}
    </div>

    <div class="card">
      <div class="card-title">Manual steps<span class="ct-tag">fallback</span></div>
      <div class="bc-fields">
        <div class="bc-date-field" style="margin-bottom:0"><label>Date</label><input type="date" id="act-date" value="${yStr}"></div>
        <div class="bc-field"><label>Steps</label><div class="mi-wrap"><input type="number" inputmode="numeric" id="act-steps" placeholder="0"><span class="mi-unit">steps</span></div></div>
      </div>
      <div class="nut-actions"><button class="nbtn save" onclick="saveManualActivity()">Save steps</button></div>
      <div class="nut-cfm" id="actManCfm">Saved ✓</div>
    </div>

    ${summary}
    ${listHtml}`;
}

function showCfm(id){const el=document.getElementById(id);if(el){el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800);}}

export function importActivity(){
  const raw=document.getElementById('act-paste').value;
  let p;
  try{p=parseActivityCode(raw);}
  catch(e){alert("That code didn't look right. Make sure you pasted the whole thing from the Shortcut (it starts with TRXA1).");return;}
  activitySet(p.date,{steps:p.steps,restingHR:p.restingHR,active:p.active,workouts:p.workouts});
  renderActivity();
  showCfm('actCfm');
}

export function saveManualActivity(){
  const date=document.getElementById('act-date').value;
  const steps=document.getElementById('act-steps').value;
  if(!date){alert('Pick a date.');return;}
  if(steps===''){alert('Enter a step count.');return;}
  const existing=activityGet(date)||{};
  activitySet(date,{...existing,steps:Math.round(+steps)||0});
  renderActivity();
  showCfm('actManCfm');
}

export function delActivity(date){
  if(confirm('Remove this day\'s activity?')){activityDel(date);renderActivity();}
}

export function toggleActHelp(){actHelpOpen=!actHelpOpen;renderActivity();}
