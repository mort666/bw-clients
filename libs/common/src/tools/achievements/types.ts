import { RequireAtLeastOne } from "type-fest";
import { Tagged } from "type-fest/source/opaque";

import { EventFormat, ServiceFormat } from "../log/ecs-format";

import { Type } from "./data";

export type EvaluatorType = keyof typeof Type;
export type AchievementId = string & Tagged<"achievement">;
export type AchievementProgressId = string & Tagged<"achievement-progress">;

export type AchievementProgressEvent = EventFormat &
  ServiceFormat & { achievement: { type: "progress"; name: AchievementProgressId; value: number } };
export type AchievementEarnedEvent = EventFormat &
  ServiceFormat & { achievement: { type: "earned"; name: AchievementId } };
export type AchievementEvent = AchievementProgressEvent | AchievementEarnedEvent;

// consumed by validator and achievement list (should this include a "toast-alerter"?)
export type Achievement = {
  achievement: AchievementId;
  progress: AchievementProgressId;
  evaluator: EvaluatorType;

  // pre-filter that disables the rule if it's met
  trigger: "once" | RequireAtLeastOne<{ low: number; high: number }>;

  hidden: boolean;
};

// consumed by validator
export type AchievementValidator = Achievement & {
  // when the watch triggers on incoming user events
  filter: (item: EventFormat) => boolean;

  // what to do when an incoming event is triggered
  action: (
    item: EventFormat,
    progress?: AchievementProgressEvent,
  ) => [AchievementEvent] | [AchievementEvent, AchievementEvent];
};
