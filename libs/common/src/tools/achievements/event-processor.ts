import {
  Observable,
  OperatorFunction,
  concatMap,
  filter,
  from,
  map,
  pipe,
  withLatestFrom,
} from "rxjs";

import { EventFormat } from "../log/ecs-format";

import { achievementMonitors$, achievementsLocal$, userActionIn$ } from "./inputs";
import { AchievementFormat, AchievementWatch } from "./types";

// the formal even processor
function validate(
  achievements$: Observable<AchievementWatch[]>,
  status$: Observable<AchievementFormat[]>,
): OperatorFunction<EventFormat, AchievementFormat> {
  // compute list of active monitors
  const monitors$ = achievements$.pipe(
    withLatestFrom(achievementsLocal$),
    filter(([monitors, local]) => {
      // 🧩 TODO: filter out inactive monitors by reviewing local store
      //          and interpreting triggers.
      return true;
    }),
  );

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

// pre-wired achievement stream; this is the prototype's host, and
//  in the full version is wired by the application
const validatedAchievements$ = userActionIn$.pipe(
  validate(achievementMonitors$, achievementsLocal$),
);

export { validate, validatedAchievements$ };
