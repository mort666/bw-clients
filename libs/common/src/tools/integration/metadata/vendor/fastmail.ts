import { Field, Vendor } from "../data";
import { Extension } from "../extension";
import { IntegrationMetadata } from "../type";

export const Fastmail = {
  id: Vendor.fastmail,
  name: "Fastmail",
};

// integration-wide configuration
export const FastmailIntegrations: IntegrationMetadata[] = [
  {
    extension: Extension.forwarder,
    product: {
      vendor: Fastmail,
    },
    host: {
      selfHost: "maybe",
      baseUrl: "https://api.fastmail.com",
    },
    requestedFields: [Field.token],
  },
];
