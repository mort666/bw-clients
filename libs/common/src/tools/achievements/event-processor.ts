import { Observable, OperatorFunction, concatMap, from, map, pipe, withLatestFrom } from "rxjs";

import { EventFormat } from "../log/ecs-format";

import {
  achievementMonitors$,
  achievementsLocal$ as achievementsLog$,
  userActionIn$,
} from "./inputs";
import { isProgress } from "./meta";
import { AchievementFormat, AchievementWatch, Earned, Progress } from "./types";

// OPTIMIZATION: compute the list of active monitors from trigger criteria
function active(
  status$: Observable<AchievementFormat[]>,
): OperatorFunction<AchievementWatch[], AchievementWatch[]> {
  return pipe(
    withLatestFrom(status$),
    map(([monitors, log]) => {
      // partition the log into progress and earned achievements
      const progress: Progress[] = [];
      const earned: Earned[] = [];
      for (const l of log) {
        if (isProgress(l.achievement)) {
          progress.push(l.achievement);
        } else {
          earned.push(l.achievement);
        }
      }

      const progressByName = new Map(progress.map((a) => [a.name, a.value]));
      const earnedByName = new Set(earned.map((e) => e.name));

      // compute list of active achievements
      const active = monitors.filter((m) => {
        if (m.trigger === "once") {
          // monitor disabled if already achieved
          return !earnedByName.has(m.achievement);
        }

        // monitor disabled if outside of threshold
        const progress = progressByName.get(m.achievement) ?? 0;
        if (m.trigger.high ?? Number.POSITIVE_INFINITY < progress) {
          return false;
        } else if (m.trigger.low ?? 0 > progress) {
          return false;
        }

        // otherwise you're within the threshold, so the monitor is active
        return true;
      });

      return active;
    }),
  );
}

// the formal event processor
function validate(
  monitors$: Observable<AchievementWatch[]>,
  status$: Observable<AchievementFormat[]>,
): OperatorFunction<EventFormat, AchievementFormat> {
  // analyze the incoming event stream to identify achievements
  const processor = pipe(
    withLatestFrom(monitors$),
    map(([action, monitors]) => {
      // 🧩 TODO: transform list of monitors to the list of monitors triggered
      //          by the incoming action
      return [action, monitors];
    }),
    withLatestFrom(status$),
    concatMap(([[action, monitors], status]) => {
      // 🧩 TODO: execute each of the monitors feeding in its associated achievement
      //          entry and the action that triggered the achievement.
      return from([] as AchievementFormat[]);
    }),
  );

  return processor;
}

const liveMonitors$ = achievementMonitors$.pipe(active(achievementsLog$));

// pre-wired achievement stream; this is the prototype's host, and
//  in the full version is wired by the application
const validatedAchievements$ = userActionIn$.pipe(validate(liveMonitors$, achievementsLog$));

export { validate, validatedAchievements$ };
