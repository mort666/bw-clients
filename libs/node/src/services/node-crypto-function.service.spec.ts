import { Utils } from "@bitwarden/common/platform/misc/utils";
import { DecryptParameters } from "@bitwarden/common/platform/models/domain/decrypt-parameters";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";

import { NodeCryptoFunctionService } from "./node-crypto-function.service";

const RsaPublicKey =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAl0Vawl/toXzkEvB82FEtqHP" +
  "4xlU2ab/v0crqIfXfIoWF/XXdHGIdrZeilnRXPPJT1B9dTsasttEZNnua/0Rek/cjNDHtzT52irfoZYS7X6HNIfOi54Q+egP" +
  "RQ1H7iNHVZz3K8Db9GCSKPeC8MbW6gVCzb15esCe1gGzg6wkMuWYDFYPoh/oBqcIqrGah7firqB1nDedzEjw32heP2DAffVN" +
  "084iTDjiWrJNUxBJ2pDD5Z9dT3MzQ2s09ew1yMWK2z37rT3YerC7OgEDmo3WYo3xL3qYJznu3EO2nmrYjiRa40wKSjxsTlUc" +
  "xDF+F0uMW8oR9EMUHgepdepfAtLsSAQIDAQAB";
const RsaPrivateKey =
  "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCXRVrCX+2hfOQS8Hz" +
  "YUS2oc/jGVTZpv+/Ryuoh9d8ihYX9dd0cYh2tl6KWdFc88lPUH11Oxqy20Rk2e5r/RF6T9yM0Me3NPnaKt+hlhLtfoc0h86L" +
  "nhD56A9FDUfuI0dVnPcrwNv0YJIo94LwxtbqBULNvXl6wJ7WAbODrCQy5ZgMVg+iH+gGpwiqsZqHt+KuoHWcN53MSPDfaF4/" +
  "YMB99U3TziJMOOJask1TEEnakMPln11PczNDazT17DXIxYrbPfutPdh6sLs6AQOajdZijfEvepgnOe7cQ7aeatiOJFrjTApK" +
  "PGxOVRzEMX4XS4xbyhH0QxQeB6l16l8C0uxIBAgMBAAECggEASaWfeVDA3cVzOPFSpvJm20OTE+R6uGOU+7vh36TX/POq92q" +
  "Buwbd0h0oMD32FxsXywd2IxtBDUSiFM9699qufTVuM0Q3tZw6lHDTOVG08+tPdr8qSbMtw7PGFxN79fHLBxejjO4IrM9lapj" +
  "WpxEF+11x7r+wM+0xRZQ8sNFYG46aPfIaty4BGbL0I2DQ2y8I57iBCAy69eht59NLMm27fRWGJIWCuBIjlpfzET1j2HLXUIh" +
  "5bTBNzqaN039WH49HczGE3mQKVEJZc/efk3HaVd0a1Sjzyn0QY+N1jtZN3jTRbuDWA1AknkX1LX/0tUhuS3/7C3ejHxjw4Dk" +
  "1ZLo5/QKBgQDIWvqFn0+IKRSu6Ua2hDsufIHHUNLelbfLUMmFthxabcUn4zlvIscJO00Tq/ezopSRRvbGiqnxjv/mYxucvOU" +
  "BeZtlus0Q9RTACBtw9TGoNTmQbEunJ2FOSlqbQxkBBAjgGEppRPt30iGj/VjAhCATq2MYOa/X4dVR51BqQAFIEwKBgQDBSIf" +
  "TFKC/hDk6FKZlgwvupWYJyU9RkyfstPErZFmzoKhPkQ3YORo2oeAYmVUbS9I2iIYpYpYQJHX8jMuCbCz4ONxTCuSIXYQYUcU" +
  "q4PglCKp31xBAE6TN8SvhfME9/MvuDssnQinAHuF0GDAhF646T3LLS1not6Vszv7brwSoGwKBgQC88v/8cGfi80ssQZeMnVv" +
  "q1UTXIeQcQnoY5lGHJl3K8mbS3TnXE6c9j417Fdz+rj8KWzBzwWXQB5pSPflWcdZO886Xu/mVGmy9RWgLuVFhXwCwsVEPjNX" +
  "5ramRb0/vY0yzenUCninBsIxFSbIfrPtLUYCc4hpxr+sr2Mg/y6jpvQKBgBezMRRs3xkcuXepuI2R+BCXL1/b02IJTUf1F+1" +
  "eLLGd7YV0H+J3fgNc7gGWK51hOrF9JBZHBGeOUPlaukmPwiPdtQZpu4QNE3l37VlIpKTF30E6mb+BqR+nht3rUjarnMXgAoE" +
  "Z18y6/KIjpSMpqC92Nnk/EBM9EYe6Cf4eA9ApAoGAeqEUg46UTlJySkBKURGpIs3v1kkf5I0X8DnOhwb+HPxNaiEdmO7ckm8" +
  "+tPVgppLcG0+tMdLjigFQiDUQk2y3WjyxP5ZvXu7U96jaJRI8PFMoE06WeVYcdIzrID2HvqH+w0UQJFrLJ/0Mn4stFAEzXKZ" +
  "BokBGnjFnTnKcs7nv/O8=";

