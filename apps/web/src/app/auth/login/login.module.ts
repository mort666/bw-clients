import { NgModule } from "@angular/core";

import { LoginViaWebAuthnComponent } from "@bitwarden/angular/auth/login-via-webauthn/login-via-webauthn.component";
import { CheckboxModule } from "@bitwarden/components";

import { SharedModule } from "../../../app/shared";

@NgModule({
  imports: [SharedModule, CheckboxModule, LoginViaWebAuthnComponent],
  declarations: [],
  exports: [LoginViaWebAuthnComponent],
})
export class LoginModule {}
