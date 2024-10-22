import { map, combineLatest, Observable, switchMap } from "rxjs";

import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";

import {
  LABS_SETTINGS_DISK,
  GlobalState,
  KeyDefinition,
  StateProvider,
} from "../../platform/state";

const LABS_SETTINGS_ENABLED = new KeyDefinition(LABS_SETTINGS_DISK, "labsSettingsEnabled", {
  deserializer: (value: boolean) => value ?? false,
});

const IMPROVED_FIELD_QUALIFICATION_FOR_INLINE_MENU_ENABLED = new KeyDefinition(
  LABS_SETTINGS_DISK,
  "improvedFieldQualificationForInlineMenuEnabled",
  {
    deserializer: (value: boolean) => value ?? null,
  },
);

const ADDITIONAL_INLINE_MENU_CIPHER_TYPES_ENABLED = new KeyDefinition(
  LABS_SETTINGS_DISK,
  "additionalInlineMenuCipherTypesEnabled",
  {
    deserializer: (value: boolean) => value ?? null,
  },
);

const NOTIFICATION_BAR_IMPROVEMENTS_ENABLED = new KeyDefinition(
  LABS_SETTINGS_DISK,
  "notificationBarImprovementsEnabled",
  {
    deserializer: (value: boolean) => value ?? null,
  },
);

const DESIGN_REFRESH_ENABLED = new KeyDefinition(LABS_SETTINGS_DISK, "designRefreshEnabled", {
  deserializer: (value: boolean) => value ?? null,
});

export abstract class LabsSettingsServiceAbstraction {
  checkUserSettingClearStatus: () => Promise<void>;
  clearAllLabsSettings: () => Promise<void>;
  labsSettingsEnabled$: Observable<boolean>;
  setLabsSettingsEnabled: (newValue: boolean) => Promise<void>;
  improvedFieldQualificationForInlineMenuEnabled$: Observable<boolean | null>;
  setImprovedFieldQualificationForInlineMenuEnabled: (newValue: boolean) => Promise<void>;
  resolvedImprovedFieldQualificationForInlineMenuEnabled$: Observable<boolean | null>;
  additionalInlineMenuCipherTypesEnabled$: Observable<boolean | null>;
  setAdditionalInlineMenuCipherTypesEnabled: (newValue: boolean) => Promise<void>;
  resolvedAdditionalInlineMenuCipherTypesEnabled$: Observable<boolean | null>;
  notificationBarImprovementsEnabled$: Observable<boolean | null>;
  resolvedNotificationBarImprovementsEnabled$: Observable<boolean | null>;
  setNotificationBarImprovementsEnabled: (newValue: boolean) => Promise<void>;
  designRefreshEnabled$: Observable<boolean | null>;
  resolvedDesignRefreshEnabled$: Observable<boolean | null>;
  setDesignRefreshEnabled: (newValue: boolean) => Promise<void>;
}

export class LabsSettingsService implements LabsSettingsServiceAbstraction {
  private labsSettingsEnabledState: GlobalState<boolean>;
  readonly labsSettingsEnabled$: Observable<boolean>;
  private improvedFieldQualificationForInlineMenuEnabledState: GlobalState<boolean>;
  readonly improvedFieldQualificationForInlineMenuEnabled$: Observable<boolean>;
  readonly resolvedImprovedFieldQualificationForInlineMenuEnabled$: Observable<boolean>;
  private additionalInlineMenuCipherTypesEnabledState: GlobalState<boolean>;
  readonly additionalInlineMenuCipherTypesEnabled$: Observable<boolean>;
  readonly resolvedAdditionalInlineMenuCipherTypesEnabled$: Observable<boolean>;
  private notificationBarImprovementsState: GlobalState<boolean>;
  readonly notificationBarImprovementsEnabled$: Observable<boolean>;
  readonly resolvedNotificationBarImprovementsEnabled$: Observable<boolean>;
  private designRefreshEnabledState: GlobalState<boolean>;
  readonly designRefreshEnabled$: Observable<boolean>;
  readonly resolvedDesignRefreshEnabled$: Observable<boolean>;
  private preserveLabSettings: boolean = true;