const Sha1Mac = "4d4c223f95dc577b665ec4ccbcb680b80a397038";
const Sha256Mac = "6be3caa84922e12aaaaa2f16c40d44433bb081ef323db584eb616333ab4e874f";
const Sha512Mac =
  "21910e341fa12106ca35758a2285374509326c9fbe0bd64e7b99c898f841dc948c58ce66d3504d8883c" +
  "5ea7817a0b7c5d4d9b00364ccd214669131fc17fe4aca";

describe("NodeCrypto Function Service", () => {
  describe("pbkdf2", () => {
    const regular256Key = "pj9prw/OHPleXI6bRdmlaD+saJS4awrMiQsQiDjeu2I=";
    const utf8256Key = "yqvoFXgMRmHR3QPYr5pyR4uVuoHkltv9aHUP63p8n7I=";
    const unicode256Key = "ZdeOata6xoRpB4DLp8zHhXz5kLmkWtX5pd+TdRH8w8w=";

    const regular512Key =
      "liTi/Ke8LPU1Qv+Vl7NGEVt/XMbsBVJ2kQxtVG/Z1/JFHFKQW3ZkI81qVlwTiCpb+cFXzs+57" +
      "eyhhx5wfKo5Cg==";
    const utf8512Key =
      "df0KdvIBeCzD/kyXptwQohaqUa4e7IyFUyhFQjXCANu5T+scq55hCcE4dG4T/MhAk2exw8j7ixRN" +
      "zXANiVZpnw==";
    const unicode512Key =
      "FE+AnUJaxv8jh+zUDtZz4mjjcYk0/PZDZm+SLJe3XtxtnpdqqpblX6JjuMZt/dYYNMOrb2+mD" +
      "L3FiQDTROh1lg==";

    testPbkdf2("sha256", regular256Key, utf8256Key, unicode256Key);
    testPbkdf2("sha512", regular512Key, utf8512Key, unicode512Key);
  });

  describe("hkdf", () => {
    const regular256Key = "qBUmEYtwTwwGPuw/z6bs/qYXXYNUlocFlyAuuANI8Pw=";
    const utf8256Key = "6DfJwW1R3txgiZKkIFTvVAb7qVlG7lKcmJGJoxR2GBU=";
    const unicode256Key = "gejGI82xthA+nKtKmIh82kjw+ttHr+ODsUoGdu5sf0A=";

    const regular512Key = "xe5cIG6ZfwGmb1FvsOedM0XKOm21myZkjL/eDeKIqqM=";
    const utf8512Key = "XQMVBnxVEhlvjSFDQc77j5GDE9aorvbS0vKnjhRg0LY=";
    const unicode512Key = "148GImrTbrjaGAe/iWEpclINM8Ehhko+9lB14+52lqc=";

    testHkdf("sha256", regular256Key, utf8256Key, unicode256Key);
    testHkdf("sha512", regular512Key, utf8512Key, unicode512Key);
  });

  describe("hkdfExpand", () => {
    const prk16Byte = "criAmKtfzxanbgea5/kelQ==";
    const prk32Byte = "F5h4KdYQnIVH4rKH0P9CZb1GrR4n16/sJrS0PsQEn0Y=";
    const prk64Byte =
      "ssBK0mRG17VHdtsgt8yo4v25CRNpauH+0r2fwY/E9rLyaFBAOMbIeTry+" +
      "gUJ28p8y+hFh3EI9pcrEWaNvFYonQ==";

    testHkdfExpand("sha256", prk32Byte, 32, "BnIqJlfnHm0e/2iB/15cbHyR19ARPIcWRp4oNS22CD8=");
    testHkdfExpand(
      "sha256",
      prk32Byte,
      64,
      "BnIqJlfnHm0e/2iB/15cbHyR19ARPIcWRp4oNS22CD9BV+" +
        "/queOZenPNkDhmlVyL2WZ3OSU5+7ISNF5NhNfvZA==",
    );
    testHkdfExpand("sha512", prk64Byte, 32, "uLWbMWodSBms5uGJ5WTRTesyW+MD7nlpCZvagvIRXlk=");
    testHkdfExpand(
      "sha512",
      prk64Byte,
      64,
      "uLWbMWodSBms5uGJ5WTRTesyW+MD7nlpCZvagvIRXlkY5Pv0sB+" +
        "MqvaopmkC6sD/j89zDwTV9Ib2fpucUydO8w==",
    );

    it("should fail with prk too small", async () => {
      const cryptoFunctionService = new NodeCryptoFunctionService();
      const f = cryptoFunctionService.hkdfExpand(
        Utils.fromB64ToArray(prk16Byte),
        "info",
        32,
        "sha256",
      );
      await expect(f).rejects.toEqual(new Error("prk is too small."));
    });

    it("should fail with outputByteSize is too large", async () => {
      const cryptoFunctionService = new NodeCryptoFunctionService();
      const f = cryptoFunctionService.hkdfExpand(
        Utils.fromB64ToArray(prk32Byte),
        "info",
        8161,
        "sha256",
      );
      await expect(f).rejects.toEqual(new Error("outputByteSize is too large."));
    });
  });

  describe("hash", () => {
    const regular1Hash = "2a241604fb921fad12bf877282457268e1dccb70";
    const utf81Hash = "85672798dc5831e96d6c48655d3d39365a9c88b6";
    const unicode1Hash = "39c975935054a3efc805a9709b60763a823a6ad4";

    const regular256Hash = "2b8e96031d352a8655d733d7a930b5ffbea69dc25cf65c7bca7dd946278908b2";
    const utf8256Hash = "25fe8440f5b01ed113b0a0e38e721b126d2f3f77a67518c4a04fcde4e33eeb9d";
    const unicode256Hash = "adc1c0c2afd6e92cefdf703f9b6eb2c38e0d6d1a040c83f8505c561fea58852e";

    const regular512Hash =
      "c15cf11d43bde333647e3f559ec4193bb2edeaa0e8b902772f514cdf3f785a3f49a6e02a4b87b3" +
      "b47523271ad45b7e0aebb5cdcc1bc54815d256eb5dcb80da9d";
    const utf8512Hash =
      "035c31a877a291af09ed2d3a1a293e69c3e079ea2cecc00211f35e6bce10474ca3ad6e30b59e26118" +
      "37463f20969c5bc95282965a051a88f8cdf2e166549fcdd";
    const unicode512Hash =
      "2b16a5561af8ad6fe414cc103fc8036492e1fc6d9aabe1b655497054f760fe0e34c5d100ac773d" +
      "9f3030438284f22dbfa20cb2e9b019f2c98dfe38ce1ef41bae";

    const regularMd5 = "5eceffa53a5fd58c44134211e2c5f522";
    const utf8Md5 = "3abc9433c09551b939c80aa0aa3174e1";
    const unicodeMd5 = "85ae134072c8d81257933f7045ba17ca";

    testHash("sha1", regular1Hash, utf81Hash, unicode1Hash);
    testHash("sha256", regular256Hash, utf8256Hash, unicode256Hash);
    testHash("sha512", regular512Hash, utf8512Hash, unicode512Hash);
    testHash("md5", regularMd5, utf8Md5, unicodeMd5);
  });

  describe("hmac", () => {
    testHmac("sha1", Sha1Mac);
    testHmac("sha256", Sha256Mac);
    testHmac("sha512", Sha512Mac);
  });

  describe("compare", () => {
    testCompare(false);
  });

  describe("hmacFast", () => {
    testHmac("sha1", Sha1Mac, true);
    testHmac("sha256", Sha256Mac, true);
    testHmac("sha512", Sha512Mac, true);
  });

  describe("compareFast", () => {
    testCompare(true);
  });

  describe("aesEncrypt CBC mode", () => {
    it("should successfully encrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const iv = makeStaticByteArray(16);
      const key = makeStaticByteArray(32);
      const data = Utils.fromUtf8ToArray("EncryptMe!");
      const encValue = await nodeCryptoFunctionService.aesEncrypt(data, iv, key);
      expect(Utils.fromBufferToB64(encValue)).toBe("ByUF8vhyX4ddU9gcooznwA==");
    });

    it("should successfully encrypt and then decrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const iv = makeStaticByteArray(16);
      const key = makeStaticByteArray(32);
      const value = "EncryptMe!";
      const data = Utils.fromUtf8ToArray(value);
      const encValue = await nodeCryptoFunctionService.aesEncrypt(data, iv, key);
      const decValue = await nodeCryptoFunctionService.aesDecrypt(encValue, iv, key, "cbc");
      expect(Utils.fromBufferToUtf8(decValue)).toBe(value);
    });
  });

  describe("aesDecryptFast CBC mode", () => {
    it("should successfully decrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const iv = Utils.fromBufferToB64(makeStaticByteArray(16));
      const symKey = new SymmetricCryptoKey(makeStaticByteArray(32));
      const data = "ByUF8vhyX4ddU9gcooznwA==";
      const params = nodeCryptoFunctionService.aesDecryptFastParameters(data, iv, null, symKey);
      const decValue = await nodeCryptoFunctionService.aesDecryptFast(params, "cbc");
      expect(decValue).toBe("EncryptMe!");
    });
  });

  describe("aesDecryptFast ECB mode", () => {
    it("should successfully decrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const params = new DecryptParameters<Uint8Array>();
      params.encKey = makeStaticByteArray(32);
      params.data = Utils.fromB64ToArray("z5q2XSxYCdQFdI+qK2yLlw==");
      const decValue = await nodeCryptoFunctionService.aesDecryptFast(params, "ecb");
      expect(decValue).toBe("EncryptMe!");
    });
  });

  describe("aesDecryptFast GCM mode", () => {
    it("successfully decrypts data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const iv = Utils.fromBufferToB64(makeStaticByteArray(12));
      const symKey = new SymmetricCryptoKey(makeStaticByteArray(32));
      const data = "Amy1abyVtlboYFBtLnDAzAwAgb3Qg2m4fMo=";
      const params = nodeCryptoFunctionService.aesDecryptFastParameters(data, iv, null, symKey);
      const decValue = await nodeCryptoFunctionService.aesDecryptFast(params, "gcm");
      expect(decValue).toBe("EncryptMe!");
    });
  });

  describe("aesDecrypt CBC mode", () => {
    it("should successfully decrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const iv = makeStaticByteArray(16);
      const key = makeStaticByteArray(32);
      const data = Utils.fromB64ToArray("ByUF8vhyX4ddU9gcooznwA==");
      const decValue = await nodeCryptoFunctionService.aesDecrypt(data, iv, key, "cbc");
      expect(Utils.fromBufferToUtf8(decValue)).toBe("EncryptMe!");
    });
  });

  describe("aesDecrypt ECB mode", () => {
    it("should successfully decrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const key = makeStaticByteArray(32);
      const data = Utils.fromB64ToArray("z5q2XSxYCdQFdI+qK2yLlw==");
      const decValue = await nodeCryptoFunctionService.aesDecrypt(data, null, key, "ecb");
      expect(Utils.fromBufferToUtf8(decValue)).toBe("EncryptMe!");
    });
  });

  describe("aesDecrypt GCM mode", () => {
    it("successfully decrypts data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const iv = makeStaticByteArray(12);
      const key = makeStaticByteArray(32);
      const data = Utils.fromB64ToArray("Amy1abyVtlboYFBtLnDAzAwAgb3Qg2m4fMo=");
      const decValue = await nodeCryptoFunctionService.aesDecrypt(data, iv, key, "gcm");
      expect(Utils.fromBufferToUtf8(decValue)).toBe("EncryptMe!");
    });
  });

  describe("rsaEncrypt", () => {
    it("should successfully encrypt and then decrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const pubKey = Utils.fromB64ToArray(RsaPublicKey);
      const privKey = Utils.fromB64ToArray(RsaPrivateKey);
      const value = "EncryptMe!";
      const data = Utils.fromUtf8ToArray(value);
      const encValue = await nodeCryptoFunctionService.rsaEncrypt(data, pubKey, "sha1");
      const decValue = await nodeCryptoFunctionService.rsaDecrypt(encValue, privKey, "sha1");
      expect(Utils.fromBufferToUtf8(decValue)).toBe(value);
    });
  });

  describe("rsaDecrypt", () => {
    it("should successfully decrypt data", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const privKey = Utils.fromB64ToArray(RsaPrivateKey);
      const data = Utils.fromB64ToArray(
        "A1/p8BQzN9UrbdYxUY2Va5+kPLyfZXF9JsZrjeEXcaclsnHurdxVAJcnbEqYMP3UXV" +
          "4YAS/mpf+Rxe6/X0WS1boQdA0MAHSgx95hIlAraZYpiMLLiJRKeo2u8YivCdTM9V5vuAEJwf9Tof/qFsFci3sApdbATkorCT" +
          "zFOIEPF2S1zgperEP23M01mr4dWVdYN18B32YF67xdJHMbFhp5dkQwv9CmscoWq7OE5HIfOb+JAh7BEZb+CmKhM3yWJvoR/D" +
          "/5jcercUtK2o+XrzNrL4UQ7yLZcFz6Bfwb/j6ICYvqd/YJwXNE6dwlL57OfwJyCdw2rRYf0/qI00t9u8Iitw==",
      );
      const decValue = await nodeCryptoFunctionService.rsaDecrypt(data, privKey, "sha1");
      expect(Utils.fromBufferToUtf8(decValue)).toBe("EncryptMe!");
    });
  });

  describe("rsaExtractPublicKey", () => {
    it("should successfully extract key", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const privKey = Utils.fromB64ToArray(RsaPrivateKey);
      const publicKey = await nodeCryptoFunctionService.rsaExtractPublicKey(privKey);
      expect(Utils.fromBufferToB64(publicKey)).toBe(RsaPublicKey);
    });
  });

  describe("rsaGenerateKeyPair", () => {
    testRsaGenerateKeyPair(1024);
    testRsaGenerateKeyPair(2048);

    // Generating 4096 bit keys is really slow with Forge lib.
    // Maybe move to something else if we ever want to generate keys of this size.
    // testRsaGenerateKeyPair(4096);
  });

  describe("randomBytes", () => {
    it("should make a value of the correct length", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const randomData = await nodeCryptoFunctionService.randomBytes(16);
      expect(randomData.byteLength).toBe(16);
    });

    it("should not make the same value twice", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const randomData = await nodeCryptoFunctionService.randomBytes(16);
      const randomData2 = await nodeCryptoFunctionService.randomBytes(16);
      expect(
        randomData.byteLength === randomData2.byteLength && randomData !== randomData2,
      ).toBeTruthy();
    });
  });

  describe("aesGenerateKey", () => {
    it("should delegate to randomBytes", async () => {
      const nodeCryptoFunctionService = new NodeCryptoFunctionService();
      const spy = jest.spyOn(nodeCryptoFunctionService, "randomBytes");
      await nodeCryptoFunctionService.aesGenerateKey(256);
      expect(spy).toHaveBeenCalledWith(32);
    });
  });

  describe("diffieHellmanGenerateKeyPair", () => {
    describe("x25519", () => {
      it("generates a key pair", async () => {
        const cryptoFunctionService = new NodeCryptoFunctionService();
        const { keyPair } = await cryptoFunctionService.diffieHellmanGenerateKeyPair(
          "x25519",
          undefined,
        );
        expect(keyPair.privateKey).toBeDefined();
        expect(keyPair.publicKey).toBeDefined();
      });

      it("pre-extracts the public key in raw format", async () => {
        const cryptoFunctionService = new NodeCryptoFunctionService();
        const { keyPair, publicKey } = await cryptoFunctionService.diffieHellmanGenerateKeyPair(
          "x25519",
          undefined,
        );
        const publicFromKeyPair = await crypto.subtle.exportKey("raw", keyPair.publicKey);

        expect(publicKey).toEqual(new Uint8Array(publicFromKeyPair));
      });
    });

    describe("ecdh", () => {
      describe.each(["P-256", "P-384", "P-521"] as const)("curve %s", (curve) => {
        it("generates a key pair", async () => {
          const cryptoFunctionService = new NodeCryptoFunctionService();
          const { keyPair } = await cryptoFunctionService.diffieHellmanGenerateKeyPair(
            "ecdh",
            curve,
          );
          expect(keyPair.privateKey).toBeDefined();
          expect(keyPair.publicKey).toBeDefined();
        });

        it("pre-extracts the public key in raw format", async () => {
          const cryptoFunctionService = new NodeCryptoFunctionService();
          const { keyPair, publicKey } = await cryptoFunctionService.diffieHellmanGenerateKeyPair(
            "ecdh",
            curve,
          );
          const publicFromKeyPair = await crypto.subtle.exportKey("raw", keyPair.publicKey);

          expect(publicKey).toEqual(new Uint8Array(publicFromKeyPair));
          // Should be odd
          expect(publicKey.byteLength % 2).toBe(1);
          // First byte should be 0x04
          expect(publicKey[0]).toBe(0x04);
        });
      });
    });
  });

  describe("deriveSharedKeyBits", () => {
    let cryptoFunctionService: NodeCryptoFunctionService;

    beforeEach(() => {
      cryptoFunctionService = new NodeCryptoFunctionService();
    });

    describe("x25519", () => {
      const testVectors = Object.freeze({
        a: {
          key_ops: ["deriveKey", "deriveBits"],
          ext: true,
          crv: "X25519",
          d: "dwdtCnMYpX08FsFyUbJmRd9ML4frwJkqsXf7pR25LCo=",
          x: "hSDwCYkwp1R0i33ctD73Wg2/Og0mOBr066SpjqqbTmo=",
          kty: "OKP",
        },
        b: {
          key_ops: ["deriveKey", "deriveBits"],
          ext: true,
          crv: "X25519",
          d: "XasIfmJKikt54X+Lg4AO5m87sSkmGLb9HC+LJ/+I4Os=",
          x: "3p7bfXt9wbTTW2HC7OQ1Nz+DQ8hbeGdNrfx+FG+IK08=",
          kty: "OKP",
        },
        expected: "Sl2dW6TOLeFyjjv0gDUPJeB+IclH0Z4zdvCbPB4WF0I", // hex
      });

      it("computes the correct shared key for a test vector", async () => {
        function testVectorToUint8Array(hex: string): Uint8Array {
          return new Uint8Array(Buffer.from(hex, "hex"));
        }
        const aPrivateKey = await crypto.subtle.importKey("jwk", testVectors.a, "x25519", false, [
          "deriveBits",
        ]);
        const aPublicKey = new Uint8Array(Buffer.from(testVectors.a.x, "base64"));
        const bPrivateKey = await crypto.subtle.importKey("jwk", testVectors.b, "x25519", false, [
          "deriveBits",
        ]);
        const bPublicKey = new Uint8Array(Buffer.from(testVectors.b.x, "base64"));
        const expectedSharedKey = testVectorToUint8Array(
          "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742",
        );

        const actualAB = await cryptoFunctionService.deriveSharedKeyBits(
          aPrivateKey,
          bPublicKey,
          "x25519",
          undefined,
        );
        const actualBA = await cryptoFunctionService.deriveSharedKeyBits(
          bPrivateKey,
          aPublicKey,
          "x25519",
          undefined,
        );

        expect(actualAB).toEqual(expectedSharedKey);
        expect(actualBA).toEqual(expectedSharedKey);
      });
    });

    describe("ecdh", () => {
      // from rfc 7027 https://datatracker.ietf.org/doc/html/rfc7027.html#page-6
      const testVectors = Object.freeze({
        "P-256": {
          a: {
            key_ops: ["deriveKey", "deriveBits"],
            ext: true,
            kty: "EC",
            x: "slavLyCsXalaOmUgYA-cG4RFNxapMfWK5cnGFZXEsmE",
            y: "fR3rqDZX_m9ba5OPD4EM4AecqltCTNyXsGmV6e5UYkk",
            crv: "P-256",
            d: "HauUPXMuCzvArJpcNJisBzfHq05MVPmHv1Ixd_8Trxk",
          },
          b: {
            key_ops: ["deriveKey", "deriveBits"],
            ext: true,
            kty: "EC",
            x: "UDVHYHeNMuViKX2ixvJfUdRkP2vYaLH5LEtaZj0Sp5U",
            y: "ScRWbvlcz4IZc6h4SkUu6ejmho1hOrg3kUgEkpJf4OE",
            crv: "P-256",
            d: "xquL6bqtpdDaEoZ0h2HDwpXlPdX__w0xrr8VZLAS2wQ",
          },
          expectedSharedKey: {
            x: "89AFC39D41D3B327814B80940B042590F96556EC91E6AE7939BCE31F3A18BF2B",
            y: "49C27868F4ECA2179BFD7D59B1E3BF34C1DBDE61AE12931648F43E59632504DE",
          },
        },
        "P-384": {
          a: {
            key_ops: ["deriveKey", "deriveBits"],
            ext: true,
            kty: "EC",
            x: "0vsFRhdWTrrQyXF6MJcB3Lg-JjalCra973eA46nFNBwD4oLbTzpL514ZVNIb5nPG",
            y: "_KZHmMem5pmjhKjAmQ2twvwkssOh5ww28ZXBabgOsCF3MYi-ICkvkqdVvdPNCPaM",
            crv: "P-384",
            d: "V7yD-hx8gep_0pw8nFTYD0pRVkxGGN9Uz1zL1Ynq99oSJBG-mceLkwhXACvTKN2o",
          },
          b: {
            key_ops: ["deriveKey", "deriveBits"],
            ext: true,
            kty: "EC",
            x: "4pgonl58vdZpXrBurolmIw85fAwIY0gMfNRYt1TZWY-kXYz5vKxhi1ycjqotiprR",
            y: "CCFnRehKJtFX1-0zJWHcXaIpm09B88rq2nhmCRcc5E9NOdgh8dRyJw63o7c7F7XQ",
            crv: "P-384",
            d: "40D_ztyfZdBzV3CT8r5JC-SvZfGx4IfUnQNOzbgLcD98zvGcCH04Zs41JCEQ0t-y",
          },
        },
        "P-521": {
          a: {
            key_ops: ["deriveKey", "deriveBits"],
            ext: true,
            kty: "EC",
            x: "APD7DZbPsfQ-9tDlc1gFnZGQg5seDx59BmKeFDRERULUqr3EYoxpH-8eutJoXaKCTdzdiXWYpG7nEO99Q6CQuR6Q",
            y: "ACbcq7utMbQ5XRGwg-O23brBa29Gcaht6TRQvT9k3worJDQlKN-awn8b68HGMb8WEfJe2gFoPAB9D9Cr8sRT5W35",
            crv: "P-521",
            d: "AVeaaA3VUhbZfz_oJOCZjhg6gqxXjf96YDJ7rawtAnJDHxtLif7LHVQcOHRKiB6dN9al5KdCGhvo8eekMgRcDXPI",
          },
          b: {
            key_ops: ["deriveKey", "deriveBits"],
            ext: true,
            kty: "EC",
            x: "AD_GaHOGgjivKoC4C7L5P-fEUzvEpXKFSi32tmscW4NJqiCWQsekuR0EMNgXTw_7GTlrnsn5CcLHfianF3Way-bk",
            y: "AcJO4Pl7_qys5QS0-XP_Wluy5KgBXZIIG5vmmDLK7Vhsl_30IP6_WPA5JkqEOHZs25uTMdEERvcJlw7EAItGrM5t",
            crv: "P-521",
            d: "ADYRyQSF0aLOcYGukdjtFEe5d_pI8wLoU5kNHXfUPoVDHqK02zC-bDRIjJB8f0VWBZYVs88WXFVabUzYlbFwcSi1",
          },
        },
      });

      describe.each(["P-256", "P-384", "P-521"] as const)("curve %s", (curve) => {
        it("computes the correct shared key for a test vector", async () => {
          const aPrivateKey = await crypto.subtle.importKey(
            "jwk",
            testVectors[curve].a,
            { name: "ecdh", namedCurve: curve },
            true,
            ["deriveBits"],
          );
          const aPublicKey = Buffer.concat([
            new Uint8Array([0x04]),
            Buffer.from(testVectors[curve].a.x, "base64"),
            Buffer.from(testVectors[curve].a.y, "base64"),
          ]);
          const bPrivateKey = await crypto.subtle.importKey(
            "jwk",
            testVectors[curve].b,
            { name: "ecdh", namedCurve: curve },
            true,
            ["deriveBits"],
          );
          const bPublicKey = Buffer.concat([
            new Uint8Array([0x04]),
            Buffer.from(testVectors[curve].b.x, "base64"),
            Buffer.from(testVectors[curve].b.y, "base64"),
          ]);

          const actualAB = cryptoFunctionService.deriveSharedKeyBits(
            aPrivateKey,
            bPublicKey,
            "ecdh",
            curve,
          );

          const actualBA = cryptoFunctionService.deriveSharedKeyBits(
            bPrivateKey,
            aPublicKey,
            "ecdh",
            curve,
          );

          expect(actualAB).toEqual(actualBA);
        });
      });
    });
  });
});

