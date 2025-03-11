import { Subject } from "rxjs";

import { EventFormat } from "../log/ecs-format";

import { Achievement, AchievementEvent, AchievementValidator } from "./types";

// sync data from the server (consumed by event store)
const replicationIn$ = new Subject<AchievementEvent>();

// data incoming from the UI (consumed by validator)
const userActionIn$ = new Subject<EventFormat>();

// what to look for (consumed by validator)
const achievementMonitors$ = new Subject<AchievementValidator[]>();

// data stored in local state  (consumed by validator and achievement list)
const achievementsLocal$ = new Subject<AchievementEvent[]>();

// metadata (consumed by achievement list)
const achievementMetadata$ = new Subject<Achievement>();

export {
  replicationIn$,
  userActionIn$,
  achievementsLocal$,
  achievementMonitors$,
  achievementMetadata$,
};
