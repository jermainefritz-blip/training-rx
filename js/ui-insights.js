/* ════════════════════════════════════════════════════════════════════
   ui-insights.js — the Insights tab (third top-level tab).

   Rules-based, computed locally (no API). Analyzes ALL logged data up to
   now, tied to the Aug 13 goal. Priority order (per athlete): body-comp
   trajectory, then lift plateaus/stalls, then nutrition adherence.

   Every suggestion respects the coaching spec: protein 180–200g is the
   top lever, never touch Monday Cycle or Wed/Sat Pilates, and never
   advise adding load before the progression rules allow it.
   ════════════════════════════════════════════════════════════════════ */
import {DAYS, NTGT, BGOAL, PROGRAM, STEPS} from './data.js';
import {state} from './state.js';
import {store} from './storage.js';
import {wKey} from './week.js';
import {liftWeek, workWeight, hitTopThatWeek, consecutiveLoggedWeeks} from './progression.js';
import {bodySorted} from './body.js';
import {stepsStats, recentActivity} from './activity.js';

/* ── BUILD STATIC PANEL ─────────────────────────────────────────────── */
export function buildInsightsPanel(){
  const panelsEl=document.getElementById('panels');
  const p=document.createElement('div');
  p.className='panel'+(state.activeTab==='insights'?' active':'');
  p.id='panel-insights';
  p.innerHTML='<div id="insightsBody"></div>';
  panelsEl.appendChild(p);
}

/* whole days from now until the end of the program window */
function daysToEnd(){
  const end=new Date(PROGRAM.end+'T23:59:59');
  return Math.ceil((end-new Date())/86400000);
}

/* small coloured callout box */
function noteBox(text,tone){
  const map={good:['var(--good-soft)','var(--good)'],warn:['var(--warn-soft)','var(--warn)'],bad:['var(--bad-soft)','var(--bad)'],signal:['var(--signal-soft)','var(--signal)']};
  const [bg,fg]=map[tone]||map.signal;
  return `<div style="margin-top:10px;padding:11px 13px;background:${bg};color:${fg};border-radius:10px;font-size:12.5px;font-weight:600;line-height:1.45">${text}</div>`;
}
function emptyCard(title,tag,emoji,msg){
  return `<div class="card"><div class="card-title">${title}<span class="ct-tag">${tag}</span></div><div class="empty" style="padding:16px"><div class="ee">${emoji}</div>${msg}</div></div>`;
}
function rowsHtml(rows){
  return rows.map(r=>`<div class="avgrow"><div class="an">${r[0]}</div><div class="av" style="color:${r[2]||'var(--ink)'}">${r[1]}</div></div>`).join('');
}

/* ════════════════════════════════════════════════════════════════════
   1) BODY-COMP TRAJECTORY  (top priority)
   ════════════════════════════════════════════════════════════════════ */
