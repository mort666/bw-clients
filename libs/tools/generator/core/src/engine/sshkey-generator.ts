import { GenerationRequest } from "@bitwarden/common/tools/types";

import { SshKeyNativeGenerator } from "../abstractions/sshkey-native-generator.abstraction";
import { CredentialGenerator, GeneratedCredential } from "../types";
import { SshKeyGenerationOptions } from "../types/sshkey-generation-options";

export class SshKeyGenerator implements CredentialGenerator<SshKeyGenerationOptions> {
  constructor(private sshkeyNativeGenerator: SshKeyNativeGenerator) {}

  async generate(
    request: GenerationRequest,
    settings: SshKeyGenerationOptions,
  ): Promise<GeneratedCredential> {
    const key = (
      await this.sshkeyNativeGenerator.generate(
        request.algorithm as "rsa" | "ed25519",
        settings.bits,
      )
    ).privateKey;
    return new GeneratedCredential(key, request.algorithm, Date.now());
  }
}
