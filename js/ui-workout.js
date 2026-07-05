/* ════════════════════════════════════════════════════════════════════
   ui-workout.js — the Train tab: builds the day sub-panels/cards, renders
   set rows + targets, handles set logging, custom exercises, and history.
   ════════════════════════════════════════════════════════════════════ */
import {DAYS} from './data.js';
import {state} from './state.js';
import {store, persist} from './storage.js';
import {wKey, weekDates} from './week.js';
import {liftWeek, workWeight, recommend, targetWeight} from './progression.js';
import {customList, customAdd, customDel, isSkipped, customLiftWeek} from './custom.js';
import {setTimer, startTimer} from './timer.js';
import {confetti} from './fx.js';
import {escapeHtml, fmtSec} from './util.js';

/* plate math for barbell lifts → e.g. "45 + 10/side" or null if not loadable */
function plates(total,bar){
  let per=(total-bar)/2;
  if(per<0)return null;
  if(per===0)return 'empty bar';
  const sizes=[45,35,25,10,5,2.5],out=[];
  for(const s of sizes){while(per>=s-1e-9){out.push(s);per=Math.round((per-s)*100)/100;}}
  if(per>0.009)return null;
  return out.join(' + ')+'/side';
}

/* ── QUICK WIN 1: open on today's session ───────────────────────────── */
const DOW_TO_DAY={1:0,3:1,4:2,6:3}; // Mon→Push, Wed→Pull, Thu→Legs, Sat→Upper
const REST_NEXT={2:1,5:3,0:0};      // rest days → next session: Tue→Pull, Fri→Upper, Sun→Push
function todaySession(){
  const wd=new Date().getDay();
  if(wd in DOW_TO_DAY)return {idx:DOW_TO_DAY[wd],today:true};
  return {idx:REST_NEXT[wd],today:false};
}

/* ── QUICK WIN 2: streaks + auto PRs ────────────────────────────────── */
/* count workout days with any logged set in a given week */
function sessionsInWeek(offset){
  let n=0;
  DAYS.forEach(day=>{
    let logged=false;
    day.exercises.forEach((ex,ei)=>{if(!isSkipped(offset,day.id,ei)&&liftWeek(day.id,ei,offset).length)logged=true;});
    customList(offset,day.id).forEach(cx=>{if(customLiftWeek(day.id,cx.id,offset).length)logged=true;});
    if(logged)n++;
  });
  return n;
}
/* consecutive weeks with ≥1 session, counting back from the viewed week */
function weekStreak(view){
  let start=sessionsInWeek(view)>0?view:view-1;
  let s=0;for(let w=start;w>view-52;w--){if(sessionsInWeek(w)>0)s++;else break;}
  return s;
}
/* personal records set in a given week (weight beats all prior, or reps for BW) */
function prsForWeek(offset){
  const prs=[];
  DAYS.forEach(day=>{
    day.exercises.forEach((ex,ei)=>{
      if(isSkipped(offset,day.id,ei))return;
      const cur=liftWeek(day.id,ei,offset);if(!cur.length)return;
      if(ex.bw){
        const curReps=Math.max(...cur.map(s=>s.reps));
        let prev=0;for(let w=offset-1;w>=offset-26;w--){const s=liftWeek(day.id,ei,w);if(s.length)prev=Math.max(prev,...s.map(x=>x.reps));}
        if(prev>0&&curReps>prev)prs.push(`${ex.name} ${curReps} reps`);
      }else{
        const curW=workWeight(day.id,ei,offset);
        let prev=0;for(let w=offset-1;w>=offset-26;w--){const ww=workWeight(day.id,ei,w);if(ww!=null)prev=Math.max(prev,ww);}
        if(prev>0&&curW>prev)prs.push(`${ex.name} ${curW} lb`);
      }
    });
  });
  return prs;
}
function renderMomentum(){
  const el=document.getElementById('momentum');if(!el)return;
  const sessions=sessionsInWeek(state.wo);
  const streak=weekStreak(state.wo);
  const prs=prsForWeek(state.wo);
  const chips=[
    `<span class="mo-chip">🔥 <b>${streak}</b> wk streak</span>`,
    `<span class="mo-chip">✅ <b>${sessions}/4</b> sessions</span>`
  ];
  if(prs.length)chips.push(`<span class="mo-chip pr">🏆 <b>${prs.length}</b> PR${prs.length>1?'s':''}</span>`);
  el.innerHTML=`<div class="momentum">${chips.join('')}</div>`+(prs.length?`<div class="mo-pr">🏆 ${prs.join(' · ')}</div>`:'');
}

