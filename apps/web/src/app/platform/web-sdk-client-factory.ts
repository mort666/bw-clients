import { SdkClientFactory } from "@bitwarden/common/platform/abstractions/sdk/sdk-client-factory";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { WebCryptoFunctionService } from "@bitwarden/common/platform/services/web-crypto-function.service";
import * as sdk from "@bitwarden/sdk-internal";

/**
 * SDK client factory with a js fallback for when WASM is not supported.
 */
export class WebSdkClientFactory implements SdkClientFactory {
  async createSdkClient(
    ...args: ConstructorParameters<typeof sdk.BitwardenClient>
  ): Promise<sdk.BitwardenClient> {
    const module = await load();

    (sdk as any).init(module);

    let start = performance.now();
    let iterations = 20000;
    for (let i = 0; i < iterations; i++) {
      sdk.ClientCrypto.generate_xwing_keypair();
    }
    let end = performance.now();
    console.log("[xwing] generated", iterations, "keys in ", end-start, "ms which is ", 1000/(end-start)*iterations, "keys per second");

    let test_key = sdk.ClientCrypto.generate_xwing_keypair();
    let pk = test_key.slice(32);
    let sk = test_key.slice(0,32);

    start = performance.now();
    for (let i = 0; i < iterations; i++) {
      sdk.ClientCrypto.encapsulate_xwing(pk);
    }
    end = performance.now();
    console.log("[xwing] encapsulated", iterations, "keys in ", end-start, "ms which is ", 1000/(end-start)*iterations, "keys per second");

    let encapsulated_test_key = sdk.ClientCrypto.encapsulate_xwing(pk);
    let ct = encapsulated_test_key.slice(0,1120);
    let ss_sender = encapsulated_test_key.slice(1120);

    start = performance.now();
    for (let i = 0; i < iterations; i++) {
      sdk.ClientCrypto.decapsulate_xwing(sk, ct);
    }
    end = performance.now();
    console.log("[xwing] decapsulated", iterations, "keys in ", end-start, "ms which is ", 1000/(end-start)*iterations, "keys per second");


    start = performance.now();
    for (let i = 0; i < iterations; i++) {
      sdk.ClientCrypto.generate_ed25519_keypair();
    }
    end = performance.now();
    console.log("[ed25519] generated", iterations, "keys in ", end-start, "ms which is ", 1000/(end-start)*iterations, "keys per second");

    let ed25519keypair = sdk.ClientCrypto.generate_ed25519_keypair();
    let signingKey = ed25519keypair.slice(0,32);
    let verifyingKey = ed25519keypair.slice(32);

    let testmsg = "hello world";
    let testmsgUint8 = Utils.fromByteStringToArray(testmsg);
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
      sdk.ClientCrypto.sign_ed25519(testmsgUint8, signingKey);
    }
    end = performance.now();
    console.log("[ed25510] signed", iterations, "msgs in ", end-start, "ms which is ", 1000/(end-start)*iterations, "sigs per second");

    let signature = sdk.ClientCrypto.sign_ed25519(testmsgUint8, signingKey);
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
      sdk.ClientCrypto.verify_ed25519(testmsgUint8, signature, verifyingKey);
    }
    end = performance.now();
    console.log("[ed25519] verified", iterations, "msgs in ", end-start, "ms which is ", 1000/(end-start)*iterations, "verify per second");

    let webcryptofunctionservice = new WebCryptoFunctionService(window);

    start = performance.now();
    iterations = 1000;
    for (let i = 0; i < iterations/50; i++) {
        await webcryptofunctionservice.rsaGenerateKeyPair(2048);
    }
    end = performance.now();
    console.log("[rsa-webcrypto] generated", iterations, " 2048 bit keys in ", end-start, "ms which is ", 1000/(end-start)*iterations, "keys per second");
    
    let rsakey = await webcryptofunctionservice.rsaGenerateKeyPair(2048);
    iterations = 100000;
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
        await webcryptofunctionservice.rsaEncrypt(testmsgUint8, rsakey[0], "sha256");
    }
    end = performance.now();
    console.log("[rsa-webcrypto] encrypted", iterations, "msg using 2048 bit key in ", end-start, "ms which is ", 1000/(end-start)*iterations, "encs per second");

    let encrypted = await webcryptofunctionservice.rsaEncrypt(testmsgUint8, rsakey[0], "sha256");
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await webcryptofunctionservice.rsaDecrypt(encrypted, rsakey[1], "sha256");
    }
    end = performance.now();
    console.log("[rsa-webcrypto] decrypted", iterations, "msg using 2048 bit key in ", end-start, "ms which is ", 1000/(end-start)*iterations, "encs per second");

    return Promise.resolve(new sdk.BitwardenClient(...args));
  }
}

// https://stackoverflow.com/a/47880734
const supported = (() => {
  try {
    if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00),
      );
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
})();

async function load() {
  if (supported) {
    return await import("@bitwarden/sdk-internal/bitwarden_wasm_internal_bg.wasm");
  } else {
    //return await import("@bitwarden/sdk-internal/bitwarden_wasm_internal_bg.wasm.js");
  }
}
