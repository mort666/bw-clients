import { CryptoFunctionService } from "@bitwarden/common/platform/abstractions/crypto-function.service";

export class ScriptSignature {
  constructor(private readonly cryptoFunctionService: CryptoFunctionService) {}
}
