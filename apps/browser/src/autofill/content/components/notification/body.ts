import createEmotion from "@emotion/css/create-instance";
import { html } from "lit";

import { Theme, ThemeTypes } from "@bitwarden/common/platform/enums";

import {
  NotificationMessageParams,
  NotificationType,
  NotificationTypes,
} from "../../../notification/abstractions/notification-bar";
import { CipherItem } from "../cipher";
import { NotificationCipherData } from "../cipher/types";
import { I18n } from "../common-types";
import { scrollbarStyles, spacing, themes, typography } from "../constants/styles";
import { ItemRow } from "../rows/item-row";

import { NotificationConfirmationBody } from "./confirmation/body";

export const componentClassPrefix = "notification-body";

const { css } = createEmotion({
  key: componentClassPrefix,
});

export type NotificationBodyProps = {
  ciphers?: NotificationCipherData[];
  i18n: I18n;
  notificationType?: NotificationType;
  theme: Theme;
  handleEditOrUpdateAction: (e: Event) => void;
  params?: NotificationMessageParams;
};

export function NotificationBody({
  ciphers = [],
  i18n,
  notificationType,
  theme = ThemeTypes.Light,
  handleEditOrUpdateAction,
  params,
}: NotificationBodyProps) {
  // @TODO get client vendor from context
  const isSafari = false;
  const { passwordChangeUri, organizationName } = params;

  switch (notificationType) {
    case NotificationTypes.AtRiskPassword:
      return NotificationConfirmationBody({
        buttonAria: "",
        error: "At risk password",
        theme,
        tasksAreComplete: false,
        itemName: "",
        handleOpenVault: () => {},
        buttonText: "",
        confirmationMessage: chrome.i18n.getMessage(
          passwordChangeUri ? "atRiskChangePrompt" : "atRiskNavigatePrompt",
          organizationName,
        ),
      });
    default:
      return html`
        <div class=${notificationBodyStyles({ isSafari, theme })}>
          ${ciphers.map((cipher) =>
            ItemRow({
              theme,
              children: CipherItem({
                cipher,
                i18n,
                notificationType,
                theme,
                handleAction: handleEditOrUpdateAction,
              }),
            }),
          )}
        </div>
      `;
  }
}

const notificationBodyStyles = ({ isSafari, theme }: { isSafari: boolean; theme: Theme }) => css`
  ${typography.body1}

  gap: ${spacing["1.5"]};
  display: flex;
  flex-flow: column;
  background-color: ${themes[theme].background.alt};
  max-height: 123px;
  overflow-x: hidden;
  overflow-y: auto;
  white-space: nowrap;
  color: ${themes[theme].text.main};
  font-weight: 400;

  :last-child {
    border-radius: 0 0 ${spacing["4"]} ${spacing["4"]};
  }

  ${isSafari ? scrollbarStyles(theme).safari : scrollbarStyles(theme).default}
`;
