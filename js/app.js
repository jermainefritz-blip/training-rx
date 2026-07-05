/* ════════════════════════════════════════════════════════════════════
   app.js — bootstrap. Wires everything together and starts the app.

   Because the app's HTML uses inline onclick="fnName(...)" handlers (kept
   from v8 for a zero-risk port), every function referenced from markup must
   be reachable as a global. The "bridge" block below is the single place
   that exposes module functions on window. New inline handlers → add here.
   ════════════════════════════════════════════════════════════════════ */
import {state} from './state.js';
import {flags, storageAvailable, loadAll, showSaveWarning} from './storage.js';
import {
  buildWorkoutPanel, mark, markCustom, deleteCustom,
  openAddForm, saveCustomEx, unskip, toggleHist,
  stepVal, repeatLastWeek
} from './ui-workout.js';
import {PROGRAM} from './data.js';
import {
  buildDashPanel, pickNutDay, liveCal, saveNut, clearNut,
  toggleBcForm, saveBody, delBody
} from './ui-dashboard.js';
import {buildInsightsPanel} from './ui-insights.js';
import {importActivity, saveManualActivity, delActivity, toggleActHelp} from './ui-activity.js';
import {buildTabs, switchTab, switchDay, switchSub, changeWeek, renderAll} from './ui-core.js';
import {openModal, closeModal, closeOuter, copySummary, copySaveCode, restoreData, clearData} from './ui-export.js';
import {setTimer, tToggle, tReset, toggleWorkoutClock, addTime} from './timer.js';

/* ── bridge inline-HTML onclick handlers → module functions ─────────── */
Object.assign(window, {
  // header + timer
  toggleWorkoutClock, tToggle, tReset, setTimer, addTime,
  // faster logging
  stepVal, repeatLastWeek,
  // navigation
  changeWeek, switchTab, switchDay, switchSub,
  // data & backup modal
  openModal, closeModal, closeOuter, copySummary, copySaveCode, restoreData, clearData,
  // workout tab
  toggleHist, mark, markCustom, deleteCustom, openAddForm, saveCustomEx, unskip,
  // dashboard tab
  pickNutDay, liveCal, saveNut, clearNut, toggleBcForm, saveBody, delBody,
  // activity tab
  importActivity, saveManualActivity, delActivity, toggleActHelp
});

/* ── boot ───────────────────────────────────────────────────────────── */
async function boot(){
  flags.storageOK=storageAvailable();
  // live header countdown to the program end date
  const dTo=Math.ceil((new Date(PROGRAM.end+'T23:59:59')-new Date())/86400000);
  const tag=document.getElementById('tagline');
  if(tag)tag.textContent=dTo>0?`Summer Cut · ${dTo} days to ${PROGRAM.endLabel}`:`Summer Cut · ${PROGRAM.endLabel}`;
  // build the (empty) shell first so the UI paints immediately
  buildTabs();
  buildWorkoutPanel();
  buildDashPanel();
  buildInsightsPanel();
  document.getElementById('tbar').classList.toggle('hide',state.activeTab!=='workout');
  // load saved data from IndexedDB / localStorage (async), then render
  await loadAll();
  renderAll();
  /* Warn only if BOTH durable stores are unavailable — otherwise data is safe. */
  if(!flags.storageOK && !flags.idbOK){showSaveWarning();}
}
boot();

/* ── register the service worker (offline + instant load / installable) ── */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{}); // silent if unsupported
  });
}