function testPbkdf2(
  algorithm: "sha256" | "sha512",
  regularKey: string,
  utf8Key: string,
  unicodeKey: string,
) {
  const regularEmail = "user@example.com";
  const utf8Email = "üser@example.com";

  const regularPassword = "password";
  const utf8Password = "pǻssword";
  const unicodePassword = "😀password🙏";

  it("should create valid " + algorithm + " key from regular input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.pbkdf2(regularPassword, regularEmail, algorithm, 5000);
    expect(Utils.fromBufferToB64(key)).toBe(regularKey);
  });

  it("should create valid " + algorithm + " key from utf8 input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.pbkdf2(utf8Password, utf8Email, algorithm, 5000);
    expect(Utils.fromBufferToB64(key)).toBe(utf8Key);
  });

  it("should create valid " + algorithm + " key from unicode input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.pbkdf2(unicodePassword, regularEmail, algorithm, 5000);
    expect(Utils.fromBufferToB64(key)).toBe(unicodeKey);
  });

  it("should create valid " + algorithm + " key from array buffer input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.pbkdf2(
      Utils.fromUtf8ToArray(regularPassword),
      Utils.fromUtf8ToArray(regularEmail),
      algorithm,
      5000,
    );
    expect(Utils.fromBufferToB64(key)).toBe(regularKey);
  });
}

