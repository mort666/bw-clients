import { CipherConfiguration as CipherConfigurationSdk } from "@bitwarden/sdk-internal";

export type OpaqueKeVersion = 3;

export class CipherConfiguration {
  opaqueVersion: OpaqueKeVersion;

  oprfCs: OprfCs;
  keGroup: KeGroup;
  keyExchange: KeyExchange;
  ksf: KsfConfig;

  constructor(ksf: KsfConfig) {
    this.opaqueVersion = 3;
    this.oprfCs = "ristretto255";
    this.keGroup = "ristretto255";
    this.keyExchange = "triple-dh";
    this.ksf = ksf;
  }

  toSdkConfig(): CipherConfigurationSdk {
    if (this.ksf.algorithm !== "argon2id") {
      throw new Error("Unsupported KSF algorithm");
    } else {
      return {
        oprf_cs: this.oprfCs,
        ke_group: this.keGroup,
        key_exchange: this.keyExchange,
        ksf: {
          argon2id: [
            this.ksf.parameters.memory,
            this.ksf.parameters.iterations,
            this.ksf.parameters.parallelism,
          ],
        },
      };
    }
  }
}

export type OprfCs = "ristretto255";
export type KeGroup = "ristretto255";
export type KeyExchange = "triple-dh";

export type Argon2IdParameters = {
  // Memory in KiB
  memory: number;
  iterations: number;
  parallelism: number;
};

export type KsfParameters = Argon2IdParameters;

type KsfAlgorithm = "argon2id";

export type KsfConfig = {
  algorithm: KsfAlgorithm;
  parameters: KsfParameters;
};
