import { BehaviorSubject, ReplaySubject, bufferCount, firstValueFrom } from "rxjs";

import { validate } from "./event-processor";
import { ItemCreatedProgressEvent } from "./example-achievements";
import { itemAdded$ } from "./example-events";
import {
  ItemCreatedAchievement,
  ItemCreatedProgress,
  ItemCreatedTracker,
  ItemCreatedValidator,
  TotallyAttachedAchievement,
  TotallyAttachedValidator,
} from "./example-validators";
import { AchievementEvent } from "./types";

describe("event-processor", () => {
  describe("validate", () => {
    it("earns an achievement", async () => {
      const validators$ = new BehaviorSubject([TotallyAttachedValidator]);
      const captured$ = new BehaviorSubject<AchievementEvent[]>([]);
      const achievements$ = new ReplaySubject<AchievementEvent>(2);
      const result = firstValueFrom(achievements$.pipe(bufferCount(2)));

      itemAdded$.pipe(validate(validators$, captured$)).subscribe(achievements$);

      const expected = [{ achievement: { type: "earned", name: TotallyAttachedAchievement } }];
      await expect(result).resolves.toMatchObject(expected);
    });

    it("tracks achievement progress", async () => {
      const validators$ = new BehaviorSubject([ItemCreatedTracker]);
      const captured$ = new BehaviorSubject<AchievementEvent[]>([]);
      const achievements$ = new ReplaySubject<AchievementEvent>(2);
      const result = firstValueFrom(achievements$.pipe(bufferCount(2)));

      itemAdded$.pipe(validate(validators$, captured$)).subscribe(achievements$);

      const expected = [{ achievement: { type: "progress", name: ItemCreatedProgress, value: 1 } }];
      await expect(result).resolves.toMatchObject(expected);
    });

    it("updates achievement progress", async () => {
      const validators$ = new BehaviorSubject([ItemCreatedTracker]);
      const captured$ = new BehaviorSubject<AchievementEvent[]>([ItemCreatedProgressEvent]);
      const achievements$ = new ReplaySubject<AchievementEvent>(2);
      const result = firstValueFrom(achievements$.pipe(bufferCount(2)));

      itemAdded$.pipe(validate(validators$, captured$)).subscribe(achievements$);

      const expected = [{ achievement: { type: "progress", name: ItemCreatedProgress, value: 2 } }];
      await expect(result).resolves.toMatchObject(expected);
    });

    it("tracks achievement progress and earns an achievement", async () => {
      const validators$ = new BehaviorSubject([ItemCreatedValidator]);
      const captured$ = new BehaviorSubject<AchievementEvent[]>([]);
      const achievements$ = new ReplaySubject<AchievementEvent>(2);
      const result = firstValueFrom(achievements$.pipe(bufferCount(2)));

      itemAdded$.pipe(validate(validators$, captured$)).subscribe(achievements$);

      // NOTE: `progress` always comes before `earned`, but the order of individual
      // progress or earned entries is not guaranteed.
      const expected = [
        { achievement: { type: "progress", name: ItemCreatedProgress, value: 1 } },
        { achievement: { type: "earned", name: ItemCreatedAchievement } },
      ];
      await expect(result).resolves.toMatchObject(expected);
    });
  });
});
