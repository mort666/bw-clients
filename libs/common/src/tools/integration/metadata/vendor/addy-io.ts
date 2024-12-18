import { Field, Vendor } from "../data";
import { Extension } from "../extension";
import { IntegrationMetadata } from "../type";

export const AddyIo = {
  id: Vendor.anonaddy,
  name: "Addy.io",
};

export const AddyIoIntegrations: IntegrationMetadata[] = [
  {
    extension: Extension.forwarder,
    product: {
      vendor: AddyIo,
    },
    host: {
      selfHost: "maybe",
      baseUrl: "https://app.addy.io",
    },
    requestedFields: [Field.token, Field.baseUrl, Field.domain],
  },
];
