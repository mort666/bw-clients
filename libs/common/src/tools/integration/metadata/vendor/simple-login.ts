import { Field, Vendor } from "../data";
import { Extension } from "../extension";
import { IntegrationMetadata, VendorMetadata } from "../type";

export const SimpleLogin: VendorMetadata = {
  id: Vendor.simplelogin,
  name: "SimpleLogin",
};

export const SimpleLoginIntegrations: IntegrationMetadata[] = [
  {
    extension: Extension.forwarder,
    product: {
      vendor: SimpleLogin,
    },
    host: {
      selfHost: "maybe",
      baseUrl: "https://app.simplelogin.io",
    },
    requestedFields: [Field.baseUrl, Field.token, Field.domain],
  },
];