/* ── BUILD STATIC WORKOUT PANEL (day sub-tabs + exercise cards) ──────── */
export function buildWorkoutPanel(){
  const panelsEl=document.getElementById('panels');
  const workoutPanel=document.createElement('div');
  workoutPanel.className='panel'+(state.activeTab==='workout'?' active':'');
  workoutPanel.id='panel-workout';
  const ts=todaySession();
  state.activeDay=ts.idx; // open on today's (or next) session
  let subhtml='<div class="subtabs" role="tablist">';
  DAYS.forEach((d,i)=>{subhtml+=`<button class="subtab${i===state.activeDay?' active':''}" id="wsub-${i}" onclick="switchDay(${i})">${d.label}${(ts.today&&i===ts.idx)?' <span class="tflag">TODAY</span>':''}</button>`;});
  subhtml+='</div>';
  const restNote=ts.today?'':`<div class="rest-note">😴 Rest day today — next session: <b>${DAYS[ts.idx].label}</b></div>`;
  workoutPanel.innerHTML=subhtml+restNote+'<div id="momentum"></div><div id="workoutDays"></div>';
  panelsEl.appendChild(workoutPanel);

  const wd=document.getElementById('workoutDays');
  DAYS.forEach((day,di)=>{
    const sp=document.createElement('div');
    sp.className='subpanel'+(di===state.activeDay?' active':'');
    sp.id=`day-${di}`;
    let h=`
      <div class="day-hdr">
        <div class="day-name">${day.name}</div>
        <div class="day-sub">${day.subtitle}</div>
        <div class="day-meta">
          <span class="mpill ac">${day.exercises.length} lifts</span>
          <span class="mpill">${day.finisher.name}</span>
          ${day.extra?`<span class="mpill">${day.extra.name}</span>`:''}
        </div>
      </div>
      <div class="done-banner" id="banner-${di}"><h3>Session complete</h3><p>Log it silently — recap comes Sunday.</p></div>`;
    sp.innerHTML=h;

    day.exercises.forEach((ex,ei)=>{
      const card=document.createElement('div');
      card.className='excard';card.id=`ex-${di}-${ei}`;
      card.innerHTML=`
        <div class="bump-flag" id="bump-${di}-${ei}"></div>
        <div class="exhdr">
          <div class="exname">${ex.name}</div>
          <div class="excheck" id="chk-${di}-${ei}">✓</div>
        </div>
        <div class="exmeta">
          <span class="etag ${ex.type==='strength'?'str':'hyp'}">${ex.type==='strength'?'Strength':'Hypertrophy'}</span>
          <span class="etag s">${ex.setsReps}</span>
          <span class="etag r">⏱ ${fmtSec(ex.restSecs)}</span>
          <span class="etag t">${ex.muscle}</span>
        </div>
        <div class="ref-row">
          <div class="ref-pill"><div class="ref-label">Last session</div><div class="ref-val" id="ref-last-${di}-${ei}">—</div></div>
          <div class="ref-pill"><div class="ref-label">Target this week</div><div class="ref-val target" id="ref-tgt-${di}-${ei}">—</div></div>
        </div>
        <div class="plate-line" id="plate-${di}-${ei}" style="display:none"></div>
        <button class="repeat-btn" id="rep-${di}-${ei}" onclick="repeatLastWeek(${di},${ei})" style="display:none">↩ Same as last week</button>
        <div class="htoggle" onclick="toggleHist(${di},${ei})">📈 <span id="htxt-${di}-${ei}">Show history</span></div>
        <div class="hpanel" id="hist-${di}-${ei}"></div>
        <table class="st">
          <thead><tr><th>Set</th><th>Prev</th><th>${ex.bw?'Added':'Lbs'}</th><th>Reps</th><th>✓</th></tr></thead>
          <tbody id="tb-${di}-${ei}"></tbody>
        </table>
        <div style="height:10px"></div>`;
      sp.appendChild(card);
    });

    // custom exercise container (re-rendered per week) + add button
    sp.insertAdjacentHTML('beforeend',`<div id="custom-${di}"></div>
      <button class="add-ex-btn" id="addbtn-${di}" onclick="openAddForm(${di})">+ Add exercise</button>
      <div class="add-form" id="addform-${di}"></div>`);

    // finisher card
    const f=day.finisher;
    const blue=(f.type==='cycle'||f.type==='pilates');
    let fin=`<div class="cardio-card${blue?' blue':''}"><div class="ci">${f.icon}</div><div><div class="cn">${f.name}</div><div class="cd">${f.desc}</div></div></div>`;
    if(day.extra)fin+=`<div class="cardio-card"><div class="ci">${day.extra.icon}</div><div><div class="cd">${day.extra.desc}</div></div></div>`;
    sp.insertAdjacentHTML('beforeend',fin);
    wd.appendChild(sp);
  });
}

