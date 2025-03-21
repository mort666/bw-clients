import { BehaviorSubject, EMPTY, filter, find, from, Observable } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";

import { Account } from "../../auth/abstractions/account.service";
import { UserEventLogProvider } from "../log/logger";

import { AchievementHub } from "./achievement-hub";
import { AchievementService as AchievementServiceAbstraction } from "./achievement.service.abstraction";
import { isEarnedEvent, isProgressEvent } from "./meta";
import {
  Achievement,
  AchievementEarnedEvent,
  AchievementEvent,
  AchievementProgressEvent,
  AchievementValidator,
} from "./types";
import { ItemCreatedCountConfig } from "./validators/config/item-created-count-config";
import { SendItemCreatedCountConfig } from "./validators/config/send-created-count-config";
import { SendItemCreatedCountValidator } from "./validators/send-item-created-count-validator";
import { VaultItemCreatedCountValidator } from "./validators/vault-item-created-count-validator";

export class NextAchievementService implements AchievementServiceAbstraction {
  constructor(private readonly eventLogs: UserEventLogProvider) {}

  private hubs = new Map<string, AchievementHub>();

  private getHub(account: Account) {
    if (!this.hubs.has(account.id)) {
      // FIXME: sync these from the server and load them
      const validators$ = new BehaviorSubject<AchievementValidator[]>([
        ...VaultItemCreatedCountValidator.createValidators(ItemCreatedCountConfig.AllConfigs),
        ...SendItemCreatedCountValidator.createValidators(SendItemCreatedCountConfig.AllConfigs),
      ]);

      // FIXME: load stored achievements
      const achievements$ = from([] as AchievementEvent[]);
      const events$ = this.eventLogs.monitor$(account);
      const hub = new AchievementHub(validators$, events$, achievements$);

      this.hubs.set(account.id, hub);
    }

    return this.hubs.get(account.id)!;
  }

  private _achievements: Achievement[] = [
    ...ItemCreatedCountConfig.AllConfigs,
    ...SendItemCreatedCountConfig.AllConfigs,
  ];

  private _achievementsSubject = from(this._achievements);

  achievementMap() {
    return new Map(this._achievements.map((a) => [a.achievement, a] as const));
  }

  earnedStream$(account: Account, all: boolean = false) {
    const hub = this.getHub(account);
    if (all) {
      return hub.all$().pipe(filter(isEarnedEvent));
    } else {
      return hub.new$().pipe(filter(isEarnedEvent));
    }
  }

  earnedMap$(account: Account) {
    return this.getHub(account).earned$();
  }

  progressStream$(account: Account, all: boolean = false) {
    const hub = this.getHub(account);
    if (all) {
      return hub.all$().pipe(filter(isProgressEvent));
    } else {
      return hub.new$().pipe(filter(isProgressEvent));
    }
  }

  metricsMap$(account: Account) {
    return this.getHub(account).metrics$();
  }

  achievementById$(achievementId: string): Observable<Achievement> {
    return this._achievementsSubject.pipe(
      find((item: Achievement) => item.name === achievementId),
      filter((f): f is Achievement => !!f),
    );
  }

  earned$: Observable<AchievementEarnedEvent> = EMPTY;
  inProgress$: Observable<AchievementProgressEvent> = EMPTY;
  achievementsEarned$(userId: UserId): Observable<AchievementEarnedEvent> {
    return EMPTY;
  }

  achievementsInProgress$(userId: UserId): Observable<AchievementProgressEvent> {
    return EMPTY;
  }
}
