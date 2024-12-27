import { Field, Site } from "./data";
import { SiteMetadata } from "./type";

export const Extension: Record<string, SiteMetadata> = {
  [Site.forwarder]: {
    id: Site.forwarder,
    availableFields: [Field.baseUrl, Field.domain, Field.prefix, Field.token],
  },
};

export const FieldsBySite = {
  [Site.forwarder]: [Field.token, Field.baseUrl, Field.domain, Field.prefix],
} as const;
