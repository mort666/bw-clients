import { Observable } from "rxjs";

import { ClientTuple, TranslationService } from "./translation.service";

export abstract class I18nService<T extends ClientTuple> extends TranslationService<T> {
  abstract userSetLocale$: Observable<string | undefined>;
  abstract locale$: Observable<string>;
  abstract setLocale(locale: string): Promise<void>;
  abstract init(): Promise<void>;
}
