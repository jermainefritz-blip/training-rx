/* ════════════════════════════════════════════════════════════════════
   util.js — tiny shared helpers with no state and no dependencies.
   ════════════════════════════════════════════════════════════════════ */

/* Escape user-entered text before putting it into innerHTML. */
export function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Format a duration in seconds as e.g. "1m 30s" / "45s" (used on rest tags). */
export function fmtSec(s){const m=Math.floor(s/60),r=s%60;return m>0?(r>0?`${m}m ${r}s`:`${m}m`):`${s}s`;}

/* Format milliseconds remaining as a clock "M:SS" (used by the rest timer). */
export function fmtTime(ms){const t=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;}
