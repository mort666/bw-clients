import { Jsonify } from "type-fest";

import { Identity as SdkIdentity } from "@bitwarden/sdk-internal";

import { EncString } from "../../../key-management/crypto/models/enc-string";
import Domain from "../../../platform/models/domain/domain-base";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { IdentityData } from "../data/identity.data";
import { IdentityView } from "../view/identity.view";

export class Identity extends Domain {
  title?: EncString;
  firstName?: EncString;
  middleName?: EncString;
  lastName?: EncString;
  address1?: EncString;
  address2?: EncString;
  address3?: EncString;
  city?: EncString;
  state?: EncString;
  postalCode?: EncString;
  country?: EncString;
  company?: EncString;
  email?: EncString;
  phone?: EncString;
  ssn?: EncString;
  username?: EncString;
  passportNumber?: EncString;
  licenseNumber?: EncString;

  constructor(obj?: IdentityData) {
    super();
    if (obj == null) {
      return;
    }

    this.title = obj.title != null ? new EncString(obj.title) : undefined;
    this.firstName = obj.firstName != null ? new EncString(obj.firstName) : undefined;
    this.middleName = obj.middleName != null ? new EncString(obj.middleName) : undefined;
    this.lastName = obj.lastName != null ? new EncString(obj.lastName) : undefined;
    this.address1 = obj.address1 != null ? new EncString(obj.address1) : undefined;
    this.address2 = obj.address2 != null ? new EncString(obj.address2) : undefined;
    this.address3 = obj.address3 != null ? new EncString(obj.address3) : undefined;
    this.city = obj.city != null ? new EncString(obj.city) : undefined;
    this.state = obj.state != null ? new EncString(obj.state) : undefined;
    this.postalCode = obj.postalCode != null ? new EncString(obj.postalCode) : undefined;
    this.country = obj.country != null ? new EncString(obj.country) : undefined;
    this.company = obj.company != null ? new EncString(obj.company) : undefined;
    this.email = obj.email != null ? new EncString(obj.email) : undefined;
    this.phone = obj.phone != null ? new EncString(obj.phone) : undefined;
    this.ssn = obj.ssn != null ? new EncString(obj.ssn) : undefined;
    this.username = obj.username != null ? new EncString(obj.username) : undefined;
    this.passportNumber =
      obj.passportNumber != null ? new EncString(obj.passportNumber) : undefined;
    this.licenseNumber = obj.licenseNumber != null ? new EncString(obj.licenseNumber) : undefined;
  }

  decrypt(
    orgId: string | undefined,
    context: string = "No Cipher Context",
    encKey?: SymmetricCryptoKey,
  ): Promise<IdentityView> {
    return this.decryptObj<Identity, IdentityView>(
      this,
      new IdentityView(),
      [
        "title",
        "firstName",
        "middleName",
        "lastName",
        "address1",
        "address2",
        "address3",
        "city",
        "state",
        "postalCode",
        "country",
        "company",
        "email",
        "phone",
        "ssn",
        "username",
        "passportNumber",
        "licenseNumber",
      ],
      orgId ?? null,
      encKey,
      "DomainType: Identity; " + context,
    );
  }

  toIdentityData(): IdentityData {
    const i = new IdentityData();
    this.buildDataModel(this, i, {
      title: null,
      firstName: null,
      middleName: null,
      lastName: null,
      address1: null,
      address2: null,
      address3: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      company: null,
      email: null,
      phone: null,
      ssn: null,
      username: null,
      passportNumber: null,
      licenseNumber: null,
    });
    return i;
  }

