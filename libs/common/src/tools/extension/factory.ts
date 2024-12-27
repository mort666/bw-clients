import { AddyIo, AddyIoExtensions } from "./data/addy-io";
import { DuckDuckGo, DuckDuckGoExtensions } from "./data/duck-duck-go";
import { Fastmail, FastmailExtensions } from "./data/fastmail";
import { ForwardEmail, ForwardEmailExtensions } from "./data/forward-email";
import { Mozilla, MozillaExtensions } from "./data/mozilla";
import { SimpleLogin, SimpleLoginExtensions } from "./data/simple-login";
import { DefaultExtensionRegistry } from "./default-extension-registry";
import { Extension } from "./metadata/extension";
import { ExtensionMetadata, VendorMetadata } from "./metadata/type";

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