  constructor(
    private stateProvider: StateProvider,
    private configService: ConfigService,
  ) {
    this.labsSettingsEnabledState = this.stateProvider.getGlobal(LABS_SETTINGS_ENABLED);
    this.labsSettingsEnabled$ = this.labsSettingsEnabledState.state$.pipe(map((x) => x ?? false));

    // This setting may improve the accuracy of the inline menu appearing in login forms
    this.improvedFieldQualificationForInlineMenuEnabledState = this.stateProvider.getGlobal(
      IMPROVED_FIELD_QUALIFICATION_FOR_INLINE_MENU_ENABLED,
    );
    this.improvedFieldQualificationForInlineMenuEnabled$ =
      this.improvedFieldQualificationForInlineMenuEnabledState.state$.pipe(map((x) => x ?? null));
    // Get user setting or feature-flag value for `inline-menu-field-qualification`
    this.resolvedImprovedFieldQualificationForInlineMenuEnabled$ = combineLatest([
      this.labsSettingsEnabled$,
      this.designRefreshEnabled$,
      this.configService.getFeatureFlag(FeatureFlag.InlineMenuFieldQualification),
    ]).pipe(switchMap((stateResults) => this.resolveSettingStates(stateResults)));

    // This flag turns on inline menu credit card and identity features
    this.additionalInlineMenuCipherTypesEnabledState = this.stateProvider.getGlobal(
      ADDITIONAL_INLINE_MENU_CIPHER_TYPES_ENABLED,
    );
    this.additionalInlineMenuCipherTypesEnabled$ =
      this.additionalInlineMenuCipherTypesEnabledState.state$.pipe(map((x) => x ?? null));
    // Get user setting or feature-flag value for `inline-menu-positioning-improvements`
    this.resolvedAdditionalInlineMenuCipherTypesEnabled$ = combineLatest([
      this.labsSettingsEnabled$,
      this.additionalInlineMenuCipherTypesEnabled$,
      this.configService.getFeatureFlag(FeatureFlag.InlineMenuPositioningImprovements),
    ]).pipe(switchMap((stateResults) => this.resolveSettingStates(stateResults)));

    this.notificationBarImprovementsState = this.stateProvider.getGlobal(
      NOTIFICATION_BAR_IMPROVEMENTS_ENABLED,
    );
    this.notificationBarImprovementsEnabled$ = this.notificationBarImprovementsState.state$.pipe(
      map((x) => x ?? null),
    );
    // Get user setting or feature-flag value for `notification-bar-add-login-improvements`
    this.resolvedNotificationBarImprovementsEnabled$ = combineLatest([
      this.labsSettingsEnabled$,
      this.notificationBarImprovementsEnabled$,
      this.configService.getFeatureFlag(FeatureFlag.NotificationBarAddLoginImprovements),
    ]).pipe(switchMap((stateResults) => this.resolveSettingStates(stateResults)));

    this.designRefreshEnabledState = this.stateProvider.getGlobal(DESIGN_REFRESH_ENABLED);
    this.designRefreshEnabled$ = this.designRefreshEnabledState.state$.pipe(map((x) => x ?? null));
    // Get user setting or feature-flag value for `extension-refresh`
    this.resolvedDesignRefreshEnabled$ = combineLatest([
      this.labsSettingsEnabled$,
      this.designRefreshEnabled$,
      this.configService.getFeatureFlag(FeatureFlag.ExtensionRefresh),
    ]).pipe(switchMap((stateResults) => this.resolveSettingStates(stateResults)));
  }

  private async resolveSettingStates([labsSettingsEnabled, userOverrideValue, featureFlagValue]: [
    labsSettingsEnabled: boolean,
    userOverrideValue: boolean,
    featureFlagValue: boolean,
  ]) {
    if (labsSettingsEnabled && userOverrideValue !== null) {
      return userOverrideValue;
    }

    // return the feature flag value if lab settings aren't enabled or user override is not set
    return featureFlagValue ?? false;
  }

  // @TODO ensure this is called regularly/on state consumption
  async checkUserSettingClearStatus() {
    // Feature-flag-driven safety override for user overrides
    this.preserveLabSettings = !(await this.configService.getFeatureFlag(
      FeatureFlag.ClearAllLabsSettings,
    ));

    if (!this.preserveLabSettings) {
      await this.clearAllLabsSettings();
    }
  }

  async clearAllLabsSettings() {
    // Note, does not clear the `labsSettingsEnabled` state
    await Promise.all([
      this.setImprovedFieldQualificationForInlineMenuEnabled(null),
      this.setAdditionalInlineMenuCipherTypesEnabled(null),
      this.setDesignRefreshEnabled(null),
      this.setNotificationBarImprovementsEnabled(null),
    ]);
  }

  async setLabsSettingsEnabled(newValue: boolean | null): Promise<void> {
    // Feature flag control to disable making lab settings available
    const labSettingsAllowed = await this.configService.getFeatureFlag(
      FeatureFlag.AllowLabsSettings,
    );

    await this.labsSettingsEnabledState.update(() => (labSettingsAllowed ? newValue : false));
  }

  async setImprovedFieldQualificationForInlineMenuEnabled(newValue: boolean | null): Promise<void> {
    await this.improvedFieldQualificationForInlineMenuEnabledState.update(() =>
      this.preserveLabSettings ? newValue : null,
    );
  }

  async setAdditionalInlineMenuCipherTypesEnabled(newValue: boolean | null): Promise<void> {
    await this.additionalInlineMenuCipherTypesEnabledState.update(() =>
      this.preserveLabSettings ? newValue : null,
    );
  }

  async setNotificationBarImprovementsEnabled(newValue: boolean | null): Promise<void> {
    await this.notificationBarImprovementsState.update(() =>
      this.preserveLabSettings ? newValue : null,
    );
  }

  async setDesignRefreshEnabled(newValue: boolean | null): Promise<void> {
    await this.designRefreshEnabledState.update(() => (this.preserveLabSettings ? newValue : null));
  }
}
