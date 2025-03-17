import { UserId } from "../../../types/guid";
import { AchievementProgressEvent } from "../types";

import { CredentialGeneratedProgress, ItemCreatedProgress } from "./example-validators";

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

const NextItemCreatedProgressEvent: AchievementProgressEvent = {
  "@timestamp": Date.now() + 100,
  event: {
    kind: "metric",
    category: "session",
  },
  achievement: { type: "progress", name: ItemCreatedProgress, value: 2 },
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

const CredentialGeneratedProgressEvent: AchievementProgressEvent = {
  "@timestamp": Date.now(),
  event: {
    kind: "metric",
    category: "session",
  },
  achievement: { type: "progress", name: CredentialGeneratedProgress, value: 1 },
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

export {
  ItemCreatedProgressEvent,
  NextItemCreatedProgressEvent as ItemCreatedProgress2Event,
  CredentialGeneratedProgressEvent,
};
