/* ════════════════════════════════════════════════════════════════════
   fx.js — tiny visual flourishes. No library.
   confetti(): a short burst of falling colored pieces for session-complete.
   ════════════════════════════════════════════════════════════════════ */
const COLORS=['#4d7cff','#34d17e','#e0a83a','#a78bfa','#f06464'];

export function confetti(count=48){
  const box=document.createElement('div');
  box.className='confetti';
  for(let i=0;i<count;i++){
    const p=document.createElement('i');
    p.style.left=(Math.random()*100)+'%';
    p.style.background=COLORS[i%COLORS.length];
    p.style.animationDelay=(Math.random()*0.25).toFixed(2)+'s';
    // vary horizontal drift + a little size variation
    p.style.setProperty('--dx',((Math.random()*2-1)*140).toFixed(0)+'px');
    p.style.transform=`rotate(${Math.floor(Math.random()*360)}deg)`;
    if(i%3===0){p.style.width='7px';p.style.height='11px';}
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(()=>box.remove(),1800);
}
