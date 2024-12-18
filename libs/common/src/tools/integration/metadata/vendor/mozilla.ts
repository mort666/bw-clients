import { Field, Vendor } from "../data";
import { Extension } from "../extension";
import { IntegrationMetadata } from "../type";

export const Mozilla = {
  id: Vendor.mozilla,
  name: "Mozilla",
};

export const MozillaIntegrations: IntegrationMetadata[] = [
  {
    extension: Extension.forwarder,
    product: {
      vendor: Mozilla,
      name: "Firefox Relay",
    },
    host: {
      selfHost: "never",
      baseUrl: "https://relay.firefox.com/api",
    },
    requestedFields: [Field.token],
  },
];
