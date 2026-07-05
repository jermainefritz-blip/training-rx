/* ════════════════════════════════════════════════════════════════════
   ui-dashboard.js — the Dashboard tab: Nutrition, Body, and Summary
   sub-panels, plus the macro donut, sparklines, and weekly findings.
   ════════════════════════════════════════════════════════════════════ */
import {DAYS, NTGT, BGOAL, DOW, SUBS, STEPS} from './data.js';
import {state} from './state.js';
import {store} from './storage.js';
import {wKey, weekDates, dayDateLabel} from './week.js';
import {liftWeek, workWeight, recommend} from './progression.js';
import {nutSet, nutDel, nutWeek} from './nutrition.js';
import {bodySorted, bodyLatest, bodyAdd, bodyDel} from './body.js';
import {customList, isSkipped, customLiftWeek} from './custom.js';
import {stepsStats} from './activity.js';
import {renderActivity} from './ui-activity.js';
import {escapeHtml, flagRange, flagMax} from './util.js';

/* ── BUILD STATIC DASHBOARD PANEL ───────────────────────────────────── */
export function buildDashPanel(){
  const panelsEl=document.getElementById('panels');
  const dashPanel=document.createElement('div');
  dashPanel.className='panel'+(state.activeTab==='dash'?' active':'');
  dashPanel.id='panel-dash';
  let dsub='<div class="subtabs" role="tablist">';
  SUBS.forEach((s,i)=>{dsub+=`<button class="subtab${s.id===state.activeSub?' active':''}" id="dsub-${s.id}" onclick="switchSub('${s.id}')">${s.label}</button>`;});
  dsub+='</div>';
  dashPanel.innerHTML=dsub+SUBS.map(s=>`<div class="subpanel${state.activeSub===s.id?' active':''}" id="sub-${s.id}"></div>`).join('');
  panelsEl.appendChild(dashPanel);
}

/* ── DASHBOARD ROUTER ───────────────────────────────────────────────── */
export function renderDash(){
  if(state.activeSub==='nutrition')renderNutrition();
  else if(state.activeSub==='body')renderBody();
  else if(state.activeSub==='activity')renderActivity();
  else renderSummary();
}

