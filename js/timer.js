/* ════════════════════════════════════════════════════════════════════
   timer.js — rest timer (circular countdown ring), workout clock, beep.
   The ring drains as time passes and shifts colour (blue → amber → green).
   Tap the ring or "+15" to add time. Self-contained; uses fmtTime.
   ════════════════════════════════════════════════════════════════════ */
import {fmtTime} from './util.js';

/* ── REST TIMER ── */
let tEnd=null,tPaused=0,tRun=false,tRaf=null,tTotal=0;
const RING_C=2*Math.PI*19; // ring radius 19 → circumference ≈ 119.38

function updateRing(rem){
  const fg=document.getElementById('tringFg');if(!fg)return;
  const frac=tTotal>0?Math.max(0,Math.min(1,rem/tTotal)):0;
  fg.style.strokeDashoffset=(RING_C*(1-frac)).toFixed(2);
  fg.classList.toggle('warn',rem>0&&rem<=10000);
  fg.classList.toggle('done',rem<=0&&tTotal>0);
}

export function setTimer(secs){
  tReset();
  tTotal=secs*1000;tPaused=secs*1000;
  const d=document.getElementById('tdisp');d.textContent=fmtTime(tPaused);d.className='tdisp';
  updateRing(tPaused);
}
export function startTimer(){
  if(tRun||tPaused<=0)return;
  tRun=true;tEnd=Date.now()+tPaused;
  const b=document.getElementById('tsbtn');b.textContent='PAUSE';b.className='tbtn pause';
  tRaf=requestAnimationFrame(updT);
}
function updT(){
  if(!tRun)return;
  const rem=tEnd-Date.now();
  const el=document.getElementById('tdisp');
  if(rem<=0){
    el.textContent='0:00';el.className='tdisp done';
    const fg=document.getElementById('tringFg');if(fg){fg.style.strokeDashoffset='0';fg.classList.add('done');fg.classList.remove('warn');} // full green flash
    tRun=false;tEnd=null;tPaused=0;
    const b=document.getElementById('tsbtn');b.textContent='START';b.className='tbtn go';
    if(navigator.vibrate)navigator.vibrate([300,100,300]);playBeep();return;
  }
  el.textContent=fmtTime(rem);el.className='tdisp'+(rem<=10000?' warn':'');
  updateRing(rem);
  tRaf=requestAnimationFrame(updT);
}
export function tToggle(){
  if(tRun){
    tPaused=Math.max(0,tEnd-Date.now());tRun=false;cancelAnimationFrame(tRaf);
    const b=document.getElementById('tsbtn');b.textContent='START';b.className='tbtn go';
    document.getElementById('tdisp').textContent=fmtTime(tPaused);updateRing(tPaused);
  }else startTimer();
}
export function tReset(){
  tRun=false;tEnd=null;tPaused=0;tTotal=0;cancelAnimationFrame(tRaf);
  const d=document.getElementById('tdisp');if(d){d.textContent='0:00';d.className='tdisp';}
  const b=document.getElementById('tsbtn');if(b){b.textContent='START';b.className='tbtn go';}
  updateRing(0);
}
/* add time to a running or paused timer (tap ring / +15 button) */
export function addTime(secs){
  const add=secs*1000;
  if(tRun){tEnd+=add;tTotal+=add;updateRing(tEnd-Date.now());}
  else{
    if(tPaused<=0)tTotal=0;
    tPaused+=add;tTotal+=add;
    const d=document.getElementById('tdisp');if(d){d.textContent=fmtTime(tPaused);d.className='tdisp';}
    updateRing(tPaused);
  }
  if(navigator.vibrate)navigator.vibrate(15);
}

/* ── WORKOUT CLOCK ── */
let wcStart=null,wcPaused=0,wcRun=false,wcRaf=null;
export function toggleWorkoutClock(){if(!wcRun){wcStart=Date.now()-wcPaused;wcRun=true;document.getElementById('startWorkoutBtn').textContent='⏸';wcRaf=requestAnimationFrame(updWC);}else{wcPaused=Date.now()-wcStart;wcRun=false;cancelAnimationFrame(wcRaf);document.getElementById('startWorkoutBtn').textContent='▶';}}
function updWC(){if(!wcRun)return;const e=Date.now()-wcStart;const m=Math.floor(e/60000),s=Math.floor((e%60000)/1000);document.getElementById('workoutClock').textContent=`${m}:${String(s).padStart(2,'0')}`;wcRaf=requestAnimationFrame(updWC);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&wcRun){cancelAnimationFrame(wcRaf);wcRaf=requestAnimationFrame(updWC);}if(!document.hidden&&tRun){cancelAnimationFrame(tRaf);tRaf=requestAnimationFrame(updT);}});

/* ── AUDIO ── */
let actx=null;
function getCtx(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();return actx;}
function playBeep(){try{const c=getCtx();[{f:880,s:0,d:.12},{f:880,s:.15,d:.12},{f:660,s:.30,d:.25}].forEach(({f,s,d})=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.setValueAtTime(f,c.currentTime+s);g.gain.setValueAtTime(.5,c.currentTime+s);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+s+d);o.start(c.currentTime+s);o.stop(c.currentTime+s+d+.05);});}catch(e){}}
document.addEventListener('touchstart',()=>{try{getCtx();}catch(e){}},{once:true});
