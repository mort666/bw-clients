import { Field, Site } from "./data";
import { ExtensionMetadata } from "./type";

export const Extension: Record<string, ExtensionMetadata> = {
  [Site.forwarder]: {
    id: Site.forwarder,
    availableFields: [Field.baseUrl, Field.domain, Field.prefix, Field.token],
  },
};