/* ── NUTRITION TAB ───────────────────────────────────── */
export function renderNutrition(){
  const el=document.getElementById('sub-nutrition');
  const wk=wKey(state.wo);
  const weekData=store.nutrition[wk]||{};
  let daypick='<div class="daypick">';
  DOW.forEach((d,i)=>{
    const logged=weekData[i]?'logged':'';
    daypick+=`<button class="dpb ${i===state.nutDay?'active':''} ${logged}" onclick="pickNutDay(${i})"><div class="dpd">${d}</div></button>`;
  });
  daypick+='</div>';

  const cur=weekData[state.nutDay]||{};
  const f=(cur.fat!=null)?flagMax(+cur.fat,NTGT.fatHi):'';
  const c=(cur.carb!=null)?flagRange(+cur.carb,NTGT.carbLo,NTGT.carbHi):'';
  const p=(cur.pro!=null)?flagRange(+cur.pro,NTGT.proLo,NTGT.proHi):'';
  const ca=(cur.cal!=null)?flagRange(+cur.cal,NTGT.calLo,NTGT.calHi):'';

  const entry=`
    <div class="sec-eyebrow">Daily log · ${state.wo===0?'this week':weekDates(state.wo)}</div>
    <h2 class="sec-title">Nutrition</h2>
    <p class="sec-desc">Enter your daily totals. Calories are entered manually. Averages update automatically.</p>
    ${daypick}
    <div class="nut-entry">
      <h4>${DOW[state.nutDay]}</h4>
      <div class="nh-date">${dayDateLabel(state.wo,state.nutDay)}</div>
      <div class="macro-grid">
        <div class="macro-field">
          <label>Protein <span class="tgt">· 180–200g</span></label>
          <div class="mi-wrap"><input class="mi ${p?'f-'+p:''}" type="number" inputmode="numeric" id="nf-pro" value="${cur.pro??''}" placeholder="0" oninput="liveCal()"><span class="mi-unit">g</span></div>
        </div>
        <div class="macro-field">
          <label>Carbs <span class="tgt">· 100–130g</span></label>
          <div class="mi-wrap"><input class="mi ${c?'f-'+c:''}" type="number" inputmode="numeric" id="nf-carb" value="${cur.carb??''}" placeholder="0" oninput="liveCal()"><span class="mi-unit">g</span></div>
        </div>
        <div class="macro-field">
          <label>Fat <span class="tgt">· under 60g</span></label>
          <div class="mi-wrap"><input class="mi ${f?'f-'+f:''}" type="number" inputmode="numeric" id="nf-fat" value="${cur.fat??''}" placeholder="0" oninput="liveCal()"><span class="mi-unit">g</span></div>
        </div>
        <div class="macro-field">
          <label>Calories <span class="tgt">· 1,800–1,900</span></label>
          <div class="mi-wrap"><input class="mi ${ca?'f-'+ca:''}" type="number" inputmode="numeric" id="nf-cal" value="${cur.cal??''}" placeholder="0"><span class="mi-unit">kcal</span></div>
        </div>
      </div>
      <div class="calc-cal"><span>From macros (4·4·9)</span><b id="calcCal">—</b></div>
      <div class="nut-actions">
        <button class="nbtn save" onclick="saveNut()">Save ${DOW[state.nutDay]}</button>
        <button class="nbtn clear" onclick="clearNut()" aria-label="Clear this day">🗑</button>
      </div>
      <div class="nut-cfm" id="nutCfm">Saved.</div>
    </div>`;

  // weekly averages block
  const nw=nutWeek(state.wo);
  let avg='';
  if(nw){
    const a=nw.avg;
    const rows=[
      {n:'Calories',v:Math.round(a.cal),t:'1,800–1,900',fl:flagRange(a.cal,NTGT.calLo,NTGT.calHi),unit:''},
      {n:'Protein',v:Math.round(a.pro)+'g',t:'180–200g',fl:flagRange(a.pro,NTGT.proLo,NTGT.proHi),unit:''},
      {n:'Carbs',v:Math.round(a.carb)+'g',t:'100–130g',fl:flagRange(a.carb,NTGT.carbLo,NTGT.carbHi),unit:''},
      {n:'Fat',v:Math.round(a.fat)+'g',t:'under 60g',fl:flagMax(a.fat,NTGT.fatHi),unit:''},
    ];
    avg=`<div class="card">
      <div class="card-title">Week averages<span class="ct-tag">${nw.n} of 7 days logged</span></div>
      ${rows.map(r=>`<div class="avgrow"><div class="an">${r.n}</div><div class="av mv ${r.fl}" style="font-size:17px">${r.v}</div><div class="at">${r.t}</div><div class="ad"><span class="dot ${r.fl}"></span></div></div>`).join('')}
    </div>`;
  }else{
    avg=`<div class="card"><div class="empty"><div class="ee">🍽️</div>No nutrition logged this week yet.<br>Pick a day above and enter your totals.</div></div>`;
  }
  el.innerHTML=entry+avg;
  liveCal();
}
export function pickNutDay(i){state.nutDay=i;renderNutrition();}
export function liveCal(){
  const p=+document.getElementById('nf-pro')?.value||0;
  const c=+document.getElementById('nf-carb')?.value||0;
  const f=+document.getElementById('nf-fat')?.value||0;
  const el=document.getElementById('calcCal');
  if(!el)return;
  const k=p*4+c*4+f*9;
  el.textContent=k>0?`${k} kcal`:'—';
}
export function saveNut(){
  const pro=document.getElementById('nf-pro').value;
  const carb=document.getElementById('nf-carb').value;
  const fat=document.getElementById('nf-fat').value;
  const cal=document.getElementById('nf-cal').value;
  if(pro===''&&carb===''&&fat===''&&cal===''){nutDel(state.wo,state.nutDay);renderNutrition();return;}
  nutSet(state.wo,state.nutDay,{pro:pro===''?null:+pro,carb:carb===''?null:+carb,fat:fat===''?null:+fat,cal:cal===''?null:+cal});
  const cf=document.getElementById('nutCfm');cf.classList.add('show');setTimeout(()=>cf.classList.remove('show'),1600);
  renderNutrition();
}
export function clearNut(){nutDel(state.wo,state.nutDay);renderNutrition();}

