import { html, nothing } from "lit";

import { Theme } from "@bitwarden/common/platform/enums";

import { Celebrate, Keyhole, Warning } from "../../illustrations";
import { iconContainerStyles, notificationConfirmationBodyStyles } from "../confirmation/body";

import { AtRiskNotificationMessage } from "./message";

export const componentClassPrefix = "notification-confirmation-body";

export type AtRiskNotificationBodyProps = {
  buttonAria: string;
  buttonText: string;
  confirmationMessage: string;
  error?: string;
  itemName?: string;
  messageDetails?: string;
  tasksAreComplete?: boolean;
  theme: Theme;
  handleOpenVault: (e: Event) => void;
};

export function AtRiskNotificationBody({
  buttonAria,
  buttonText,
  confirmationMessage,
  error,
  itemName,
  messageDetails,
  tasksAreComplete,
  theme,
  handleOpenVault,
}: AtRiskNotificationBodyProps) {
  const IconComponent = tasksAreComplete ? Keyhole : !error ? Celebrate : Warning;

  const showConfirmationMessage = confirmationMessage || buttonText || messageDetails;

  return html`
    <div class=${notificationConfirmationBodyStyles({ theme })}>
      <div class=${iconContainerStyles(error)}>${IconComponent({ theme })}</div>
      ${showConfirmationMessage
        ? AtRiskNotificationMessage({
            buttonAria,
            buttonText,
            itemName,
            message: confirmationMessage,
            messageDetails,
            theme,
            handleClick: handleOpenVault,
          })
        : nothing}
    </div>
  `;
}
