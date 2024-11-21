import { BaseResponse } from "../../../models/response/base.response";
import { TunnelVersion } from "../../../platform/communication-tunnel/communication-tunnel";

export class InitTunnelResponse extends BaseResponse {
  readonly encapsulationKey: Uint8Array;
  readonly tunnelVersion: TunnelVersion;
  readonly tunnelIdentifier: string;
  readonly tunnelDurationSeconds: number;

  constructor(response: any) {
    super(response);
    this.encapsulationKey = new Uint8Array(this.getResponseProperty("EncapsulationKey"));
    this.tunnelVersion = this.getResponseProperty("TunnelVersion");
    this.tunnelIdentifier = this.getResponseProperty("TunnelIdentifier");
    this.tunnelDurationSeconds = this.getResponseProperty("TunnelDurationSeconds");
  }
}
