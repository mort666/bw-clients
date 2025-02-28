import { Injectable } from "@angular/core";
import { Observable, from, of, switchMap } from "rxjs";

import { TwoFactorProviderType } from "@bitwarden/common/auth/enums/two-factor-provider-type";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { AbstractStorageService } from "@bitwarden/common/platform/abstractions/storage.service";


export interface TwoFactorFormData {
  token?: string;
  remember?: boolean;
  selectedProviderType?: TwoFactorProviderType;
  emailSent?: boolean;
}

const STORAGE_KEY = "twoFactorFormData";

@Injectable({
  providedIn: "root",
})
export class ExtensionTwoFactorFormCacheService {
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
