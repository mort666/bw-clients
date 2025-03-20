import { filter, find, from, map, Observable } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";

import { AchievementHub } from "./achievement-hub";
import { AchievementService as AchievementServiceAbstraction } from "./achievement.service.abstraction";
import { EventStoreAbstraction } from "./event-store.abstraction.service";
import {
  VaultItems_1_Added_Achievement,
  VaultItems_10_Added_Achievement,
} from "./examples/achievements";
import { isEarnedEvent, isProgressEvent } from "./meta";
import {
  Achievement,
  AchievementEarnedEvent,
  AchievementEvent,
  AchievementId,
  AchievementProgressEvent,
} from "./types";

// Service might be deprecated in favor of the AchievmentHub
// The hub is currently missing a way of listing all achievements, finding by id, but that could be possibly done via the AchievementManager
export class HubAchievementService implements AchievementServiceAbstraction {
  private _achievements: Achievement[] = [
    VaultItems_1_Added_Achievement,
    VaultItems_10_Added_Achievement,
  ];

  private _achievementsSubject = from(this._achievements);

  earned$: Observable<AchievementEarnedEvent>;  
  inProgress$: Observable<AchievementProgressEvent>;

  achievementById$: (achievementId: string) => Observable<Achievement>;
  achievementsEarned$ = (userId: UserId) => { return this.earned$ };
  achievementsInProgress$ = (userId: UserId) => { return this.inProgress$ }

  private achievementHub = new AchievementHub();
  
  constructor() {
    this.achievementById$ = (achievementId: AchievementId) =>
      this._achievementsSubject.pipe(find((item: Achievement) => item.name === achievementId));

    this.earned$ = this.achievementHub.new$().pipe(filter((event) => isEarnedEvent(event)), map((event) => {
      return event as AchievementEarnedEvent;
    }));

    this.inProgress$ = this.achievementHub.new$().pipe(filter((event) => isProgressEvent(event)), map((event) => {
      return event as AchievementProgressEvent;
    }));
  }
}
