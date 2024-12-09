import { PinService } from "@bitwarden/auth/common";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { UserId } from "@bitwarden/common/types/guid";

export class DesktopPinService extends PinService {
  async getPinKeyEncryptedUserKeyEphemeral(userId: UserId): Promise<EncString> {
    const ephemeralValue = await ipc.platform.ephemeralStore.getEphemeralValue(
      `pinKeyEncryptedUserKeyEphemeral-${userId}`,
    );
    if (ephemeralValue == null) {
      return null;
    } else {
      return new EncString(ephemeralValue);
    }
  }

  async setPinKeyEncryptedUserKeyEphemeral(value: EncString, userId: UserId): Promise<void> {
    return await ipc.platform.ephemeralStore.setEphemeralValue(
      `pinKeyEncryptedUserKeyEphemeral-${userId}`,
      value.encryptedString,
    );
  }

  async deletePinKeyEncryptedUserKeyEphemeral(userId: string): Promise<void> {
    return await ipc.platform.ephemeralStore.removeEphemeralValue(
      `pinKeyEncryptedUserKeyEphemeral-${userId}`,
    );
  }
}
