import { SshKeyNativeGeneratorAbstraction } from "../abstractions/sshkey-native-generator.abstraction";
import { CredentialGenerator, GeneratedCredential } from "../types";
import { SshKeyGenerationOptions } from "../types/sshkey-generation-options";

import { SshKeyRequest } from "./types";

export class SshKeyGenerator implements CredentialGenerator<SshKeyGenerationOptions> {
  constructor(private sshkeyNativeGenerator: SshKeyNativeGeneratorAbstraction) {}

  async generate(
    _request: SshKeyRequest,
    settings: SshKeyGenerationOptions,
  ): Promise<GeneratedCredential> {
    const key = (await this.sshkeyNativeGenerator.generate(settings.keyAlgorithm, settings.bits))
      .privateKey;
    return new GeneratedCredential(key, "sshkey", Date.now());
  }
}
