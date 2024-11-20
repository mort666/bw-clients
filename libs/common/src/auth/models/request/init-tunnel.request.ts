import { TunnelVersion } from "../../../platform/communication-tunnel/communication-tunnel";

export class InitTunnelRequest {
  constructor(readonly supportedTunnelVersions: TunnelVersion[]) {}
}
