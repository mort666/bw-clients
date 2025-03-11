import { UserKey } from "../../types/key";

export abstract class OpaqueService {
  /**
   * Register a user to use the Opaque login method.
   */
  abstract Register(masterPassword: string, userKey: UserKey): Promise<void>;

  /**
   * Authenticate using the Opaque login method.
   * @returns The UserKey obtained during the Opaque login flow.
   */
  abstract Login(masterPassword: string): Promise<UserKey>;
}
