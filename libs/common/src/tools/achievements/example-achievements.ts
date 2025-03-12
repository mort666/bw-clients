import { UserId } from "../../types/guid";

import { ItemCreatedProgress } from "./example-validators";
import { AchievementProgressEvent } from "./types";

const ItemCreatedProgressEvent: AchievementProgressEvent = {
  "@timestamp": Date.now(),
  event: {
    kind: "metric",
    category: "session",
  },
  achievement: { type: "progress", name: ItemCreatedProgress, value: 1 },
  service: {
    name: "extension",
    type: "client",
    node: {
      name: "an-installation-identifier-for-this-client-instance",
    },
    environment: "local",
    version: "2025.3.1-innovation-sprint",
  },
  user: {
    id: "some-guid" as UserId,
  },
};

export { ItemCreatedProgressEvent };
