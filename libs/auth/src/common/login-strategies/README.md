# Overview of Authentication at Bitwarden

<br>

> **Table of Contents**
>
> - [Authentication Methods](#authentication-methods)
> - [The Credentials Object](#the-credentials-object)
> - [The Login Strategy](#the-login-strategy)
> - [The `logIn()` and `startLogin()` Methods](#the-login-and-startlogin-methods)
> - [Handling the `AuthResult`](#handling-the-authresult)
> - [Final Diagram](#final-diagram)

<br>

## Authentication Methods

Bitwarden provides 5 methods for logging in to Bitwarden, as defined in our [`AuthenticationType`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/enums/authentication-type.ts) enum. They are:

1. [Login with Master Password](https://bitwarden.com/help/bitwarden-security-white-paper/#authentication-and-decryption) &mdash; authentication with an email address and master password
2. [Login with Device](https://bitwarden.com/help/log-in-with-device/) (aka Login with Auth Request) &mdash; authentication with a one-time access code
3. [Login with SSO](https://bitwarden.com/help/about-sso/) &mdash; authentication with an SSO Identity Provider (IdP) through SAML or OpenID Connect (OIDC)
4. [Login with Passkey](https://bitwarden.com/help/login-with-passkeys/) (aka Login with WebAuthn) &mdash; authentication with a passkey
5. [Login with User API Key](https://bitwarden.com/help/personal-api-key/) &mdash; authentication with an API key and secret.

<br>

- Methods 1-4
  - Can be initiated from the `LoginComponent` on our Angular clients (route `/login`)
  - Can be initiated from our CLI client
- Method 5
  - Can be initiated _only_ from our CLI client

<br>

While each login method relies on its own unique logic, this `README` discusses the logic that is _generally_ common to all login methods.

<br>

## The Credentials Object

When the user clicks the "submit" action for their specific login method, we build a **credentials object**. This object gathers the core credentials needed to initiate the specific login method.

For example, when the user clicks "Log in with master password", we build a `PasswordLoginCredentials` object, which is defined as follows:

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

Notice that the `type` is automatically set to `AuthenticationType.Password`, and that the `PasswordLoginCredentials` object simply requires an `email` and `masterPassword` to initiate the login process.

Each authentication method builds it's respective credentials object, as defined in [login-credentials.ts](https://github.com/bitwarden/clients/blob/main/libs/auth/src/common/models/domain/login-credentials.ts).

- `PasswordLoginCredentials`
- `AuthRequestLoginCredentials`
- `SsoLoginCredentials`
- `WebAuthnLoginCredentials`
- `UserApiLoginCredentials`

<br>

## The Login Strategy

The credentials object gets forwarded to our `LoginStrategyService`, which acts as an orchestrator to determine which specific **login strategy** should be used for the login process.

> [!IMPORTANT]
> Our authentication methods are handled by different [login strategies](https://github.com/bitwarden/clients/tree/main/libs/auth/src/common/login-strategies) in our code, making use of the [Strategy Pattern](https://refactoring.guru/design-patterns/strategy). Those strategies are:
>
> - `PasswordLoginStrategy`
> - `AuthRequestLoginStrategy`
> - `SsoLoginStrategy`
> - `WebAuthnLoginStrategy`
> - `UserApiLoginStrategy`
>
> Each of those strategies extend the base `LoginStrategy`, which houses common login logic.

The `LoginStrategyService` uses the `type` property on the credentials object to determine which of the specific login strategies should be used for the login process.

For example, the `PasswordLoginCredentials` object has `type = 0` (which is `AuthenticationType.Password`). This tells the `LoginStrategyService` to use the `PasswordLoginStrategy` for the login process.

Here is what all of this looks like so far:

```mermaid
flowchart TD
    %% Top row: Login methods
    A1[Login with Master Password]
    A2[Login with Device / Auth Request]
    A3[Login with SSO]
    A4[Login with Passkey / WebAuthn]
    A5[Login with User API Key - CLI only]

    %% Second row: Credentials objects
    B1[PasswordLoginCredentials]
    B2[AuthRequestLoginCredentials]
    B3[SsoLoginCredentials]
    B4[WebAuthnLoginCredentials]
    B5[UserApiLoginCredentials]

    %% Third row: Banner-wide LoginStrategyService
    C["""────────────────────────────────────────────
    LoginStrategyService
    ────────────────────────────────────────────"""]

    %% Fourth row: Login Strategies
    D1[PasswordLoginStrategy]
    D2[AuthRequestLoginStrategy]
    D3[SsoLoginStrategy]
    D4[WebAuthnLoginStrategy]
    D5[UserApiLoginStrategy]

    %% Align rows and arrows
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5

    B1 --> C
    B2 --> C
    B3 --> C
    B4 --> C
    B5 --> C

    C --> D1
    C --> D2
    C --> D3
    C --> D4
    C --> D5

    %% Style login method boxes (#634E53 deep plum, white text)
    style A1 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A2 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A3 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A4 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A5 fill:#634E53,stroke:#634E53,color:#FFFFFF

    %% Style credentials boxes (#DDDAC5 cream, black text)
    style B1 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B2 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B3 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B4 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B5 fill:#DDDAC5,stroke:#B8B29A,color:#000000

    %% Style LoginStrategyService banner (#6C7E68 muted forest green, white text)
    style C fill:#6C7E68,stroke:#6C7E68,color:#FFFFFF

    %% Style login strategy boxes (#B2C29B soft sage green, black text)
    style D1 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D2 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D3 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D4 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D5 fill:#B2C29B,stroke:#6C7E68,color:#000000
```

<br>

## The `logIn()` and `startLogin()` Methods

Each login strategy has it's own implementation of the `logIn()` method, which takes the credentials object as its sole argument and triggers a process that does the following _at minimum_:

<details>
  <summary><strong>1 - Builds a <code>LoginStrategyData</code> and <code>TokenRequest</code> object</strong></summary>

- Each login strategy uses the credentials object to help build a type of the `LoginStrategyData` object, which contains data needed throughout the lifetime of the login strategy. Each login strategy has it's own class that implements the `LoginStrategyData` interface:
  - `PasswordLoginStrategyData`
  - `AuthRequestLoginStrategyData`
  - `SsoLoginStrategyData`
  - `WebAuthnLoginStrategyData`
  - `UserApiLoginStrategyData`

- Each `LoginStrategyData` object has different properties, but the most important property common to all `LoginStrategyData` objects is the `tokenRequest` property, which holds some type of the `TokenRequest` object, and is formed based on the specific login strategy:
  - `PasswordTokenRequest` &mdash; used by both Password and Auth Request login strategies
  - `SsoTokenRequest`
  - `WebAuthnTokenRequest`
  - `UserApiTokenRequest`

</details>

<details>
  <summary><strong>2 - Calls the base <code>startLogin()</code> method</strong></summary>
  
  - After building the `LoginStrategyData` object, we call the `startLogin()` method, which exists on the base `LoginStrategy` and is therefore common to all of the login strategies. The `startLogin()` method does two main things:

    [1] - <em>Makes a `POST` request to the `/connect/token` endpoint on our Identity Server</em>

      - `REQUEST` &mdash; The contents of the payload for this request are determined by the `toIdentityToken()` method that exists on the base `TokenRequest` object (which can be overridden by the sub-classes). This method translates the information in the `TokenRequest` into the payload that will be sent to the `/connect/token` endpoint on our Identity Server.

      - `RESPONSE` &mdash; The Identity Server validates the request based on the grant type, and then generates a response that will be some form of `IdentityResponse`. There are three possibilities:
        - [`IdentityTokenResponse`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/models/response/identity-token.response.ts)

          - This response contains means the user has been authenticated. The response contains:
            - Authentication information for the user (access token, refresh token)
            - Decryption information for the user

        - [`IdentityTwoFactorResponse`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/models/response/identity-two-factor.response.ts)
          - This response means that the user will need to complete Two Factor Authentication, and the response contains information about the user's 2FA requirements (i.e. which 2FA providers they have available to them, etc.)

        - [`IdentityDeviceVerificationResponse`](https://github.com/bitwarden/clients/blob/main/libs/common/src/auth/models/response/identity-device-verification.response.ts)
          - This reponse means that the user will need to verify their new device.

    [2] - <em>Calls one of the `process*Response()` methods based on the type of `IdentityResponse`, each of which returns an `AuthResult`</em>

      - If `IdentityTokenResponse`, call `processTokenResponse()`

        - This method uses information from the `IdentityTokenResponse` object to set Authentication and Decryption information about the user into state.

          - `saveAccountInformation()` - initializes the account with information from the `IdentityTokenResponse` after successful login.

            - Adds the account to the `AccountService` and sets up the account profile in `StateService`
            - Sets the access token and refresh token to state
            - Sets the `userDecryptionOptions` to state

          - Sets the user's cryptographic properties to state via `setMasterKey()`, `setUserKey()`, and `setPrivateKey()`

          - Sets a `forceSetPasswordReason` in state, if necessary.

      - If `IdentityTwoFactorResponse`, call `processTwoFactorResponse()`
        - This method adds the necessary data for the 2FA process to the `AuthResult`

      - If `IdentityDeviceVerificationResponse`, call `processDeviceVerificationResponse()`
        - This method simply sets `requiresDeviceVerification` to `true` on the `AuthResult`

</details>

<details>
  <summary><strong>3 - Returns an <code>AuthResult</code> object</strong></summary>
  
  - The `AuthResult` object contains information that will be used to determine how to navigate the user after authentication.

</details>

<br>

## Handling the `AuthResult`

The `AuthResult` object returned from the `process*Response()` method contains information that will be used to determine how to navigate the user after authentication.

For example, if the `AuthResult` contains:

- `requiresTwoFactor` &mdash; then navigate user to `/2fa`
- `requiresDeviceVerification` &mdash; then navigate user to `/device-verification`
- If there are no additional requirements according to the `AuthResult`, then navigate user to `/vault`

<br>

## Final Diagram

Here is a high-level overview of what all of this looks like in the end:

```mermaid
flowchart TD
    %% Top row: Login methods
    A1[Login with Master Password]
    A2[Login with Device / Auth Request]
    A3[Login with SSO]
    A4[Login with Passkey / WebAuthn]
    A5[Login with User API Key - CLI only]

    %% Second row: Credentials objects
    B1[PasswordLoginCredentials]
    B2[AuthRequestLoginCredentials]
    B3[SsoLoginCredentials]
    B4[WebAuthnLoginCredentials]
    B5[UserApiLoginCredentials]

    %% Third row: Banner-wide LoginStrategyService
    C["""────────────────────────────────────────────
    LoginStrategyService
    ────────────────────────────────────────────"""]

    %% Fourth row: Login Strategies
    D1[PasswordLoginStrategy]
    D2[AuthRequestLoginStrategy]
    D3[SsoLoginStrategy]
    D4[WebAuthnLoginStrategy]
    D5[UserApiLoginStrategy]

    %% Fifth row: Token Request objects
    E1[PasswordTokenRequest]
    E2[PasswordTokenRequest]
    E3[SsoTokenRequest]
    E4[WebAuthnTokenRequest]
    E5[UserApiTokenRequest]

    %% Sixth row: POST identity token
    F["""────────────────────────────────────────────
    POST identity token to /connect/token
    ────────────────────────────────────────────"""]

    %% Seventh row: Server validates and responds
    G["""────────────────────────────────────────────
    Server validates request and sends a response
    ────────────────────────────────────────────"""]

    %% Eighth row: Response types
    H1[Response 1: IdentityTokenResponse]
    H2[Response 2: IdentityTwoFactorResponse]
    H3[Response 3: IdentityDeviceVerificationResponse]

    %% Ninth row: Process response functions
    I1[Call processTokenResponse]
    I2[Call processTwoFactorResponse]
    I3[Call processDeviceVerificationResponse]

    %% Tenth row: AuthResult
    J["""────────────────────────────────────────────
    AuthResult
    We use this object to determine how to direct the user
    ────────────────────────────────────────────"""]

    %% Eleventh row: Routing decisions
    K1[If authResult has no special requirements, route to /vault]
    K2[If authResult.requiresTwoFactor, route to /2fa]
    K3[If authResult.requiresDeviceVerification, route to /device-verification]

    %% Align rows and arrows
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5

    B1 --> C
    B2 --> C
    B3 --> C
    B4 --> C
    B5 --> C

    C --> D1
    C --> D2
    C --> D3
    C --> D4
    C --> D5

    D1 --> E1
    D2 --> E2
    D3 --> E3
    D4 --> E4
    D5 --> E5

    E1 --> F
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F

    F --> G

    G --> H1
    G --> H2
    G --> H3

    H1 --> I1
    H2 --> I2
    H3 --> I3

    I1 --> J
    I2 --> J
    I3 --> J

    J --> K1
    J --> K2
    J --> K3

    %% Style login method boxes (#634E53 deep plum, white text)
    style A1 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A2 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A3 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A4 fill:#634E53,stroke:#634E53,color:#FFFFFF
    style A5 fill:#634E53,stroke:#634E53,color:#FFFFFF

    %% Style credentials, token request, and AuthResult boxes (#DDDAC5 cream, black text)
    style B1 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B2 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B3 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B4 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style B5 fill:#DDDAC5,stroke:#B8B29A,color:#000000

    style E1 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style E2 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style E3 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style E4 fill:#DDDAC5,stroke:#B8B29A,color:#000000
    style E5 fill:#DDDAC5,stroke:#B8B29A,color:#000000

    style J fill:#DDDAC5,stroke:#B8B29A,color:#000000

    %% Style LoginStrategyService banner (#6C7E68 muted forest green, white text)
    style C fill:#6C7E68,stroke:#6C7E68,color:#FFFFFF

    %% Style login strategy boxes (#B2C29B soft sage green, black text)
    style D1 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D2 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D3 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D4 fill:#B2C29B,stroke:#6C7E68,color:#000000
    style D5 fill:#B2C29B,stroke:#6C7E68,color:#000000

    %% Style POST and server validation boxes (#5F6E75 slate gray, white text)
    style F fill:#5F6E75,stroke:#5F6E75,color:#FFFFFF
    style G fill:#5F6E75,stroke:#5F6E75,color:#FFFFFF

    %% Style Identity*Response boxes (#133C55 deep navy blue, white text)
    style H1 fill:#133C55,stroke:#133C55,color:#FFFFFF
    style H2 fill:#133C55,stroke:#133C55,color:#FFFFFF
    style H3 fill:#133C55,stroke:#133C55,color:#FFFFFF

    %% Style process response boxes (#386FA4 medium blue, white text)
    style I1 fill:#386FA4,stroke:#386FA4,color:#FFFFFF
    style I2 fill:#386FA4,stroke:#386FA4,color:#FFFFFF
    style I3 fill:#386FA4,stroke:#386FA4,color:#FFFFFF

    %% Style routing boxes (#59A5D8 soft blue, white text)
    style K1 fill:#59A5D8,stroke:#59A5D8,color:#FFFFFF
    style K2 fill:#59A5D8,stroke:#59A5D8,color:#FFFFFF
    style K3 fill:#59A5D8,stroke:#59A5D8,color:#FFFFFF
```
