// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { map, Observable, Subject, take } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AnonLayoutComponent, InputPasswordComponent } from "@bitwarden/auth/angular";
import { ButtonModule, Icon, IconModule } from "@bitwarden/components";

import { PopOutComponent } from "../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../platform/popup/layout/popup-page.component";

interface ViewData {
  phishingHost: string;
}

@Component({
  standalone: true,
  templateUrl: "phishing-warning.html",
  imports: [
    AnonLayoutComponent,
    CommonModule,
    IconModule,
    PopOutComponent,
    PopupPageComponent,
    InputPasswordComponent,
    PopupHeaderComponent,
    PopupPageComponent,
    CommonModule,
    JslibModule,
    ButtonModule,
    RouterModule,
  ],
})
export class PhishingWarning implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected showLogo: boolean = true;
  protected hideIcon: boolean = false;

  protected pageTitle: string;
  protected pageSubtitle: string;
  protected pageIcon: Icon;
  protected showReadonlyHostname: boolean;
  protected maxWidth: "md" | "3xl";
  protected hasLoggedInAccount: boolean = false;
  protected hideFooter: boolean;

  protected queryParams$: Observable<ViewData>;

  protected theme: string;

  constructor(private activatedRoute: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.queryParams$ = this.activatedRoute.queryParamMap.pipe(
      take(1),
      map((queryParamMap) => ({
        phishingHost: queryParamMap.get("phishingHost"),
      })),
    );
  }
  closeTab(): void {
    globalThis.close();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