function testHkdf(
  algorithm: "sha256" | "sha512",
  regularKey: string,
  utf8Key: string,
  unicodeKey: string,
) {
  const ikm = Utils.fromB64ToArray("criAmKtfzxanbgea5/kelQ==");

  const regularSalt = "salt";
  const utf8Salt = "üser_salt";
  const unicodeSalt = "😀salt🙏";

  const regularInfo = "info";
  const utf8Info = "üser_info";
  const unicodeInfo = "😀info🙏";

  it("should create valid " + algorithm + " key from regular input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.hkdf(ikm, regularSalt, regularInfo, 32, algorithm);
    expect(Utils.fromBufferToB64(key)).toBe(regularKey);
  });

  it("should create valid " + algorithm + " key from utf8 input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.hkdf(ikm, utf8Salt, utf8Info, 32, algorithm);
    expect(Utils.fromBufferToB64(key)).toBe(utf8Key);
  });

  it("should create valid " + algorithm + " key from unicode input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.hkdf(ikm, unicodeSalt, unicodeInfo, 32, algorithm);
    expect(Utils.fromBufferToB64(key)).toBe(unicodeKey);
  });

  it("should create valid " + algorithm + " key from array buffer input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const key = await cryptoFunctionService.hkdf(
      ikm,
      Utils.fromUtf8ToArray(regularSalt),
      Utils.fromUtf8ToArray(regularInfo),
      32,
      algorithm,
    );
    expect(Utils.fromBufferToB64(key)).toBe(regularKey);
  });
}

