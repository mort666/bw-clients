import { EncryptionType } from "../enums";

export interface Encrypted {
  encryptionType?: EncryptionType;
  dataBytes: Uint8Array | null;
  macBytes: Uint8Array | null | undefined;
  ivBytes: Uint8Array | null;
}
