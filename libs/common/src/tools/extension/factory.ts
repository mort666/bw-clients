import { DefaultExtensionRegistry } from "./default-extension-registry";
import { Extension } from "./metadata";
import { ExtensionMetadata } from "./type";
import { AddyIo, AddyIoExtensions } from "./vendor/addy-io";
import { DuckDuckGo, DuckDuckGoExtensions } from "./vendor/duck-duck-go";
import { Fastmail, FastmailExtensions } from "./vendor/fastmail";
import { ForwardEmail, ForwardEmailExtensions } from "./vendor/forward-email";
import { Mozilla, MozillaExtensions } from "./vendor/mozilla";
import { SimpleLogin, SimpleLoginExtensions } from "./vendor/simple-login";
import { VendorMetadata } from "./vendor/type";

// FIXME: find a better way to build the registry than a hard-coded factory function

/** Constructs the extension registry */
export function buildRegistry() {
  function registerAll(vendor: VendorMetadata, extensions: ExtensionMetadata[]) {
    registry.registerVendor(vendor);
    for (const extension of extensions) {
      registry.registerExtension(extension);
    }
  }

  const registry = new DefaultExtensionRegistry();

  for (const site of Reflect.ownKeys(Extension) as string[]) {
    registry.registerSite(Extension[site]);
  }

  registerAll(AddyIo, AddyIoExtensions);
  registerAll(DuckDuckGo, DuckDuckGoExtensions);
  registerAll(Fastmail, FastmailExtensions);
  registerAll(ForwardEmail, ForwardEmailExtensions);
  registerAll(Mozilla, MozillaExtensions);
  registerAll(SimpleLogin, SimpleLoginExtensions);

  return registry;
}
