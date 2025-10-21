import { Jsonify } from "type-fest";

import { Card as SdkCard } from "@bitwarden/sdk-internal";

import { EncString } from "../../../key-management/crypto/models/enc-string";
import Domain from "../../../platform/models/domain/domain-base";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { CardData } from "../data/card.data";
import { CardView } from "../view/card.view";

export class Card extends Domain {
  cardholderName?: EncString;
  brand?: EncString;
  number?: EncString;
  expMonth?: EncString;
  expYear?: EncString;
  code?: EncString;

  constructor(obj?: CardData) {
    super();
    if (obj == null) {
      return;
    }

    this.cardholderName =
      obj.cardholderName != null ? new EncString(obj.cardholderName) : undefined;
    this.brand = obj.brand != null ? new EncString(obj.brand) : undefined;
    this.number = obj.number != null ? new EncString(obj.number) : undefined;
    this.expMonth = obj.expMonth != null ? new EncString(obj.expMonth) : undefined;
    this.expYear = obj.expYear != null ? new EncString(obj.expYear) : undefined;
    this.code = obj.code != null ? new EncString(obj.code) : undefined;
  }

  async decrypt(
    orgId: string | undefined,
    context = "No Cipher Context",
    encKey?: SymmetricCryptoKey,
  ): Promise<CardView> {
    return this.decryptObj<Card, CardView>(
      this,
      new CardView(),
      ["cardholderName", "brand", "number", "expMonth", "expYear", "code"],
      orgId ?? null,
      encKey,
      "DomainType: Card; " + context,
    );
  }

  toCardData(): CardData {
    const c = new CardData();
    this.buildDataModel(this, c, {
      cardholderName: null,
      brand: null,
      number: null,
      expMonth: null,
      expYear: null,
      code: null,
    });
    return c;
  }

  static fromJSON(obj: Partial<Jsonify<Card>> | undefined): Card | undefined {
    if (obj == null) {
      return undefined;
    }

    const card = new Card();
    card.cardholderName =
      obj.cardholderName != null ? EncString.fromJSON(obj.cardholderName) : undefined;
    card.brand = obj.brand != null ? EncString.fromJSON(obj.brand) : undefined;
    card.number = obj.number != null ? EncString.fromJSON(obj.number) : undefined;
    card.expMonth = obj.expMonth != null ? EncString.fromJSON(obj.expMonth) : undefined;
    card.expYear = obj.expYear != null ? EncString.fromJSON(obj.expYear) : undefined;
    card.code = obj.code != null ? EncString.fromJSON(obj.code) : undefined;

    return card;
  }

  /**
   *  Maps Card to SDK format.
   *
   * @returns {SdkCard} The SDK card object.
   */
  toSdkCard(): SdkCard {
    return {
      cardholderName: this.cardholderName?.toSdk(),
      brand: this.brand?.toSdk(),
      number: this.number?.toSdk(),
      expMonth: this.expMonth?.toSdk(),
      expYear: this.expYear?.toSdk(),
      code: this.code?.toSdk(),
    };
  }

  /**
   * Maps an SDK Card object to a Card
   * @param obj - The SDK Card object
   */
  static fromSdkCard(obj: SdkCard | undefined): Card | undefined {
    if (!obj) {
      return undefined;
    }

    const card = new Card();
    card.cardholderName =
      obj.cardholderName != null ? EncString.fromJSON(obj.cardholderName) : undefined;
    card.brand = obj.brand != null ? EncString.fromJSON(obj.brand) : undefined;
    card.number = obj.number != null ? EncString.fromJSON(obj.number) : undefined;
    card.expMonth = obj.expMonth != null ? EncString.fromJSON(obj.expMonth) : undefined;
    card.expYear = obj.expYear != null ? EncString.fromJSON(obj.expYear) : undefined;
    card.code = obj.code != null ? EncString.fromJSON(obj.code) : undefined;

    return card;
  }
}
