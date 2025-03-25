import { firstValueFrom, map } from "rxjs";
import { SemVer } from "semver";

import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { BulkEncryptService } from "@bitwarden/common/key-management/crypto/abstractions/bulk-encrypt.service";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { View } from "@bitwarden/common/models/view/view";
import Domain from "@bitwarden/common/platform/models/domain/domain-base";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { OrgKey, UserKey } from "@bitwarden/common/types/key";
import { CipherType, FieldType } from "@bitwarden/common/vault/enums";
import { Attachment } from "@bitwarden/common/vault/models/domain/attachment";
import { Card } from "@bitwarden/common/vault/models/domain/card";
import { Fido2Credential } from "@bitwarden/common/vault/models/domain/fido2-credential";
import { Field } from "@bitwarden/common/vault/models/domain/field";
import { Identity } from "@bitwarden/common/vault/models/domain/identity";
import { Login } from "@bitwarden/common/vault/models/domain/login";
import { LoginUri } from "@bitwarden/common/vault/models/domain/login-uri";
import { Password } from "@bitwarden/common/vault/models/domain/password";
import { SecureNote } from "@bitwarden/common/vault/models/domain/secure-note";
import { SshKey } from "@bitwarden/common/vault/models/domain/ssh-key";
import { AttachmentView } from "@bitwarden/common/vault/models/view/attachment.view";
import { FieldView } from "@bitwarden/common/vault/models/view/field.view";
import { PasswordHistoryView } from "@bitwarden/common/vault/models/view/password-history.view";
import { KeyService } from "@bitwarden/key-management";

import { ConfigService } from "../../platform/abstractions/config/config.service";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { OrganizationId, UserId } from "../../types/guid";
import {
  CipherEncryptionService,
  EncCipherAttachment,
} from "../abstractions/cipher-encryption.service";
import { Cipher } from "../models/domain/cipher";
import { CipherView } from "../models/view/cipher.view";

const CIPHER_KEY_ENC_MIN_SERVER_VER = new SemVer("2024.2.0");

export class DefaultCipherEncryptionService implements CipherEncryptionService {
  constructor(
    private encryptService: EncryptService,
    private bulkEncryptService: BulkEncryptService,
    private keyService: KeyService,
    private configService: ConfigService,
  ) {}

  async encrypt(
    model: CipherView,
    userId: UserId,
    keyForCipherEncryption?: SymmetricCryptoKey,
    keyForCipherKeyDecryption?: SymmetricCryptoKey,
    originalCipher?: Cipher,
  ): Promise<Cipher> {
    const cipher = new Cipher();
    cipher.id = model.id;
    cipher.folderId = model.folderId;
    cipher.favorite = model.favorite;
    cipher.organizationId = model.organizationId;
    cipher.type = model.type;
    cipher.collectionIds = model.collectionIds;
    cipher.revisionDate = model.revisionDate;
    cipher.reprompt = model.reprompt;
    cipher.edit = model.edit;

    if (await this.getCipherKeyEncryptionEnabled()) {
      cipher.key = originalCipher?.key ?? null;
      const userOrOrgKey = await this.getKeyForCipherKeyDecryption(cipher, userId);
      // The keyForEncryption is only used for encrypting the cipher key, not the cipher itself, since cipher key encryption is enabled.
      // If the caller has provided a key for cipher key encryption, use it. Otherwise, use the user or org key.
      keyForCipherEncryption ||= userOrOrgKey;
      // If the caller has provided a key for cipher key decryption, use it. Otherwise, use the user or org key.
      keyForCipherKeyDecryption ||= userOrOrgKey;
      return this.encryptCipherWithCipherKey(
        model,
        cipher,
        keyForCipherEncryption,
        keyForCipherKeyDecryption,
      );
    } else {
      keyForCipherEncryption ||= await this.getKeyForCipherKeyDecryption(cipher, userId);
      // We want to ensure that the cipher key is null if cipher key encryption is disabled
      // so that decryption uses the proper key.
      cipher.key = null;
      return this.encryptCipher(model, cipher, keyForCipherEncryption);
    }
  }

