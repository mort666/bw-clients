import { RequireAtLeastOne } from "type-fest";
import { Tagged } from "type-fest/source/opaque";

import { EventFormat, ServiceFormat, UserFormat } from "../log/ecs-format";

import { Type } from "./data";

export type ValidatorId = keyof typeof Type;
export type AchievementId = string & Tagged<"achievement">;
export type MetricId = string & Tagged<"metric-id">;

// validators require all events to contain this baseline information
export type UserActionEvent = EventFormat & UserFormat & ServiceFormat;

export type AchievementProgressEvent = EventFormat &
  ServiceFormat &
  UserFormat & { achievement: { type: "progress"; name: MetricId; value: number } };
export type AchievementEarnedEvent = EventFormat &
  ServiceFormat &
  UserFormat & { achievement: { type: "earned"; name: AchievementId } };
export type AchievementEvent = AchievementProgressEvent | AchievementEarnedEvent;

type MetricCriteria = {
  // the metric observed by low/high triggers
  metric: MetricId;
} & RequireAtLeastOne<{
  // criteria fail when the metric is less than or equal to `low`
  low: number;
  // criteria fail when the metric is greater than `high`
  high: number;
}>;
type ActiveCriteria = "until-earned" | MetricCriteria;

// consumed by validator and achievement list (should this include a "toast-alerter"?)
export type Achievement = {
  // identifies the achievement being monitored
  achievement: AchievementId;

  // human-readable name of the achievement
  name: string;

  // human-readable description of the achievement
  description?: string;

  // conditions that determine when the achievement validator should be loaded
  // by the processor
  active: ActiveCriteria;

  // identifies the validator containing filter/measure/earn methods
  validator: ValidatorId;

  // whether or not the achievement is hidden until it is earned
  hidden: boolean;
};

// consumed by validator
export type AchievementValidator = Achievement & {
  // when the watch triggers on incoming user events
  trigger: (item: UserActionEvent) => boolean;

  // observe data from the event stream and produces measurements
  measure?: (item: UserActionEvent, metrics: Map<MetricId, number>) => AchievementProgressEvent[];

  // monitors achievement progress and emits earned achievements
  award?: (
    events: AchievementProgressEvent[],
    metrics: Map<MetricId, number>,
  ) => AchievementEarnedEvent[];
};
