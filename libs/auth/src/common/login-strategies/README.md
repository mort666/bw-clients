# Overview of Authentication at Bitwarden

> [!IMPORTANT]
> While each login method has its own unique logic, this document discusses the
> logic that is _generally_ common to all login methods. It provides a high-level
> overview of authentication and as such will involve some abstraction. That said,
> the code is the ultimate source of truth.

<br>

> **Table of Contents**
>
> - [Authentication Methods](#authentication-methods)
> - [The Login Credentials Object](#the-login-credentials-object)
> - [The `LoginStrategyService` and our Login Strategies](#the-loginstrategyservice-and-our-login-strategies)
> - [The `logIn()` and `startLogin()` Methods](#the-login-and-startlogin-methods)
> - [Handling the `AuthResult`](#handling-the-authresult)
> - [Diagram of Authentication Flows](#diagram-of-authentication-flows)

<br>

## Authentication Methods

Bitwarden provides 5 methods for logging in to Bitwarden, as defined in our [`AuthenticationType`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/enums/authentication-type.ts) enum. They are:

1. [Login with Master Password](https://bitwarden.com/help/bitwarden-security-white-paper/#authentication-and-decryption)
2. [Login with Auth Request](https://bitwarden.com/help/log-in-with-device/) (aka Login with Device) &mdash; authenticate with a one-time access code
3. [Login with Single Sign-On](https://bitwarden.com/help/about-sso/) &mdash; authenticate with an SSO Identity Provider (IdP) through SAML or OpenID Connect (OIDC)
4. [Login with Passkey](https://bitwarden.com/help/login-with-passkeys/) (WebAuthn)
5. [Login with User API Key](https://bitwarden.com/help/personal-api-key/) &mdash; authenticate with an API key and secret

<br>

**Login Initiation**

_Angular Clients_

A user begins the login process by entering their email on the `/login` screen (`LoginComponent`). From there, the user must click one of the following buttons to initiate a login method by navigating to the associated login component:

- `"Continue"` &rarr; user stays on the `LoginComponent` and enters a Master Password
- `"Log in with device"` &rarr; navigates user to `LoginViaAuthRequestComponent`
- `"Use single sign-on"` &rarr; navigates user to `SsoComponent`
- `"Log in with passkey"` &rarr; navigates user to `LoginViaWebAuthnComponent`
  - Note: Login with Passkey is currently not available on the Desktop client.

> [!NOTE]
>
> - Our Angular clients do not support the Login with User API Key method.

> - The Login with Master Password method is also used by the
>   `RegistrationFinishComponent` and `CompleteTrialInitiationComponent` (the user automatically
>   gets logged in with their Master Password after registration), and the `RecoverTwoFactorComponent`
>   (the user logs in with their Master Password along with their 2FA recovery code).

_CLI Client_

The CLI client supports the following login methods via the `LoginCommand`.

- Login with Master Password
- Login with Single Sign-On
- Login with User API Key (which can _only_ be initiated from the CLI client)

<br>

## The Login Credentials Object

When the user clicks the "submit" action on the associated login component, we first build a **login credentials object**. This object gathers the core credentials needed to initiate the specific login method.

For example, when the user clicks "Log in with master password" on the `LoginComponent`, we build a `PasswordLoginCredentials` object, which is defined as follows:

```typescript
export class PasswordLoginCredentials {
  readonly type = AuthenticationType.Password;

  constructor(
    public email: string,
    public masterPassword: string,
    public twoFactor?: TokenTwoFactorRequest,
    public masterPasswordPoliciesFromOrgInvite?: MasterPasswordPolicyOptions,
  ) {}
}
```

Notice that the `type` is automatically set to `AuthenticationType.Password`, and the `PasswordLoginCredentials` object simply requires an `email` and `masterPassword` to initiate the login method.

Each login method builds it's own type of credentials object, each of which is defined in [`login-credentials.ts`](https://github.com/bitwarden/clients/blob/main/libs/auth/src/common/models/domain/login-credentials.ts).

- `PasswordLoginCredentials`
- `AuthRequestLoginCredentials`
- `SsoLoginCredentials`
- `WebAuthnLoginCredentials`
- `UserApiLoginCredentials`

<br>

## The `LoginStrategyService` and our Login Strategies

The credentials object gets passed to our [`LoginStrategyService`](https://github.com/bitwarden/clients/blob/main/libs/auth/src/common/services/login-strategies/login-strategy.service.ts), which acts as an orchestrator that determines which of our specific **login strategies** should be initialized and used for the login process.

> [!IMPORTANT]
> Our authentication methods are handled by different [login strategies](https://github.com/bitwarden/clients/tree/main/libs/auth/src/common/login-strategies), making use of the [Strategy Design Pattern](https://refactoring.guru/design-patterns/strategy). Those strategies are:
>
> - `PasswordLoginStrategy`
> - `AuthRequestLoginStrategy`
> - `SsoLoginStrategy`
> - `WebAuthnLoginStrategy`
> - `UserApiLoginStrategy`
>
> Each of those strategies extend the base [`LoginStrategy`](https://github.com/bitwarden/clients/blob/main/libs/auth/src/common/login-strategies/login.strategy.ts), which houses common login logic.

The `LoginStrategyService` uses the `type` property on the credentials object to determine which specific login strategy should be initialized and used for the login process.

For example, the `PasswordLoginCredentials` object has `type` of `AuthenticationType.Password`. This tells the `LoginStrategyService` to initialize and use the `PasswordLoginStrategy` for the login process.

Once the `LoginStrategyService` initializes the appropriate strategy, it then calls the `logIn()` method defined on that strategy, passing in the credentials object as an argument. For example: `PasswordLoginStrategy.logIn(PasswordLoginCredentials)`.

<br>

## The `logIn()` and `startLogin()` Methods

Each login strategy has it's own unique implementation of the `logIn()` method, yet they all perform similar logic.

The main purpose of the `logIn()` method is to take the credentials object (passed in from the `LoginStrategyService`) and perform the following general logic:

1. Build a `LoginStrategyData` object with a `TokenRequest` property
2. Cache the `LoginStrategyData` object
3. Call the `startLogin()` method on the base `LoginStrategy`

Here are those steps in more detail:

1. **Build a `LoginStrategyData` object with a `TokenRequest` property**

   Each strategy uses the credentials object to help build a type of `LoginStrategyData` object, which contains the data needed throughout the lifetime of the particular strategy.

   Each strategy has it's own class that implements the `LoginStrategyData` interface:
   - `PasswordLoginStrategyData`
   - `AuthRequestLoginStrategyData`
   - `SsoLoginStrategyData`
   - `WebAuthnLoginStrategyData`
   - `UserApiLoginStrategyData`

   So in our ongoing example that uses the "Login with Master Password" method, the call to `PasswordLoginStrategy.logIn(PasswordLoginCredentials)` would build a `PasswordLoginStrategyData` object that contains the data needed throughout the lifetime of the `PasswordLoginStrategy`.

   That `PasswordLoginStrategyData` object is defined like so:

   ```typescript
   export class PasswordLoginStrategyData implements LoginStrategyData {
     tokenRequest: PasswordTokenRequest;

     forcePasswordResetReason: ForceSetPasswordReason = ForceSetPasswordReason.None;
     localMasterKeyHash: string;
     masterKey: MasterKey;
     userEnteredEmail: string;
   }
   ```

   Each of the `LoginStrategyData` types have varying properties, but one property common to all is the `tokenRequest` property.

   The `tokenRequest` property holds some type of [`TokenRequest`](https://github.com/bitwarden/clients/tree/main/libs/common/src/auth/models/request/identity-token) object based on the strategy:
   - `PasswordTokenRequest` &mdash; used by both the `PasswordLoginStrategy` and `AuthRequestLoginStrategy`
   - `SsoTokenRequest`
   - `WebAuthnLoginTokenRequest`
   - `UserApiTokenRequest`

   This `TokenRequest` object is also built within the `logIn()` method and is added as a property to the `LoginStrategyData` object.

   <br />

2. **Cache the `LoginStrategyData` object**

   Because a login method could "fail" due to a need for Two Factor Authentication or New Device Verification, we need a way of preserving the `LoginStrategyData` so that we can re-use it later when the user provides their 2FA or NDV token. This way, the user does not need to completely re-submit all of their credentials.

   The way we cache this `LoginStrategyData` is simply by saving it to a property called `cache` on the strategy. There will be more details on how this cache is used later on.

   <br />

3. **Call the `startLogin()` method on the base `LoginStrategy`**

   Next, we call the `startLogin()` method, which exists on the base `LoginStrategy` and is therefore common to all login strategies. The `startLogin()` method does the following:
   1. **Makes a `POST` request to the `/connect/token` endpoint on our Identity Server**
      - `REQUEST`

        The exact payload for this request is determined by the `TokenRequest` object. More specifically, the base `TokenRequest` object contains a `toIdentityToken()` method which can be overridden by the sub-classes (`PasswordTokenRequest`, etc.). This `toIdentityToken()` method takes the information in the `TokenRequest` object and turns it into the payload that gets sent to our `/connect/token` endpoint.

      - `RESPONSE`

        The Identity Server validates the request and then generates some type of `IdentityResponse`, which can be one of three types:
        - [`IdentityTokenResponse`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/models/response/identity-token.response.ts)
          - This response means the user has been authenticated
          - The response contains:
            - Authentication information for the user
              - An access token, which is a JWT with claims about the user
              - A refresh token
            - Decryption information for the user
              - Includes the user's master-key-encrypted user key (if the user has a master password), along with their KDF settings
              - Includes an object that contains information about which decryption options the user has available to them

        - [`IdentityTwoFactorResponse`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/models/response/identity-two-factor.response.ts)
          - This response means the user needs to complete two-factor authentication
          - The response contains information about the user's 2FA requirements, such as which 2FA providers they have available to them, etc.

        - [`IdentityDeviceVerificationResponse`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/models/response/identity-device-verification.response.ts)
          - This response means the user needs to verify their new device via [new device verification](https://bitwarden.com/help/new-device-verification/)
          - The response contains a boolean property that simply states whether or not the device has been verified

   2. **Calls one of the `process[IdentityType]Response()` methods, each of which builds and returns an [`AuthResult`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/models/domain/auth-result.ts) object**
      - If `IdentityTokenResponse`, call `processTokenResponse()`
        - This method uses information from the `IdentityTokenResponse` object to set Authentication and Decryption information about the user into state.
          - `saveAccountInformation()` - initializes the account with information from the `IdentityTokenResponse` after successful login.
            - Adds the account to the `AccountService` and sets up the account profile in `StateService`
            - Sets the access token and refresh token to state
            - Sets the `userDecryptionOptions` to state

          - Sets cryptographic properties to state via `setMasterKey()`, `setUserKey()`, and `setPrivateKey()`

          - Sets a `forceSetPasswordReason` to state, if necessary

      - If `IdentityTwoFactorResponse`, call `processTwoFactorResponse()`
        - This method sets 2FA data to state for later processing at the `/2fa` route, and also adds the necessary data for the 2FA process to the `AuthResult`

      - If `IdentityDeviceVerificationResponse`, call `processDeviceVerificationResponse()`
        - This method simply sets `requiresDeviceVerification` to `true` on the `AuthResult`

<br>

## Handling the `AuthResult`

The `AuthResult` object returned from the `process[IdentityType]Response()` method contains information that will be used to determine how to direct the user after an authentication attempt.

### Re-submit Scenarios

There are two cases where a user is required to provide additional information before they can be authenticated: Two Factor Authentication (2FA) and New Device Verification (NDV). In these scenarios, we actually need the user to "re-submit" their original request, along with their added 2FA or NDV token. Here is how these scenarios work:

**User must complete Two Factor Authentication**

1. Remember that when the server response is `IdentityTwoFactorResponse`, we set 2FA data into state and also add the necessary data for the 2FA process to the `AuthResult`.
2. When `AuthResult.requiresTwoFactor`, the specific login strategy exports its `LoginStrategyData` to the `LoginStrategyService`, where it gets stored in memory. This means the `LoginStrategyService` has a cache of the original request the user sent.
3. We route the user to `/2fa` (`TwoFactorAuthComponent`).
4. The user enters their 2FA token.
5. On submission, the `LoginStrategyService` calls `logInTwoFactor()` on the particular login strategy. This method then:

- Takes the cached `LoginStrategyData` (the user's original request), and appends the 2FA token onto the `TokenRequest`
- Calls `startLogin()` again, this time using the updated `LoginStrategyData` that includes the 2FA token.

**User must complete New Device Verification**

1. Remember that when the server response is `IdentityDeviceVerificationResponse`, we set `requiresDeviceVerification` to `true` on the `AuthResult`.
2. When `AuthResult.requiresDeviceVerification` is `true`, the specific login strategy exports its `LoginStrategyData` to the `LoginStrategyService`, where it gets stored in memory. This means the `LoginStrategyService` has a cache of the original request the user sent.
3. We route the user to `/device-verification`.
4. The user enters their NDV token.
5. On submission, the `LoginStrategyService` calls `logInNewDeviceVerification()` on the particular login strategy. This method then:

- Takes the cached `LoginStrategyData` (the user's original request), and appends the NDV token onto the `TokenRequest`.
- Calls `startLogIn()` again, this time using the updated `LoginStrategyData` that includes the NDV token.

### Successful Authentication Scenarios

**User must change their password**

**User sent to `/login-initiated`**

**User sent to `/vault`**

<br>

## Diagram of Authentication Flows

Here is a high-level overview of what all of this looks like in the end.

<br>

![A Diagram of our Authentication Flows](./overview-of-authentication.svg)
