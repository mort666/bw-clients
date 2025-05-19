import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { MasterPasswordPolicyOptions } from "@bitwarden/common/admin-console/models/domain/master-password-policy-options";
import { Account, AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { MasterPasswordApiService } from "@bitwarden/common/auth/abstractions/master-password-api.service.abstraction";
import { ForceSetPasswordReason } from "@bitwarden/common/auth/models/domain/force-set-password-reason";
import { PasswordRequest } from "@bitwarden/common/auth/models/request/password.request";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { SyncService } from "@bitwarden/common/platform/sync";
import { UserId } from "@bitwarden/common/types/guid";
import { UserKey } from "@bitwarden/common/types/key";
import { DialogService, ToastService, Translation } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";
import { I18nPipe } from "@bitwarden/ui-common";
// import {
//   AcceptOrganizationInviteService
// } from "@bitwarden/web-vault/src/app/auth/organization-invite/accept-organization.service";
// import { RouterService } from "@bitwarden/web-vault/src/app/core";

import {
  InputPasswordComponent,
  InputPasswordFlow,
} from "../input-password/input-password.component";
import { PasswordInputResult } from "../input-password/password-input-result";

import { ChangePasswordService } from "./change-password.service.abstraction";

@Component({
  standalone: true,
  selector: "auth-change-password",
  templateUrl: "change-password.component.html",
  imports: [InputPasswordComponent, I18nPipe],
})
export class ChangePasswordComponent implements OnInit {
  @Input() inputPasswordFlow: InputPasswordFlow = InputPasswordFlow.ChangePassword;

  activeAccount: Account | null = null;
  email?: string;
  activeUserId?: UserId;
  masterPasswordPolicyOptions?: MasterPasswordPolicyOptions;
  initializing = true;
  submitting = false;
  userkeyRotationV2 = false;
  formPromise?: Promise<any>;
  secondaryButtonText?: Translation = undefined;
  forceSetPasswordReason: ForceSetPasswordReason = ForceSetPasswordReason.None;

  constructor(
    private accountService: AccountService,
    private changePasswordService: ChangePasswordService,
    private configService: ConfigService,
    private i18nService: I18nService,
    private keyService: KeyService,
    private masterPasswordApiService: MasterPasswordApiService,
    private masterPasswordService: InternalMasterPasswordServiceAbstraction,
    private messagingService: MessagingService,
    private policyService: PolicyService,
    private toastService: ToastService,
    private syncService: SyncService,
    // private routerService: RouterService,
    // private acceptOrganizationInviteService: AcceptOrganizationInviteService,
    private dialogService: DialogService,
    private router: Router,
  ) {}

  async ngOnInit() {
    this.userkeyRotationV2 = await this.configService.getFeatureFlag(FeatureFlag.UserKeyRotationV2);

    this.activeAccount = await firstValueFrom(this.accountService.activeAccount$);
    this.activeUserId = this.activeAccount?.id;
    this.email = this.activeAccount?.email;

    if (!this.activeUserId) {
      throw new Error("userId not found");
    }

    this.masterPasswordPolicyOptions = await firstValueFrom(
      this.policyService.masterPasswordPolicyOptions$(this.activeUserId),
    );

    this.forceSetPasswordReason = await firstValueFrom(
      this.masterPasswordService.forceSetPasswordReason$(this.activeUserId),
    );

    if (
      this.forceSetPasswordReason === ForceSetPasswordReason.AdminForcePasswordReset ||
      this.forceSetPasswordReason === ForceSetPasswordReason.WeakMasterPassword
    ) {
      this.secondaryButtonText = { key: "cancel" };
    } else {
      this.secondaryButtonText = undefined;
    }

    this.initializing = false;
  }

  async performSecondaryAction() {
    if (
      this.forceSetPasswordReason === ForceSetPasswordReason.AdminForcePasswordReset ||
      this.forceSetPasswordReason === ForceSetPasswordReason.WeakMasterPassword
    ) {
      await this.logOut();
    } else {
      await this.cancel();
    }
  }

  async logOut() {
    const confirmed = await this.dialogService.openSimpleDialog({
      title: { key: "logOut" },
      content: { key: "logOutConfirmation" },
      acceptButtonText: { key: "logOut" },
      type: "warning",
    });

    if (confirmed) {
      this.messagingService.send("logout");
    }
  }

  async cancel() {
    // clearing the login redirect url so that the user
    // does not join the organization if they cancel
    // await this.routerService.getAndClearLoginRedirectUrl();
    // await this.acceptOrganizationInviteService.clearOrganizationInvitation();
    // await this.router.navigate(["/vault"]);
  }

  async handlePasswordFormSubmit(passwordInputResult: PasswordInputResult) {
    this.submitting = true;
    if (this.userkeyRotationV2) {
      await this.submitNew(passwordInputResult);
    } else {
      await this.submitOld(passwordInputResult);
    }
  }

  private async submitNew(passwordInputResult: PasswordInputResult) {
    try {
      if (passwordInputResult.rotateUserKey) {
        if (this.activeAccount == null) {
          throw new Error("activeAccount not found");
        }

        if (passwordInputResult.currentPassword == null) {
          throw new Error("currentPassword not found");
        }

        await this.syncService.fullSync(true);

        await this.changePasswordService.rotateUserKeyMasterPasswordAndEncryptedData(
          passwordInputResult.currentPassword,
          passwordInputResult.newPassword,
          this.activeAccount,
          passwordInputResult.newPasswordHint,
        );
      } else {
        if (!this.activeUserId) {
          throw new Error("userId not found");
        }

        await this.changePasswordService.changePassword(passwordInputResult, this.activeUserId);

        this.toastService.showToast({
          variant: "success",
          title: this.i18nService.t("masterPasswordChanged"),
          message: this.i18nService.t("masterPasswordChangedDesc"),
        });

        this.messagingService.send("logout");
      }
    } catch {
      this.toastService.showToast({
        variant: "error",
        title: "",
        message: this.i18nService.t("errorOccurred"),
      });
    } finally {
      this.submitting = false;
    }
  }

  private async submitOld(passwordInputResult: PasswordInputResult) {
    if (!this.activeUserId) {
      throw new Error("userId not found");
    }

    if (passwordInputResult.currentServerMasterKeyHash == null) {
      throw new Error("currentServerMasterKeyHash not found");
    }

    if (passwordInputResult.rotateUserKey) {
      await this.syncService.fullSync(true);
    }

    let newMasterKeyEncryptedUserKey: [UserKey, EncString] | null = null;

    const userKey = await this.keyService.getUserKey();
    if (userKey == null) {
      newMasterKeyEncryptedUserKey = await this.keyService.makeUserKey(
        passwordInputResult.newMasterKey,
      );
    } else {
      newMasterKeyEncryptedUserKey = await this.keyService.encryptUserKeyWithMasterKey(
        passwordInputResult.newMasterKey,
      );
    }

    const request = new PasswordRequest();
    request.masterPasswordHash = passwordInputResult.currentServerMasterKeyHash;
    request.newMasterPasswordHash = passwordInputResult.newServerMasterKeyHash;
    request.masterPasswordHint = passwordInputResult.newPasswordHint;
    request.key = newMasterKeyEncryptedUserKey[1].encryptedString as string;

    try {
      if (passwordInputResult.rotateUserKey) {
        this.formPromise = this.masterPasswordApiService.postPassword(request).then(async () => {
          // we need to save this for local masterkey verification during rotation
          await this.masterPasswordService.setMasterKeyHash(
            passwordInputResult.newLocalMasterKeyHash,
            this.activeUserId as UserId,
          );
          await this.masterPasswordService.setMasterKey(
            passwordInputResult.newMasterKey,
            this.activeUserId as UserId,
          );
          return this.updateKey(passwordInputResult.newPassword);
        });
      } else {
        this.formPromise = this.masterPasswordApiService.postPassword(request);
      }

      await this.formPromise;

      this.toastService.showToast({
        variant: "success",
        title: this.i18nService.t("masterPasswordChanged"),
        message: this.i18nService.t("logBackIn"),
      });

      this.messagingService.send("logout");
    } catch {
      this.toastService.showToast({
        variant: "error",
        title: "",
        message: this.i18nService.t("errorOccurred"),
      });
    }
  }

  private async updateKey(newPassword: string) {
    if (this.activeAccount == null) {
      throw new Error("activeAccount not found");
    }

    await this.changePasswordService.rotateUserKeyAndEncryptedDataLegacy(
      newPassword,
      this.activeAccount,
    );
  }
}
