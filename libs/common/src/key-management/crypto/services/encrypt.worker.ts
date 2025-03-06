// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Jsonify } from "type-fest";

import { Decryptable } from "@bitwarden/common/platform/interfaces/decryptable.interface";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { ConsoleLogService } from "@bitwarden/common/platform/services/console-log.service";
import { ContainerService } from "@bitwarden/common/platform/services/container.service";
import { getClassInitializer } from "@bitwarden/common/platform/services/cryptography/get-class-initializer";
import { WebCryptoFunctionService } from "@bitwarden/common/platform/services/web-crypto-function.service";

import { ServerConfig } from "../../../platform/abstractions/config/server-config";
import { LogService } from "../../../platform/abstractions/log.service";

import { EncryptServiceImplementation } from "./encrypt.service.implementation";

const workerApi: Worker = self as any;

let inited = false;
let encryptService: EncryptServiceImplementation;
let logService: LogService;

const DECRYPT_COMMAND_SHELL = Object.freeze({ command: "decrypt" });
const SET_CONFIG_COMMAND_SHELL = Object.freeze({ command: "setConfig" });

type DecryptCommandData = {
  id: string;
  items: Jsonify<Decryptable<any>>[];
  key: Jsonify<SymmetricCryptoKey>;
};

type SetConfigCommandData = { newConfig: ServerConfig };

export function buildDecryptMessage(data: DecryptCommandData): string {
  return JSON.stringify({
    ...data,
    ...DECRYPT_COMMAND_SHELL,
  });
}

export function buildSetConfigMessage(data: SetConfigCommandData): string {
  return JSON.stringify({
    ...data,
    ...SET_CONFIG_COMMAND_SHELL,
  });
}

/**
 * Bootstrap the worker environment with services required for decryption
 */
export function init() {
  const cryptoFunctionService = new WebCryptoFunctionService(self);
  logService = new ConsoleLogService(false);
  encryptService = new EncryptServiceImplementation(cryptoFunctionService, logService, true);

  const bitwardenContainerService = new ContainerService(null, encryptService);
  bitwardenContainerService.attachToGlobal(self);

  inited = true;
}

/**
 * Listen for messages and decrypt their contents
 */
workerApi.addEventListener("message", async (event: { data: string }) => {
  if (!inited) {
    init();
  }

  const request: {
    command: string;
  } = JSON.parse(event.data);

  switch (request.command) {
    case DECRYPT_COMMAND_SHELL.command:
      return await handleDecrypt(request as unknown as DecryptCommandData);
    case SET_CONFIG_COMMAND_SHELL.command:
      return await handleSetConfig(request as unknown as SetConfigCommandData);
    default:
      logService.error(`unknown worker command`, request.command, request);
  }
});

async function handleDecrypt(request: DecryptCommandData) {
  const key = SymmetricCryptoKey.fromJSON(request.key);
  const items = request.items.map((jsonItem) => {
    const initializer = getClassInitializer<Decryptable<any>>(jsonItem.initializerKey);
    return initializer(jsonItem);
  });
  const result = await encryptService.decryptItems(items, key);

  workerApi.postMessage({
    id: request.id,
    items: JSON.stringify(result),
  });
}

async function handleSetConfig(request: SetConfigCommandData) {
  encryptService.onServerConfigChange(request.newConfig);
}
