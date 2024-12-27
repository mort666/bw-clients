import { AddyIo, AddyIoIntegrations } from "../data/addy-io";
import { DuckDuckGo, DuckDuckGoIntegrations } from "../data/duck-duck-go";
import { Fastmail, FastmailIntegrations } from "../data/fastmail";
import { ForwardEmail, ForwardEmailIntegrations } from "../data/forward-email";
import { Mozilla, MozillaIntegrations } from "../data/mozilla";
import { SimpleLogin, SimpleLoginIntegrations } from "../data/simple-login";

import { DefaultIntegrationRegistry } from "./default-extension-registry";
import { Extension } from "./extension";
import { ExtensionMetadata, VendorMetadata } from "./type";

/** Constructs the integration registry */
export function buildRegistry() {
  // FIXME: find a better way to build the registry than a hard-coded factory function
  function registerAll(vendor: VendorMetadata, integrations: ExtensionMetadata[]) {
    registry.registerVendor(vendor);
    for (const integration of integrations) {
      registry.registerExtension(integration);
    }
  }

  const registry = new DefaultIntegrationRegistry();

  for (const site of Reflect.ownKeys(Extension) as string[]) {
    registry.registerSite(Extension[site]);
  }

  registerAll(AddyIo, AddyIoIntegrations);
  registerAll(DuckDuckGo, DuckDuckGoIntegrations);
  registerAll(Fastmail, FastmailIntegrations);
  registerAll(ForwardEmail, ForwardEmailIntegrations);
  registerAll(Mozilla, MozillaIntegrations);
  registerAll(SimpleLogin, SimpleLoginIntegrations);

  return registry;
}
