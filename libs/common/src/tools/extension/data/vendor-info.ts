import { Vendor } from "../metadata/data";
import { VendorMetadata } from "../metadata/type";

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
