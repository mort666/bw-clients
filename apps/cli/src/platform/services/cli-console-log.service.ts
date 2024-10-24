import { LogLevelType } from "@bitwarden/common/platform/enums/log-level-type.enum";
import { ConsoleLogService } from "@bitwarden/common/platform/services/console-log.service";

export class CliConsoleLogService extends ConsoleLogService {
  override write(level: LogLevelType, message?: any, ...optionalParams: any[]) {
    if (!this.filter(level)) {
      return;
    }

    if (process.env.BW_RESPONSE === "true") {
      // eslint-disable-next-line
      super.write(LogLevelType.Error, message, ...optionalParams);
      return;
    }

    super.write(level, message, ...optionalParams);
  }
}
