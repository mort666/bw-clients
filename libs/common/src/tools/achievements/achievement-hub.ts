import { Observable, ReplaySubject, Subject, debounceTime, filter, map, startWith } from "rxjs";

import { active } from "./achievement-manager";
import { achievements } from "./achievement-processor";
import { latestEarnedSet, latestMetrics } from "./latest-metrics";
import { isEarnedEvent, isProgressEvent } from "./meta";
import {
  AchievementEarnedEvent,
  AchievementEvent,
  AchievementId,
  AchievementProgressEvent,
  AchievementValidator,
  MetricId,
  UserActionEvent,
} from "./types";

const ACHIEVEMENT_INITIAL_DEBOUNCE_MS = 100;

export class AchievementHub {
  constructor(
    validators$: Observable<AchievementValidator[]>,
    events$: Observable<UserActionEvent>,
    bufferSize: number = 1000,
  ) {
    this.achievements = new Subject<AchievementEvent>();
    this.achievementLog = new ReplaySubject<AchievementEvent>(bufferSize);
    this.achievements.subscribe(this.achievementLog);

    const active$ = validators$.pipe(active(this.metrics$(), this.earned$()));

    events$.pipe(achievements(active$, this.metrics$())).subscribe(this.achievements);
  }

  private readonly achievements: Subject<AchievementEvent>;
  private readonly achievementLog: ReplaySubject<AchievementEvent>;

  earned$(): Observable<Set<AchievementId>> {
    return this.achievementLog.pipe(
      filter((e) => isEarnedEvent(e)),
      map((e) => e as AchievementEarnedEvent),
      latestEarnedSet(),
      startWith(new Set<AchievementId>()),
      debounceTime(ACHIEVEMENT_INITIAL_DEBOUNCE_MS),
    );
  }

  metrics$(): Observable<Map<MetricId, number>> {
    return this.achievementLog.pipe(
      filter((e) => isProgressEvent(e)),
      map((e) => e as AchievementProgressEvent),
      latestMetrics(),
      startWith(new Map<MetricId, number>()),
    );
  }

  /** emit all achievement events */
  all$(): Observable<AchievementEvent> {
    return this.achievementLog.asObservable();
  }

  /** emit achievement events received after subscription */
  new$(): Observable<AchievementEvent> {
    return this.achievements.asObservable();
  }
}
