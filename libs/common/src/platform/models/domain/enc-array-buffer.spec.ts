import { makeStaticByteArray } from "../../../../spec";
import {
  EncryptionType,
  SymmetricEncryptionTypes,
  AsymmetricEncryptionTypes,
  encryptionTypeToString,
} from "../../enums";

import { EncArrayBuffer } from "./enc-array-buffer";

describe("encArrayBuffer", () => {
  describe("parses the buffer", () => {
    test.each([
      [EncryptionType.AesCbc128_HmacSha256_B64, "AesCbc128_HmacSha256_B64"],
      [EncryptionType.AesCbc256_HmacSha256_B64, "AesCbc256_HmacSha256_B64"],
    ])("with %c%s", (encType: EncryptionType) => {
      const iv = makeStaticByteArray(16, 10);
      const mac = makeStaticByteArray(32, 20);
      // We use the minimum data length of 1 to test the boundary of valid lengths
      const data = makeStaticByteArray(1, 100);

      const array = new Uint8Array(1 + iv.byteLength + mac.byteLength + data.byteLength);
      array.set([encType]);
      array.set(iv, 1);
      array.set(mac, 1 + iv.byteLength);
      array.set(data, 1 + iv.byteLength + mac.byteLength);

      const actual = new EncArrayBuffer(array);

      expect(actual.encryptionType).toEqual(encType);
      expect(actual.ivBytes).toEqualBuffer(iv);
      expect(actual.macBytes).toEqualBuffer(mac);
      expect(actual.dataBytes).toEqualBuffer(data);
    });

    it("with AesCbc256_B64", () => {
      const encType = EncryptionType.AesCbc256_B64;
      const iv = makeStaticByteArray(16, 10);
      // We use the minimum data length of 1 to test the boundary of valid lengths
      const data = makeStaticByteArray(1, 100);

      const array = new Uint8Array(1 + iv.byteLength + data.byteLength);
      array.set([encType]);
      array.set(iv, 1);
      array.set(data, 1 + iv.byteLength);

      const actual = new EncArrayBuffer(array);

      expect(actual.encryptionType).toEqual(encType);
      expect(actual.ivBytes).toEqual(iv);
      expect(actual.dataBytes).toEqual(data);
      expect(actual.macBytes).toBeNull();
    });
  });

  describe("throws if the buffer has an invalid length", () => {
    test.each([
      [EncryptionType.AesCbc128_HmacSha256_B64, 50, "AesCbc128_HmacSha256_B64"],
      [EncryptionType.AesCbc256_HmacSha256_B64, 50, "AesCbc256_HmacSha256_B64"],
      [EncryptionType.AesCbc256_B64, 18, "AesCbc256_B64"],
    ])("with %c%c%s", (encType: EncryptionType, minLength: number) => {
      // Generate invalid byte array
      // Minus 1 to leave room for the encType, minus 1 to make it invalid
      const invalidBytes = makeStaticByteArray(minLength - 2);

      const invalidArray = new Uint8Array(1 + invalidBytes.byteLength);
      invalidArray.set([encType]);
      invalidArray.set(invalidBytes, 1);

      expect(() => new EncArrayBuffer(invalidArray)).toThrow("Error parsing encrypted ArrayBuffer");
    });
  });

  it("doesn't parse the buffer if the encryptionType is not supported", () => {
    // Starting at 9 implicitly gives us an invalid encType
    const bytes = makeStaticByteArray(50, 9);
    expect(() => new EncArrayBuffer(bytes)).toThrow("Error parsing encrypted ArrayBuffer");
  });

  describe("fromParts factory", () => {
    const plainValue = makeStaticByteArray(16, 1);

    it("throws if required data is null", () => {
      expect(() =>
        EncArrayBuffer.fromParts(EncryptionType.AesCbc128_HmacSha256_B64, plainValue, null!, null),
      ).toThrow("encryptionType, iv, and data must be provided");
      expect(() =>
        EncArrayBuffer.fromParts(EncryptionType.AesCbc128_HmacSha256_B64, null!, plainValue, null),
      ).toThrow("encryptionType, iv, and data must be provided");
      expect(() => EncArrayBuffer.fromParts(null!, plainValue, plainValue, null)).toThrow(
        "encryptionType, iv, and data must be provided",
      );
    });

    it.each(SymmetricEncryptionTypes.map((t) => encryptionTypeToString(t)))(
      "works for %s",
      async (typeName) => {
        const type = EncryptionType[typeName as keyof typeof EncryptionType];
        const iv = plainValue;
        const mac = type === EncryptionType.AesCbc256_B64 ? null : makeStaticByteArray(32, 20);
        const data = plainValue;

        const actual = EncArrayBuffer.fromParts(type, iv, data, mac);

        expect(actual.encryptionType).toEqual(type);
        expect(actual.ivBytes).toEqual(iv);
        expect(actual.macBytes).toEqual(mac);
        expect(actual.dataBytes).toEqual(data);
      },
    );

    it.each(SymmetricEncryptionTypes.filter((t) => t !== EncryptionType.AesCbc256_B64))(
      "validates mac length for %s",
      (type) => {
        const iv = plainValue;
        const mac = makeStaticByteArray(1, 20);
        const data = plainValue;

        expect(() => EncArrayBuffer.fromParts(type, iv, data, mac)).toThrow("Invalid MAC length");
      },
    );

    it.each(SymmetricEncryptionTypes.map((t) => encryptionTypeToString(t)))(
      "requires or forbids mac for %s",
      async (typeName) => {
        const type = EncryptionType[typeName as keyof typeof EncryptionType];
        const iv = makeStaticByteArray(16, 10);
        const mac = type === EncryptionType.AesCbc256_B64 ? makeStaticByteArray(32, 20) : null;
        const data = plainValue;

        expect(() => EncArrayBuffer.fromParts(type, iv, data, mac)).toThrow();
      },
    );

    it.each(AsymmetricEncryptionTypes)("throws for async type %s", (type) => {
      expect(() => EncArrayBuffer.fromParts(type, plainValue, plainValue, null)).toThrow(
        `Unknown EncryptionType ${type} for EncArrayBuffer.fromParts`,
      );
    });
  });
});
