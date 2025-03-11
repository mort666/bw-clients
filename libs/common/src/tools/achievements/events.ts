import { of } from "rxjs";

const itemAdded$ = of({
  "@timestamp": Date.now(),
  user: {
    id: "1E2EDBC3-4449-4583-A4AC-ACDFA5C2EC71",
  },
  event: {
    kind: "event",
    category: "session",
    type: "creation",
    outcome: "success",
    provider: "vault",
  },
  service: {
    name: "chrome-extension",
    type: "client",
    node: { name: "commotion-amused-rinse-trivial-sadly" },
    environment: "production",
    version: "37899",
  },
  transaction: { id: "00f067aa0ba902b7" },
  action: "vault-item-added",
  labels: { "vault-item-type": "login", "vault-item-uri-quantity": 1 },
  tags: ["with-attachment"],
});

const itemUpdated$ = of({
  "@timestamp": Date.now(),
  user: {
    id: "1E2EDBC3-4449-4583-A4AC-ACDFA5C2EC71",
  },
  event: {
    kind: "event",
    category: "session",
    type: "creation",
    outcome: "success",
    provider: "bitwarden-chrome-extension",
  },
  service: {
    name: "chrome-extension",
    type: "client",
    node: { name: "commotion-amused-rinse-trivial-sadly" },
    environment: "production",
    version: "37899",
  },
  transaction: { id: "00f067aa0ba902b8" },
  action: "vault-item-updated",
  labels: { "vault-item-type": "login", "uri-quantity": 1 },
  tags: ["with-folder"],
});

const itemMovedToCollection$ = of(
  {
    "@timestamp": Date.now(),
    user: {
      id: "1E2EDBC3-4449-4583-A4AC-ACDFA5C2EC71",
    },
    event: {
      kind: "event",
      category: "session",
      type: "deletion",
      outcome: "success",
      provider: "bitwarden-chrome-extension",
    },
    service: {
      name: "chrome-extension",
      type: "client",
      node: { name: "commotion-amused-rinse-trivial-sadly" },
      environment: "production",
      version: "37899",
    },
    transaction: { id: "00f067aa0ba902b9" },
    action: "vault-item-moved",
    labels: { "vault-item-type": "login", "uri-quantity": 1 },
    tags: ["collection"],
  },
  {
    "@timestamp": Date.now(),
    user: {
      id: "1E2EDBC3-4449-4583-A4AC-ACDFA5C2EC71",
    },
    event: {
      kind: "event",
      category: "session",
      type: "info",
      outcome: "success",
      provider: "bitwarden-chrome-extension",
    },
    service: {
      name: "chrome-extension",
      type: "client",
      node: { name: "commotion-amused-rinse-trivial-sadly" },
      environment: "production",
      version: "37899",
    },
    transaction: { id: "00f067aa0ba902b9" },
    action: "vault-item-moved",
    labels: { "vault-item-type": "login", "uri-quantity": 1 },
    tags: ["collection"],
  },
);

export { itemAdded$, itemUpdated$, itemMovedToCollection$ };
