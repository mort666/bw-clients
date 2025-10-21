// Full routes that auth owns in the extension
export const AuthExtensionRoutes = Object.freeze({
  AccountSecurity: "account-security",
  DeviceManagement: "device-management",
  AccountSwitcher: "account-switcher",

  // Composed routes from segments (allowing for router.navigate / routerLink usage)
});

export type AuthExtensionRoute = (typeof AuthExtensionRoutes)[keyof typeof AuthExtensionRoutes];