function testHkdfExpand(
  algorithm: "sha256" | "sha512",
  b64prk: string,
  outputByteSize: number,
  b64ExpectedOkm: string,
) {
  const info = "info";

  it("should create valid " + algorithm + " " + outputByteSize + " byte okm", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const okm = await cryptoFunctionService.hkdfExpand(
      Utils.fromB64ToArray(b64prk),
      info,
      outputByteSize,
      algorithm,
    );
    expect(Utils.fromBufferToB64(okm)).toBe(b64ExpectedOkm);
  });
}

function testHash(
  algorithm: "sha1" | "sha256" | "sha512" | "md5",
  regularHash: string,
  utf8Hash: string,
  unicodeHash: string,
) {
  const regularValue = "HashMe!!";
  const utf8Value = "HǻshMe!!";
  const unicodeValue = "😀HashMe!!!🙏";

  it("should create valid " + algorithm + " hash from regular input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const hash = await cryptoFunctionService.hash(regularValue, algorithm);
    expect(Utils.fromBufferToHex(hash)).toBe(regularHash);
  });

  it("should create valid " + algorithm + " hash from utf8 input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const hash = await cryptoFunctionService.hash(utf8Value, algorithm);
    expect(Utils.fromBufferToHex(hash)).toBe(utf8Hash);
  });

  it("should create valid " + algorithm + " hash from unicode input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const hash = await cryptoFunctionService.hash(unicodeValue, algorithm);
    expect(Utils.fromBufferToHex(hash)).toBe(unicodeHash);
  });

  it("should create valid " + algorithm + " hash from array buffer input", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const hash = await cryptoFunctionService.hash(Utils.fromUtf8ToArray(regularValue), algorithm);
    expect(Utils.fromBufferToHex(hash)).toBe(regularHash);
  });
}

