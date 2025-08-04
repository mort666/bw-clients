import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { distinctUntilChanged, from, map, merge, shareReplay, startWith, Subject } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ItemModule } from "@bitwarden/components";
import { GeneratorModule } from "@bitwarden/generator-components";

import { CurrentAccountComponent } from "../../../auth/popup/account-switching/current-account.component";
import { BrowserApi } from "../../../platform/browser/browser-api";
import { PopOutComponent } from "../../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../platform/popup/layout/popup-page.component";

@Component({
  selector: "credential-generator",
  templateUrl: "credential-generator.component.html",
  imports: [
    CommonModule,
    GeneratorModule,
    CurrentAccountComponent,
    JslibModule,
    PopOutComponent,
    PopupHeaderComponent,
    PopupPageComponent,
    RouterModule,
    ItemModule,
  ],
})
export class CredentialGeneratorComponent {
  website$ = this.buildWebsiteObservable();

  private buildWebsiteObservable() {
    // Initial URL in the active tab
    const initial$ = from(chrome.tabs.query({ active: true, currentWindow: true })).pipe(
      map((tabs) => tabs[0]?.url ?? null),
    );

    // URL update in the active tab
    const updated$ = new Subject<string | null>();
    BrowserApi.addListener(chrome.tabs.onUpdated, (_tabId, changeInfo, tab) => {
      if (tab.active && changeInfo.url) {
        updated$.next(changeInfo.url!);
      }
    });

    // tab switching
    const activated$ = new Subject<string | null>();
    BrowserApi.addListener(chrome.tabs.onActivated, async ({ tabId }) => {
      await chrome.tabs.get(tabId).then((tab) => activated$.next(tab.url ?? null));
    });

    return merge(initial$, updated$, activated$).pipe(
      startWith(null),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}
