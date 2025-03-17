import {
  Observable,
  ReplaySubject,
  Subject,
  debounceTime,
  filter,
  map,
  share,
  startWith,
} from "rxjs";

import { active } from "./achievement-manager";
import { achievements } from "./achievement-processor";
import { latestEarnedMetrics, latestProgressMetrics } from "./latest-metrics";
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

    const metrics$ = this.metrics$().pipe(
      map((m) => new Map(Array.from(m.entries(), ([k, v]) => [k, v.achievement.value] as const))),
      share(),
    );
    const earned$ = this.earned$().pipe(map((m) => new Set(m.keys())));
    const active$ = validators$.pipe(active(metrics$, earned$));

    events$.pipe(achievements(active$, metrics$)).subscribe(this.achievements);
  }

  private readonly achievements: Subject<AchievementEvent>;
  private readonly achievementLog: ReplaySubject<AchievementEvent>;

  earned$(): Observable<Map<AchievementId, AchievementEarnedEvent>> {
    return this.achievementLog.pipe(
      filter((e) => isEarnedEvent(e)),
      map((e) => e as AchievementEarnedEvent),
      latestEarnedMetrics(),
      startWith(new Map<AchievementId, AchievementEarnedEvent>()),
      debounceTime(ACHIEVEMENT_INITIAL_DEBOUNCE_MS),
    );
  }

  metrics$(): Observable<Map<MetricId, AchievementProgressEvent>> {
    return this.achievementLog.pipe(
      filter((e) => isProgressEvent(e)),
      map((e) => e as AchievementProgressEvent),
      latestProgressMetrics(),
      startWith(new Map<MetricId, AchievementProgressEvent>()),
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
