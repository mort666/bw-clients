import { BaseResponse } from "@bitwarden/common/models/response/base.response";
import { Guid } from "@bitwarden/common/types/guid";

import { OrganizationIntegrationType } from "./organization-integration-type";

export class OrganizationIntegrationResponse extends BaseResponse {
  id: Guid;
  organizationIntegrationType: OrganizationIntegrationType;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.organizationIntegrationType = this.getResponseProperty("Type");
  }
}
