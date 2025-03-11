import { KdfConfig } from "../../../../../key-management/src";

export class CipherConfiguration {
  opaqueVersion = 1; // TODO: what's the current version?
  kdf: KdfConfig;
  oprf = "ristretto-255";
  ke = "ristretto-255";
  keyExchange = "triple-diffie-helmen";

  constructor(kdf: KdfConfig) {
    this.kdf = kdf;
  }
}
