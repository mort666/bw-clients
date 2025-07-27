// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { firstValueFrom, map } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AuthRequestApiServiceAbstraction, AuthRequestServiceAbstraction } from "@bitwarden/auth/common";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { AuthRequestType } from "@bitwarden/common/auth/enums/auth-request-type";
import { AuthRequest } from "@bitwarden/common/auth/models/request/auth.request";
import { PasswordlessAuthRequest } from "@bitwarden/common/auth/models/request/passwordless-auth.request";
import { AppIdService } from "@bitwarden/common/platform/abstractions/app-id.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { AsyncActionsModule, ButtonModule, CalloutModule, DialogModule, DialogService, FormFieldModule, IconButtonModule } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";
import { ServerRelayInitiator } from "@bitwarden/sdk-internal";
import { I18nPipe } from "@bitwarden/ui-common";

import {
  InputPasswordComponent,
} from "../input-password/input-password.component";

@Component({
  standalone: true,
  selector: "auth-debug",
  templateUrl: "debug.component.html",
  imports: [
    CommonModule,
    InputPasswordComponent,
    JslibModule,
    ButtonModule,
    CalloutModule,
    CommonModule,
    FormFieldModule,
    DialogModule,
    I18nPipe,
    InputPasswordComponent,
    DialogModule,
    CommonModule,
    JslibModule,
    ButtonModule,
    IconButtonModule,
    ReactiveFormsModule,
    AsyncActionsModule,
    FormFieldModule,
  ]
})
export class DebugComponent implements OnInit {

  protected formGroup = new FormGroup({
    connectString: this.formBuilder.control(""),
  });

  constructor(
    private formBuilder: FormBuilder,
    private dialogService: DialogService,
    private keyService: KeyService,
    private accountService: AccountService,
    private authRequestApiService: AuthRequestApiServiceAbstraction,
    private authRequestService: AuthRequestServiceAbstraction,
    private apiService: ApiService,
    private appIdService: AppIdService,
  ) { }

  async ngOnInit() {
  }

  submit = async () => {

    const a = await this.dialogService.openSimpleDialog({
      title: "User verification",
      acceptButtonText: "Confirm",
      content: "Please confirm with biometrics.",
      type: "primary"
    });


    const connectString = this.formGroup.controls.connectString.value;
    if (a) {
      const email = await firstValueFrom(
        this.accountService.activeAccount$.pipe(map((account) => account.email)),
      );
      const request = await this.buildAuthRequest(email, AuthRequestType.AuthenticateAndUnlock);
      const response = await this.authRequestApiService.postAuthRequest(request);
      const approveRequest = new PasswordlessAuthRequest(
        "7.abc",
        undefined,
        await this.appIdService.getAppId(),
        true,
      );
      await this.apiService.putAuthRequest(response.id, approveRequest);

      const uuid = connectString.split(",")[0];
      const psk = Utils.fromB64ToArray(connectString.split(",")[1]);
      const initiator = await ServerRelayInitiator.connect(
        uuid, psk
      );
      initiator.send_auth_request(
        (await this.keyService.getUserKey()).toEncoded(),
        email,
        response.id
      );
    }
  }


  private async buildAuthRequest(
    email: string,
    authRequestType: AuthRequestType,
  ): Promise<AuthRequest> {
    const code = "ABCDEFGHIJKLMNOPQRSTUVWXY";
    return new AuthRequest(email, "00000000-0000-0000-0000-000000000000", "placeholder_public", AuthRequestType.AuthenticateAndUnlock, code);
  }
}
