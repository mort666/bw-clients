// eslint-disable-next-line import/no-restricted-paths
import type BrowserMessages from "../../../../../apps/browser/src/_locales/en/messages.json";
// eslint-disable-next-line import/no-restricted-paths
import type CliMessages from "../../../../../apps/cli/src/locales/en/messages.json";
// eslint-disable-next-line import/no-restricted-paths
import type DesktopMessages from "../../../../../apps/desktop/src/locales/en/messages.json";
// eslint-disable-next-line import/no-restricted-paths
import type WebMessages from "../../../../../apps/web/src/locales/en/messages.json";

type BrowserMessages = typeof BrowserMessages;
type CliMessages = typeof CliMessages;
type DesktopMessages = typeof DesktopMessages;
type WebMessages = typeof WebMessages;

type Messages = {
  browser: BrowserMessages;
  cli: CliMessages;
  desktop: DesktopMessages;
  web: WebMessages;
};

export type ClientTuple = (keyof Messages)[];

export type I18nKeys<TClients extends ClientTuple> = keyof {
  [Index in keyof TClients]: Messages[TClients[Index]];
}[number];

export abstract class TranslationService<TClients extends ClientTuple> {
  abstract supportedTranslationLocales: string[];
  abstract translationLocale: string;
  abstract collator: Intl.Collator;
  abstract localeNames: Map<string, string>;
  abstract t(
    id: I18nKeys<TClients>,
    p1?: string | number,
    p2?: string | number,
    p3?: string | number,
  ): string;
  abstract translate(id: I18nKeys<TClients>, p1?: string, p2?: string, p3?: string): string;
}