function testHmac(algorithm: "sha1" | "sha256" | "sha512", mac: string, fast = false) {
  it("should create valid " + algorithm + " hmac", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const value = Utils.fromUtf8ToArray("SignMe!!");
    const key = Utils.fromUtf8ToArray("secretkey");
    let computedMac: ArrayBuffer = null;
    if (fast) {
      computedMac = await cryptoFunctionService.hmacFast(value, key, algorithm);
    } else {
      computedMac = await cryptoFunctionService.hmac(value, key, algorithm);
    }
    expect(Utils.fromBufferToHex(computedMac)).toBe(mac);
  });
}

function testCompare(fast = false) {
  it("should successfully compare two of the same values", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const a = new Uint8Array(2);
    a[0] = 1;
    a[1] = 2;
    const equal = fast
      ? await cryptoFunctionService.compareFast(a, a)
      : await cryptoFunctionService.compare(a, a);
    expect(equal).toBe(true);
  });

  it("should successfully compare two different values of the same length", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const a = new Uint8Array(2);
    a[0] = 1;
    a[1] = 2;
    const b = new Uint8Array(2);
    b[0] = 3;
    b[1] = 4;
    const equal = fast
      ? await cryptoFunctionService.compareFast(a, b)
      : await cryptoFunctionService.compare(a, b);
    expect(equal).toBe(false);
  });

  it("should successfully compare two different values of different lengths", async () => {
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const a = new Uint8Array(2);
    a[0] = 1;
    a[1] = 2;
    const b = new Uint8Array(2);
    b[0] = 3;
    const equal = fast
      ? await cryptoFunctionService.compareFast(a, b)
      : await cryptoFunctionService.compare(a, b);
    expect(equal).toBe(false);
  });
}

function testRsaGenerateKeyPair(length: 1024 | 2048 | 4096) {
  it(
    "should successfully generate a " + length + " bit key pair",
    async () => {
      const cryptoFunctionService = new NodeCryptoFunctionService();
      const keyPair = await cryptoFunctionService.rsaGenerateKeyPair(length);
      expect(keyPair[0] == null || keyPair[1] == null).toBe(false);
      const publicKey = await cryptoFunctionService.rsaExtractPublicKey(keyPair[1]);
      expect(Utils.fromBufferToB64(keyPair[0])).toBe(Utils.fromBufferToB64(publicKey));
    },
    30000,
  );
}

function makeStaticByteArray(length: number) {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = i;
  }
  return arr;
}
