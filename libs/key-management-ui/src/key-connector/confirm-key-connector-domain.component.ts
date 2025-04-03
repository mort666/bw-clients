import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { KeyConnectorService } from "@bitwarden/common/key-management/key-connector/abstractions/key-connector.service";
import {
  AsyncActionsModule,
  ButtonModule,
  FormFieldModule,
  IconButtonModule,
} from "@bitwarden/components";

@Component({
  selector: "confirm-key-connector-domain",
  templateUrl: "confirm-key-connector-domain.component.html",
  standalone: true,
  imports: [
    CommonModule,
    JslibModule,
    ReactiveFormsModule,
    ButtonModule,
    FormFieldModule,
    AsyncActionsModule,
    IconButtonModule,
  ],
})
export class ConfirmKeyConnectorDomainComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private keyConnectorService: KeyConnectorService,
  ) {
    // TODO
    // this.accountService.activeAccount$.pipe(takeUntil(this.destroy$)).subscribe((account) => {
    //   console.log("[confirm-key-connector-domain]: account", account);
    // });
  }

  ngOnInit() {
    throw new Error("Method not implemented.");
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  confirm = async () => {
    // this.keyConnectorService.convertNewSsoUserToKeyConnector();
  };
}
