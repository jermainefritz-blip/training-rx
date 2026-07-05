/* ════════════════════════════════════════════════════════════════════
   week.js — date/week helpers. Pure functions, no state.
   All week keys are ISO week strings ("2026-W28"), Thursday-anchored.
   ════════════════════════════════════════════════════════════════════ */

/* ISO week key for the week `offset` weeks from now (0 = current). */
export function wKey(offset){
  const d=new Date();d.setDate(d.getDate()+offset*7);
  const t=new Date(d);t.setHours(0,0,0,0);
  // ISO week: Thursday-anchored
  t.setDate(t.getDate()+3-((t.getDay()+6)%7));
  const week1=new Date(t.getFullYear(),0,4);
  const wn=1+Math.round(((t-week1)/86400000-3+((week1.getDay()+6)%7))/7);
  return `${t.getFullYear()}-W${String(wn).padStart(2,'0')}`;
}

/* Date object for the Monday of the week `offset` weeks from now. */
export function mondayOf(offset){
  const d=new Date();d.setDate(d.getDate()+offset*7);
  const day=d.getDay();
  const mon=new Date(d);mon.setDate(d.getDate()-(day===0?6:day-1));mon.setHours(0,0,0,0);
  return mon;
}

/* "M/D – M/D" range label for a week. */
export function weekDates(offset){
  const mon=mondayOf(offset);const sun=new Date(mon);sun.setDate(mon.getDate()+6);
  const f=dt=>`${dt.getMonth()+1}/${dt.getDate()}`;return `${f(mon)} – ${f(sun)}`;
}

/* "Monday, July 6" style label for a given day-of-week within a week. */
export function dayDateLabel(offset,dowIdx){
  const mon=mondayOf(offset);const d=new Date(mon);d.setDate(mon.getDate()+dowIdx);
  return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}
