import { SshKeyApi } from "@bitwarden/common/vault/models/api/ssh-key.api";
import { SshKeyData } from "@bitwarden/common/vault/models/data/ssh-key.data";

import { SshKeyNativeGeneratorAbstraction } from "../../../../../libs/tools/generator/core/src/abstractions/sshkey-native-generator.abstraction";

export class ElectronSshKeyGeneratorService implements SshKeyNativeGeneratorAbstraction {
  async generate(keyAlgorithm: "rsa" | "ed25519", keyLength?: number): Promise<SshKeyData> {
    let algorithmNameWithBits = keyAlgorithm;
    if (keyAlgorithm === "rsa") {
      algorithmNameWithBits += `${keyLength}`;
    }
    const key = await ipc.platform.sshAgent.generateKey(algorithmNameWithBits);
    return new SshKeyData(
      new SshKeyApi({
        privateKey: key.privateKey,
        publicKey: key.publicKey,
        keyFingerprint: key.keyFingerprint,
      }),
    );
  }
}
