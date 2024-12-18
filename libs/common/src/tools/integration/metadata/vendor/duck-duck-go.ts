import { Field, Vendor } from "../data";
import { Extension } from "../extension";
import { IntegrationMetadata } from "../type";

export const DuckDuckGo = {
  id: Vendor.duckduckgo,
  name: "DuckDuckGo",
};

export const DuckDuckGoIntegrations: IntegrationMetadata[] = [
  {
    extension: Extension.forwarder,
    product: {
      vendor: DuckDuckGo,
    },
    host: {
      selfHost: "never",
      baseUrl: "https://quack.duckduckgo.com/api",
    },
    requestedFields: [Field.token],
  },
];
