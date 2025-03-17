import { OperatorFunction, map, filter, pipe, scan } from "rxjs";

import { MetricId, AchievementProgressEvent, AchievementId, AchievementEarnedEvent } from "./types";

function latestProgressEvents(): OperatorFunction<
  AchievementProgressEvent,
  AchievementProgressEvent
> {
  type Accumulator = {
    latest: Map<MetricId, AchievementProgressEvent>;
    captured?: AchievementProgressEvent;
  };
  const acc: Accumulator = { latest: new Map() };

  return pipe(
    scan((acc, captured) => {
      const { latest } = acc;
      const current = latest.get(captured.achievement.name);

      // omit stale events
      if (current && current["@timestamp"] > captured["@timestamp"]) {
        return { latest };
      }

      latest.set(captured.achievement.name, captured);
      return { latest, captured };
    }, acc),
    // omit updates caused by stale events
    filter(({ captured }) => !!captured),
    map(({ captured }) => captured!),
  );
}

function latestProgressMetrics(): OperatorFunction<
  AchievementProgressEvent,
  Map<MetricId, AchievementProgressEvent>
> {
  return pipe(
    scan((metrics, captured) => {
      const metric = metrics.get(captured.achievement.name);

      // omit stale metrics
      if (metric && metric["@timestamp"] > captured["@timestamp"]) {
        return metrics;
      }

      metrics.set(captured.achievement.name, captured);

      return metrics;
    }, new Map<MetricId, AchievementProgressEvent>()),
  );
}

function latestEarnedMetrics(): OperatorFunction<
  AchievementEarnedEvent,
  Map<AchievementId, AchievementEarnedEvent>
> {
  return pipe(
    scan((earned, captured) => {
      earned.set(captured.achievement.name, captured);
      return earned;
    }, new Map<AchievementId, AchievementEarnedEvent>()),
  );
}

export { latestProgressMetrics, latestProgressEvents, latestEarnedMetrics };
