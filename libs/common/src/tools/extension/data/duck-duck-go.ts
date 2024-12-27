import { Field, Vendor } from "../metadata/data";
import { Extension } from "../metadata/extension";
import { ExtensionMetadata } from "../metadata/type";

export const DuckDuckGo = {
  id: Vendor.duckduckgo,
  name: "DuckDuckGo",
};

export const DuckDuckGoIntegrations: ExtensionMetadata[] = [
  {
    site: Extension.forwarder,
    product: {
      vendor: DuckDuckGo,
    },
    host: {
      authorization: "bearer",
      selfHost: "never",
      baseUrl: "https://quack.duckduckgo.com/api",
    },
    requestedFields: [Field.token],
  },
];
