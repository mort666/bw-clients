import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { MasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { EncryptionType } from "@bitwarden/common/platform/enums";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { KeyService } from "@bitwarden/key-management";
import { PureCrypto } from "@bitwarden/sdk-internal";

import { SharedModule } from "../../shared";

// The master key was originally used to encrypt user data, before the user key was introduced.
// This component is used to migrate from the old encryption scheme to the new one.
@Component({
  standalone: true,
  imports: [SharedModule],
  templateUrl: "debug.component.html",
})
export class DebugMenu implements OnInit {
  userKey: string;
  userKeyType: string;

  privateKey: string;
  privateKeyType: string;

  masterKey: string;

  userId: string;

  testClaimPublicKeyOwnershipResult: string;

  formGroup: FormGroup = new FormGroup({
    fetchPKIUserId: this.formBuilder.control("", [Validators.required]),
    privateKey: this.formBuilder.control("", [Validators.required]),
    publicKey: this.formBuilder.control("", [Validators.required]),
    userKey: this.formBuilder.control("", [Validators.required]),
    signingKey: this.formBuilder.control("", [Validators.required]),
    verifyingKey: this.formBuilder.control("", [Validators.required]),

    testClaimVerifyingKey: this.formBuilder.control("", [Validators.required]),
    testClaimPublicKey: this.formBuilder.control("", [Validators.required]),
    testClaimPublicKeyOwnershipClaim: this.formBuilder.control("", [Validators.required]),
  });
  otherUserPublicKey: string | null = null;

  constructor(
    private keyService: KeyService,
    private masterPasswordService: MasterPasswordServiceAbstraction,
    private accountService: AccountService,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
  ) {}

  async ngOnInit() {
    const activeUserId = await firstValueFrom(this.accountService.activeAccount$);
    this.userId = activeUserId.id;
    const userKey = await firstValueFrom(this.keyService.userKey$(activeUserId.id));
    this.formGroup.get("userKey").setValue(userKey.keyB64);
    this.userKeyType =
      userKey.inner().type == EncryptionType.AesCbc256_HmacSha256_B64
        ? "AES-256-CBC-HMAC-SHA256"
        : "COSE";

    this.privateKey = Utils.fromBufferToB64(
      (await firstValueFrom(this.keyService.userPrivateKey$(activeUserId.id))).buffer,
    );
    this.formGroup.get("privateKey").setValue(this.privateKey);
    this.formGroup
      .get("publicKey")
      .setValue(
        Utils.fromBufferToB64(
          (await firstValueFrom(this.keyService.userPublicKey$(activeUserId.id))).buffer,
        ),
      );
    this.privateKeyType = "RSA";

    const signingKey = await firstValueFrom(this.keyService.userSigningKey$(activeUserId.id));
    const verifyingKey = Utils.fromBufferToB64(
      PureCrypto.verifying_key_for_signing_key(signingKey.inner(), userKey.toEncoded()),
    );
    this.formGroup.get("signingKey").setValue(signingKey.inner());
    this.formGroup.get("verifyingKey").setValue(verifyingKey);
  }

  getUserPublicKey = async () => {
    this.otherUserPublicKey = (
      await this.apiService.getUserPublicKey(this.formGroup.get("fetchPKIUserId").value)
    ).publicKey;
  };

  verifyPublicKeyOwnershipClaim = async () => {
    const claim = this.formGroup.get("testClaimPublicKeyOwnershipClaim").value;
    const publicKey = this.formGroup.get("testClaimPublicKey").value;
    const verifyingKey = this.formGroup.get("testClaimVerifyingKey").value;
    try {
      const result = PureCrypto.verify_public_key_ownership_claim(
        Utils.fromB64ToArray(claim),
        Utils.fromB64ToArray(publicKey),
        Utils.fromB64ToArray(verifyingKey),
      );
      this.testClaimPublicKeyOwnershipResult = result ? "Valid" : "Invalid";
    } catch (e) {
      this.testClaimPublicKeyOwnershipResult = "Error: " + e;
    }
  };
}
