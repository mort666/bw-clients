import { Utils } from "../misc/utils";
import { EncString } from "../models/domain/enc-string";

import { TunnelVersion } from "./communication-tunnel";

declare const marker: unique symbol;

export class TunneledRequest<RequestType> {
  [marker]: RequestType;

  readonly encryptedData: string;
  readonly encapsulatedKey: string;

  constructor(
    encryptedData: Uint8Array,
    encapsulatedKey: EncString,
    readonly tunnelVersion: TunnelVersion,
    readonly tunnelIdentifier: string,
  ) {
    if (encryptedData == null) {
      throw new Error("encryptedData is required");
    }
    if (encapsulatedKey == null) {
      throw new Error("encapsulatedKey is required");
    }
    if (tunnelVersion == null) {
      throw new Error("tunnelVersion is required");
    }
    if (tunnelIdentifier == null) {
      throw new Error("tunnelIdentifier is required");
    }
    this.encapsulatedKey = Utils.fromBufferToB64(encapsulatedKey.dataBytes);
    this.encryptedData = Utils.fromBufferToB64(encryptedData);
  }
}

export function isTunneledRequest<RequestType = any>(
  request: any,
): request is TunneledRequest<RequestType> {
  return (
    request.encryptedData !== undefined &&
    request.tunnelVersion !== undefined &&
    request.tunnelIdentifier !== undefined
  );
}
