import { Observable, OperatorFunction, concatMap, from, map, pipe, withLatestFrom } from "rxjs";

import { EventFormat } from "../log/ecs-format";

import {
  achievementMonitors$,
  achievementsLocal$ as achievementsLog$,
  userActionIn$,
} from "./inputs";
import { isEarnedEvent, isProgressEvent } from "./meta";
import { AchievementEvent, AchievementValidator } from "./types";

function mapProgressByName(status: AchievementEvent[]) {
  return new Map(
    status.filter(isProgressEvent).map((e) => [e.achievement.name, e.achievement.value] as const),
  );
}

// OPTIMIZATION: compute the list of active monitors from trigger criteria
function active(
  status$: Observable<AchievementEvent[]>,
): OperatorFunction<AchievementValidator[], AchievementValidator[]> {
  return pipe(
    withLatestFrom(status$),
    map(([monitors, log]) => {
      // partition the log into progress and earned achievements
      const progressByName = mapProgressByName(log);
      const earnedByName = new Set(
        log.filter((e) => isEarnedEvent(e)).map((e) => e.achievement.name),
      );

      // compute list of active achievements
      const active = monitors.filter((m) => {
        // 🧠 the filters could be lifted into a function argument & delivered
        //    as a `Map<FilterType, (monitor) => bool>

        if (m.trigger === "once") {
          // monitor disabled if already achieved
          return !earnedByName.has(m.achievement);
        }

        // monitor disabled if outside of threshold
        const progress = (m.metric && progressByName.get(m.metric)) || 0;
        if (progress > (m.trigger.high ?? Number.POSITIVE_INFINITY)) {
          return false;
        } else if (progress < (m.trigger.low ?? 0)) {
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
  monitors$: Observable<AchievementValidator[]>,
  status$: Observable<AchievementEvent[]>,
): OperatorFunction<EventFormat, AchievementEvent> {
  return pipe(
    withLatestFrom(monitors$),
    map(([action, monitors]) => {
      // narrow the list of all live monitors to just those that may produce new logs
      const triggered = monitors.filter((m) => m.filter(action));
      return [action, triggered] as const;
    }),
    withLatestFrom(status$),
    concatMap(([[action, monitors], status]) => {
      const results: AchievementEvent[] = [];

      // process achievement monitors sequentially, accumulating result records
      for (const monitor of monitors) {
        const progress = mapProgressByName(status);

        const measurements = monitor.measure(action, progress);
        results.push(...measurements);

        // modify copy produced by filter to avoid reallocation
        for (const m of measurements) {
          progress.set(m.achievement.name, m.achievement.value);
        }

        results.push(...monitor.earn(progress));
      }

      // deliver results as a stream containing individual records to maintain
      // the map/reduce model of the validator
      return from(results);
    }),
  );
}

const liveMonitors$ = achievementMonitors$.pipe(active(achievementsLog$));

// pre-wired achievement stream; this is the prototype's host, and
//  in the full version is wired by the application
const validatedAchievements$ = userActionIn$.pipe(validate(liveMonitors$, achievementsLog$));

export { validate, validatedAchievements$ };