/* ── RENDER WORKOUT (per-week) ──────────────────────────────────────── */
export function renderWorkout(){
  const isNow=state.wo===0;
  let totalSets=0,doneSets=0;
  DAYS.forEach((day,di)=>{
    day.exercises.forEach((ex,ei)=>{
      const card=document.getElementById(`ex-${di}-${ei}`);
      const skipped=isSkipped(state.wo,day.id,ei);
      card.classList.toggle('skipped',skipped);
      // toggle a "swapped out" note
      let skipNote=document.getElementById(`skip-${di}-${ei}`);
      if(skipped&&!skipNote){
        skipNote=document.createElement('div');skipNote.id=`skip-${di}-${ei}`;skipNote.className='skip-note';
        skipNote.innerHTML=`Swapped out this week · <button onclick="unskip(${di},${ei})">restore</button>`;
        card.insertBefore(skipNote,card.firstChild);
      }else if(!skipped&&skipNote){skipNote.remove();}

      // reference pills
      const lastW=workWeight(day.id,ei,state.wo-1);
      document.getElementById(`ref-last-${di}-${ei}`).textContent =
        lastW!=null?(ex.bw?(lastW>0?`+${lastW}`:'BW'):`${lastW} lb`):(ex.bw?'BW':'—');
      const tgt=targetWeight(ex,day.id,ei,state.wo);
      document.getElementById(`ref-tgt-${di}-${ei}`).textContent =
        ex.bw?(tgt>0?`+${tgt} · ${ex.topRep}+`:`BW · ${ex.topRep}+`):`${tgt} lb`;

      // bump flag: did target rise vs last logged working weight?
      const bf=document.getElementById(`bump-${di}-${ei}`);
      if(isNow&&!skipped&&lastW!=null&&!ex.bw&&tgt>lastW){
        bf.textContent=`↑ Progressed: target ${tgt} lb (was ${lastW}). Earned by hitting top reps.`;
        bf.classList.add('show');
      }else if(isNow&&!skipped&&ex.bw&&lastW!=null){
        const recPrev=recommend(ex,day.id,ei,state.wo-1);
        if(recPrev.status==='up'){bf.textContent=`↑ Progressed: aim ${ex.topRep+1}+ reps or add load this week.`;bf.classList.add('show');}
        else bf.classList.remove('show');
      }else bf.classList.remove('show');

      // quick-win controls: "same as last week" + plate calculator
      const repBtn=document.getElementById(`rep-${di}-${ei}`);
      if(repBtn)repBtn.style.display=(isNow&&!skipped&&lastW!=null)?'block':'none';
      const plateEl=document.getElementById(`plate-${di}-${ei}`);
      if(plateEl){
        const ps=(ex.bar&&!skipped)?plates(tgt,ex.bar):null;
        if(ps){plateEl.style.display='block';plateEl.innerHTML=`🏋️ ${tgt} lb = <b>${ps}</b> <span style="opacity:.7">(bar ${ex.bar})</span>`;}
        else plateEl.style.display='none';
      }

      // set rows
      const lbsStep=(typeof ex.inc==='number'?ex.inc:5);
      const tb=document.getElementById(`tb-${di}-${ei}`);tb.innerHTML='';
      const saved=store.lifts[wKey(state.wo)]?.[day.id]?.[ei]||{};
      for(let si=0;si<ex.sets;si++){
        if(!skipped)totalSets++;
        const s=saved[si];if(s&&!skipped)doneSets++;
        const prev=lastW!=null?(ex.bw?`+${workWeight(day.id,ei,state.wo-1)||0}`:`${lastW}`):'—';
        const dis=isNow?'':'disabled';
        const phLbs=ex.bw?(tgt>0?tgt:''):tgt;
        const phReps=ex.topRep;
        const tr=document.createElement('tr');
        tr.className='sr'+(s?' done':'');tr.id=`row-${di}-${ei}-${si}`;
        const lbsId=`lbs-${di}-${ei}-${si}`, repsId=`reps-${di}-${ei}-${si}`;
        const lbsSpin=isNow?`<span class="spin"><button class="spb" tabindex="-1" onclick="stepVal('${lbsId}',${lbsStep})">+</button><button class="spb" tabindex="-1" onclick="stepVal('${lbsId}',${-lbsStep})">−</button></span>`:'';
        const repsSpin=isNow?`<span class="spin"><button class="spb" tabindex="-1" onclick="stepVal('${repsId}',1)">+</button><button class="spb" tabindex="-1" onclick="stepVal('${repsId}',-1)">−</button></span>`:'';
        tr.innerHTML=`
          <td>${si+1}</td>
          <td style="font-size:12px;color:var(--muted)">${prev}</td>
          <td><div class="siwrap"><input class="si" type="number" inputmode="decimal" id="${lbsId}"
            value="${s&&s.lbs!=null?s.lbs:''}" placeholder="${phLbs}" ${dis}>${lbsSpin}</div></td>
          <td><div class="siwrap"><input class="si" type="number" inputmode="numeric" id="${repsId}"
            value="${s?s.reps:''}" placeholder="${phReps}" ${dis}>${repsSpin}</div></td>
          <td><button class="dbtn ${s?'on':''}" id="done-${di}-${ei}-${si}" onclick="mark(${di},${ei},${si})" ${dis} aria-label="Mark set done">✓</button></td>`;
        tb.appendChild(tr);
      }
      refreshCard(di,ei);
    });
    const cc=renderCustom(di);
    totalSets+=cc.total;doneSets+=cc.done;
    refreshBanner(di);
  });
  const pct=totalSets?Math.round(doneSets/totalSets*100):0;
  document.getElementById('progGlobal').style.width=pct+'%';
  renderMomentum();
}

