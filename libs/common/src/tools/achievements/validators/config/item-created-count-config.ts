import { CipherType } from "../../../../vault/enums";
import { Type } from "../../data";
import { Achievement, AchievementId, MetricId } from "../../types";

/**
 * Creates the ability to add configs for different achievements at
 * defined thresholds for items created in the vault. Creating the config
 * with no cipher type is used for validations where the type is not needed
 */
export class ItemCreatedCountConfig implements Achievement {
  // Define the achievements here
  static readonly AllConfigs: ItemCreatedCountConfig[] = [
    // Any vault items added
    new ItemCreatedCountConfig("vault-item-created", "1st item added", 1),
    new ItemCreatedCountConfig("vault-items-created-ten", "10 items created", 10),
    new ItemCreatedCountConfig("vault-items-created-fifty", "50 items created", 50),
    new ItemCreatedCountConfig("vault-items-created-one-hundred", "100 items created", 100),

    // Login items added
    new ItemCreatedCountConfig("login-item-created", "1st login item added", 1, CipherType.Login),
    new ItemCreatedCountConfig(
      "login-item-created-ten",
      "10 login items added",
      10,
      CipherType.Login,
    ),
    new ItemCreatedCountConfig(
      "login-item-created-fifty",
      "50 login items added",
      50,
      CipherType.Login,
    ),
    new ItemCreatedCountConfig(
      "login-item-created-one-hundred",
      "100 login items added",
      100,
      CipherType.Login,
    ),

    // Card items
    new ItemCreatedCountConfig("card-item-created", "1st card item added", 1, CipherType.Card),
    new ItemCreatedCountConfig("card-item-created-3", "3rd card items added", 3, CipherType.Card),
    new ItemCreatedCountConfig("card-item-created-5", "5th card item added", 5, CipherType.Card),

    // Note items
    new ItemCreatedCountConfig(
      "note-item-created",
      "1st card item added",
      1,
      CipherType.SecureNote,
    ),
    new ItemCreatedCountConfig(
      "note-item-created-ten",
      "10 card items added",
      10,
      CipherType.SecureNote,
    ),
    new ItemCreatedCountConfig(
      "note-item-created-fifty",
      "50 card items added",
      50,
      CipherType.SecureNote,
    ),
    new ItemCreatedCountConfig(
      "note-item-created-one-hundred",
      "100 card items added",
      100,
      CipherType.SecureNote,
    ),

    // SSH Key - Achievements indicate only one so just set threshold at 1
    new ItemCreatedCountConfig("ssh-key-item-created", "1st SSH Key added", 1),
  ];

  base: Achievement;
  get achievement() {
    return this.base.achievement;
  }

  get name() {
    return this.base.name;
  }

  get validator() {
    return this.base.validator;
  }

  get active() {
    return this.base.active;
  }

  get hidden() {
    return this.base.hidden;
  }
  cipherType: CipherType | null = null;
  threshold: number;
  private constructor(
    key: string,
    name: string,
    threshold: number,
    cipherType: CipherType | null = null,
  ) {
    this.cipherType = cipherType;
    this.threshold = threshold;
    this.base = {
      achievement: key as AchievementId,
      name: name,
      validator: Type.Threshold,
      active: {
        metric:
          `item-${cipherType ? `${CipherType[cipherType].toLowerCase()}-` : ""}quantity` as MetricId,
        low: threshold - 1,
        high: threshold,
      },
      hidden: false,
    };
  }
}
