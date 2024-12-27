import { Field, Vendor } from "../metadata/data";
import { Extension } from "../metadata/extension";
import { ExtensionMetadata, VendorMetadata } from "../metadata/type";

export const SimpleLogin: VendorMetadata = {
  id: Vendor.simplelogin,
  name: "SimpleLogin",
};

export const SimpleLoginIntegrations: ExtensionMetadata[] = [
  {
    site: Extension.forwarder,
    product: {
      vendor: SimpleLogin,
    },
    host: {
      authentication: true,
      selfHost: "maybe",
      baseUrl: "https://app.simplelogin.io",
    },
    requestedFields: [Field.baseUrl, Field.token, Field.domain],
  },
];
