import { RequireAtLeastOne } from "type-fest";
import { Tagged } from "type-fest/source/opaque";

import { EventFormat, ServiceFormat } from "../log/ecs-format";

export type AchievementId = string & Tagged<"achievement">;

type Progress = { type: "progress"; name: AchievementId; value: number };
type Earned = { type: "earned"; name: AchievementId };
export type AchievementFormat = EventFormat & ServiceFormat & { achievement: Progress | Earned };

// consumed by validator and achievement list (should this include a "toast-alerter"?)
export type Achievement = {
  achievement: AchievementId;

  // pre-filter that disables the rule if it's met
  trigger: "once" | RequireAtLeastOne<{ low: number; high: number }>;

  hidden: boolean;
};

// consumed by validator
export type AchievementWatch = Achievement & {
  // when the watch triggers on incoming user events
  filter: (item: EventFormat) => boolean;

  // what to do when an incoming event is triggered
  action: (
    item: EventFormat,
    progress?: AchievementFormat,
  ) => [AchievementFormat] | [AchievementFormat, AchievementFormat];
};
