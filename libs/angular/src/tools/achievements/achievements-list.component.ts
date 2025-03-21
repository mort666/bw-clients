import { CommonModule } from "@angular/common";
import { Component, NgZone } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter, switchMap } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AccountService, Account } from "@bitwarden/common/auth/abstractions/account.service";
import { AchievementService } from "@bitwarden/common/tools/achievements/achievement.service.abstraction";
import {
  Achievement,
  AchievementEarnedEvent,
  AchievementId,
  AchievementProgressEvent,
  MetricId,
} from "@bitwarden/common/tools/achievements/types";
import {
  ButtonModule,
  Icon,
  IconButtonModule,
  ItemModule,
  SectionComponent,
  SectionHeaderComponent,
  TypographyModule,
} from "@bitwarden/components";

import { AchievementItem } from "./achievement-item.component";
import { AchievementIcon } from "./icons/achievement.icon";
import { iconMap } from "./icons/icon-map";

@Component({
  selector: "achievements-list",
  templateUrl: "achievements-list.component.html",
  standalone: true,
  imports: [
    CommonModule,
    ItemModule,
    ButtonModule,
    IconButtonModule,
    SectionComponent,
    TypographyModule,
    JslibModule,
    SectionHeaderComponent,
    AchievementItem,
  ],
})
export class AchievementsListComponent {
  protected achievements: Array<Achievement>;
  private _active: Set<AchievementId> = new Set();
  private _earned: Map<AchievementId, AchievementEarnedEvent> = new Map();
  private _progress: Map<MetricId, AchievementProgressEvent> = new Map();

  constructor(
    private achievementService: AchievementService,
    private accountService: AccountService,
    zone: NgZone,
  ) {
    this.achievements = Array.from(achievementService.achievementMap().values());

    const account$ = this.accountService.activeAccount$.pipe(
      filter((account): account is Account => !!account),
    );

    account$
      .pipe(
        switchMap((account) => this.achievementService.earnedMap$(account)),
        takeUntilDestroyed(),
      )
      .subscribe((earned) => zone.run(() => (this._earned = earned)));

    account$
      .pipe(
        switchMap((account) => this.achievementService.metricsMap$(account)),
        takeUntilDestroyed(),
      )
      .subscribe((progress) => zone.run(() => (this._progress = progress)));

    account$
      .pipe(
        switchMap((account) => this.achievementService.active$(account)),
        takeUntilDestroyed(),
      )
      .subscribe((active) => zone.run(() => (this._active = active)));
  }

  protected isEarned(achievement: Achievement) {
    return this._earned.has(achievement.achievement);
  }

  protected earnedDate(achievement: Achievement) {
    return new Date(this._earned.get(achievement.achievement)?.["@timestamp"] ?? 0);
  }

  protected progress(achievement: Achievement) {
    if (achievement.active === "until-earned" || this._earned.has(achievement.achievement)) {
      return -1;
    }

    return this._progress.get(achievement.active.metric)?.achievement?.value ?? -1;
  }

  protected goal(achievement: Achievement) {
    if (achievement.active === "until-earned" || !this._active.has(achievement.achievement)) {
      return -1;
    }

    return this._progress.get(achievement.active.metric)?.achievement?.goal ?? -1;
  }

  protected icon(achievement: Achievement): Icon {
    return (iconMap[achievement.achievement] as Icon) ?? AchievementIcon;
  }
}