/* render custom exercise cards for a day; returns set counts */
export function renderCustom(di){
  const day=DAYS[di];const isNow=state.wo===0;
  const cont=document.getElementById(`custom-${di}`);
  const list=customList(state.wo,day.id);
  const addBtn=document.getElementById(`addbtn-${di}`);
  if(addBtn)addBtn.style.display=isNow?'block':'none';
  let total=0,done=0;
  cont.innerHTML='';
  list.forEach(cx=>{
    const wk=wKey(state.wo);const saved=store.lifts[wk]?.[day.id]?.['c'+cx.id]||{};
    let rows='';
    for(let si=0;si<cx.sets;si++){
      total++;const s=saved[si];if(s)done++;
      const dis=isNow?'':'disabled';
      rows+=`<tr class="sr${s?' done':''}" id="crow-${di}-${cx.id}-${si}">
        <td>${si+1}</td>
        <td style="font-size:12px;color:var(--muted)">—</td>
        <td><input class="si" type="number" inputmode="decimal" id="clbs-${di}-${cx.id}-${si}" value="${s&&s.lbs!=null?s.lbs:''}" placeholder="${cx.start||''}" ${dis}></td>
        <td><input class="si" type="number" inputmode="numeric" id="creps-${di}-${cx.id}-${si}" value="${s?s.reps:''}" placeholder="${cx.topRep}" ${dis}></td>
        <td><button class="dbtn ${s?'on':''}" id="cdone-${di}-${cx.id}-${si}" onclick="markCustom(${di},'${cx.id}',${si})" ${dis} aria-label="Mark set done">✓</button></td>
      </tr>`;
    }
    const replNote=cx.replaces!=null&&cx.replaces!==''?` · replaces ${day.exercises[+cx.replaces]?.name||'a lift'}`:'';
    const card=document.createElement('div');
    card.className='excard custom';
    card.innerHTML=`
      <div class="custom-tag">Custom${replNote}</div>
      <div class="exhdr">
        <div class="exname">${escapeHtml(cx.name)}</div>
        <button class="cx-del" onclick="deleteCustom(${di},'${cx.id}')" aria-label="Delete custom exercise" ${isNow?'':'disabled'}>✕</button>
      </div>
      <div class="exmeta">
        <span class="etag ${cx.type==='strength'?'str':'hyp'}">${cx.type==='strength'?'Strength':'Hypertrophy'}</span>
        <span class="etag s">${cx.sets}×${cx.topRep}${cx.type==='strength'?' (top)':''}</span>
        <span class="etag r">⏱ ${fmtSec(cx.restSecs)}</span>
        <span class="etag t">${cx.type==='strength'?'Compound':'Isolation'}</span>
      </div>
      <table class="st">
        <thead><tr><th>Set</th><th>Prev</th><th>Lbs</th><th>Reps</th><th>✓</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="height:10px"></div>`;
    cont.appendChild(card);
  });
  return {total,done};
}