function trajectory(){
  const B=bodySorted();
  if(B.length<2)return {enough:false};
  const first=B[0], last=B[B.length-1];
  const span=Math.max(0.5,(new Date(last.date)-new Date(first.date))/(7*86400000)); // weeks between
  const rate=k=>(last[k]!=null&&first[k]!=null)?(last[k]-first[k])/span:null;
  const wRate=rate('w'), bfRate=rate('bf'), smmRate=rate('smm');
  const weeksLeft=Math.max(0,daysToEnd()/7);
  const projW=(last.w!=null&&wRate!=null)?last.w+wRate*weeksLeft:null;
  return {enough:true,first,last,wRate,bfRate,smmRate,weeksLeft,projW};
}
function trajectoryCard(){
  const t=trajectory();
  if(!t.enough)
    return emptyCard('Body-comp trajectory','to '+PROGRAM.endLabel,'📉',
      `Log at least 2 InBody readings (weight, body fat, muscle) and I'll project whether you'll hit ${BGOAL.wLo}–${BGOAL.wHi} lb by ${PROGRAM.endLabel} — and whether you're holding muscle.`);

  const {last,wRate,bfRate,smmRate,projW}=t;
  const fmtRate=(r,unit)=>r==null?'—':`${r>0?'+':''}${Math.round(r*100)/100} ${unit}/wk`;

  let projColor='var(--ink)';
  if(projW!=null){
    if(projW>BGOAL.wHi)projColor='var(--warn)';
    else if(projW<BGOAL.wLo)projColor='var(--signal)';
    else projColor='var(--good)';
  }
  const smmHeld = last.smm==null?null:last.smm>=BGOAL.smm-0.5;
  const smmColor = smmHeld==null?'var(--ink)':(smmHeld?'var(--good)':'var(--bad)');
  const bfColor = bfRate==null?'var(--ink)':(bfRate<0?'var(--good)':(bfRate>0?'var(--warn)':'var(--ink)'));

  const rows=[
    ['Current weight', last.w!=null?last.w+' lb':'—'],
    ['Projected '+PROGRAM.endLabel, projW!=null?Math.round(projW)+' lb':'—', projColor],
    ['Weight pace', fmtRate(wRate,'lb'), wRate!=null&&wRate<0?'var(--good)':'var(--ink)'],
    ['Muscle (SMM)', last.smm!=null?`${last.smm} lb · ${smmHeld?'holding':'dropping'}`:'—', smmColor],
    ['Body fat trend', fmtRate(bfRate,'%'), bfColor],
  ];

  // primary suggestion — spec-safe
  const muscleSlipping=(smmHeld===false)||(smmRate!=null&&smmRate<-0.25);
  let note;
  if(muscleSlipping)
    note=noteBox(`⚠️ Muscle is slipping. Make protein <b>180–200g</b> non-negotiable, keep training intensity up, and don't deepen the calorie deficit — holding muscle beats faster scale loss.`,'bad');
  else if(projW!=null && projW>BGOAL.wHi)
    note=noteBox(`Behind pace for ${BGOAL.wLo}–${BGOAL.wHi}. First tighten tracking accuracy and daily steps (8–12k). Only if tracking is solid, trim calories by 100–150 — keep protein 180–200 and hold your training schedule steady.`,'warn');
  else if(projW!=null && projW<BGOAL.wLo)
    note=noteBox(`On pace to dip below ${BGOAL.wLo} lb. Fine for leanness <i>only</i> if muscle holds — keep protein 180–200 and watch SMM; ease the deficit if muscle starts to drop.`,'signal');
  else if(projW!=null)
    note=noteBox(`✅ On track — projected around <b>${Math.round(projW)} lb</b> by ${PROGRAM.endLabel} while holding muscle. Keep doing exactly this.`,'good');
  else
    note=noteBox('Add weight to your readings to project a finish line.','signal');

  return `<div class="card">
    <div class="card-title">Body-comp trajectory<span class="ct-tag">to ${PROGRAM.endLabel}</span></div>
    ${rowsHtml(rows)}
    ${note}
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   2) LIFT PLATEAUS & STALLS  (top priority)
   ════════════════════════════════════════════════════════════════════ */
function liftStatuses(){
  const out=[];
  DAYS.forEach(day=>{
    day.exercises.forEach((ex,ei)=>{
      const weeks=[]; // most-recent first
      for(let w=0;w>=-7;w--){
        const s=liftWeek(day.id,ei,w);if(!s.length)continue;
        weeks.push({w,weight:workWeight(day.id,ei,w),maxReps:Math.max(...s.map(x=>x.reps)),hitTop:hitTopThatWeek(ex,day.id,ei,w)});
      }
      if(!weeks.length)return;
      const cur=weeks[0];
      let streak=1; // consecutive recent weeks at the same working weight
      for(let i=1;i<weeks.length;i++){if(weeks[i].weight===cur.weight)streak++;else break;}
      const recent=weeks.slice(0,streak);
      const repsClimbing=recent.length>1&&recent[0].maxReps>recent[recent.length-1].maxReps;
      const deloadDue=consecutiveLoggedWeeks(day.id,ei,0)>=5;
      let status;
      if(cur.hitTop)status='ready';                       // about to earn load
      else if(deloadDue)status='deload';
      else if(streak>=3&&!repsClimbing)status='stalled';  // 3+ wks same weight, reps flat
      else status='building';
      out.push({name:ex.name,muscle:ex.muscle,priority:ex.muscle.includes('★'),status,weight:cur.weight,weeks:weeks.length,bw:ex.bw});
    });
  });
  return out;
}
function plateauCard(){
  const L=liftStatuses();
  if(!L.length)
    return emptyCard('Lift plateaus & stalls','last 8 weeks','🏋️','Log a few sessions and your progress — and any plateaus — will show up here.');

  const ready=L.filter(x=>x.status==='ready');
  const building=L.filter(x=>x.status==='building');
  const stalled=L.filter(x=>x.status==='stalled');
  const deload=L.filter(x=>x.status==='deload');

  const bits=[];
  if(ready.length)bits.push(`<b>${ready.length}</b> ready to add load`);
  if(building.length)bits.push(`<b>${building.length}</b> progressing`);
  if(stalled.length)bits.push(`<b>${stalled.length}</b> stalled`);
  if(deload.length)bits.push(`<b>${deload.length}</b> due a deload`);
  const summary=`<p class="sec-desc" style="margin:0 0 8px">${bits.join(' · ')||'Logging in progress.'}</p>`;

  const flagged=[...stalled.map(x=>({...x,flag:'stall'})),...deload.map(x=>({...x,flag:'deload'}))]
    .sort((a,b)=>(b.priority-a.priority));
  let rows;
  if(flagged.length){
    rows=flagged.map(x=>{
      const badge=x.flag==='stall'?'<span class="lp-badge stall">Stalled</span>':'<span class="lp-badge deload">Deload</span>';
      const wtxt=x.bw?(x.weight>0?'+'+x.weight:'BW'):x.weight+' lb';
      const reason=x.flag==='stall'?`weight stuck at ${wtxt} · ${x.weeks} wks logged`:'5+ loading weeks';
      return `<div class="lp-row"><div class="lp-info"><div class="lp-name">${x.name} ${x.priority?'<span style="color:var(--signal)">★</span>':''}</div><div class="lp-detail">${x.muscle.replace(' ★','')} · ${reason}</div></div><div class="lp-rec">${badge}</div></div>`;
    }).join('');
  }else{
    rows=`<div class="ro-finding" style="border:none"><span class="fi">✅</span><span>No plateaus — everything's moving.${ready.length?' Some lifts are ready for more load (check your Train targets).':''}</span></div>`;
  }
  let note='';
  if(stalled.length||deload.length)
    note=noteBox(`For a stall: hold the weight and drive reps toward the top of the range, and check sleep, protein (180–200g), and recovery. If a lift has had 5 hard loading weeks, take the scheduled deload — don't just pile on weight.`,'warn');

  return `<div class="card"><div class="card-title">Lift plateaus &amp; stalls<span class="ct-tag">★ priority</span></div>${summary}${rows}${note}</div>`;
}

