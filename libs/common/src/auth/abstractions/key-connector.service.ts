import { Organization } from "../../admin-console/models/domain/organization";
import { UserId } from "../../types/guid";
import { IdentityTokenResponse } from "../models/response/identity-token.response";

export abstract class KeyConnectorService {
  abstract setMasterKeyFromUrl(url: string, userId: UserId): Promise<void>;

  abstract getManagingOrganization(userId: UserId): Promise<Organization>;

  abstract getUsesKeyConnector(userId: UserId): Promise<boolean>;

  abstract migrateUser(userId: UserId): Promise<void>;

  abstract userNeedsMigration(userId: UserId): Promise<boolean>;

  abstract convertNewSsoUserToKeyConnector(
    tokenResponse: IdentityTokenResponse,
    orgId: string,
    userId: UserId,
  ): Promise<void>;

  abstract setUsesKeyConnector(enabled: boolean, userId: UserId): Promise<void>;

  abstract setConvertAccountRequired(status: boolean, userId: UserId): Promise<void>;

  abstract getConvertAccountRequired(): Promise<boolean>;

  abstract removeConvertAccountRequired(userId: UserId): Promise<void>;
}
