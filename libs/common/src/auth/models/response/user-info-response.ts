import { BaseResponse } from "../../../models/response/base.response";

export class UserInfoResponse extends BaseResponse {
  id: string;
  name?: string;
  email: string;
  emailVerified: boolean;
  creationDate: string;
  premium: boolean;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("sub");
    this.name = this.getResponseProperty("name");
    this.email = this.getResponseProperty("email");
    this.emailVerified = this.getResponseProperty("email_verified");
    this.creationDate = this.getResponseProperty("accountcreationdate");
    this.premium = this.getResponseProperty("premium");
  }
}
