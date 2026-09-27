/**
 * @digitalbonds/un-sdgs ships real per-goal Lottie animation JSON, but its own
 * `getGoal()` / `listGoals()` helpers load that JSON via `require(computedPath)` —
 * a runtime-computed require Rollup/Vite cannot statically bundle. Verified by
 * building it: calling either function throws
 * "Could not dynamically require ..." the instant it runs, in dev and in prod.
 *
 * The fix is to skip those two functions entirely and import each goal's JSON
 * by its real, static path instead — which Vite bundles just fine, and which
 * is plain data (no `document` access), so it's also completely SSR-safe.
 *
 * This only pulls the English "color" variant, matching the app's current
 * language and the existing colored-badge look. Adding "white" or "spa" later
 * is the same pattern: import the file, add it to a lookup map.
 */

import goal1 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_1.json";
import goal2 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_2.json";
import goal3 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_3.json";
import goal4 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_4.json";
import goal5 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_5.json";
import goal6 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_6.json";
import goal7 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_7.json";
import goal8 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_8.json";
import goal9 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_9.json";
import goal10 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_10.json";
import goal11 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_11.json";
import goal12 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_12.json";
import goal13 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_13.json";
import goal14 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_14.json";
import goal15 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_15.json";
import goal16 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_16.json";
import goal17 from "@digitalbonds/un-sdgs/src/assets/goals/eng/color/goal_17.json";

export const sdgAnimations: Record<number, object> = {
  1: goal1,
  2: goal2,
  3: goal3,
  4: goal4,
  5: goal5,
  6: goal6,
  7: goal7,
  8: goal8,
  9: goal9,
  10: goal10,
  11: goal11,
  12: goal12,
  13: goal13,
  14: goal14,
  15: goal15,
  16: goal16,
  17: goal17,
};
