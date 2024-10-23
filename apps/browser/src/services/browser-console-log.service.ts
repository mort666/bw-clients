import { LogLevelType } from "@bitwarden/common/platform/enums";
import { ConsoleLogService } from "@bitwarden/common/platform/services/console-log.service";

const LOG_LEVEL_KEY = "logLevel";

export class BrowserConsoleLogService extends ConsoleLogService {
  protected async readStoredLogLevel(): Promise<LogLevelType> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(LOG_LEVEL_KEY, (obj) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        resolve(obj?.[LOG_LEVEL_KEY] ?? null);
      });
    });
  }

  protected writeStoredLogLevel(newLogLevel: LogLevelType): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ [LOG_LEVEL_KEY]: newLogLevel }, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        resolve();
      });
    });
  }
}
