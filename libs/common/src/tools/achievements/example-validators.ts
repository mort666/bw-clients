import { Type } from "./data";
import { earnedEvent, progressEvent } from "./events";
import { AchievementId, MetricId, AchievementValidator } from "./types";

const ItemCreatedProgress = "item-quantity" as MetricId;

const ItemCreatedAchievement = "item-created" as AchievementId;
const ThreeItemsCreatedAchievement = "three-vault-items-created" as AchievementId;
const FiveItemsCreatedAchievement = "five-vault-items-created" as AchievementId;

const ItemCreatedValidator = {
  achievement: ItemCreatedAchievement,
  metric: ItemCreatedProgress,
  evaluator: Type.Threshold,
  trigger: "once",
  hidden: false,
  filter(item) {
    return item.action === "vault-item-added";
  },
  measure(item, progress) {
    return [progressEvent(ItemCreatedProgress)];
  },
  earn(progress) {
    return [earnedEvent(ItemCreatedAchievement)];
  },
} satisfies AchievementValidator;

const ThreeItemsCreatedValidator = {
  achievement: ThreeItemsCreatedAchievement,
  metric: ItemCreatedProgress,
  evaluator: Type.Threshold,
  trigger: { low: 2, high: 3 },
  hidden: false,
  filter(item) {
    return item.action === "vault-item-added";
  },
  measure(_item, progress) {
    const value = 1 + (progress.get(ItemCreatedProgress) ?? 0);
    return [progressEvent(ItemCreatedProgress, value)];
  },
  earn(_measured, progress) {
    const value = progress.get(ItemCreatedProgress) ?? 0;
    return value >= 3 ? [earnedEvent(ItemCreatedAchievement)] : [];
  },
} satisfies AchievementValidator;

const FiveItemsCreatedValidator = {
  achievement: ThreeItemsCreatedAchievement,
  metric: ItemCreatedProgress,
  evaluator: Type.Threshold,
  trigger: { low: 4, high: 5 },
  hidden: false,
  filter(item) {
    return item.action === "vault-item-added";
  },
  measure(_item, progress) {
    const value = 1 + (progress.get(ItemCreatedProgress) ?? 0);
    return [progressEvent(ItemCreatedProgress, value)];
  },
  earn(_measured, progress) {
    const value = progress.get(ItemCreatedProgress) ?? 0;
    return value >= 5 ? [earnedEvent(ItemCreatedAchievement)] : [];
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
