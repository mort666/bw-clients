import { Observable, OperatorFunction, concatMap, from, map, pipe, withLatestFrom } from "rxjs";

import { active } from "./achievement-manager";
import {
  achievementMonitors$,
  achievementsLocal$ as achievementsLog$,
  userActionIn$,
} from "./inputs";
import {
  AchievementEvent,
  AchievementId,
  AchievementProgressEvent,
  AchievementValidator,
  MetricId,
  UserActionEvent,
} from "./types";
import { mapProgressByName } from "./util";

// the formal event processor
function validate(
  validators$: Observable<AchievementValidator[]>,
  captured$: Observable<AchievementEvent[]>,
): OperatorFunction<UserActionEvent, AchievementEvent> {
  return pipe(
    withLatestFrom(validators$),
    map(([action, monitors]) => {
      // narrow the list of all live monitors to just those that may produce new logs
      const triggered = monitors.filter((m) => m.filter(action));
      return [action, triggered] as const;
    }),
    withLatestFrom(captured$),
    concatMap(([[action, validators], captured]) => {
      const results: AchievementEvent[] = [];
      const progress = mapProgressByName(captured);
      const measurements = new Map<AchievementId, AchievementProgressEvent[]>();

      // collect measurements
      for (const validator of validators) {
        const measured = validator.measure(action, progress);
        measurements.set(validator.achievement, measured);
        results.push(...measured);
      }

      // update processor's internal progress values
      const distinct = new Map<MetricId, AchievementId>();
      const entries = [...measurements.entries()].flatMap(([a, ms]) =>
        ms.map((m) => [a, m] as const),
      );
      for (const [achievement, measured] of entries) {
        const key = measured.achievement.name;
        if (distinct.has(key)) {
          const msg = `${achievement} failed to set set ${key} value already set by ${distinct.get(key)}`;
          throw new Error(msg);
        }

        distinct.set(key, achievement);
        progress.set(measured.achievement.name, measured.achievement.value);
      }

      // detect earned achievements
      for (const validator of validators) {
        const measured = measurements.get(validator.achievement) ?? [];
        const earned = validator.earn(measured, progress);
        results.push(...earned);
      }

      // deliver results as a stream containing individual records to maintain
      // the map/reduce model of the validator
      return from(results);
    }),
  );
}

// monitors are lazy until their trigger condition is met
const liveMonitors$ = achievementMonitors$.pipe(active(achievementsLog$));

// pre-wired achievement stream; this is the prototype's host, and
//  in the full version is wired by the application
const validatedAchievements$ = userActionIn$.pipe(validate(liveMonitors$, achievementsLog$));

export { validate, validatedAchievements$ };
