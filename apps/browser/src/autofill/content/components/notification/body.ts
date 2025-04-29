import createEmotion from "@emotion/css/create-instance";
import { html } from "lit";

import { Theme, ThemeTypes } from "@bitwarden/common/platform/enums";

import {
  NotificationType,
  NotificationTypes,
} from "../../../notification/abstractions/notification-bar";
import { CipherItem } from "../cipher";
import { NotificationCipherData } from "../cipher/types";
import { scrollbarStyles, spacing, themes, typography } from "../constants/styles";
import { ItemRow } from "../rows/item-row";

export const componentClassPrefix = "notification-body";

const { css } = createEmotion({
  key: componentClassPrefix,
});

export function NotificationBody({
  ciphers = [],
  passwordChangeUri,
  i18n,
  notificationType,
  theme = ThemeTypes.Light,
  handleEditOrUpdateAction,
}: {
  ciphers?: NotificationCipherData[];
  passwordChangeUri: string;
  customClasses?: string[];
  i18n: { [key: string]: string };
  notificationType?: NotificationType;
  theme: Theme;
  handleEditOrUpdateAction: (e: Event) => void;
}) {
  // @TODO get client vendor from context
  const isSafari = false;

  switch (notificationType) {
    case NotificationTypes.AtRiskPassword:
      return html`
        <div class=${notificationBodyStyles({ isSafari, theme })}>
          ${passwordChangeUri ? i18n.atRiskChangePrompt : i18n.atRiskNavigatePrompt}
          ${passwordChangeUri && i18n.changePassword}
        </div>
      `;
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
