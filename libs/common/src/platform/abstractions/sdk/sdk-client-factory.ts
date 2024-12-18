import type { BitwardenClient, BitwardenPure } from "@bitwarden/sdk-internal";

/**
 * Factory for creating SDK clients.
 */
export abstract class SdkClientFactory {
  abstract createSdkClient(
    ...args: ConstructorParameters<typeof BitwardenClient>
  ): Promise<BitwardenClient>;
}

export abstract class SdkPureClientFactory {
  abstract createPureSdkClient(): Promise<BitwardenPure>;
}
