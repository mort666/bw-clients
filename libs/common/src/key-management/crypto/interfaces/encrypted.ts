import { EncryptionType } from "../../../platform/enums";

export interface Encrypted {
  encryptionType?: EncryptionType;
  dataBytes: Uint8Array;
  macBytes: Uint8Array;
  ivBytes: Uint8Array;
}
