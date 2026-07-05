/* ════════════════════════════════════════════════════════════════════
   body.js — body-composition readings.
   store.body = [{date, w, bf, smm, ecw}] (kept sorted ascending on read)
   ════════════════════════════════════════════════════════════════════ */
import {store, persist} from './storage.js';

export function bodySorted(){return [...store.body].sort((a,b)=>a.date.localeCompare(b.date));}
export function bodyLatest(){const s=bodySorted();return s.length?s[s.length-1]:null;}
export function bodyAdd(rec){store.body.push(rec);return persist();}
export function bodyDel(idx){const s=bodySorted();const rec=s[idx];store.body=store.body.filter(r=>r!==rec);persist();}