/* ── BODY COMP TAB ───────────────────────────────────── */
export function renderBody(){
  const el=document.getElementById('sub-body');
  const latest=bodyLatest();
  const sorted=bodySorted();

  // metric cards vs goals
  let metrics='';
  if(latest){
    const wFlag=latest.w!=null?(latest.w>=BGOAL.wLo&&latest.w<=BGOAL.wHi?'good':(latest.w>BGOAL.wHi?'signal':'warn')):'none';
    const wPct=latest.w!=null?Math.max(0,Math.min(100,Math.round((BGOAL.wStart-latest.w)/(BGOAL.wStart-((BGOAL.wLo+BGOAL.wHi)/2))*100))):0;
    const smmHold=latest.smm!=null?(latest.smm>=BGOAL.smm-0.5?'good':(latest.smm>=BGOAL.smm-1.5?'warn':'bad')):'none';
    metrics=`
    <div class="metric-grid">
      <div class="metric">
        <div class="ml">Weight <span class="dot ${wFlag==='signal'?'warn':wFlag}"></span></div>
        <div class="mv">${latest.w??'—'}<small> lb</small></div>
        <div class="mtgt">Goal ${BGOAL.wLo}–${BGOAL.wHi} · from ${BGOAL.wStart}</div>
        <div class="bar"><i class="signal" style="width:${wPct}%"></i></div>
      </div>
      <div class="metric">
        <div class="ml">Body fat</div>
        <div class="mv">${latest.bf??'—'}<small> %</small></div>
        <div class="mtgt">Trend down · definition</div>
      </div>
      <div class="metric">
        <div class="ml">Skeletal muscle <span class="dot ${smmHold}"></span></div>
        <div class="mv ${smmHold==='bad'?'bad':''}">${latest.smm??'—'}<small> lb</small></div>
        <div class="mtgt">Hold ${BGOAL.smm} (baseline)</div>
      </div>
      <div class="metric">
        <div class="ml">ECW ratio</div>
        <div class="mv">${latest.ecw??'—'}</div>
        <div class="mtgt">Stable · recovery marker</div>
      </div>
    </div>`;
  }

  // sparklines
  let sparks='';
  if(sorted.length>=1){
    sparks =spark('Weight',sorted.map(r=>r.w),'lb',{goalLo:BGOAL.wLo,goalHi:BGOAL.wHi,invert:true});
    sparks+=spark('Body fat %',sorted.map(r=>r.bf),'%',{invert:true});
    sparks+=spark('Skeletal muscle',sorted.map(r=>r.smm),'lb',{ref:BGOAL.smm});
    sparks+=spark('ECW ratio',sorted.map(r=>r.ecw),'',{});
  }

  // history list
  let list='';
  if(sorted.length){
    list=`<div class="card"><div class="card-title">All readings<span class="ct-tag">every 2 weeks</span></div><div class="bc-readings">`;
    [...sorted].reverse().forEach((r,ri)=>{
      const realIdx=sorted.length-1-ri;
      const dt=new Date(r.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
      list+=`<div class="bc-reading">
        <div class="brd">${dt}</div>
        <div class="brvals">
          <span class="brv"><b>${r.w??'—'}</b>lb</span>
          <span class="brv"><b>${r.bf??'—'}</b>%</span>
          <span class="brv"><b>${r.smm??'—'}</b>SMM</span>
          <span class="brv"><b>${r.ecw??'—'}</b>ECW</span>
        </div>
        <button class="bc-del" onclick="delBody(${realIdx})" aria-label="Delete reading">✕</button>
      </div>`;
    });
    list+='</div></div>';
  }else{
    list=`<div class="card"><div class="empty"><div class="ee">📏</div>No measurements yet.<br>Add your first InBody reading to start tracking.</div></div>`;
  }

  const today=new Date().toISOString().slice(0,10);
  const form=`
    <button class="bc-entry-toggle" onclick="toggleBcForm()">${state.bcFormOpen?'✕ Cancel':'+ Add measurement'}</button>
    <div class="bc-form ${state.bcFormOpen?'open':''}" id="bcForm">
      <h4>New reading</h4>
      <div class="bc-date-field"><label>Date</label><input type="date" id="bc-date" value="${today}"></div>
      <div class="bc-fields">
        <div class="bc-field"><label>Weight</label><div class="mi-wrap"><input type="number" inputmode="decimal" id="bc-w" placeholder="0"><span class="mi-unit">lb</span></div></div>
        <div class="bc-field"><label>Body fat</label><div class="mi-wrap"><input type="number" inputmode="decimal" id="bc-bf" placeholder="0"><span class="mi-unit">%</span></div></div>
        <div class="bc-field"><label>Skeletal muscle</label><div class="mi-wrap"><input type="number" inputmode="decimal" id="bc-smm" placeholder="0"><span class="mi-unit">lb</span></div></div>
        <div class="bc-field"><label>ECW ratio</label><div class="mi-wrap"><input type="number" inputmode="decimal" id="bc-ecw" placeholder="0.000"><span class="mi-unit"></span></div></div>
      </div>
      <div class="nut-actions"><button class="nbtn save" onclick="saveBody()">Save reading</button></div>
    </div>`;

  el.innerHTML=`
    <div class="sec-eyebrow">Body composition · InBody</div>
    <h2 class="sec-title">Body</h2>
    <p class="sec-desc">Measured every 2 weeks. Goal lines: weight ${BGOAL.wLo}–${BGOAL.wHi} lb, hold muscle at ${BGOAL.smm} lb.</p>
    ${metrics}${form}${sparks}${list}`;
}
export function toggleBcForm(){state.bcFormOpen=!state.bcFormOpen;renderBody();}
export function saveBody(){
  const date=document.getElementById('bc-date').value;
  if(!date){alert('Pick a date.');return;}
  const num=id=>{const v=document.getElementById(id).value;return v===''?null:+v;};
  const rec={date,w:num('bc-w'),bf:num('bc-bf'),smm:num('bc-smm'),ecw:num('bc-ecw')};
  if(rec.w==null&&rec.bf==null&&rec.smm==null&&rec.ecw==null){alert('Enter at least one value.');return;}
  // replace if same date exists
  store.body=store.body.filter(r=>r.date!==date);
  const ok=bodyAdd(rec);
  state.bcFormOpen=false;renderBody();
  if(!ok){
    alert('⚠️ This browser blocked saving. Your reading is showing but was NOT written to disk and will be lost on refresh.\n\nTap "Copy backup now" in the red banner, or use the ⋯ menu to copy a save code immediately.');
  }
}
export function delBody(idx){if(confirm('Delete this reading?')){bodyDel(idx);renderBody();}}

/* tiny sparkline generator with optional goal band / reference line */
function spark(label,vals,unit,opts){
  opts=opts||{};
  const pts=vals.map((v,i)=>({v,i})).filter(p=>p.v!=null);
  if(pts.length===0)return '';
  const w=520,h=64,pad=6;
  let lo=Math.min(...pts.map(p=>p.v)),hi=Math.max(...pts.map(p=>p.v));
  if(opts.goalLo!=null){lo=Math.min(lo,opts.goalLo);hi=Math.max(hi,opts.goalHi);}
  if(opts.ref!=null){lo=Math.min(lo,opts.ref);hi=Math.max(hi,opts.ref);}
  if(hi===lo){hi+=1;lo-=1;}
  const span=hi-lo;
  const X=i=>pts.length<=1?w/2:pad+(i/(pts.length-1))*(w-2*pad);
  const Y=v=>pad+(1-(v-lo)/span)*(h-2*pad);
  let band='';
  if(opts.goalLo!=null){
    const y1=Y(opts.goalHi),y2=Y(opts.goalLo);
    band=`<rect x="0" y="${y1}" width="${w}" height="${Math.max(2,y2-y1)}" fill="var(--signal)" opacity="0.10"/>`;
  }
  let ref='';
  if(opts.ref!=null){const y=Y(opts.ref);ref=`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="var(--good)" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>`;}
  const line=pts.map((p,k)=>`${k?'L':'M'}${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const dots=pts.map(p=>`<circle cx="${X(p.i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3" fill="var(--signal)"/>`).join('');
  const cur=pts[pts.length-1].v;
  let goalTxt='';
  if(opts.goalLo!=null)goalTxt=`Goal ${opts.goalLo}–${opts.goalHi}`;
  else if(opts.ref!=null)goalTxt=`Hold ${opts.ref}`;
  return `<div class="spark-card">
    <div class="spark-head">
      <div><div class="spark-label">${label}</div></div>
      <div style="text-align:right"><div class="spark-now">${cur}<small> ${unit}</small></div>${goalTxt?`<div class="spark-goal">${goalTxt}</div>`:''}</div>
    </div>
    <svg class="spark-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      ${band}${ref}
      <path d="${line}" fill="none" stroke="var(--signal)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   SUMMARY (the brain) — auto-updates from nutrition + lifts + body.
   ════════════════════════════════════════════════════════════════════ */
export function renderSummary(){
  const el=document.getElementById('sub-summary');
  const nw=nutWeek(state.wo);
  const findings=buildFindings(nw);

  // ── findings readout ──
  let readout=`<div class="readout">
    <div class="ro-top"><div class="ro-title">Weekly readout</div><div class="ro-week">${weekDates(state.wo)}</div></div>
    ${findings.map(f=>`<div class="ro-finding"><span class="fi">${f.icon}</span><span>${f.text}</span></div>`).join('')}
  </div>`;

  // ── nutrition snapshot ──
  let nutCard;
  if(nw){
    const a=nw.avg;
    const items=[
      {n:'Calories',v:Math.round(a.cal),fl:flagRange(a.cal,NTGT.calLo,NTGT.calHi),max:2200,goalLo:NTGT.calLo,goalHi:NTGT.calHi},
      {n:'Protein',v:Math.round(a.pro)+'g',fl:flagRange(a.pro,NTGT.proLo,NTGT.proHi),max:220,raw:a.pro,goalLo:NTGT.proLo,goalHi:NTGT.proHi},
      {n:'Carbs',v:Math.round(a.carb)+'g',fl:flagRange(a.carb,NTGT.carbLo,NTGT.carbHi),max:160,raw:a.carb,goalLo:NTGT.carbLo,goalHi:NTGT.carbHi},
      {n:'Fat',v:Math.round(a.fat)+'g',fl:flagMax(a.fat,NTGT.fatHi),max:80,raw:a.fat,goalHi:NTGT.fatHi},
    ];
    nutCard=`<div class="card">
      <div class="card-title">Nutrition · week average<span class="ct-tag">${nw.n}/7 days</span></div>
      ${macroDonut(a.pro,a.carb,a.fat)}
      ${items.map(it=>{
        const raw=it.raw!=null?it.raw:(typeof it.v==='number'?it.v:parseFloat(it.v));
        const pct=Math.max(3,Math.min(100,Math.round(raw/it.max*100)));
        return `<div class="avgrow"><div class="an">${it.n}</div><div class="av mv ${it.fl}">${it.v}</div><div class="ad"><span class="dot ${it.fl}"></span></div></div>
        <div class="bar" style="margin:-2px 0 4px"><i class="${it.fl}" style="width:${pct}%"></i></div>`;
      }).join('')}
    </div>`;
  }else{
    nutCard=`<div class="card"><div class="card-title">Nutrition · week average</div><div class="empty" style="padding:14px"><div class="ee">🍽️</div>No food logged this week yet.</div></div>`;
  }

  // ── lift progression ──
  let liftRows='';let anyLift=false;
  DAYS.forEach((day,di)=>{
    day.exercises.forEach((ex,ei)=>{
      if(isSkipped(state.wo,day.id,ei))return;
      const sets=liftWeek(day.id,ei,state.wo);
      if(!sets.length)return;
      anyLift=true;
      const rec=recommend(ex,day.id,ei,state.wo);
      const repsStr=sets.map(s=>s.reps).join(',');
      const wstr=ex.bw?(workWeight(day.id,ei,state.wo)>0?`+${workWeight(day.id,ei,state.wo)}`:'BW'):`${workWeight(day.id,ei,state.wo)} lb`;
      let badge='',next='';
      if(rec.status==='up'){
        badge='<span class="lp-badge up">Add load</span>';
        next=ex.bw?`<div class="lp-next">Next: ${ex.topRep+1}+ reps →</div>`:`<div class="lp-next">Next: ${rec.nextWeight} lb →</div>`;
      }else if(rec.status==='deload'){
        badge='<span class="lp-badge deload">Deload</span>';
        next=`<div class="lp-next">5+ loading weeks</div>`;
      }else{
        badge='<span class="lp-badge hold">Hold</span>';
      }
      liftRows+=`<div class="lp-row">
        <div class="lp-info">
          <div class="lp-name">${ex.name} ${ex.muscle.includes('★')?'<span style="color:var(--signal)">★</span>':''}</div>
          <div class="lp-detail">${wstr} · reps ${repsStr} · ${rec.note}</div>
        </div>
        <div class="lp-rec">${badge}${next}</div>
      </div>`;
    });
    // custom lifts
    customList(state.wo,day.id).forEach(cx=>{
      const sets=customLiftWeek(day.id,cx.id,state.wo);
      if(!sets.length)return;
      anyLift=true;
      const w=Math.max(...sets.map(s=>s.lbs));
      const repsStr=sets.map(s=>s.reps).join(',');
      const atTop=sets.length>=Math.max(2,cx.sets-1)&&sets.every(s=>s.reps>=cx.topRep);
      let badge,note;
      if(atTop){badge='<span class="lp-badge up">Add load</span>';note=`At top — next ${Math.round((w+(cx.inc||2.5))*2)/2} lb`;}
      else{badge='<span class="lp-badge hold">Hold</span>';note='Building within range';}
      liftRows+=`<div class="lp-row">
        <div class="lp-info">
          <div class="lp-name">${escapeHtml(cx.name)} <span class="cust-pill">custom</span></div>
          <div class="lp-detail">${w>0?w+' lb':'BW'} · reps ${repsStr} · ${note}</div>
        </div>
        <div class="lp-rec">${badge}</div>
      </div>`;
    });
  });
  let liftCard;
  if(anyLift){
    liftCard=`<div class="card">
      <div class="card-title">Lift progression<span class="ct-tag">★ priority muscles</span></div>
      ${liftRows}
      <p class="fineprint" style="margin-top:12px">Earned increases auto-load as next week's target on the Train tab. Log your real sets — targets are placeholders, nothing is written until you check a set.</p>
    </div>`;
  }else{
    liftCard=`<div class="card"><div class="card-title">Lift progression</div><div class="empty" style="padding:14px"><div class="ee">🏋️</div>No sessions logged this week yet.</div></div>`;
  }

  // ── body snapshot (only if data exists) ──
  let bodyCard='';
  const latest=bodyLatest();const sorted=bodySorted();
  if(latest){
    const prev=sorted.length>=2?sorted[sorted.length-2]:null;
    const delta=(k)=>{if(!prev||latest[k]==null||prev[k]==null)return '';const d=latest[k]-prev[k];const s=d>0?'+':'';return ` <small style="color:var(--muted)">(${s}${(Math.round(d*10)/10)})</small>`;};
    bodyCard=`<div class="card">
      <div class="card-title">Body composition<span class="ct-tag">latest reading</span></div>
      <div class="avgrow"><div class="an">Weight</div><div class="av">${latest.w??'—'}<small style="font-size:11px;color:var(--muted)"> lb</small>${delta('w')}</div><div class="at">goal ${BGOAL.wLo}–${BGOAL.wHi}</div></div>
      <div class="avgrow"><div class="an">Body fat</div><div class="av">${latest.bf??'—'}<small style="font-size:11px;color:var(--muted)"> %</small>${delta('bf')}</div><div class="at">trend ↓</div></div>
      <div class="avgrow"><div class="an">Skeletal muscle</div><div class="av">${latest.smm??'—'}<small style="font-size:11px;color:var(--muted)"> lb</small>${delta('smm')}</div><div class="at">hold ${BGOAL.smm}</div></div>
      <div class="avgrow"><div class="an">ECW ratio</div><div class="av">${latest.ecw??'—'}${delta('ecw')}</div><div class="at">stable</div></div>
    </div>`;
  }

  el.innerHTML=`
    <div class="sec-eyebrow">Auto-updating · ${state.wo===0?'live this week':'past week'}</div>
    <h2 class="sec-title">Summary</h2>
    <p class="sec-desc">Pulls from your food, lifts, and measurements. Updates as you log.</p>
    ${readout}${liftCard}${nutCard}${bodyCard}`;
}

/* macro distribution donut — split of calories from protein / carbs / fat */
function macroDonut(proG,carbG,fatG){
  const pCal=proG*4, cCal=carbG*4, fCal=fatG*9;
  const total=pCal+cCal+fCal;
  if(total<=0)return '';
  const segs=[
    {label:'Protein', cal:pCal, g:Math.round(proG), color:'var(--signal)'},
    {label:'Carbs',   cal:cCal, g:Math.round(carbG),color:'var(--good)'},
    {label:'Fat',     cal:fCal, g:Math.round(fatG), color:'var(--warn)'},
  ];
  const R=52, C=2*Math.PI*R, cx=64, cy=64, sw=22;
  let offset=0;
  const rings=segs.map(s=>{
    const frac=s.cal/total;
    const len=frac*C;
    const dash=`${len} ${C-len}`;
    const el=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${s.color}" stroke-width="${sw}"
      stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset+=len;
    return el;
  }).join('');
  const legend=segs.map(s=>{
    const pct=Math.round(s.cal/total*100);
    return `<div class="dleg-row"><span class="dleg-dot" style="background:${s.color}"></span><span class="dleg-name">${s.label}</span><span class="dleg-pct">${pct}%</span><span class="dleg-g">${s.g}g</span></div>`;
  }).join('');
  return `<div class="donut-wrap">
    <svg class="donut" viewBox="0 0 128 128" width="118" height="118" role="img" aria-label="Macro calorie distribution">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--line2)" stroke-width="${sw}"/>
      ${rings}
      <text x="64" y="60" text-anchor="middle" class="donut-cap">${Math.round(total)}</text>
      <text x="64" y="76" text-anchor="middle" class="donut-sub">kcal/day</text>
    </svg>
    <div class="dleg">${legend}</div>
  </div>`;
}

/* short, plain-language findings (no essays) */
export function buildFindings(nw){
  const out=[];
  // protein first (top priority)
  if(nw){
    const a=nw.avg;
    if(a.pro>=NTGT.proLo&&a.pro<=NTGT.proHi)out.push({icon:'✅',text:`Protein on track — avg <b>${Math.round(a.pro)}g</b>.`});
    else if(a.pro<NTGT.proLo)out.push({icon:'⚠️',text:`Protein low — avg <b>${Math.round(a.pro)}g</b>, target 180–200.`});
    else out.push({icon:'•',text:`Protein high — avg <b>${Math.round(a.pro)}g</b>, fine if calories hold.`});

    if(a.cal>=NTGT.calLo&&a.cal<=NTGT.calHi)out.push({icon:'✅',text:`Calories in range — avg <b>${Math.round(a.cal)}</b>.`});
    else if(a.cal>NTGT.calHi)out.push({icon:'⚠️',text:`Calories over — avg <b>${Math.round(a.cal)}</b>, target ≤1,900.`});
    else out.push({icon:'•',text:`Calories under — avg <b>${Math.round(a.cal)}</b>; ok if energy holds.`});

    if(a.fat>NTGT.fatHi)out.push({icon:'⚠️',text:`Fat above 60g — avg <b>${Math.round(a.fat)}g</b>.`});
    if(a.carb>NTGT.carbHi)out.push({icon:'•',text:`Carbs above band — avg <b>${Math.round(a.carb)}g</b>.`});
    else if(a.carb<NTGT.carbLo&&nw.n>=3)out.push({icon:'•',text:`Carbs below band — avg <b>${Math.round(a.carb)}g</b>.`});

    if(nw.n<4)out.push({icon:'ℹ️',text:`Only <b>${nw.n}</b> day${nw.n>1?'s':''} logged — averages will firm up.`});
  }else{
    out.push({icon:'🍽️',text:'No food logged this week yet.'});
  }
  // lifts: count progressions earned
  let ups=0,deloads=0,logged=0;
  DAYS.forEach((day,di)=>{
    day.exercises.forEach((ex,ei)=>{
      if(isSkipped(state.wo,day.id,ei))return;
      if(!liftWeek(day.id,ei,state.wo).length)return;logged++;
      const r=recommend(ex,day.id,ei,state.wo);if(r.status==='up')ups++;if(r.status==='deload')deloads++;
    });
    customList(state.wo,day.id).forEach(cx=>{
      const sets=customLiftWeek(day.id,cx.id,state.wo);if(!sets.length)return;logged++;
      const atTop=sets.length>=Math.max(2,cx.sets-1)&&sets.every(s=>s.reps>=cx.topRep);if(atTop)ups++;
    });
  });
  if(logged){
    if(ups)out.push({icon:'📈',text:`<b>${ups}</b> lift${ups>1?'s':''} earned a load increase next week.`});
    else out.push({icon:'•',text:`Lifts logged — holding weights, building reps.`});
    if(deloads)out.push({icon:'⚠️',text:`<b>${deloads}</b> lift${deloads>1?'s':''} hit 5+ loading weeks — deload soon.`});
  }
  // body
  const latest=bodyLatest();const sorted=bodySorted();
  if(latest&&sorted.length>=2){
    const prev=sorted[sorted.length-2];
    if(latest.w!=null&&prev.w!=null){
      const d=Math.round((latest.w-prev.w)*10)/10;
      const held=latest.smm!=null&&prev.smm!=null&&latest.smm>=prev.smm-0.5;
      if(d<0)out.push({icon:'✅',text:`Weight down <b>${Math.abs(d)} lb</b>${held?' — muscle held.':'.'}`});
      else if(d>0)out.push({icon:'•',text:`Weight up <b>${d} lb</b> since last reading.`});
      else out.push({icon:'•',text:`Weight flat since last reading.`});
    }
  }else if(latest){
    out.push({icon:'📏',text:`First body reading logged — baseline set.`});
  }
  // activity / steps (rolling 7 days)
  const ss=stepsStats(7);
  if(ss){
    if(ss.avg>=STEPS.lo)out.push({icon:'👟',text:`Steps on track — avg <b>${ss.avg.toLocaleString()}</b>/day.`});
    else out.push({icon:'⚠️',text:`Steps low — avg <b>${ss.avg.toLocaleString()}</b>/day; aim 8–12k for recovery.`});
  }
  return out;
}
