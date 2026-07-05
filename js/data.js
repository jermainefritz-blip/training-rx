/* ════════════════════════════════════════════════════════════════════
   data.js — the program's fixed data model (from the coaching spec).
   Lift baselines = Week 6 of the previous block, carried forward as the
   starting point of the cut. Progression rules are applied from here.

   type: "strength" = compound (4–6, 2 wks at top before +load)
         "isolation"/"core" = (1 wk at top before +load)
   topRep = top of the prescribed rep range (threshold for progression)
   inc    = load added when the rule is met (lbs); "bw" lifts add reps not load
   ════════════════════════════════════════════════════════════════════ */
export const DAYS=[
  {
    id:"push", label:"Push", name:"Push + Cycle", subtitle:"Chest · Shoulders · Triceps",
    finisher:{type:"cycle", icon:"🚴", name:"Zone 2 Cycle", desc:"Steady · 120–125 BPM · keep it easy"},
    extra:{icon:"🦵", name:"Hip Mobility", desc:"15 min · do not skip"},
    exercises:[
      {name:"Bench Press", muscle:"Lower/inner chest ★", setsReps:"4×4–6", sets:4, topRep:6, restSecs:120, type:"strength", start:155, inc:5, bar:45},
      {name:"Incline Chest Press", muscle:"Lower/inner chest ★", setsReps:"3×8–10", sets:3, topRep:10, restSecs:90, type:"isolation", start:115, inc:5},
      {name:"Shoulder Press (DB)", muscle:"Front delts ★", setsReps:"3×8–10", sets:3, topRep:10, restSecs:90, type:"isolation", start:37.5, inc:2.5},
      {name:"Lateral Raise (Machine)", muscle:"Lateral delts ★", setsReps:"3×12–15", sets:3, topRep:15, restSecs:60, type:"isolation", start:60, inc:5},
      {name:"Cable Lateral Raise", muscle:"Lateral delts ★", setsReps:"3×12–15", sets:3, topRep:15, restSecs:60, type:"isolation", start:10, inc:2.5},
      {name:"Reverse Pec Deck", muscle:"Rear delts ★", setsReps:"3×12–15", sets:3, topRep:15, restSecs:60, type:"isolation", start:60, inc:5},
    ]
  },
  {
    id:"pull", label:"Pull", name:"Pull + Walk", subtitle:"Back · Rear Delts · Biceps",
    finisher:{type:"walk", icon:"🏔️", name:"Incline Walk Finisher", desc:"10 min · 10–12% grade · 3.5 mph"},
    exercises:[
      {name:"Pull-Up", muscle:"Upper back ★", setsReps:"4×6–8", sets:4, topRep:8, restSecs:120, type:"strength", start:0, inc:"bw", bw:true},
      {name:"Lat Pulldown", muscle:"Upper back ★", setsReps:"3×6–8", sets:3, topRep:8, restSecs:90, type:"strength", start:145, inc:5},
      {name:"T-Bar Row", muscle:"Traps · rhomboids ★", setsReps:"3×6–8", sets:3, topRep:8, restSecs:90, type:"strength", start:80, inc:5},
      {name:"Upright Row", muscle:"Traps · lateral delts ★", setsReps:"3×10–12", sets:3, topRep:12, restSecs:60, type:"isolation", start:50, inc:5},
      {name:"Cable Rear Delt Fly", muscle:"Rear delts ★", setsReps:"3×12–15", sets:3, topRep:15, restSecs:60, type:"isolation", start:15, inc:2.5},
      {name:"Bent-Over Reverse DB Fly", muscle:"Rear delts ★", setsReps:"3×12–15", sets:3, topRep:15, restSecs:60, type:"isolation", start:15, inc:2.5},
      {name:"Incline DB Curl", muscle:"Biceps", setsReps:"3×8–10", sets:3, topRep:10, restSecs:60, type:"isolation", start:25, inc:2.5},
    ]
  },
  {
    id:"legs", label:"Legs", name:"Leg Day", subtitle:"Quads · Hamstrings · Core",
    finisher:{type:"walk", icon:"🏔️", name:"Incline Walk Finisher", desc:"10 min · 10–12% grade · 3.5 mph"},
    exercises:[
      {name:"Leg Press", muscle:"Quads", setsReps:"4×6–8", sets:4, topRep:8, restSecs:120, type:"strength", start:190, inc:10},
      {name:"Leg Extension", muscle:"Quads", setsReps:"3×10–12", sets:3, topRep:12, restSecs:60, type:"isolation", start:115, inc:5},
      {name:"Goblet Squat", muscle:"Quads · glutes", setsReps:"3×10–12", sets:3, topRep:12, restSecs:90, type:"isolation", start:50, inc:5},
      {name:"Weighted Cable Crunch", muscle:"Core", setsReps:"4×15–20", sets:4, topRep:20, restSecs:45, type:"core", start:22.5, inc:2.5},
    ]
  },
  {
    id:"upper", label:"Upper", name:"Upper + Walk", subtitle:"Chest · Back · Shoulders · Arms",
    finisher:{type:"walk", icon:"🏔️", name:"Incline Walk Finisher", desc:"10 min · 10–12% grade · 3.5 mph"},
    exercises:[
      {name:"Chest Press (Machine)", muscle:"Lower/inner chest", setsReps:"3×8–10", sets:3, topRep:10, restSecs:90, type:"isolation", start:145, inc:5},
      {name:"Bent-Over Barbell Row", muscle:"Upper back · traps ★", setsReps:"3×8–10", sets:3, topRep:10, restSecs:120, type:"strength", start:105, inc:5, bar:45},
      {name:"Overhead Press (Barbell)", muscle:"Front delts", setsReps:"4×4–6", sets:4, topRep:6, restSecs:120, type:"strength", start:80, inc:5, bar:45},
      {name:"EZ Bar Curl", muscle:"Biceps", setsReps:"3×10–12", sets:3, topRep:12, restSecs:60, type:"isolation", start:47.5, inc:2.5, bar:25},
      {name:"Overhead Triceps Extension", muscle:"Triceps", setsReps:"3×12–15", sets:3, topRep:15, restSecs:60, type:"isolation", start:32.5, inc:2.5},
    ]
  }
];

/* nutrition targets */
export const NTGT={calLo:1800,calHi:1900,proLo:180,proHi:200,fatHi:60,carbLo:100,carbHi:130};
/* daily steps target band (dog walks) */
export const STEPS={lo:8000,hi:12000};
/* body-comp goals */
export const BGOAL={wLo:167,wHi:170,wStart:180.4,smm:88.6};
/* this cut's program window (used by Insights trajectory math) */
export const PROGRAM={start:'2026-07-06', end:'2026-08-13', endLabel:'Aug 13'};
export const DOW=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* primary tabs */
export const TABS=[
  {id:"workout",  label:"Train"},
  {id:"dash",     label:"Dashboard"},
  {id:"insights", label:"Insights"}
];
/* dashboard sub-tabs */
export const SUBS=[
  {id:"nutrition",label:"Nutrition"},
  {id:"body",     label:"Body"},
  {id:"activity", label:"Activity"},
  {id:"summary",  label:"Summary"}
];