  async encryptCipherAttachmentData(
    cipher: Cipher,
    fileName: string,
    data: Uint8Array,
    userId: UserId,
  ): Promise<EncCipherAttachment> {
    const encKey = (await this.getKeyForCipherKeyDecryption(cipher, userId)) as SymmetricCryptoKey;
    const cipherKeyEncryptionEnabled = await this.getCipherKeyEncryptionEnabled();
    let cipherEncKey: UserKey | OrgKey;
    if (cipherKeyEncryptionEnabled && cipher.key != null) {
      const keyBytes = await this.encryptService.decryptToBytes(cipher.key, encKey);
      if (keyBytes == null) {
        throw new Error("Cipher key decryption failed. Failed to decrypt the cipher key.");
      }
      cipherEncKey = new SymmetricCryptoKey(keyBytes) as UserKey | OrgKey;
    } else {
      cipherEncKey = encKey as UserKey | OrgKey;
    }
    const encFileName = await this.encryptService.encrypt(fileName, cipherEncKey);
    const dataEncKey = await this.keyService.makeDataEncKey(cipherEncKey);
    const encData = await this.encryptService.encryptToBytes(new Uint8Array(data), dataEncKey[0]);
    return {
      encFileName,
      dataEncKey,
      encData,
    };
  }

  async decryptMany(ciphers: Cipher[], userId: UserId): Promise<CipherView[] | null> {
    const keys = await firstValueFrom(this.keyService.cipherDecryptionKeys$(userId, true));

    if (keys == null || (keys.userKey == null && Object.keys(keys.orgKeys ?? {}).length === 0)) {
      return null;
    }

    // Group ciphers by orgId or under 'null' for the user's ciphers
    const grouped = ciphers.reduce(
      (agg, c) => {
        agg[c.organizationId as OrganizationId] ??= [];
        agg[c.organizationId as OrganizationId].push(c);
        return agg;
      },
      {} as Record<OrganizationId, Cipher[]>,
    );

    const allCipherViews = (
      await Promise.all(
        Object.entries(grouped).map(async ([orgId, groupedCiphers]) => {
          const key = (keys.orgKeys ?? {})[orgId as OrganizationId] ?? keys.userKey;
          if (await this.configService.getFeatureFlag(FeatureFlag.PM4154_BulkEncryptionService)) {
            return await this.bulkEncryptService.decryptItems(groupedCiphers, key);
          } else {
            return await this.encryptService.decryptItems(groupedCiphers, key);
          }
        }),
      )
    ).flat();

    return allCipherViews as CipherView[];
  }

  async decrypt(cipher: Cipher, userId: UserId): Promise<CipherView | null> {
    const decrypted = await this.decryptMany([cipher], userId);
    return decrypted?.[0] ?? null;
  }

  async getKeyForCipherKeyDecryption(cipher: Cipher, userId: UserId): Promise<UserKey | OrgKey> {
    return (
      (await firstValueFrom(
        this.keyService
          .orgKeys$(userId)
          .pipe(map((keys) => keys?.[cipher.organizationId as OrganizationId] ?? null)),
      )) || ((await this.keyService.getUserKeyWithLegacySupport(userId)) as UserKey)
    );
  }

  async encryptCipherWithCipherKey(
    model: CipherView,
    cipher: Cipher,
    keyForCipherKeyEncryption: SymmetricCryptoKey,
    keyForCipherKeyDecryption: SymmetricCryptoKey,
  ): Promise<Cipher> {
    // First, we get the key for cipher key encryption, in its decrypted form
    let decryptedCipherKey: SymmetricCryptoKey;
    if (cipher.key == null) {
      decryptedCipherKey = await this.keyService.makeCipherKey();
    } else {
      const keyBytes = await this.encryptService.decryptToBytes(
        cipher.key,
        keyForCipherKeyDecryption,
      );

      if (keyBytes == null) {
        throw new Error("Cipher key decryption failed. Failed to decrypt the cipher key.");
      }

      decryptedCipherKey = new SymmetricCryptoKey(keyBytes);
    }

    // Then, we have to encrypt the cipher key with the proper key.
    cipher.key = await this.encryptService.encrypt(
      decryptedCipherKey.key,
      keyForCipherKeyEncryption,
    );

    // Finally, we can encrypt the cipher with the decrypted cipher key.
    return this.encryptCipher(model, cipher, decryptedCipherKey);
  }

