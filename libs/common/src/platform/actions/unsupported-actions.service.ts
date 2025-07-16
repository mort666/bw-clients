import { ActionsService } from "./actions-service";

export class UnsupportedActionsService implements ActionsService {
  openPopup(): Promise<void> {
    throw new Error("Open Popup unsupported.");
  }

  openPopupToUrl(url: string): Promise<void> {
    throw new Error("Open Popup to Url unsupported.");
  }
}
