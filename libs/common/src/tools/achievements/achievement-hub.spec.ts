import { BehaviorSubject, ReplaySubject, Subject, firstValueFrom } from "rxjs";

import { ConsoleLogService } from "../../platform/services/console-log.service";
import { consoleSemanticLoggerProvider } from "../log";

import { AchievementHub } from "./achievement-hub";
import { ItemCreatedEarnedEvent } from "./examples/achievement-events";
import {
  TotallyAttachedAchievement,
  TotallyAttachedValidator,
} from "./examples/example-validators";
import { itemAdded$ } from "./examples/user-events";
import {
  AchievementEarnedEvent,
  AchievementEvent,
  AchievementId,
  AchievementProgressEvent,
  AchievementValidator,
  MetricId,
  UserActionEvent,
} from "./types";

const testLog = consoleSemanticLoggerProvider(new ConsoleLogService(true), {});

describe("AchievementHub", () => {
  describe("all$", () => {
    it("emits achievements constructor emissions", async () => {
      const validators$ = new Subject<AchievementValidator[]>();
      const events$ = new Subject<UserActionEvent>();
      const achievements$ = new Subject<AchievementEvent>();
      const hub = new AchievementHub(validators$, events$, achievements$);
      const results$ = new ReplaySubject<AchievementEvent>(3);
      hub.all$().subscribe(results$);

      achievements$.next(ItemCreatedEarnedEvent);

      const result = firstValueFrom(results$);
      await expect(result).resolves.toEqual(ItemCreatedEarnedEvent);
    });

    it("emits achievements derived from events", async () => {
      const validators$ = new BehaviorSubject<AchievementValidator[]>([TotallyAttachedValidator]);
      const events$ = new Subject<UserActionEvent>();
      const achievements$ = new Subject<AchievementEvent>();
      const hub = new AchievementHub(validators$, events$, achievements$, 10, testLog);
      const results$ = new ReplaySubject<AchievementEvent>(3);
      hub.all$().subscribe(results$);

      // hub starts listening when achievements$ completes
      achievements$.complete();
      itemAdded$.subscribe(events$);

      const result = firstValueFrom(results$);
      await expect(result).resolves.toMatchObject({
        achievement: { type: "earned", name: TotallyAttachedAchievement },
      });
    });
  });

  describe("new$", () => {
    it("", async () => {
      const validators$ = new Subject<AchievementValidator[]>();
      const events$ = new Subject<UserActionEvent>();
      const achievements$ = new Subject<AchievementEvent>();
      const hub = new AchievementHub(validators$, events$, achievements$);
      const results$ = new ReplaySubject<AchievementEvent>(3);
      hub.new$().subscribe(results$);
    });
  });

  describe("earned$", () => {
    it("", async () => {
      const validators$ = new Subject<AchievementValidator[]>();
      const events$ = new Subject<UserActionEvent>();
      const achievements$ = new Subject<AchievementEvent>();
      const hub = new AchievementHub(validators$, events$, achievements$);
      const results$ = new ReplaySubject<Map<AchievementId, AchievementEarnedEvent>>(1);
      hub.earned$().subscribe(results$);
    });
  });

  describe("metrics$", () => {
    it("", async () => {
      const validators$ = new Subject<AchievementValidator[]>();
      const events$ = new Subject<UserActionEvent>();
      const achievements$ = new Subject<AchievementEvent>();
      const hub = new AchievementHub(validators$, events$, achievements$);
      const results$ = new ReplaySubject<Map<MetricId, AchievementProgressEvent>>(1);
      hub.metrics$().subscribe(results$);
    });
  });
});
