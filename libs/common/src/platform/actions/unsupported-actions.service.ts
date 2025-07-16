import { ActionsService } from "./actions-service";

export class UnsupportedActionsService implements ActionsService {
  openPopup(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
