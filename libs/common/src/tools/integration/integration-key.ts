import { Jsonify } from "type-fest";

import { INTEGRATION_DISK } from "@bitwarden/common/platform/state";

import { PrivateClassifier } from "../private-classifier";
import { ObjectKey } from "../state/object-key";

import { IntegrationRegistry } from "./metadata/registry";
import { ExtensionSite, VendorId } from "./metadata/type";

export class IntegrationKey<T> {
  constructor(
    private site: ExtensionSite,
    private deserialize: (json: Jsonify<T>) => T,
    private initial?: T,
  ) {}

  /** Constructs an object key
   *  @remarks this method should only be called by the integration service.
   *    It is not provided for general use.
   */
  toObjectKey(vendor: VendorId, registry: IntegrationRegistry): ObjectKey<T> {
    const integration = registry.getIntegration(this.site, vendor);

    // an integrator can only store fields that are exported from the
    // extension point *and* that were requested by the extension. All
    // of the data stored by the extension is, for the moment, private.
    const fields: any[] = integration.extension.availableFields.filter((available) =>
      integration.requestedFields.includes(available),
    );
    const classifier = new PrivateClassifier(fields);

    const objectKey: ObjectKey<T> = {
      target: "object",
      key: `${integration.extension.id}.${integration.product.vendor.id}`,
      state: INTEGRATION_DISK,
      classifier,
      format: "classified",
      options: {
        deserializer: this.deserialize,
        clearOn: ["logout"],
      },
      initial: this.initial,
    };

    return objectKey;
  }
}
