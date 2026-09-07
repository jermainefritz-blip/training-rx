/* ════════════════════════════════════════════════════════════════════
   data.js — the program's fixed data model (from the coaching spec).
   Weight fields (`start`) are only ever a baseline placeholder for an
   exercise with no logged history yet — the app never invents a heavier
   number on its own. Once a week is logged, its actual weight becomes
   the historical reference for every week after.

   type: "strength" = compound (heavier, lower-rep — lifted first)
         "isolation"/"core" = hypertrophy accessory work (lifted after)
   bar  = barbell weight (lb) for lifts loaded on a bar — the app shows
          the per-side plate math for these ("X + Y/side").
   ════════════════════════════════════════════════════════════════════ */
export const DAYS=[
  {
    id:"push", label:"Push", name:"Push Day", subtitle:"Chest · Shoulders · Triceps",
    exercises:[
      {name:"Flat DB Bench Press", muscle:"Chest ★", setsReps:"4×4–6", sets:4, topRep:6, restSecs:150, type:"strength", start:60},
      {name:"Seated DB Shoulder Press", muscle:"Front delts ★", setsReps:"3×6–8", sets:3, topRep:8, restSecs:105, type:"strength", start:40},
      {name:"High-to-Low Cable Fly", muscle:"Lower chest", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:20},
      {name:"Face-Away Cable Reverse Fly", muscle:"Rear delts", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:15},
      {name:"Cable Lateral Raise", muscle:"Lateral delts ★", setsReps:"4×10–15", sets:4, topRep:15, restSecs:75, type:"isolation", start:10},
      {name:"Cable Upright Row", muscle:"Traps · delts", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:40},
    ]
  },
  {
    id:"pull", label:"Pull", name:"Pull Day", subtitle:"Back · Rear Delts · Biceps",
    exercises:[
      {name:"Weighted Pull-Up", muscle:"Upper back ★", setsReps:"4×4–6", sets:4, topRep:6, restSecs:150, type:"strength", start:15, bw:true},
      {name:"Chest-Supported DB Row", muscle:"Upper back ★", setsReps:"4×6–8", sets:4, topRep:8, restSecs:105, type:"strength", start:50},
      {name:"Straight-Arm Lat Pulldown", muscle:"Lats", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:50},
      {name:"Standing Barbell Shrug", muscle:"Traps ★", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:135, bar:45},
      {name:"Reverse Pec Deck", muscle:"Rear delts ★", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:60},
      {name:"Incline DB Curl", muscle:"Biceps", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:25},
    ]
  },
  {
    id:"legs", label:"Legs", name:"Leg Day", subtitle:"Quads · Hamstrings · Core",
    exercises:[
      {name:"Leg Press", muscle:"Quads ★", setsReps:"4×4–6", sets:4, topRep:6, restSecs:150, type:"strength", start:190},
      {name:"Romanian Deadlift", muscle:"Hamstrings · glutes ★", setsReps:"3×8–10", sets:3, topRep:10, restSecs:105, type:"strength", start:135, bar:45},
      {name:"Walking Lunge", muscle:"Quads · glutes", setsReps:"3×10–12/leg", sets:3, topRep:12, restSecs:75, type:"isolation", start:30},
      {name:"Leg Extension", muscle:"Quads", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:115},
      {name:"Weighted Cable Crunch", muscle:"Core", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"core", start:22.5},
    ]
  },
  {
    id:"upper", label:"Upper", name:"Upper Day", subtitle:"Chest · Back · Shoulders · Arms",
    exercises:[
      {name:"Vertical Traction Pulldown", muscle:"Upper back ★", setsReps:"4×6–8", sets:4, topRep:8, restSecs:150, type:"strength", start:145},
      {name:"Weighted Dips", muscle:"Chest · triceps ★", setsReps:"4×4–6", sets:4, topRep:6, restSecs:150, type:"strength", start:25, bw:true},
      {name:"Incline Bench Face-Down Reverse Fly", muscle:"Rear delts", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:15},
      {name:"Lateral Raise Machine", muscle:"Lateral delts", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:60},
      {name:"Cable Y-Raise", muscle:"Delts", setsReps:"3×10–15", sets:3, topRep:15, restSecs:75, type:"isolation", start:10},
      {name:"Overhead Triceps Extension", muscle:"Triceps (optional)", setsReps:"2×10–15", sets:2, topRep:15, restSecs:75, type:"isolation", start:32.5},
    ]
  }
];

/* body-comp goals */
export const BGOAL={wLo:167,wHi:170,wStart:180.4,smm:88.6};
/* this cut's program window */
export const PROGRAM={start:'2026-09-20', end:'2026-11-08', endLabel:'Nov 8'};

/* primary tabs */
export const TABS=[
  {id:"workout", label:"Train"},
  {id:"dash",    label:"Body"}
];
