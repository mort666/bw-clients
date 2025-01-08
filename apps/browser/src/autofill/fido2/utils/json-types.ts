// TypeScript implementation of https://w3c.github.io/webauthn/#typedefdef-publickeycredentialjson

type DOMString = string;
type Base64URLString = DOMString;

// The structure of this object will be either
// RegistrationResponseJSON or AuthenticationResponseJSON
export type PublicKeyCredentialJSON = RegistrationResponseJSON | AuthenticationResponseJSON;

export type RegistrationResponseJSON = {
  id: DOMString;
  rawId: Base64URLString;
  response: AuthenticatorAttestationResponseJSON;
  authenticatorAttachment?: DOMString;
  clientExtensionResults: AuthenticationExtensionsClientOutputsJSON;
  type: DOMString;
};

export type AuthenticatorAttestationResponseJSON = {
  clientDataJSON: Base64URLString;
  authenticatorData: Base64URLString;
  transportsBase64URLString: DOMString[];
  // The publicKey field will be missing if pubKeyCredParams was used to
  // negotiate a public-key algorithm that the user agent doesn't
  // understand. (See section “Easily accessing credential data” for a
  // list of which algorithms user agents must support.) If using such an
  // algorithm then the public key must be parsed directly from
  // attestationObject or authenticatorData.
  publicKey?: Base64URLString;
  publicKeyAlgorithmBase64URLString: COSEAlgorithmIdentifier;
  // This value contains copies of some of the fields above. See
  // section “Easily accessing credential data”.
  attestationObject: Base64URLString;
};

export type AuthenticationResponseJSON = {
  id: DOMString;
  rawId: Base64URLString;
  response: AuthenticatorAssertionResponseJSON;
  authenticatorAttachment?: DOMString;
  clientExtensionResults: AuthenticationExtensionsClientOutputsJSON;
  type: DOMString;
};

export type AuthenticatorAssertionResponseJSON = {
  clientDataJSON: Base64URLString;
  authenticatorData: Base64URLString;
  signature: Base64URLString;
  userHandle?: Base64URLString;
};

export type AuthenticationExtensionsClientOutputsJSON = Record<DOMString, unknown>;
