import { UserKey } from "../../types/key";

import { OpaqueApiService } from "./opaque-api.service";
import { OpaqueService } from "./opaque.service";

export class DefaultOpaqueService implements OpaqueService {
  constructor(private opaqueApiService: OpaqueApiService) {}

  async Register(masterPassword: string, userKey: UserKey) {
    throw new Error("Not implemented");
    await Promise.resolve();
  }

  async Login(masterPassword: string) {
    throw new Error("Not implemented");
    return await Promise.resolve(null as unknown as UserKey);
  }
}
