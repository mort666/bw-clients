import { UserId } from "../../../types/guid";

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
