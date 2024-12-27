import { Site } from "../data";

import { VendorMetadata } from "./type";

export const Vendor = Object.freeze({
  anonaddy: "anonaddy",
  duckduckgo: "duckduckgo",
  fastmail: "fastmail",
  mozilla: "mozilla",
  forwardemail: "forwardemail",
  simplelogin: "simplelogin",
} as const);

export const VendorInfo: Record<string, VendorMetadata> = {
  [Vendor.anonaddy]: {
    id: Vendor.anonaddy,
    name: "Addy.io",
  },
  [Vendor.duckduckgo]: {
    id: Vendor.duckduckgo,
    name: "DuckDuckGo",
  },
  [Vendor.fastmail]: {
    id: Vendor.fastmail,
    name: "Fastmail",
  },
  [Vendor.mozilla]: {
    id: Vendor.mozilla,
    name: "Mozilla",
  },
  [Vendor.forwardemail]: {
    id: Vendor.forwardemail,
    name: "Forward Email",
  },
  [Vendor.simplelogin]: {
    id: Vendor.simplelogin,
    name: "SimpleLogin",
  },
};

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