/* ════════════════════════════════════════════════════════════════════
   3) NUTRITION ADHERENCE  (supporting signal — protein first)
   ════════════════════════════════════════════════════════════════════ */
function nutritionAdherence(){
  const days=[];
  for(let w=0;w>=-7;w--){const d=store.nutrition[wKey(w)]||{};Object.values(d).forEach(x=>{if(x)days.push(x);});}
  if(!days.length)return {enough:false};
  const pro=days.map(d=>+d.pro).filter(v=>!isNaN(v));
  const proHit=pro.filter(v=>v>=NTGT.proLo).length;
  const proRate=pro.length?Math.round(proHit/pro.length*100):0;
  const avgPro=pro.length?Math.round(pro.reduce((a,b)=>a+b,0)/pro.length):null;
  const cal=days.map(d=>+d.cal).filter(v=>!isNaN(v)&&v>0);
  const avgCal=cal.length?Math.round(cal.reduce((a,b)=>a+b,0)/cal.length):null;
  const fatOver=days.filter(d=>+d.fat>NTGT.fatHi).length;
  return {enough:true,n:days.length,proRate,avgPro,avgCal,fatOver};
}
function nutritionCard(){
  const a=nutritionAdherence();
  if(!a.enough)
    return emptyCard('Nutrition adherence','protein first','🍽️',`Log your daily macros and I'll track protein hit-rate (target ${NTGT.proLo}–${NTGT.proHi}g) and calorie consistency here.`);

  const proColor=a.proRate>=80?'var(--good)':(a.proRate>=50?'var(--warn)':'var(--bad)');
  const calColor=a.avgCal==null?'var(--ink)':(a.avgCal>=NTGT.calLo&&a.avgCal<=NTGT.calHi?'var(--good)':'var(--warn)');
  const rows=[
    ['Protein hit-rate (≥'+NTGT.proLo+'g)', a.proRate+'%', proColor],
    ['Avg protein', a.avgPro!=null?a.avgPro+'g':'—', a.avgPro!=null&&a.avgPro>=NTGT.proLo?'var(--good)':'var(--warn)'],
    ['Avg calories', a.avgCal!=null?a.avgCal:'—', calColor],
    ['Days over 60g fat', String(a.fatOver), a.fatOver?'var(--warn)':'var(--good)'],
    ['Days logged', String(a.n)],
  ];
  let note='';
  if(a.proRate<80)
    note=noteBox(`Protein is your #1 lever for holding muscle in a cut. Aim for <b>${NTGT.proLo}–${NTGT.proHi}g every day</b> — consistency here matters more than perfect calories.`,'warn');
  return `<div class="card"><div class="card-title">Nutrition adherence<span class="ct-tag">protein first</span></div>${rowsHtml(rows)}${note}</div>`;
}

