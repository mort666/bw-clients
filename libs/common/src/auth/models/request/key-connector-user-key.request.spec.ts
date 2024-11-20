import { makeEncString, makeStaticByteArray, makeSymmetricCryptoKey } from "../../../../spec";
import { TunnelVersion } from "../../../platform/communication-tunnel/communication-tunnel";

import {
  KeyConnectorGetUserKeyRequest,
  KeyConnectorSetUserKeyRequest,
} from "./key-connector-user-key.request";

describe("KeyConnectorSetUserKeyRequest", () => {
  const masterKey = makeSymmetricCryptoKey(64);
  const tunnel = {
    protect: jest.fn(),
    encapsulatedKey: makeEncString("encapsulatedKey"),
  } as any;
  const protectedKey = makeStaticByteArray(32, 100);

  it("creates a cleartext instance", async () => {
    tunnel.tunnelVersion = TunnelVersion.CLEAR_TEXT;

    const request = await KeyConnectorSetUserKeyRequest.BuildForTunnel(tunnel, masterKey);
    expect(request).toBeInstanceOf(KeyConnectorSetUserKeyRequest);
    expect(request.key).toBe(masterKey.encKeyB64);
    expect(request.encryptedKey).toBeUndefined();
    expect(request.sharedKey).toBeUndefined();
    expect(request.tunnelVersion).toBeUndefined();
  });

  it("creates an encapsulated instance", async () => {
    tunnel.tunnelVersion = TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM;
    tunnel.protect.mockResolvedValue(protectedKey);

    const request = await KeyConnectorSetUserKeyRequest.BuildForTunnel(tunnel, masterKey);
    expect(request).toBeInstanceOf(KeyConnectorSetUserKeyRequest);
    expect(request.key).toBeUndefined();
    expect(request.sharedKey).toEqualBuffer(tunnel.encapsulatedKey.dataBytes);
    expect(request.encryptedKey).toEqualBuffer(protectedKey);
    expect(request.tunnelVersion).toBe(TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM);

    expect(tunnel.protect).toHaveBeenCalledWith(masterKey.encKey);
  });
});

describe("KeyConnectorGetUserKeyRequest", () => {
  const tunnel = {
    protect: jest.fn(),
    encapsulatedKey: makeEncString("encapsulatedKey"),
  } as any;

  it("creates a cleartext instance", async () => {
    tunnel.tunnelVersion = TunnelVersion.CLEAR_TEXT;
    const request = KeyConnectorGetUserKeyRequest.BuildForTunnel(tunnel);

    expect(request).toBeInstanceOf(KeyConnectorGetUserKeyRequest);
    expect(request.tunnelVersion).toBeUndefined();
    expect(request.sharedKey).toBeUndefined();
  });

  it("creates an encapsulated instance", async () => {
    tunnel.tunnelVersion = TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM;
    const request = KeyConnectorGetUserKeyRequest.BuildForTunnel(tunnel);

    expect(request).toBeInstanceOf(KeyConnectorGetUserKeyRequest);
    expect(request.tunnelVersion).toBe(TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM);
    expect(request.sharedKey).toEqualBuffer(tunnel.encapsulatedKey.dataBytes);
  });
});