  /**
   * Encrypts a cipher object.
   * @param model The cipher view model.
   * @param cipher The cipher object.
   * @param key The encryption key to encrypt with. This can be the org key, user key or cipher key, but must never be null
   */
  async encryptCipher(model: CipherView, cipher: Cipher, key: SymmetricCryptoKey): Promise<Cipher> {
    if (key == null) {
      throw new Error(
        "Key to encrypt cipher must not be null. Use the org key, user key or cipher key.",
      );
    }

    await Promise.all([
      this.encryptObjProperty(
        model,
        cipher,
        {
          name: null,
          notes: null,
        },
        key,
      ),
      this.encryptCipherData(cipher, model, key),
      this.encryptFields(model.fields, key).then((fields) => {
        cipher.fields = fields ?? [];
      }),
      this.encryptPasswordHistories(model.passwordHistory, key).then((ph) => {
        cipher.passwordHistory = ph ?? [];
      }),
      this.encryptAttachments(model.attachments, key).then((attachments) => {
        cipher.attachments = attachments ?? [];
      }),
    ]);
    return cipher;
  }

  async encryptObjProperty<V extends View, D extends Domain>(
    model: V,
    obj: D,
    map: any,
    key: SymmetricCryptoKey,
  ): Promise<void> {
    const promises = [];
    const self = this;

    for (const prop in map) {
      // eslint-disable-next-line
      if (!map.hasOwnProperty(prop)) {
        continue;
      }

      (function (theProp, theObj) {
        const p = Promise.resolve()
          .then(() => {
            const modelProp = (model as any)[map[theProp] || theProp];
            if (modelProp && modelProp !== "") {
              return self.encryptService.encrypt(modelProp, key);
            }
            return null;
          })
          .then((val: EncString | null) => {
            (theObj as any)[theProp] = val;
          });
        promises.push(p);
      })(prop, obj);
    }

    await Promise.all(promises);
  }

  async encryptCipherData(cipher: Cipher, model: CipherView, key: SymmetricCryptoKey) {
    switch (cipher.type) {
      case CipherType.Login:
        cipher.login = new Login();
        cipher.login.passwordRevisionDate = model.login.passwordRevisionDate;
        cipher.login.autofillOnPageLoad = model.login.autofillOnPageLoad;
        await this.encryptObjProperty(
          model.login,
          cipher.login,
          {
            username: null,
            password: null,
            totp: null,
          },
          key,
        );

        if (model.login.uris != null) {
          cipher.login.uris = [];
          model.login.uris = model.login.uris.filter((u) => u.uri != null && u.uri !== "");
          for (let i = 0; i < model.login.uris.length; i++) {
            const loginUri = new LoginUri();
            loginUri.match = model.login.uris[i].match;
            await this.encryptObjProperty(
              model.login.uris[i],
              loginUri,
              {
                uri: null,
              },
              key,
            );
            const uriHash = await this.encryptService.hash(model.login.uris[i].uri, "sha256");
            loginUri.uriChecksum = await this.encryptService.encrypt(uriHash, key);
            cipher.login.uris.push(loginUri);
          }
        }

        if (model.login.fido2Credentials != null) {
          cipher.login.fido2Credentials = await Promise.all(
            model.login.fido2Credentials.map(async (viewKey) => {
              const domainKey = new Fido2Credential();
              await this.encryptObjProperty(
                viewKey,
                domainKey,
                {
                  credentialId: null,
                  keyType: null,
                  keyAlgorithm: null,
                  keyCurve: null,
                  keyValue: null,
                  rpId: null,
                  rpName: null,
                  userHandle: null,
                  userName: null,
                  userDisplayName: null,
                  origin: null,
                },
                key,
              );
              domainKey.counter = await this.encryptService.encrypt(String(viewKey.counter), key);
              domainKey.discoverable = await this.encryptService.encrypt(
                String(viewKey.discoverable),
                key,
              );
              domainKey.creationDate = viewKey.creationDate;
              return domainKey;
            }),
          );
        }
        return;
      case CipherType.SecureNote:
        cipher.secureNote = new SecureNote();
        cipher.secureNote.type = model.secureNote.type;
        return;
      case CipherType.Card:
        cipher.card = new Card();
        await this.encryptObjProperty(
          model.card,
          cipher.card,
          {
            cardholderName: null,
            brand: null,
            number: null,
            expMonth: null,
            expYear: null,
            code: null,
          },
          key,
        );
        return;
      case CipherType.Identity:
        cipher.identity = new Identity();
        await this.encryptObjProperty(
          model.identity,
          cipher.identity,
          {
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
          },
          key,
        );
        return;
      case CipherType.SshKey:
        cipher.sshKey = new SshKey();
        await this.encryptObjProperty(
          model.sshKey,
          cipher.sshKey,
          {
            privateKey: null,
            publicKey: null,
            keyFingerprint: null,
          },
          key,
        );
        return;
      default:
        throw new Error("Unknown cipher type.");
    }
  }