export function markCustom(di,cid,si){
  if(state.wo!==0)return;
  const day=DAYS[di];const cx=customList(0,day.id).find(c=>c.id===cid);if(!cx)return;
  const btn=document.getElementById(`cdone-${di}-${cid}-${si}`);
  const row=document.getElementById(`crow-${di}-${cid}-${si}`);
  const lE=document.getElementById(`clbs-${di}-${cid}-${si}`);
  const rE=document.getElementById(`creps-${di}-${cid}-${si}`);
  const wk=wKey(0);
  if(!btn.classList.contains('on')){
    if(lE.value===''&&lE.placeholder!=='')lE.value=lE.placeholder;
    if(rE.value===''&&rE.placeholder!=='')rE.value=rE.placeholder;
    btn.classList.add('on');row.classList.add('done');
    if(!store.lifts[wk])store.lifts[wk]={};
    if(!store.lifts[wk][day.id])store.lifts[wk][day.id]={};
    if(!store.lifts[wk][day.id]['c'+cid])store.lifts[wk][day.id]['c'+cid]={};
    store.lifts[wk][day.id]['c'+cid][si]={lbs:parseFloat(lE.value)||0,reps:parseInt(rE.value)||0};
    persist();setTimer(cx.restSecs);startTimer();
  }else{
    btn.classList.remove('on');row.classList.remove('done');
    if(store.lifts[wk]?.[day.id]?.['c'+cid]?.[si]){delete store.lifts[wk][day.id]['c'+cid][si];persist();}
  }
  renderWorkout();maybeCelebrate(di);
}

