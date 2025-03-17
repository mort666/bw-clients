import { BehaviorSubject, Subject } from "rxjs";

import {
  CredentialGeneratedProgressEvent,
  ItemCreatedProgressEvent,
  ItemCreatedProgress2Event,
} from "./examples/achievement-events";
import { CredentialGeneratedProgress, ItemCreatedProgress } from "./examples/example-validators";
import { latestProgressMetrics } from "./latest-metrics";
import { AchievementProgressEvent, MetricId } from "./types";

describe("latestMetrics", () => {
  it("creates a map containing a metric", () => {
    const subject = new Subject<AchievementProgressEvent>();
    const result = new BehaviorSubject(new Map<MetricId, number>());

    subject.pipe(latestProgressMetrics()).subscribe(result);
    subject.next(ItemCreatedProgressEvent);

    expect(result.value.get(ItemCreatedProgress)).toEqual(
      ItemCreatedProgressEvent.achievement.value,
    );
  });

  it("creates a map containing multiple metrics", () => {
    const subject = new Subject<AchievementProgressEvent>();
    const result = new BehaviorSubject(new Map<MetricId, number>());

    subject.pipe(latestProgressMetrics()).subscribe(result);
    subject.next(ItemCreatedProgressEvent);
    subject.next(CredentialGeneratedProgressEvent);

    expect(result.value.get(ItemCreatedProgress)).toEqual(
      ItemCreatedProgressEvent.achievement.value,
    );
    expect(result.value.get(CredentialGeneratedProgress)).toEqual(
      CredentialGeneratedProgressEvent.achievement.value,
    );
  });

  it("creates a map containing updated metrics", () => {
    const subject = new Subject<AchievementProgressEvent>();
    const result = new BehaviorSubject(new Map<MetricId, number>());

    subject.pipe(latestProgressMetrics()).subscribe(result);
    subject.next(ItemCreatedProgressEvent);
    subject.next(ItemCreatedProgress2Event);

    expect(result.value.get(ItemCreatedProgress)).toEqual(
      ItemCreatedProgress2Event.achievement.value,
    );
  });

  it("omits old events", () => {
    const subject = new Subject<AchievementProgressEvent>();
    const result = new BehaviorSubject(new Map<MetricId, number>());

    subject.pipe(latestProgressMetrics()).subscribe(result);
    subject.next(ItemCreatedProgress2Event);
    subject.next(ItemCreatedProgressEvent);

    expect(result.value.get(ItemCreatedProgress)).toEqual(
      ItemCreatedProgress2Event.achievement.value,
    );
  });
});
