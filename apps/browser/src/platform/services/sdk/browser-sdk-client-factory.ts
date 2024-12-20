import {
  SdkClientFactory,
  SdkPureClientFactory,
} from "@bitwarden/common/platform/abstractions/sdk/sdk-client-factory";
import type { BitwardenClient, BitwardenPure } from "@bitwarden/sdk-internal";

export class BrowserSdkPureClientFactory implements SdkPureClientFactory {
  async createPureSdkClient(): Promise<BitwardenPure> {
    const instance = (globalThis as any).init_pure();

    return instance;
  }
}

/**
 * SDK client factory with a js fallback for when WASM is not supported.
 *
 * Works both in popup and service worker.
 */
export class BrowserSdkClientFactory implements SdkClientFactory {
  async createSdkClient(
    ...args: ConstructorParameters<typeof BitwardenClient>
  ): Promise<BitwardenClient> {
    const instance = (globalThis as any).init_sdk(...args);

    return instance;
  }
}
