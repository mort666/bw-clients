export const Site = Object.freeze({
  forwarder: "forwarder",
} as const);

export const Field = Object.freeze({
  token: "token",
  baseUrl: "baseUrl",
  domain: "domain",
  prefix: "prefix",
} as const);

export const FieldsBySite = {
  [Site.forwarder]: [Field.token, Field.baseUrl, Field.domain, Field.prefix],
} as const;

export const Vendor = Object.freeze({
  anonaddy: "anonaddy",
  duckduckgo: "duckduckgo",
  fastmail: "fastmail",
  mozilla: "mozilla",
  forwardemail: "forwardemail",
  simplelogin: "simplelogin",
} as const);

export const VendorsByExtension = {
  [Site.forwarder]: [
    Vendor.anonaddy,
    Vendor.duckduckgo,
    Vendor.fastmail,
    Vendor.mozilla,
    Vendor.forwardemail,
    Vendor.simplelogin,
  ] as const,
} as const;
