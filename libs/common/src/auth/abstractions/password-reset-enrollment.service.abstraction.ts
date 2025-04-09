import { UserKey } from "../../types/key";

export abstract class PasswordResetEnrollmentServiceAbstraction {
  /**
   * Enroll user in password reset
   * NOTE: Will also enroll the user in the organization if in the
   * invited status
   * @param organizationId - Organization in which to enroll the user
   * @param userId - User to enroll
   * @param userKey - User's symmetric key
   * @returns Promise that resolves when the user is enrolled
   * @throws Error if the action fails
   */
  abstract enroll(
    organizationId: string,
    userId: string,
    userKey: UserKey,
    trustedOrganizationPublicKey: Uint8Array,
  ): Promise<void>;
}
