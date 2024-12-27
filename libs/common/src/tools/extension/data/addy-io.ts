import { Field, Vendor } from "../metadata/data";
import { Extension } from "../metadata/extension";
import { ExtensionMetadata } from "../metadata/type";

export const AddyIo = {
  id: Vendor.anonaddy,
  name: "Addy.io",
};

export const AddyIoIntegrations: ExtensionMetadata[] = [
  {
    site: Extension.forwarder,
    product: {
      vendor: AddyIo,
    },
    host: {
      authorization: "bearer",
      selfHost: "maybe",
      baseUrl: "https://app.addy.io",
    },
    requestedFields: [Field.token, Field.baseUrl, Field.domain],
  },
];
