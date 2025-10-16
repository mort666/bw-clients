import { UserId } from "@bitwarden/user-core";

import { AuthRequestAnsweringService } from "../../abstractions/auth-request-answering/auth-request-answering.service.abstraction";

export class NoopAuthRequestAnsweringService implements AuthRequestAnsweringService {
  constructor() {}

  async receivedPendingAuthRequest(userId: UserId, notificationId: string): Promise<void> {}

  async userMeetsConditionsToShowApprovalDialog(userId: UserId): Promise<boolean> {
    return false;
  }

  async processPendingAuthRequests(): Promise<void> {}
}
