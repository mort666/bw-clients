import { Observable } from "rxjs";

import { ClientTuple, TranslationService } from "./translation.service";

/** TODO: remove default generic of `any` */
export abstract class I18nService<T extends ClientTuple = any> extends TranslationService<T> {
  abstract userSetLocale$: Observable<string | undefined>;
  abstract locale$: Observable<string>;
  abstract setLocale(locale: string): Promise<void>;
  abstract init(): Promise<void>;
}
