import { Field, Vendor } from "../metadata/data";
import { Extension } from "../metadata/extension";
import { ExtensionMetadata } from "../metadata/type";

export const Mozilla = {
  id: Vendor.mozilla,
  name: "Mozilla",
};

export const MozillaIntegrations: ExtensionMetadata[] = [
  {
    site: Extension.forwarder,
    product: {
      vendor: Mozilla,
      name: "Firefox Relay",
    },
    host: {
      authorization: "token",
      selfHost: "never",
      baseUrl: "https://relay.firefox.com/api",
    },
    requestedFields: [Field.token],
  },
];
