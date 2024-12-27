import { deepFreeze } from "../../util";

import { AddyIo, AddyIoExtensions } from "./addy-io";
import { DuckDuckGo, DuckDuckGoExtensions } from "./duck-duck-go";
import { Fastmail, FastmailExtensions } from "./fastmail";
import { ForwardEmail, ForwardEmailExtensions } from "./forward-email";
import { Mozilla, MozillaExtensions } from "./mozilla";
import { SimpleLogin, SimpleLoginExtensions } from "./simple-login";

export const Vendors = deepFreeze([
  AddyIo,
  DuckDuckGo,
  Fastmail,
  ForwardEmail,
  Mozilla,
  SimpleLogin,
]);

export const VendorExtensions = deepFreeze(
  [
    AddyIoExtensions,
    DuckDuckGoExtensions,
    FastmailExtensions,
    ForwardEmailExtensions,
    MozillaExtensions,
    SimpleLoginExtensions,
  ].flat(),
);
