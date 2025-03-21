import { firstValueFrom } from "rxjs";

import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { BulkEncryptService } from "@bitwarden/common/key-management/crypto/abstractions/bulk-encrypt.service";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { CipherEncryptionService } from "@bitwarden/common/vault/abstractions/cipher-encryption.service";
import { KeyService } from "@bitwarden/key-management";

import { ConfigService } from "../../platform/abstractions/config/config.service";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { OrganizationId, UserId } from "../../types/guid";
import { Cipher } from "../models/domain/cipher";
import { CipherView } from "../models/view/cipher.view";

export class DefaultCipherEncryptionService implements CipherEncryptionService {
  constructor(
    private encryptService: EncryptService,
    private bulkEncryptService: BulkEncryptService,
    private keyService: KeyService,
    private configService: ConfigService,
  ) {}

  encrypt(
    cipher: CipherView,
    userId: UserId,
    keyForEncryption?: SymmetricCryptoKey,
    keyForCipherKeyDecryption?: SymmetricCryptoKey,
    originalCipher?: Cipher,
  ): Promise<Cipher> {
    throw new Error("Method not implemented.");
  }

  async decryptMany(ciphers: Cipher[], userId: UserId): Promise<CipherView[]> {
    const keys = await firstValueFrom(this.keyService.cipherDecryptionKeys$(userId, true));

    if (keys == null || (keys.userKey == null && Object.keys(keys.orgKeys ?? {}).length === 0)) {
      return [];
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

  async decrypt(cipher: Cipher, userId: UserId): Promise<CipherView> {
    const decrypted = await this.decryptMany([cipher], userId);
    return decrypted[0];
  }
}
