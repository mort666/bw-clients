import { Type } from "./data";
import { earnedEvent, progressEvent } from "./events";
import { AchievementId, AchievementProgressId, AchievementValidator } from "./types";

const ItemCreatedProgress = "item-created-progress" as AchievementProgressId;

const ItemCreatedAchievement = "item-created" as AchievementId;
const ThreeItemsCreatedAchievement = "three-vault-items-created" as AchievementId;
const FiveItemsCreatedAchievement = "five-vault-items-created" as AchievementId;

const ItemCreatedValidator = {
  achievement: ItemCreatedAchievement,
  progress: ItemCreatedProgress,
  evaluator: Type.Threshold,
  trigger: "once",
  hidden: false,
  filter(item) {
    return item.action === "vault-item-added";
  },
  action(item, progress) {
    return [progressEvent(ItemCreatedProgress), earnedEvent(ItemCreatedAchievement)];
  },
} satisfies AchievementValidator;

const ThreeItemsCreatedValidator = {
  achievement: ThreeItemsCreatedAchievement,
  progress: ItemCreatedProgress,
  evaluator: Type.Threshold,
  trigger: { low: 2, high: 3 },
  hidden: false,
  filter(item) {
    return item.action === "vault-item-added";
  },
  action(item, progress) {
    if (!progress) {
      return [progressEvent(ItemCreatedProgress)];
    }

    const value = progress.achievement.value + 1;
    if (value >= 3) {
      return [earnedEvent(ThreeItemsCreatedAchievement)];
    }

    return [progressEvent(ItemCreatedProgress, value)];
  },
} satisfies AchievementValidator;

const FiveItemsCreatedValidator = {
  achievement: ThreeItemsCreatedAchievement,
  progress: ItemCreatedProgress,
  evaluator: Type.Threshold,
  trigger: { low: 4, high: 5 },
  hidden: false,
  filter(item) {
    return item.action === "vault-item-added";
  },
  action(item, progress) {
    const value = 1 + (progress?.achievement?.value ?? 0);
    if (value >= 3) {
      return [earnedEvent(FiveItemsCreatedAchievement)];
    }

    return [progressEvent(ItemCreatedProgress, value)];
  },
} satisfies AchievementValidator;

export {
  ItemCreatedProgress,
  ItemCreatedAchievement,
  ItemCreatedValidator,
  ThreeItemsCreatedAchievement,
  ThreeItemsCreatedValidator,
  FiveItemsCreatedAchievement,
  FiveItemsCreatedValidator,
};
