import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { KeyConnectorService } from "@bitwarden/common/key-management/key-connector/abstractions/key-connector.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { SyncService } from "@bitwarden/common/platform/sync";
import { UserId } from "@bitwarden/common/types/guid";
import { AsyncActionsModule, ButtonModule, IconButtonModule } from "@bitwarden/components";
import { KdfType } from "@bitwarden/key-management";

@Component({
  selector: "confirm-key-connector-domain",
  templateUrl: "confirm-key-connector-domain.component.html",
  standalone: true,
  imports: [
    CommonModule,
    JslibModule,
    ButtonModule,
    AsyncActionsModule,
    IconButtonModule,
    RouterModule,
  ],
})
export class ConfirmKeyConnectorDomainComponent implements OnInit {
  protected loading = true;
  protected keyConnectorUrl!: string;
  private userId!: UserId;
  private organizationId!: string;
  private kdf!: KdfType;
  private kdfIterations!: number;
  private kdfMemory?: number;
  private kdfParallelism?: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private logService: LogService,
    private keyConnectorService: KeyConnectorService,
    private messagingService: MessagingService,
    private syncService: SyncService,
  ) {}

  async ngOnInit() {
    const userId = this.route.snapshot.queryParamMap.get("userId") as UserId | null;
    const organizationId = this.route.snapshot.queryParamMap.get("organizationId");
    const keyConnectorUrl = this.route.snapshot.queryParamMap.get("keyConnectorUrl");
    const kdf = Number.parseInt(this.route.snapshot.queryParamMap.get("kdf") ?? "");
    const kdfIterations = Number.parseInt(
      this.route.snapshot.queryParamMap.get("kdfIterations") ?? "",
    );
    const kdfMemory = Number.parseInt(this.route.snapshot.queryParamMap.get("kdfMemory") ?? "");
    const kdfParallelism = Number.parseInt(
      this.route.snapshot.queryParamMap.get("kdfParallelism") ?? "",
    );

    this.logService.info(
      "[confirm-key-connector-domain] userId %s, organizationId %s, keyConnectorUrl %s, kdf %s, kdfIterations %s, kdfMemory %s, kdfParallelism %s",
      userId,
      organizationId,
      keyConnectorUrl,
      KdfType[kdf],
      kdfIterations,
      kdfMemory,
      kdfParallelism,
    );

    if (
      userId == null ||
      organizationId == null ||
      keyConnectorUrl == null ||
      Number.isNaN(kdf) ||
      !kdfIterations
    ) {
      this.logService.info("[confirm-key-connector-domain] missing required parameters");
      this.messagingService.send("logout");
      return;
    }

    this.keyConnectorUrl = keyConnectorUrl;
    this.userId = userId;
    this.organizationId = organizationId;
    this.kdf = kdf;
    this.kdfIterations = kdfIterations;
    this.kdfMemory = kdfMemory ? kdfMemory : undefined;
    this.kdfParallelism = kdfParallelism ? kdfParallelism : undefined;

    this.loading = false;
  }

  confirm = async () => {
    await this.keyConnectorService.convertNewSsoUserToKeyConnector(
      this.organizationId,
      this.userId,
      this.keyConnectorUrl,
      this.kdf,
      this.kdfIterations,
      this.kdfMemory,
      this.kdfParallelism,
    );

    await this.syncService.fullSync(true);

    this.messagingService.send("loggedIn");

    await this.router.navigate(["/"]);
  };

  cancel = async () => {
    this.messagingService.send("logout");
  };
}
