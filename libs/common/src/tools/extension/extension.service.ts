import { StateProvider } from "@bitwarden/common/platform/state";

import { LegacyEncryptorProvider } from "../cryptography/legacy-encryptor-provider";

import { DefaultExtensionRegistry } from "./default-extension-registry";

export class ExtensionService {
  constructor(
    private readonly registry: DefaultExtensionRegistry,
    private readonly stateProvider: StateProvider,
    private readonly encryptorProvider: LegacyEncryptorProvider,
  ) {}

  // TODO: implement the service
}
