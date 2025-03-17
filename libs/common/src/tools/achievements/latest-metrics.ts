import { OperatorFunction, map, filter, pipe, scan } from "rxjs";

import { MetricId, AchievementProgressEvent } from "./types";

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

function latestMetrics(): OperatorFunction<AchievementProgressEvent, Map<MetricId, number>> {
  return pipe(
    scan((metrics, captured) => {
      const [timestamp] = metrics.get(captured.achievement.name) ?? [];

      // omit stale metrics
      if (timestamp && timestamp > captured["@timestamp"]) {
        return metrics;
      }

      const latest = [captured["@timestamp"], captured.achievement.value] as const;
      metrics.set(captured.achievement.name, latest);

      return metrics;
    }, new Map<MetricId, readonly [number, number]>()),

    // omit timestamps from metrics
    map(
      (metrics) => new Map(Array.from(metrics.entries(), ([metric, [, value]]) => [metric, value])),
    ),
  );
}

export { latestMetrics, latestProgressEvents };
