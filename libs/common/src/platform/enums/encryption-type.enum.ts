export enum EncryptionType {
  Aes256Cbc_B64 = 0,
  // Type 1 was the unused and removed Aes128Cbc_HmacSha256_B64
  Aes256Cbc_HmacSha256_B64 = 2,
  Rsa2048_OaepSha256_B64 = 3,
  Rsa2048_OaepSha1_B64 = 4,
  Rsa2048_OaepSha256_HmacSha256_B64 = 5,
  Rsa2048_OaepSha1_HmacSha256_B64 = 6,
}

export function encryptionTypeToString(encryptionType: EncryptionType): string {
  if (encryptionType in EncryptionType) {
    return EncryptionType[encryptionType];
  } else {
    return "Unknown encryption type " + encryptionType;
  }
}

/** The expected number of parts to a serialized EncString of the given encryption type.
 * For example, an EncString of type Aes256Cbc_B64 will have 2 parts
 *
 * Example of annotated serialized EncStrings:
 * 0.iv|data
 * 2.iv|data|mac
 * 3.data
 * 4.data
 *
 * @see EncString
 * @see EncryptionType
 * @see EncString.parseEncryptedString
 */
export const EXPECTED_NUM_PARTS_BY_ENCRYPTION_TYPE = {
  [EncryptionType.Aes256Cbc_B64]: 2,
  [EncryptionType.Aes256Cbc_HmacSha256_B64]: 3,
  [EncryptionType.Rsa2048_OaepSha256_B64]: 1,
  [EncryptionType.Rsa2048_OaepSha1_B64]: 1,
  [EncryptionType.Rsa2048_OaepSha256_HmacSha256_B64]: 2,
  [EncryptionType.Rsa2048_OaepSha1_HmacSha256_B64]: 2,
};