  async encryptFields(fieldsModel: FieldView[], key: SymmetricCryptoKey): Promise<Field[] | null> {
    if (!fieldsModel || !fieldsModel.length) {
      return null;
    }

    const self = this;
    const encFields: Field[] = [];
    await fieldsModel.reduce(async (promise, field) => {
      await promise;
      const encField = await self.encryptField(field, key);
      encFields.push(encField);
    }, Promise.resolve());

    return encFields;
  }

  async encryptField(fieldModel: FieldView, key: SymmetricCryptoKey): Promise<Field> {
    const field = new Field();
    field.type = fieldModel.type;
    field.linkedId = fieldModel.linkedId;
    // normalize boolean type field values
    if (fieldModel.type === FieldType.Boolean && fieldModel.value !== "true") {
      fieldModel.value = "false";
    }

    await this.encryptObjProperty(
      fieldModel,
      field,
      {
        name: null,
        value: null,
      },
      key,
    );

    return field;
  }

  async getCipherKeyEncryptionEnabled(): Promise<boolean> {
    const featureEnabled = await this.configService.getFeatureFlag(FeatureFlag.CipherKeyEncryption);
    const meetsServerVersion = await firstValueFrom(
      this.configService.checkServerMeetsVersionRequirement$(CIPHER_KEY_ENC_MIN_SERVER_VER),
    );
    return featureEnabled && meetsServerVersion;
  }

  async encryptPasswordHistories(
    phModels: PasswordHistoryView[],
    key: SymmetricCryptoKey,
  ): Promise<Password[] | null> {
    if (!phModels || !phModels.length) {
      return null;
    }

    const self = this;
    const encPhs: Password[] = [];
    await phModels.reduce(async (promise, ph) => {
      await promise;
      const encPh = await self.encryptPasswordHistory(ph, key);
      encPhs.push(encPh);
    }, Promise.resolve());

    return encPhs;
  }

  async encryptPasswordHistory(
    phModel: PasswordHistoryView,
    key: SymmetricCryptoKey,
  ): Promise<Password> {
    const ph = new Password();
    ph.lastUsedDate = phModel.lastUsedDate;

    await this.encryptObjProperty(
      phModel,
      ph,
      {
        password: null,
      },
      key,
    );

    return ph;
  }

  async encryptAttachments(
    attachmentsModel: AttachmentView[],
    key: SymmetricCryptoKey,
  ): Promise<Attachment[] | null> {
    if (attachmentsModel == null || attachmentsModel.length === 0) {
      return null;
    }

    const promises: Promise<any>[] = [];
    const encAttachments: Attachment[] = [];
    attachmentsModel.forEach(async (model) => {
      const attachment = new Attachment();
      attachment.id = model.id;
      attachment.size = model.size;
      attachment.sizeName = model.sizeName;
      attachment.url = model.url;
      const promise = this.encryptObjProperty(
        model,
        attachment,
        {
          fileName: null,
        },
        key,
      ).then(async () => {
        if (model.key != null) {
          attachment.key = await this.encryptService.encrypt(model.key.key, key);
        }
        encAttachments.push(attachment);
      });
      promises.push(promise);
    });

    await Promise.all(promises);
    return encAttachments;
  }
}
