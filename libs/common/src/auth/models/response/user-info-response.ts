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
    this.id = this.getResponseProperty("Id");
    this.name = this.getResponseProperty("Name");
    this.email = this.getResponseProperty("Email");
    this.emailVerified = this.getResponseProperty("EmailVerified");
    this.creationDate = this.getResponseProperty("CreationDate");
    this.premium = this.getResponseProperty("Premium");
  }
}
