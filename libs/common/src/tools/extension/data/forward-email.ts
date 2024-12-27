import { Field, Vendor } from "../metadata/data";
import { Extension } from "../metadata/extension";
import { ExtensionMetadata } from "../metadata/type";

export const ForwardEmail = {
  id: Vendor.forwardemail,
  name: "Forward Email",
};

export const ForwardEmailExtensions: ExtensionMetadata[] = [
  {
    site: Extension.forwarder,
    product: {
      vendor: ForwardEmail,
    },
    host: {
      authorization: "basic-username",
      selfHost: "never",
      baseUrl: "https://api.forwardemail.net",
    },
    requestedFields: [Field.domain, Field.token],
  },
];
