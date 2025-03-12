export class LoginStartRequest {
  constructor(
    readonly email: string,
    readonly clientLoginStartRequest: string,
  ) {}
}
