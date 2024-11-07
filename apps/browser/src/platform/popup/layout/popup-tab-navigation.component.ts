import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

import { LinkModule, LayoutComponent, NavigationModule } from "@bitwarden/components";

import { PasswordManagerLogo } from "./password-manager-logo";
@Component({
  selector: "popup-tab-navigation",
  templateUrl: "popup-tab-navigation.component.html",
  standalone: true,
  imports: [CommonModule, LinkModule, RouterModule, LayoutComponent, NavigationModule],
  host: {
    class: "tw-block tw-h-full tw-w-full tw-flex tw-flex-col",
  },
})
export class PopupTabNavigationComponent {
  logo = PasswordManagerLogo;

  navButtons = [
    {
      label: "Vault",
      page: "/tabs/vault",
      iconKey: "lock",
      iconKeyActive: "lock-f",
    },
    {
      label: "Generator",
      page: "/tabs/generator",
      iconKey: "generate",
      iconKeyActive: "generate-f",
    },
    {
      label: "Send",
      page: "/tabs/send",
      iconKey: "send",
      iconKeyActive: "send-f",
    },
    {
      label: "Settings",
      page: "/tabs/settings",
      iconKey: "cog",
      iconKeyActive: "cog-f",
    },
  ];
}
