import {
  TunnelVersion,
  CommunicationTunnel,
} from "../../../platform/communication-tunnel/communication-tunnel";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";

/**
 * @typedef { import("../response/key-connector-init-communication.response").KeyConnectorInitCommunicationResponse } KeyConnectorInitCommunicationResponse
 */

export class KeyConnectorSetUserKeyRequest {
  readonly key: string | null;
  readonly encryptedKey: Uint8Array | null;
  readonly sharedKey: Uint8Array | null;
  readonly tunnelVersion: TunnelVersion;
  /**
   *
   * @param key The key to store, encrypted by the shared key
   * @param sharedKey The key used to encrypt {@link key}, encapsulated by the {@link KeyConnectorInitCommunicationResponse.encapsulationKey} or null.
   * If null, the communication is sent in cleartext.
   */
  constructor(
    keyOrEncryptedKey:
      | string
      | {
          key: Uint8Array;
          sharedKey: Uint8Array;
          tunnelVersion: TunnelVersion;
        },
  ) {
    if (typeof keyOrEncryptedKey === "string") {
      this.key = keyOrEncryptedKey;
      this.encryptedKey = undefined;
      this.sharedKey = undefined;
      this.tunnelVersion = undefined;
    } else {
      this.key = undefined;
      this.encryptedKey = keyOrEncryptedKey.key;
      this.sharedKey = keyOrEncryptedKey.sharedKey;
      this.tunnelVersion = keyOrEncryptedKey.tunnelVersion;
    }
  }

  static async BuildForTunnel(tunnel: CommunicationTunnel, masterKey: SymmetricCryptoKey) {
    switch (tunnel.tunnelVersion) {
      case TunnelVersion.CLEAR_TEXT:
        return new KeyConnectorSetUserKeyRequest(masterKey.encKeyB64);
      case TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM:
        return new KeyConnectorSetUserKeyRequest({
          key: await tunnel.protect(masterKey.encKey),
          sharedKey: tunnel.encapsulatedKey.dataBytes,
          tunnelVersion: tunnel.tunnelVersion,
        });
      default:
    }
  }
}

export class KeyConnectorGetUserKeyRequest {
  /**
   * The key to use in encrypting the response, encapsulated by the {@link KeyConnectorInitCommunicationResponse.encapsulationKey}
   */
  readonly sharedKey: Uint8Array;
  /**
   * The version of communication to use in encrypting the response
   */
  readonly tunnelVersion: TunnelVersion;
  /**
   *
   * @fixme Once key connector server have been updated, this constructor should require a shared key and ApiService should drop support of the old GET request.
   *
   * @param sharedKey The key to use in encrypting the response, encapsulated by the {@link KeyConnectorInitCommunicationResponse.encapsulationKey}.
   * @param tunnelVersion The version of communication to use in encrypting the response.
   */
  constructor(tunneledCommunication?: { sharedKey: Uint8Array; tunnelVersion: TunnelVersion }) {
    this.sharedKey = tunneledCommunication?.sharedKey;
    this.tunnelVersion = tunneledCommunication?.tunnelVersion;
  }

  static BuildForTunnel(tunnel: CommunicationTunnel) {
    switch (tunnel.tunnelVersion) {
      case TunnelVersion.CLEAR_TEXT:
        return new KeyConnectorGetUserKeyRequest();
      case TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM:
        return new KeyConnectorGetUserKeyRequest({
          sharedKey: tunnel.encapsulatedKey.dataBytes,
          tunnelVersion: tunnel.tunnelVersion,
        });
      default:
    }
  }
}
