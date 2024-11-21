import { UserId } from "../../../types/guid";

/**
 * @typedef { import("../response/key-connector-init-communication.response").KeyConnectorInitCommunicationResponse } KeyConnectorInitCommunicationResponse
 */

export class KeyConnectorSetUserKeyRequest {
  /**
   *
   * @param key The key to store
   */
  constructor(readonly key: string) {}
}

export class KeyConnectorGetUserKeyRequest {
  constructor(readonly userId: UserId) {}
}
