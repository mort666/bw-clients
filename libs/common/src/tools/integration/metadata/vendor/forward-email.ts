import { Field, Vendor } from "../data";
import { Extension } from "../extension";
import { IntegrationMetadata } from "../type";

export const ForwardEmail = {
  id: Vendor.forwardemail,
  name: "Forward Email",
};

export const ForwardEmailIntegrations: IntegrationMetadata[] = [
  {
    extension: Extension.forwarder,
    product: {
      vendor: ForwardEmail,
    },
    host: {
      selfHost: "never",
      baseUrl: "https://api.forwardemail.net",
    },
    requestedFields: [Field.domain, Field.token],
  },
];