/* ════════════════════════════════════════════════════════════════════
   4) ACTIVITY & RECOVERY  (steps 8–12k band + Watch workouts)
   ════════════════════════════════════════════════════════════════════ */
function activityCard(){
  const ss=stepsStats(7);
  if(!ss)
    return emptyCard('Activity & recovery','steps 8–12k','⌚️','Import your Apple Watch steps on the Activity tab to track daily movement and catch low-recovery stretches.');
  const workouts=recentActivity(7).reduce((n,d)=>n+((d.workouts||[]).length),0);
  const rows=[
    ['Avg steps (7d)', ss.avg.toLocaleString(), ss.avg>=STEPS.lo?'var(--good)':'var(--warn)'],
    ['Days in 8–12k band', `${ss.inBand}/${ss.n}`],
    ['Days below 8k', String(ss.low), ss.low?'var(--warn)':'var(--good)'],
    ['Watch workouts (7d)', String(workouts)],
  ];
  const note = ss.avg<STEPS.lo
    ? noteBox(`Steps are running low (avg ${ss.avg.toLocaleString()}). Low daily movement can stall fat loss and signal under-recovery — get the dog walks back to 8–12k before trimming calories or adding cardio.`,'warn')
    : noteBox(`✅ Movement's on point — steps in the 8–12k band support the cut and recovery.`,'good');
  return `<div class="card"><div class="card-title">Activity &amp; recovery<span class="ct-tag">last 7 days</span></div>${rowsHtml(rows)}${note}</div>`;
}

/* ── RENDER ─────────────────────────────────────────────────────────── */
export function renderInsights(){
  const el=document.getElementById('insightsBody');
  const dLeft=daysToEnd();
  const countdown=dLeft>0
    ? `<b>${dLeft}</b> day${dLeft===1?'':'s'} to ${PROGRAM.endLabel} · goal ${BGOAL.wLo}–${BGOAL.wHi} lb, hold muscle ${BGOAL.smm}`
    : `${PROGRAM.endLabel} window complete · goal ${BGOAL.wLo}–${BGOAL.wHi} lb`;

  el.innerHTML=`
    <div class="sec-eyebrow">Analysis · updates as you log</div>
    <h2 class="sec-title">Insights</h2>
    <p class="sec-desc">Patterns across all your data, tied to your ${PROGRAM.endLabel} goal. Rules-based — no guessing.</p>
    <div class="readout" style="padding:13px 16px"><div class="ro-finding" style="border:none;padding:2px 0"><span class="fi">🎯</span><span>${countdown}</span></div></div>
    ${trajectoryCard()}
    ${plateauCard()}
    ${activityCard()}
    ${nutritionCard()}`;
}
