import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Policy } from "@bitwarden/common/admin-console/models/domain/policy";
import { ApiSettings } from "@bitwarden/common/tools/integration/rpc";
import { IdentityConstraint } from "@bitwarden/common/tools/state/identity-state-constraint";

import { ForwarderConfiguration } from "../../engine";
import { Forwarder } from "../../engine/forwarder";
import { GeneratorDependencyProvider, NoPolicy } from "../../types";
import { deepFreeze } from "../../util";
import { Profile, Type } from "../data";
import { GeneratorMetadata } from "../generator-metadata";
import { toForwarderIntegration } from "../util";

export function toGeneratorMetadata<Settings extends ApiSettings = ApiSettings>(
  configuration: ForwarderConfiguration<Settings>,
): GeneratorMetadata<Settings, NoPolicy> {
  const forwarder = deepFreeze({
    id: toForwarderIntegration(configuration),
    category: Type.email,
    i18nKeys: {
      name: configuration.name,
      description: "forwardedEmailDesc",
      generateCredential: "generateEmail",
      credentialGenerated: "email",
      copyCredential: "copyEmail",
    },
    capabilities: {
      autogenerate: false,
      fields: configuration.forwarder.request as string[],
    },
    engine: {
      create(dependencies: GeneratorDependencyProvider) {
        // FIXME: figure out why `configuration` fails to typecheck
        const config: any = configuration;
        return new Forwarder(config, dependencies.client, dependencies.i18nService);
      },
    },
    options: {
      constraints: configuration.forwarder.settingsConstraints,
      [Profile.account]: {
        storage: configuration.forwarder.local.settings,
        policy: {
          type: PolicyType.PasswordGenerator,
          disabledValue: {},
        },
      },
    },
    policy: {
      combine(_acc: NoPolicy, _policy: Policy) {
        return {};
      },
      toConstraints(_policy: NoPolicy) {
        return new IdentityConstraint<Settings>();
      },
    },
  } satisfies GeneratorMetadata<Settings, NoPolicy>);

  return forwarder;
}
