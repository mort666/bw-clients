import { AttachmentView as SdkAttachmentView } from "@bitwarden/sdk-internal";

import { mockFromJson } from "../../../../spec";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";

import { AttachmentView } from "./attachment.view";

jest.mock("../../../platform/models/domain/symmetric-crypto-key");

describe("AttachmentView", () => {
  it("fromJSON initializes nested objects", () => {
    jest.spyOn(SymmetricCryptoKey, "fromJSON").mockImplementation(mockFromJson);

    const actual = AttachmentView.fromJSON({
      key: "encKeyB64" as any,
    });

    expect(actual.key).toEqual("encKeyB64_fromJSON");
  });

  describe("fromSdkAttachmentView", () => {
    it("should return undefined when the input is null", () => {
      const result = AttachmentView.fromSdkAttachmentView(null as unknown as any);
      expect(result).toBeUndefined();
    });

    it("should return an AttachmentView from an SdkAttachmentView", () => {
      const key = {
        key: new Uint8Array([1, 2, 3]),
        keyB64: "encKeyB64_fromString",
        encKeyB64: "encKeyB64_fromString",
      } as SymmetricCryptoKey;

      jest.spyOn(SymmetricCryptoKey, "fromString").mockReturnValue(key);

      const sdkAttachmentView = {
        id: "id",
        url: "url",
        size: "size",
        sizeName: "sizeName",
        fileName: "fileName",
        key: "encKeyB64_fromString",
      } as SdkAttachmentView;

      const result = AttachmentView.fromSdkAttachmentView(sdkAttachmentView);

      expect(result).toMatchObject({
        id: "id",
        url: "url",
        size: "size",
        sizeName: "sizeName",
        fileName: "fileName",
        key: key,
      });
    });
  });
});
