import { BaseResponse } from "../../../models/response/base.response";
import { TunnelVersion } from "../../../platform/communication-tunnel/communication-tunnel";

export class InitTunnelResponse extends BaseResponse {
  readonly encapsulationKey: Uint8Array;
  readonly tunnelVersion: TunnelVersion;

  constructor(response: any) {
    super(response);
    this.encapsulationKey = new Uint8Array(this.getResponseProperty("EncapsulationKey"));
    this.tunnelVersion = this.getResponseProperty("TunnelVersion");
  }
}