  static fromJSON(obj: Jsonify<Identity> | undefined): Identity | undefined {
    if (obj == null) {
      return undefined;
    }

    const identity = new Identity();
    identity.title = obj.title != null ? EncString.fromJSON(obj.title) : undefined;
    identity.firstName = obj.firstName != null ? EncString.fromJSON(obj.firstName) : undefined;
    identity.middleName = obj.middleName != null ? EncString.fromJSON(obj.middleName) : undefined;
    identity.lastName = obj.lastName != null ? EncString.fromJSON(obj.lastName) : undefined;
    identity.address1 = obj.address1 != null ? EncString.fromJSON(obj.address1) : undefined;
    identity.address2 = obj.address2 != null ? EncString.fromJSON(obj.address2) : undefined;
    identity.address3 = obj.address3 != null ? EncString.fromJSON(obj.address3) : undefined;
    identity.city = obj.city != null ? EncString.fromJSON(obj.city) : undefined;
    identity.state = obj.state != null ? EncString.fromJSON(obj.state) : undefined;
    identity.postalCode = obj.postalCode != null ? EncString.fromJSON(obj.postalCode) : undefined;
    identity.country = obj.country != null ? EncString.fromJSON(obj.country) : undefined;
    identity.company = obj.company != null ? EncString.fromJSON(obj.company) : undefined;
    identity.email = obj.email != null ? EncString.fromJSON(obj.email) : undefined;
    identity.phone = obj.phone != null ? EncString.fromJSON(obj.phone) : undefined;
    identity.ssn = obj.ssn != null ? EncString.fromJSON(obj.ssn) : undefined;
    identity.username = obj.username != null ? EncString.fromJSON(obj.username) : undefined;
    identity.passportNumber =
      obj.passportNumber != null ? EncString.fromJSON(obj.passportNumber) : undefined;
    identity.licenseNumber =
      obj.licenseNumber != null ? EncString.fromJSON(obj.licenseNumber) : undefined;

    return identity;
  }

  /**
   * Maps Identity to SDK format.
   *
   * @returns {SdkIdentity} The SDK identity object.
   */
  toSdkIdentity(): SdkIdentity {
    return {
      title: this.title?.toSdk(),
      firstName: this.firstName?.toSdk(),
      middleName: this.middleName?.toSdk(),
      lastName: this.lastName?.toSdk(),
      address1: this.address1?.toSdk(),
      address2: this.address2?.toSdk(),
      address3: this.address3?.toSdk(),
      city: this.city?.toSdk(),
      state: this.state?.toSdk(),
      postalCode: this.postalCode?.toSdk(),
      country: this.country?.toSdk(),
      company: this.company?.toSdk(),
      email: this.email?.toSdk(),
      phone: this.phone?.toSdk(),
      ssn: this.ssn?.toSdk(),
      username: this.username?.toSdk(),
      passportNumber: this.passportNumber?.toSdk(),
      licenseNumber: this.licenseNumber?.toSdk(),
    };
  }

  /**
   * Maps an SDK Identity object to an Identity
   * @param obj - The SDK Identity object
   */
  static fromSdkIdentity(obj: SdkIdentity | undefined): Identity | undefined {
    if (obj == null) {
      return undefined;
    }

    const identity = new Identity();
    identity.title = obj.title != null ? EncString.fromJSON(obj.title) : undefined;
    identity.firstName = obj.firstName != null ? EncString.fromJSON(obj.firstName) : undefined;
    identity.middleName = obj.middleName != null ? EncString.fromJSON(obj.middleName) : undefined;
    identity.lastName = obj.lastName != null ? EncString.fromJSON(obj.lastName) : undefined;
    identity.address1 = obj.address1 != null ? EncString.fromJSON(obj.address1) : undefined;
    identity.address2 = obj.address2 != null ? EncString.fromJSON(obj.address2) : undefined;
    identity.address3 = obj.address3 != null ? EncString.fromJSON(obj.address3) : undefined;
    identity.city = obj.city != null ? EncString.fromJSON(obj.city) : undefined;
    identity.state = obj.state != null ? EncString.fromJSON(obj.state) : undefined;
    identity.postalCode = obj.postalCode != null ? EncString.fromJSON(obj.postalCode) : undefined;
    identity.country = obj.country != null ? EncString.fromJSON(obj.country) : undefined;
    identity.company = obj.company != null ? EncString.fromJSON(obj.company) : undefined;
    identity.email = obj.email != null ? EncString.fromJSON(obj.email) : undefined;
    identity.phone = obj.phone != null ? EncString.fromJSON(obj.phone) : undefined;
    identity.ssn = obj.ssn != null ? EncString.fromJSON(obj.ssn) : undefined;
    identity.username = obj.username != null ? EncString.fromJSON(obj.username) : undefined;
    identity.passportNumber =
      obj.passportNumber != null ? EncString.fromJSON(obj.passportNumber) : undefined;
    identity.licenseNumber =
      obj.licenseNumber != null ? EncString.fromJSON(obj.licenseNumber) : undefined;

    return identity;
  }
}
