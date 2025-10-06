import { Component } from "@angular/core";

import { PolicyType } from "@bitwarden/common/admin-console/enums";
// TODO: Remove unused imports if we won't use a feature flag
// import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
// import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
// import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";

import { SharedModule } from "../../../../shared";
import { BasePolicyEditDefinition, BasePolicyEditComponent } from "../base-policy-edit.component";

export class UriMatchDefaultPolicy extends BasePolicyEditDefinition {
  name = "uriMatchDetectionPolicy";
  description = "uriMatchDetectionDesc";
  type = PolicyType.UriMatchDefaults;
  component = UriMatchDefaultPolicyComponent;

  // display$(organization: Organization, configService: ConfigService) {
  //   return configService.getFeatureFlag$(FeatureFlag.WindowsDesktopAutotype);
  // }

  uriMatchOptions: { name: string; value: string }[] = [
    // TODO: Should this be integers?
    { name: "-- " + "Select" + " --", value: null },
    { name: "Exact", value: "exact" },
    { name: "Base Domain", value: "base_domain" },
    { name: "Host", value: "host" },
    { name: "Starts With", value: "starts_with" },
  ];
}
@Component({
  templateUrl: "uri-match-default.component.html",
  imports: [SharedModule],
})
export class UriMatchDefaultPolicyComponent extends BasePolicyEditComponent {}
