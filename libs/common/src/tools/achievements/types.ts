import { RequireAtLeastOne } from "type-fest";
import { Tagged } from "type-fest/source/opaque";

import { EventFormat, ServiceFormat, UserFormat } from "../log/ecs-format";

import { Type } from "./data";

export type EvaluatorType = keyof typeof Type;
export type AchievementId = string & Tagged<"achievement">;
export type MetricId = string & Tagged<"metric-id">;

export type AchievementProgressEvent = EventFormat &
  ServiceFormat &
  UserFormat & { achievement: { type: "progress"; name: MetricId; value: number } };
export type AchievementEarnedEvent = EventFormat &
  ServiceFormat &
  UserFormat & { achievement: { type: "earned"; name: AchievementId } };
export type AchievementEvent = AchievementProgressEvent | AchievementEarnedEvent;

// consumed by validator and achievement list (should this include a "toast-alerter"?)
export type Achievement = {
  achievement: AchievementId;

  metric?: MetricId;

  evaluator: EvaluatorType;

  // pre-filter that disables the rule if it's met
  trigger: "once" | RequireAtLeastOne<{ low: number; high: number }>;

  hidden: boolean;
};

// consumed by validator
export type AchievementValidator = Achievement & {
  // when the watch triggers on incoming user events
  filter: (item: EventFormat) => boolean;

  // observe data from the event stream and produces measurements
  measure: (item: EventFormat, progress: Map<MetricId, number>) => AchievementProgressEvent[];

  // monitors achievement progress and emits earned achievements
  earn: (
    measured: AchievementProgressEvent[],
    progress: Map<MetricId, number>,
  ) => AchievementEarnedEvent[];
};
