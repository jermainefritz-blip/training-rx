/* ════════════════════════════════════════════════════════════════════
   state.js — shared, mutable UI state.
   In the original single-file app these were loose top-level `let`s. Because
   ES modules can't share reassignable bindings cleanly, they live on one
   object here; every module reads/writes state.xxx and sees the same values.
   ════════════════════════════════════════════════════════════════════ */
export const state = {
  wo: 0,               // week offset (0 = current week, negative = past)
  activeTab: 'workout',// 'workout' | 'dash'
  activeSub: 'nutrition', // dashboard sub-tab: 'nutrition' | 'body' | 'summary'
  activeDay: 0,        // workout sub-day index (0=Push …)
  nutDay: 0,           // nutrition day-of-week index being edited
  bcFormOpen: false    // is the body-comp "add measurement" form open?
};
