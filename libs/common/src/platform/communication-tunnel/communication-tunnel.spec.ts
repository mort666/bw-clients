import { mock, MockProxy } from "jest-mock-extended";

import { makeEncString, makeStaticByteArray, makeSymmetricCryptoKey } from "../../../spec";
import { ApiService } from "../../abstractions/api.service";
import { InitTunnelResponse } from "../../auth/models/response/init-tunnel.response";
import { BaseResponse } from "../../models/response/base.response";
import { EncryptService } from "../abstractions/encrypt.service";
import { KeyGenerationService } from "../abstractions/key-generation.service";
import { Utils } from "../misc/utils";

import { CommunicationTunnel, TunnelVersion } from "./communication-tunnel";
import { TunneledRequest } from "./tunneled.request";

class TestRequest {
  constructor(readonly value: string) {}
}

class TestResponse extends BaseResponse {
  readonly value: string;
  constructor(response: any) {
    super(response);
    this.value = this.getResponseProperty("Value");
  }
}

describe("communicationTunnel with cleartext", () => {
  const url = "http://key-connector.example";
  let apiService: MockProxy<ApiService>;
  let keyGenerationService: MockProxy<KeyGenerationService>;
  let encryptService: MockProxy<EncryptService>;
  const supportedTunnelVersions = [
    TunnelVersion.CLEAR_TEXT,
    TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
  ] as const;
  let sut: CommunicationTunnel<typeof supportedTunnelVersions>;
  const sharedKey = makeSymmetricCryptoKey(32);
  const encapsulationKey = makeStaticByteArray(32, 1);
  const encapsulatedKey = makeEncString("encapsulatedKey");
  const tunnelResponse = new InitTunnelResponse({
    EncapsulationKey: encapsulationKey,
    TunnelVersion: TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
    TunnelIdentifier: "tunnelIdentifier",
    TunnelDurationSeconds: 60,
  });

  beforeEach(() => {
    apiService = mock<ApiService>();
    keyGenerationService = mock<KeyGenerationService>();
    encryptService = mock<EncryptService>();

    apiService.initCommunicationTunnel.mockResolvedValue(tunnelResponse);
    keyGenerationService.createKey.mockResolvedValue(sharedKey);
    encryptService.rsaEncrypt.mockResolvedValue(encapsulatedKey);

    sut = new CommunicationTunnel(
      apiService,
      keyGenerationService,
      encryptService,
      supportedTunnelVersions,
    );
  });

  it("negotiates with the provided server", async () => {
    await sut.negotiateTunnel(url);

    expect(apiService.initCommunicationTunnel).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        supportedTunnelVersions: expect.arrayContaining([TunnelVersion.CLEAR_TEXT]),
      }),
    );
    expect(sut.tunnelVersion).toBe(TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM);
  });

  it("allows cleartext requests", async () => {
    await sut.negotiateTunnel(url);

    // force to clear text tunnel
    sut["_tunnelVersion"] = TunnelVersion.CLEAR_TEXT;

    const request = new TestRequest("test");
    const protectedRequest = (await sut.protect(request)) as TestRequest;
    expect(protectedRequest).toBe(request);
  });

  it("encrypts the request", async () => {
    const encryptedData = makeStaticByteArray(32, 3);
    encryptService.aesGcmEncryptToBytes.mockResolvedValue(encryptedData);

    await sut.negotiateTunnel(url);

    const request = new TestRequest("test");
    const protectedRequest = (await sut.protect(request)) as TunneledRequest<TestRequest>;
    expect(protectedRequest).toEqual({
      encryptedData: Utils.fromBufferToB64(encryptedData),
      encapsulatedKey: Utils.fromBufferToB64(encapsulatedKey.dataBytes),
      tunnelVersion: TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
      tunnelIdentifier: tunnelResponse.tunnelIdentifier,
    });
  });

  it("handles cleartext responses", async () => {
    await sut.negotiateTunnel(url);

    // force to clear text tunnel
    sut["_tunnelVersion"] = TunnelVersion.CLEAR_TEXT;

    const response = { Value: "test" };
    const unprotectedResponse = await sut.unprotect(TestResponse, response);

    expect(unprotectedResponse).toEqual(new TestResponse(response));
  });

  it("decrypts the response", async () => {
    const clearTextResponse = { Value: "test" };
    const encryptedData = "encryptedData";
    encryptService.aesGcmDecryptToBytes.mockResolvedValue(
      Utils.fromUtf8ToArray(JSON.stringify(clearTextResponse)),
    );

    await sut.negotiateTunnel(url);

    const response = { EncryptedResponse: encryptedData };
    const unprotectedResponse = await sut.unprotect(TestResponse, response);

    expect(encryptService.aesGcmDecryptToBytes).toHaveBeenCalledWith(
      Utils.fromB64ToArray(encryptedData),
      expect.any(Uint8Array),
      expect.any(Uint8Array),
    );
    expect(unprotectedResponse).toEqual(new TestResponse(clearTextResponse));
  });
});

describe("communicationTunnel disallows cleartext", () => {
  let apiService: MockProxy<ApiService>;
  let keyGenerationService: MockProxy<KeyGenerationService>;
  let encryptService: MockProxy<EncryptService>;
  const supportedTunnelVersions = [TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM] as const;
  let sut: CommunicationTunnel<typeof supportedTunnelVersions>;

  beforeEach(() => {
    apiService = mock<ApiService>();
    keyGenerationService = mock<KeyGenerationService>();
    encryptService = mock<EncryptService>();

    sut = new CommunicationTunnel(
      apiService,
      keyGenerationService,
      encryptService,
      supportedTunnelVersions,
    );
  });

  describe("protect", () => {
    it("returns only a tunneled request", async () => {
      return; // this is a compiler test

      const request = new TestRequest("test");

      // @ts-expect-error -- this cast doesn't work because CLEAR_TEXT is not in the supported tunnel versions, so a TunneledRequest is always returned
      (await sut.protect(request)) as TestRequest;

      // @ts-expect-no-error -- Must be a TunneledRequest
      (await sut.protect(request)) as TunneledRequest<TestRequest>;
    });
  });
});
