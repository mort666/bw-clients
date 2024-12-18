import { Extension } from "./extension";
import { IntegrationRegistry } from "./registry";
import { IntegrationMetadata, VendorMetadata } from "./type";
import { AddyIo, AddyIoIntegrations } from "./vendor/addy-io";
import { DuckDuckGo, DuckDuckGoIntegrations } from "./vendor/duck-duck-go";
import { Fastmail, FastmailIntegrations } from "./vendor/fastmail";
import { ForwardEmail, ForwardEmailIntegrations } from "./vendor/forward-email";
import { Mozilla, MozillaIntegrations } from "./vendor/mozilla";
import { SimpleLogin, SimpleLoginIntegrations } from "./vendor/simple-login";

/** Constructs the integration registry */
export function buildRegistry() {
  // FIXME: find a better way to build the registry than a hard-coded factory function
  function registerAll(vendor: VendorMetadata, integrations: IntegrationMetadata[]) {
    registry.registerVendor(vendor);
    for (const integration of integrations) {
      registry.registerIntegration(integration);
    }
  }

  const registry = new IntegrationRegistry();

  for (const site of Reflect.ownKeys(Extension) as string[]) {
    registry.registerExtension(Extension[site]);
  }

  registerAll(AddyIo, AddyIoIntegrations);
  registerAll(DuckDuckGo, DuckDuckGoIntegrations);
  registerAll(Fastmail, FastmailIntegrations);
  registerAll(ForwardEmail, ForwardEmailIntegrations);
  registerAll(Mozilla, MozillaIntegrations);
  registerAll(SimpleLogin, SimpleLoginIntegrations);

  return registry;
}
