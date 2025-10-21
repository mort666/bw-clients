/**
 * Constants for auth team owned full routes which are shared across clients.
 */
export const AuthRoutes = Object.freeze({
  SignUp: "signup",
  FinishSignUp: "finish-signup",
  Login: "login",
  LoginWithDevice: "login-with-device",
  AdminApprovalRequested: "admin-approval-requested",
  Hint: "hint",
  LoginInitiated: "login-initiated",
  SetInitialPassword: "set-initial-password",
  ChangePassword: "change-password",
  Sso: "sso",
  TwoFactor: "2fa",
  AuthenticationTimeout: "authentication-timeout",
  NewDeviceVerification: "device-verification",
  LoginWithPasskey: "login-with-passkey",
});

export type AuthRoute = (typeof AuthRoutes)[keyof typeof AuthRoutes];
