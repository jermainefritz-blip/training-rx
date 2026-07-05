/* ════════════════════════════════════════════════════════════════════
   storage.js — the store object + persistence.

   STEP 2: durable storage.
   - PRIMARY: IndexedDB (survives better on iOS, larger quota).
   - MIRROR:  localStorage (synchronous, lets us verify a write instantly
              and gives an immediate save/fail signal — kept from v8).
   - MIGRATION: on first load, if legacy localStorage data exists but
     IndexedDB is empty, we copy it into IndexedDB. No data is lost.
   - Save-code format stays "TRXV6:" for full back-compat.

   Every write goes to BOTH stores. Data is considered safe if EITHER
   commits, so a single blocked store never means lost data.
   ════════════════════════════════════════════════════════════════════ */

const LS_KEY='trx_v6';           // legacy + mirror key
const LS_BACKUP='trx_lastBackup';// timestamp of last save-code export
const DB_NAME='trainingRx', DB_STORE='kv', DB_KEY='store';

/* The one source of truth. Mutated in place (never reassigned) so every
   module that imports it keeps seeing the same live object. */
export const store={lifts:{},nutrition:{},body:[],applied:{},custom:{},skipped:{},activity:{}};

/* Runtime flags other modules read (Data modal, boot warning). */
export const flags={storageOK:true, lastSaveFailed:false, idbOK:false, migrated:false};

/* ── IndexedDB — tiny promise wrapper, no library ─────────────────────── */
let _dbPromise=null;
function idbOpen(){
  if(_dbPromise)return _dbPromise;
  _dbPromise=new Promise((res,rej)=>{
    if(!('indexedDB' in window)||!window.indexedDB)return rej(new Error('no-idb'));
    let req;
    try{req=indexedDB.open(DB_NAME,1);}catch(e){return rej(e);}
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE);};
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>rej(req.error);
  });
  _dbPromise.catch(()=>{_dbPromise=null;}); // allow retry after failure
  return _dbPromise;
}
function idbGet(key){
  return idbOpen().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(DB_STORE,'readonly');
    const r=tx.objectStore(DB_STORE).get(key);
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error);
  }));
}
function idbSet(key,val){
  return idbOpen().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(DB_STORE,'readwrite');
    tx.objectStore(DB_STORE).put(val,key);
    tx.oncomplete=()=>res(true);
    tx.onerror=()=>rej(tx.error);
    tx.onabort=()=>rej(tx.error);
  }));
}

/* Probe whether localStorage actually works (some iOS/private modes throw). */
export function storageAvailable(){
  try{
    const k='__trx_probe__';
    localStorage.setItem(k,'1');
    const ok=localStorage.getItem(k)==='1';
    localStorage.removeItem(k);
    return ok;
  }catch(e){return false;}
}

/* Write the store to BOTH stores and verify it committed.
   Returns true if the synchronous localStorage write succeeded (kept for
   callers that expect an immediate boolean). The IndexedDB mirror runs
   async and can clear the warning banner even if localStorage was blocked. */
export function persist(){
  const payload=JSON.stringify(store);
  let lsOK=false;
  try{
    localStorage.setItem(LS_KEY,payload);
    lsOK=localStorage.getItem(LS_KEY)===payload; // verify round-trip
  }catch(e){lsOK=false;}

  // durable mirror to IndexedDB (best-effort, async)
  idbSet(DB_KEY,store).then(()=>{
    flags.idbOK=true;
    if(!lsOK){flags.lastSaveFailed=false;hideSaveWarning();} // safe via IDB
  }).catch(()=>{
    flags.idbOK=false;
    if(!lsOK){flags.lastSaveFailed=true;showSaveWarning();}  // both failed
  });

  if(lsOK){flags.lastSaveFailed=false;hideSaveWarning();return true;}
  flags.lastSaveFailed=true;showSaveWarning();return false;
}

/* Replace the entire store contents in place (used by load/restore/clear).
   Keeps the store object identity so imported references stay valid. */
export function replaceStore(p){
  p=p||{};
  store.lifts=p.lifts||{};
  store.nutrition=p.nutrition||{};
  store.body=p.body||[];
  store.applied=p.applied||{};
  store.custom=p.custom||{};
  store.skipped=p.skipped||{};
  store.activity=p.activity||{};
}

/* Load saved data at boot. Prefers IndexedDB, falls back to legacy
   localStorage, and migrates localStorage → IndexedDB when needed. */
export async function loadAll(){
  let fromIdb=null;
  try{
    await idbOpen();            // resolving means IndexedDB is usable
    flags.idbOK=true;
    fromIdb=await idbGet(DB_KEY);
  }catch(e){flags.idbOK=false;}

  let fromLs=null;
  try{const r=localStorage.getItem(LS_KEY);if(r)fromLs=JSON.parse(r);}catch(e){}

  const data=fromIdb||fromLs||null;
  if(data)replaceStore(data);

  // one-time migration: legacy data in localStorage but nothing in IDB yet
  if(!fromIdb&&fromLs&&flags.idbOK){
    try{await idbSet(DB_KEY,store);flags.migrated=true;}catch(e){}
  }
  // if we loaded from IDB, refresh the localStorage mirror so both agree
  if(fromIdb){try{localStorage.setItem(LS_KEY,JSON.stringify(store));}catch(e){}}
}

/* ── Backup-freshness tracking (for the "last backed up N days ago" nudge) ── */
export function setLastBackup(){
  const now=Date.now();
  try{localStorage.setItem(LS_BACKUP,String(now));}catch(e){}
  idbSet('lastBackup',now).catch(()=>{});
}
export function getLastBackup(){
  try{const v=localStorage.getItem(LS_BACKUP);return v?+v:null;}catch(e){return null;}
}
/* whole days since last backup, or null if never */
export function daysSinceBackup(){
  const t=getLastBackup();if(!t)return null;
  return Math.floor((Date.now()-t)/86400000);
}

/* Save-failure UI — a fixed banner that tells the user their data didn't
   persist and prompts an immediate save-code backup. */
export function showSaveWarning(){
  let b=document.getElementById('saveWarn');
  if(!b){
    b=document.createElement('div');
    b.id='saveWarn';b.className='save-warn';
    b.innerHTML=`⚠️ This browser blocked saving — your data is only in memory and will be lost on refresh.
      <button onclick="openModal();copySaveCode();">Copy backup now</button>`;
    document.body.appendChild(b);
  }
  b.classList.add('show');
}
export function hideSaveWarning(){const b=document.getElementById('saveWarn');if(b)b.classList.remove('show');}
