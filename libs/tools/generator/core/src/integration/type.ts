import { RpcConfiguration } from "@bitwarden/common/tools/integration/rpc";
import { GenerationRequest } from "@bitwarden/common/tools/types";

import { ForwarderContext } from "../engine";
import { GeneratorMetadata } from "../metadata/generator-metadata";
import { NoPolicy } from "../types";

/** Fields that may be requested by a forwarder integration */
export type ForwarderSettings = {
  /** bearer token that authenticates bitwarden to the forwarder.
   *  This is required to issue an API request.
   */
  token: string;

  /** The base URL of the forwarder's API.
   *  When this is empty, the forwarder's default production API is used.
   */
  baseUrl: string;

  /** The domain part of the generated email address.
   *  @remarks The domain should be authorized by the forwarder before
   *           submitting a request through bitwarden.
   *  @example If the domain is `domain.io` and the generated username
   *  is `jd`, then the generated email address will be `jd@domain.io`
   */
  domain: string;

  /** A prefix joined to the generated email address' username.
   *  @example If the prefix is `foo`, the generated username is `bar`,
   *  and the domain is `domain.io`, then the generated email address is `
   *  then the generated username is `foobar@domain.io`.
   */
  prefix: string;
};

/** Forwarder-specific static definition */
export type ForwarderMetadata = GeneratorMetadata<ForwarderSettings, NoPolicy> & {
  /** createForwardingEmail RPC definition */
  createForwardingEmail: RpcConfiguration<
    GenerationRequest,
    ForwarderContext<ForwarderSettings>,
    string
  >;

  /** getAccountId RPC definition; the response updates `accountId` which has a
   *  structural mixin type `RequestAccount`.
   */
  getAccountId?: RpcConfiguration<GenerationRequest, ForwarderContext<ForwarderSettings>, string>;
};
