// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";

import { AnonLayoutComponent } from "@bitwarden/auth/angular";
import { Icon, IconModule } from "@bitwarden/components";

import { PopOutComponent } from "../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../platform/popup/layout/popup-page.component";

@Component({
  standalone: true,
  templateUrl: "phishing-warning.html",
  imports: [
    AnonLayoutComponent,
    CommonModule,
    IconModule,
    PopOutComponent,
    PopupPageComponent,
    PopupHeaderComponent,
    RouterModule,
    PopupPageComponent,
  ],
})
export class PhishingWarning implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected showAcctSwitcher: boolean;
  protected showBackButton: boolean;
  protected showLogo: boolean = true;
  protected hideIcon: boolean = false;

  protected pageTitle: string;
  protected pageSubtitle: string;
  protected pageIcon: Icon;
  protected showReadonlyHostname: boolean;
  protected maxWidth: "md" | "3xl";
  protected hasLoggedInAccount: boolean = false;
  protected hideFooter: boolean;

  protected theme: string;

  constructor() {}

  async ngOnInit(): Promise<void> {
    this.resetData();
  }

  private resetData() {
    this.pageTitle = "Jimmy pageTitle";
    this.pageSubtitle = "Jimmy pageSubtitle";
    this.showReadonlyHostname = null;
    this.showAcctSwitcher = null;
    this.showBackButton = null;
    this.showLogo = true;
    this.maxWidth = null;
    this.hideFooter = null;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