/* ── ADD CUSTOM EXERCISE FORM ───────────────────────── */
export function openAddForm(di){
  const day=DAYS[di];
  const f=document.getElementById(`addform-${di}`);
  if(f.classList.contains('open')){f.classList.remove('open');f.innerHTML='';return;}
  const opts=day.exercises.map((ex,ei)=>`<option value="${ei}">${escapeHtml(ex.name)}</option>`).join('');
  f.innerHTML=`
    <h4>Add exercise</h4>
    <div class="af-field"><label>Exercise name</label><input type="text" id="af-name-${di}" placeholder="e.g. DB Floor Press" maxlength="40"></div>
    <div class="af-row">
      <div class="af-field"><label>Type</label>
        <select id="af-type-${di}"><option value="isolation">Isolation (1 wk → +load)</option><option value="strength">Compound (2 wks → +load)</option></select>
      </div>
      <div class="af-field"><label>Sets</label><input type="number" inputmode="numeric" id="af-sets-${di}" value="3" min="1" max="8"></div>
    </div>
    <div class="af-row">
      <div class="af-field"><label>Rep target (top)</label><input type="number" inputmode="numeric" id="af-reps-${di}" value="12" min="1" max="30"></div>
      <div class="af-field"><label>Start weight (opt)</label><input type="number" inputmode="decimal" id="af-start-${di}" placeholder="lb"></div>
    </div>
    <div class="af-field"><label>Replacing (optional)</label>
      <select id="af-repl-${di}"><option value="">Nothing — add as extra</option>${opts}</select>
    </div>
    <div class="af-actions">
      <button class="nbtn save" onclick="saveCustomEx(${di})">Add to ${day.label}</button>
      <button class="nbtn clear" onclick="openAddForm(${di})" aria-label="Cancel">✕</button>
    </div>`;
  f.classList.add('open');
}
export function saveCustomEx(di){
  const day=DAYS[di];
  const name=document.getElementById(`af-name-${di}`).value.trim();
  if(!name){alert('Give the exercise a name.');return;}
  const type=document.getElementById(`af-type-${di}`).value;
  const sets=Math.max(1,Math.min(8,parseInt(document.getElementById(`af-sets-${di}`).value)||3));
  const topRep=Math.max(1,Math.min(30,parseInt(document.getElementById(`af-reps-${di}`).value)||12));
  const startV=document.getElementById(`af-start-${di}`).value;
  const replaces=document.getElementById(`af-repl-${di}`).value;
  const restSecs=type==='strength'?120:60;
  customAdd(state.wo,day.id,{name,type,sets,topRep,restSecs,start:startV===''?null:+startV,replaces,inc:type==='strength'?5:2.5});
  document.getElementById(`addform-${di}`).classList.remove('open');
  document.getElementById(`addform-${di}`).innerHTML='';
  renderWorkout();
}
export function deleteCustom(di,cid){
  if(!confirm('Delete this custom exercise and its logged sets?'))return;
  customDel(state.wo,DAYS[di].id,cid);renderWorkout();
}
export function unskip(di,ei){
  const wk=wKey(state.wo);
  if(store.skipped[wk]?.[DAYS[di].id])store.skipped[wk][DAYS[di].id]=store.skipped[wk][DAYS[di].id].filter(i=>i!==ei);
  // also clear replaces pointer on any custom that pointed here
  (store.custom[wk]?.[DAYS[di].id]||[]).forEach(c=>{if(+c.replaces===ei)c.replaces='';});
  persist();renderWorkout();
}

/* nudge a weight/reps input by delta (uses placeholder when empty) */
export function stepVal(id,delta){
  const el=document.getElementById(id);if(!el||el.disabled)return;
  let v=parseFloat(el.value);if(isNaN(v))v=parseFloat(el.placeholder)||0;
  el.value=Math.max(0,Math.round((v+delta)*100)/100);
}

/* fill + complete a whole exercise with last week's numbers */
export function repeatLastWeek(di,ei){
  if(state.wo!==0)return;
  const day=DAYS[di],ex=day.exercises[ei];
  const prev=liftWeek(day.id,ei,state.wo-1);
  if(!prev.length){alert('No last-week data to copy for this lift yet.');return;}
  const wk=wKey(0);
  if(!store.lifts[wk])store.lifts[wk]={};
  if(!store.lifts[wk][day.id])store.lifts[wk][day.id]={};
  store.lifts[wk][day.id][ei]={};
  for(let si=0;si<ex.sets;si++){const s=prev[si]||prev[prev.length-1];store.lifts[wk][day.id][ei][si]={lbs:s.lbs,reps:s.reps};}
  persist();renderWorkout();maybeCelebrate(di);
}

/* ── session-complete celebration ── */
const celebrated=new Set();
function dayComplete(di){
  const day=DAYS[di],wk=wKey(0);
  const base=day.exercises.every((ex,ei)=>isSkipped(0,day.id,ei)||Array.from({length:ex.sets}).every((_,si)=>store.lifts[wk]?.[day.id]?.[ei]?.[si]));
  const cust=customList(0,day.id).every(cx=>Array.from({length:cx.sets}).every((_,si)=>store.lifts[wk]?.[day.id]?.['c'+cx.id]?.[si]));
  const hasWork=day.exercises.some((ex,ei)=>!isSkipped(0,day.id,ei))||customList(0,day.id).length>0;
  return hasWork&&base&&cust;
}
function maybeCelebrate(di){
  const key=wKey(0)+'-'+di;
  if(dayComplete(di)){if(!celebrated.has(key)){celebrated.add(key);confetti();if(navigator.vibrate)navigator.vibrate([60,40,120]);}}
  else celebrated.delete(key);
}

