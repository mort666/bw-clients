import { Component } from "@angular/core";

import { PolicyType } from "@bitwarden/common/admin-console/enums";
// TODO: Remove unused imports if we won't use a feature flag
// import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
// import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
// import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import {
  UriMatchStrategy,
  UriMatchStrategySetting,
} from "@bitwarden/common/models/domain/domain-service";

import { SharedModule } from "../../../../shared";
import { BasePolicyEditDefinition, BasePolicyEditComponent } from "../base-policy-edit.component";

export class UriMatchDefaultPolicy extends BasePolicyEditDefinition {
  name = "uriMatchDetectionPolicy";
  description = "uriMatchDetectionDesc";
  type = PolicyType.UriMatchDefaults;
  component = UriMatchDefaultPolicyComponent;

  // TODO: Remove if we won't use a feature flag
  // display$(organization: Organization, configService: ConfigService) {
  //   return configService.getFeatureFlag$(FeatureFlag.WindowsDesktopAutotype);
  // }
}
@Component({
  templateUrl: "uri-match-default.component.html",
  imports: [SharedModule],
})
export class UriMatchDefaultPolicyComponent extends BasePolicyEditComponent {
  uriMatchOptions: { name: string; value: UriMatchStrategySetting | null }[] = [
    { name: "-- Select --", value: null },
    { name: "Base Domain", value: UriMatchStrategy.Domain },
    { name: "Host", value: UriMatchStrategy.Host },
    { name: "Starts With", value: UriMatchStrategy.StartsWith },
    { name: "Exact", value: UriMatchStrategy.Exact },
    { name: "Regular Expression", value: UriMatchStrategy.RegularExpression },
    { name: "Never", value: UriMatchStrategy.Never },
  ];
}
