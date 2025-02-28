import { Observable, from, of, switchMap } from "rxjs";

import { TwoFactorFormCacheServiceAbstraction, TwoFactorFormData } from "@bitwarden/auth/angular";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { AbstractStorageService } from "@bitwarden/common/platform/abstractions/storage.service";



const STORAGE_KEY = "twoFactorFormData";

export class ExtensionTwoFactorFormCacheService implements TwoFactorFormCacheServiceAbstraction {
  constructor(
    private storageService: AbstractStorageService,
    private configService: ConfigService,
  ) {}

  isEnabled$(): Observable<boolean> {
    return from(this.configService.getFeatureFlag(FeatureFlag.PM9115_TwoFactorFormPersistence));
  }

  async isEnabled(): Promise<boolean> {
    return await this.configService.getFeatureFlag(FeatureFlag.PM9115_TwoFactorFormPersistence);
  }

  formData$(): Observable<TwoFactorFormData | null> {
    return this.isEnabled$().pipe(
      switchMap((enabled) => {
        if (!enabled) {
          return of(null);
        }
        return from(this.storageService.get<TwoFactorFormData>(STORAGE_KEY));
      }),
    );
  }

  async saveFormData(data: TwoFactorFormData): Promise<void> {
    if (!(await this.isEnabled())) {
      return;
    }

    await this.storageService.save(STORAGE_KEY, data);
  }

  async getFormData(): Promise<TwoFactorFormData | null> {
    if (!(await this.isEnabled())) {
      return null;
    }

    return await this.storageService.get<TwoFactorFormData>(STORAGE_KEY);
  }

  async clearFormData(): Promise<void> {
    await this.storageService.remove(STORAGE_KEY);
  }
}
