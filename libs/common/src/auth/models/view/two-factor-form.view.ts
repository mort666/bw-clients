import { Jsonify } from "type-fest";

import { View } from "@bitwarden/common/models/view/view";

import { TwoFactorProviderType } from "../../enums/two-factor-provider-type";

/**
 * This is a cache model for the two factor form.
 */
export class TwoFactorFormView implements View {
  token: string | undefined = undefined;
  remember: boolean | undefined = undefined;
  selectedProviderType: TwoFactorProviderType | undefined = undefined;
  emailSent: boolean | undefined = undefined;

  static fromJSON(obj: Partial<Jsonify<TwoFactorFormView>>): TwoFactorFormView {
    return Object.assign(new TwoFactorFormView(), obj);
  }
}
