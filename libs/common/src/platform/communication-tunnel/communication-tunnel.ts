import { ApiService } from "../../abstractions/api.service";
import { InitTunnelRequest } from "../../auth/models/request/init-tunnel.request";
import { InitTunnelResponse } from "../../auth/models/response/init-tunnel.response";
import { ErrorResponse } from "../../models/response/error.response";
import { EncryptService } from "../abstractions/encrypt.service";
import { KeyGenerationService } from "../abstractions/key-generation.service";
import { EncString } from "../models/domain/enc-string";

export enum TunnelVersion {
  CLEAR_TEXT = 0,
  /**
   * Shared key is AES-256-GCM encapsulated by RSA. CipherText is formatted as:
   * encryptedData + tag + iv
   * additional data is:
   * - the version of communication as 1 byte (0x00)
   */
  RSA_ENCAPSULATED_AES_256_GCM = 1,
}

export class CommunicationTunnel {
  private negotiationComplete: boolean = false;
  private sharedKey: Uint8Array;
  private _encapsulatedKey: EncString;
  get encapsulatedKey(): EncString {
    return this._encapsulatedKey;
  }
  private _tunnelVersion: TunnelVersion;
  get tunnelVersion(): TunnelVersion {
    return this._tunnelVersion;
  }

  constructor(
    private readonly apiService: ApiService,
    private readonly keyGenerationService: KeyGenerationService,
    private readonly encryptService: EncryptService,
    private readonly supportedTunnelVersions: TunnelVersion[],
  ) {}

  /**
   * Negotiate the communication protocol with the key connector.
   *
   * @param url the url of the key connector
   * @returns the cleartext shared key, an encapsulated version of the shared key that can be shared with the key
   * connector, and the version of the communication protocol.
   * @throws errors in the key negotiation process, including unsupported communication versions
   */
  async negotiateTunnel(url: string): Promise<TunnelVersion> {
    let response: InitTunnelResponse;

    try {
      response = await this.apiService.initCommunicationTunnel(
        url,
        new InitTunnelRequest(this.supportedTunnelVersions),
      );
    } catch (e) {
      // if the key connector does not support encrypted communication, fall back to clear text, as long as it's a supported version
      if (
        (e as ErrorResponse).statusCode === 404 &&
        this.supportedTunnelVersions.includes(TunnelVersion.CLEAR_TEXT)
      ) {
        response = new InitTunnelResponse({
          TunnelVersion: TunnelVersion.CLEAR_TEXT,
        });
      } else {
        throw e;
      }
    }

    return await this.initWithVersion(response);
  }

  async protect(clearText: Uint8Array): Promise<Uint8Array> {
    if (!this.negotiationComplete) {
      throw new Error("Communication tunnel not initialized");
    }

    let protectedText: Uint8Array;
    switch (this.tunnelVersion) {
      case TunnelVersion.CLEAR_TEXT:
        protectedText = clearText;
        break;
      case TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM:
        protectedText = await this.encryptService.aesGcmEncryptToBytes(
          clearText,
          this.sharedKey,
          new Uint8Array([this.tunnelVersion]),
        );
        break;
      default:
        throw new Error("Unsupported communication version");
    }
    return protectedText;
  }

  async unprotect(protectedText: Uint8Array): Promise<Uint8Array> {
    if (!this.negotiationComplete) {
      throw new Error("Communication tunnel not initialized");
    }

    let clearText: Uint8Array;
    switch (this.tunnelVersion) {
      case TunnelVersion.CLEAR_TEXT:
        clearText = protectedText;
        break;
      case TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM:
        clearText = await this.encryptService.aesGcmDecryptToBytes(
          protectedText,
          this.sharedKey,
          new Uint8Array([this.tunnelVersion]),
        );
        break;
      default:
        throw new Error("Unsupported communication version");
    }
    return clearText;
  }

  private async initWithVersion(response: InitTunnelResponse): Promise<TunnelVersion> {
    this._tunnelVersion = response.tunnelVersion;

    if (!this.supportedTunnelVersions.includes(this.tunnelVersion)) {
      throw new Error("Unsupported communication version");
    }

    switch (this.tunnelVersion) {
      case TunnelVersion.CLEAR_TEXT:
        break;
      case TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM: {
        const encapsulationKey = response.encapsulationKey;

        // use the encapsulation key to create an share a shared key
        this.sharedKey = (await this.keyGenerationService.createKey(256)).key;
        this._encapsulatedKey = await this.encryptService.rsaEncrypt(
          this.sharedKey,
          encapsulationKey,
        );
        break;
      }
      default:
        throw new Error("Unsupported communication version");
    }

    this.negotiationComplete = true;
    return this.tunnelVersion;
  }
}
