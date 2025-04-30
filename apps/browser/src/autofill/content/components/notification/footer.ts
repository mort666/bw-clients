import { css } from "@emotion/css";
import { html, nothing } from "lit";

import { Theme } from "@bitwarden/common/platform/enums";

import {
  NotificationType,
  NotificationTypes,
} from "../../../notification/abstractions/notification-bar";
import { ActionButton } from "../buttons/action-button";
import { OrgView, FolderView, CollectionView } from "../common-types";
import { spacing, themes } from "../constants/styles";

import { NotificationButtonRow } from "./button-row";
import { AdditionalTasksButtonContent } from "./confirmation/footer";

export type NotificationFooterProps = {
  collections?: CollectionView[];
  folders?: FolderView[];
  i18n: { [key: string]: string };
  notificationType?: NotificationType;
  organizations?: OrgView[];
  personalVaultIsAllowed: boolean;
  theme: Theme;
  handleSaveAction: (e: Event) => void;
  passwordChangeUri?: string;
};

export function NotificationFooter({
  collections,
  folders,
  i18n,
  notificationType,
  organizations,
  personalVaultIsAllowed,
  theme,
  passwordChangeUri,
  handleSaveAction,
}: NotificationFooterProps) {
  const isChangeNotification = notificationType === NotificationTypes.Change;
  const primaryButtonText = i18n.saveAction;

  if (notificationType === NotificationTypes.AtRiskPassword) {
    return html`<div class=${notificationFooterStyles({ theme })}>
      ${passwordChangeUri &&
      ActionButton({
        handleClick: () => {
          open("https://" + passwordChangeUri, "_blank");
        },
        buttonText: AdditionalTasksButtonContent({ buttonText: i18n.changePassword, theme }),
        theme,
        fullWidth: false,
      })}
    </div>`;
  }

  return html`
    <div class=${notificationFooterStyles({ theme })}>
      ${!isChangeNotification
        ? NotificationButtonRow({
            collections,
            folders,
            organizations,
            i18n,
            primaryButton: {
              handlePrimaryButtonClick: handleSaveAction,
              text: primaryButtonText,
            },
            personalVaultIsAllowed,
            theme,
          })
        : nothing}
    </div>
  `;
}

const notificationFooterStyles = ({ theme }: { theme: Theme }) => css`
  display: flex;
  background-color: ${themes[theme].background.alt};
  padding: 0 ${spacing[3]} ${spacing[3]} ${spacing[3]};

  :last-child {
    border-radius: 0 0 ${spacing["4"]} ${spacing["4"]};
    padding-bottom: ${spacing[4]};
  }
`;
