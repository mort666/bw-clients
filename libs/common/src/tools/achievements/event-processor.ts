import { Observable, OperatorFunction, concatMap, from, map, pipe, withLatestFrom } from "rxjs";

import { EventFormat } from "../log/ecs-format";

import { active } from "./achievement-manager";
import {
  achievementMonitors$,
  achievementsLocal$ as achievementsLog$,
  userActionIn$,
} from "./inputs";
import { AchievementEvent, AchievementValidator } from "./types";
import { mapProgressByName } from "./util";

// the formal event processor
function validate(
  validators$: Observable<AchievementValidator[]>,
  captured$: Observable<AchievementEvent[]>,
): OperatorFunction<EventFormat, AchievementEvent> {
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

      for (const validator of validators) {
        const measured = validator.measure(action, progress);
        results.push(...measured);

        // update progress with the latest measurements
        for (const m of measured) {
          progress.set(m.achievement.name, m.achievement.value);
        }

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
