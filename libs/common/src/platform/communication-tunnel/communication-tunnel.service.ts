import { ApiService } from "../../abstractions/api.service";
import { EncryptService } from "../abstractions/encrypt.service";
import { KeyGenerationService } from "../abstractions/key-generation.service";

import { CommunicationTunnel, TunnelVersion } from "./communication-tunnel";

export abstract class CommunicationTunnelService {
  /**
   *
   * @param supportedTunnelVersions the allowed tunnel versions for the communication tunnel
   * @returns an object that stores the cryptographic secrets to protect and unprotect data for the communication tunnel
   * @throws errors in the tunnel creation process, including unsupported communication versions or issues communicating with the server
   */
  abstract createTunnel<const SupportedTunnelVersions extends readonly TunnelVersion[]>(
    url: string,
    supportedTunnelVersions: SupportedTunnelVersions,
  ): Promise<CommunicationTunnel<SupportedTunnelVersions>>;
}

export class DefaultCommunicationTunnelService implements CommunicationTunnelService {
  constructor(
    private readonly apiService: ApiService,
    private readonly keyGenerationService: KeyGenerationService,
    private readonly encryptService: EncryptService,
  ) {}
  async createTunnel<const SupportedTunnelVersions extends readonly TunnelVersion[]>(
    url: string,
    supportedTunnelVersions: SupportedTunnelVersions,
  ): Promise<CommunicationTunnel<SupportedTunnelVersions>> {
    const tunnel = new CommunicationTunnel(
      this.apiService,
      this.keyGenerationService,
      this.encryptService,
      supportedTunnelVersions,
    );

    await tunnel.negotiateTunnel(url);

    return tunnel;
  }
}
