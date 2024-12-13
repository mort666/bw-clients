import { deepFreeze } from "../util";

export const Algorithm = Object.freeze({
  /** A password composed of random characters */
  password: "password",

  /** A password composed of random words from the EFF word list */
  passphrase: "passphrase",

  /** A username composed of words from the EFF word list */
  username: "username",

  /** An email username composed of random characters */
  catchall: "catchall",

  /** An email username composed of words from the EFF word list  */
  plusAddress: "plus-address",

  /** An integrated email forwarding service */
  forwarder: "forwarder",
} as const);

export const Category = Object.freeze({
  password: "password",
  username: "username",
  email: "email",
} as const);

/** Credential generation algorithm identifiers grouped by category. */
export const CategorizedAlgorithm = deepFreeze({
  /** Lists algorithms in the "password" credential category */
  [Category.password]: [Algorithm.password, Algorithm.passphrase] as const,

  /** Lists algorithms in the "username" credential category */
  [Category.username]: [Algorithm.username] as const,

  /** Lists algorithms in the "email" credential category */
  [Category.email]: [Algorithm.catchall, Algorithm.plusAddress, Algorithm.forwarder] as const,
} as const);
