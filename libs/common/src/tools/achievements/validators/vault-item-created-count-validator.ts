import { CipherType } from "../../../vault/enums";
import { EventFormat } from "../../log/ecs-format";
import { earnedEvent, progressEvent } from "../achievement-events";
import { AchievementProgressEvent, AchievementValidator, MetricId } from "../types";

import { ItemCreatedCountConfig } from "./config/item-created-count-config";

/**
 * Creates a validator that will be customized to a custom count achievement
 * @param config contains the information to create the validator and achievement info.
 * The defined config should be input as example: ItemCreatedCountConfig.ItemCreated
 *
 * Will track the count achievements for all vault items and individual vault items.
 */
export class VaultItemCreatedCountValidator implements AchievementValidator {
  private itemCreatedProgress: MetricId;
  constructor(private config: ItemCreatedCountConfig) {
    this.itemCreatedProgress =
      `item-${config.cipherType ? `${CipherType[config.cipherType]}-` : ""}quantity` as MetricId;
  }

  base: AchievementValidator;
  get achievement() {
    return this.config.achievement;
  }
  get name() {
    return this.config.name;
  }
  get validator() {
    return this.config.validator;
  }
  get active() {
    return this.config.active;
  }
  get hidden() {
    return this.config.hidden;
  }

  trigger(item: EventFormat) {
    return (
      item.action ===
      `vault-${this.config.cipherType ? `${CipherType[this.config.cipherType]}-` : ""}item-added`
    );
  }

  measure(_item: EventFormat, progress: Map<MetricId, number>) {
    const value = 1 + (progress.get(this.itemCreatedProgress) ?? 0);
    return [progressEvent(this.itemCreatedProgress, value)];
  }

  award(_measured: AchievementProgressEvent[], progress: Map<MetricId, number>) {
    const value = progress.get(this.itemCreatedProgress) ?? 0;
    return value >= this.config.threshold ? [earnedEvent(this.achievement)] : [];
  }
}
