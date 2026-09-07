/* ════════════════════════════════════════════════════════════════════
   ui-dashboard.js — the Body tab: body-composition readings, metric
   cards, and sparklines.
   ════════════════════════════════════════════════════════════════════ */
import {state} from './state.js';
import {BGOAL} from './data.js';
import {store} from './storage.js';
import {bodySorted, bodyLatest, bodyAdd, bodyDel} from './body.js';

/* ── BUILD STATIC BODY PANEL ─────────────────────────────────────────── */
export function buildDashPanel(){
  const panelsEl=document.getElementById('panels');
  const dashPanel=document.createElement('div');
  dashPanel.className='panel'+(state.activeTab==='dash'?' active':'');
  dashPanel.id='panel-dash';
  dashPanel.innerHTML='<div id="sub-body"></div>';
  panelsEl.appendChild(dashPanel);
}

export function renderDash(){renderBody();}

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
