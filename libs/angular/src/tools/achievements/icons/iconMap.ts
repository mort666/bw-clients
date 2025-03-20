import { Icon } from "@bitwarden/components";

import {
  OneLoginItemCreatedIcon,
  TenLoginItemsCreatedIcon,
  FiftyLoginItemsCreatedIcon,
  OneHundredLoginItemsCreatedIcon,
} from "./login";

export const iconMap: { [key: string]: Icon } = {
  "login-item-created": OneLoginItemCreatedIcon,
  "10-login-items-added": TenLoginItemsCreatedIcon,
  "50-login-items-added": FiftyLoginItemsCreatedIcon,
  "100-login-items-added": OneHundredLoginItemsCreatedIcon,
};