export function mark(di,ei,si){
  if(state.wo!==0)return;
  const day=DAYS[di],ex=day.exercises[ei];
  const btn=document.getElementById(`done-${di}-${ei}-${si}`);
  const row=document.getElementById(`row-${di}-${ei}-${si}`);
  const lE=document.getElementById(`lbs-${di}-${ei}-${si}`);
  const rE=document.getElementById(`reps-${di}-${ei}-${si}`);
  const wasOn=btn.classList.contains('on');
  if(!wasOn){
    if(lE.value===''&&lE.placeholder!=='')lE.value=lE.placeholder;
    if(rE.value===''&&rE.placeholder!=='')rE.value=rE.placeholder;
    btn.classList.add('on');row.classList.add('done');
    const wk=wKey(0);
    if(!store.lifts[wk])store.lifts[wk]={};
    if(!store.lifts[wk][day.id])store.lifts[wk][day.id]={};
    if(!store.lifts[wk][day.id][ei])store.lifts[wk][day.id][ei]={};
    store.lifts[wk][day.id][ei][si]={lbs:parseFloat(lE.value)||0,reps:parseInt(rE.value)||0};
    persist();
    setTimer(ex.restSecs);startTimer();
  }else{
    btn.classList.remove('on');row.classList.remove('done');
    const wk=wKey(0);if(store.lifts[wk]?.[day.id]?.[ei]?.[si]){delete store.lifts[wk][day.id][ei][si];persist();}
  }
  refreshCard(di,ei);refreshBanner(di);renderWorkout();maybeCelebrate(di);
}
function refreshCard(di,ei){
  const ex=DAYS[di].exercises[ei];
  const all=Array.from({length:ex.sets}).every((_,si)=>document.getElementById(`done-${di}-${ei}-${si}`)?.classList.contains('on'));
  document.getElementById(`ex-${di}-${ei}`).classList.toggle('done',all&&!isSkipped(state.wo,DAYS[di].id,ei));
}
function refreshBanner(di){
  const day=DAYS[di];
  const baseAll=day.exercises.every((ex,ei)=>isSkipped(state.wo,day.id,ei)||Array.from({length:ex.sets}).every((_,si)=>document.getElementById(`done-${di}-${ei}-${si}`)?.classList.contains('on')));
  const custAll=customList(state.wo,day.id).every(cx=>Array.from({length:cx.sets}).every((_,si)=>document.getElementById(`cdone-${di}-${cx.id}-${si}`)?.classList.contains('on')));
  document.getElementById(`banner-${di}`).classList.toggle('show',baseAll&&custAll);
}

/* ── HISTORY ─────────────────────────────────────────── */
export function toggleHist(di,ei){
  const p=document.getElementById(`hist-${di}-${ei}`);
  const open=p.classList.toggle('open');
  document.getElementById(`htxt-${di}-${ei}`).textContent=open?'Hide history':'Show history';
  if(open)loadHist(di,ei);
}
function loadHist(di,ei){
  const day=DAYS[di],ex=DAYS[di].exercises[ei];
  const p=document.getElementById(`hist-${di}-${ei}`);
  const rows=[];
  for(let w=0;w>=-11;w--){
    const sets=liftWeek(day.id,ei,w);if(!sets.length)continue;
    const fmt=s=>s?(ex.bw?`+${s.lbs}×${s.reps}`:`${s.lbs}×${s.reps}`):'—';
    rows.push(`<div class="hrow"><span>${weekDates(w)}</span><span>${fmt(sets[0])}</span><span>${fmt(sets[1])}</span><span>${fmt(sets[2])}</span></div>`);
    if(rows.length>=8)break;
  }
  p.innerHTML=rows.length
    ?`<div class="hhdr"><span>Week</span><span>Set 1</span><span>Set 2</span><span>Set 3</span></div>`+rows.join('')
    :`<div style="padding:14px;color:var(--muted);font-size:12px;text-align:center">No history yet</div>`;
}
