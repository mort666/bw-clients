import { LogService as LogServiceAbstraction } from "../abstractions/log.service";
import { LogLevelType } from "../enums/log-level-type.enum";

export abstract class ConsoleLogService implements LogServiceAbstraction {
  protected timersMap: Map<string, [number, number]> = new Map();
  private _storedLogLevel: LogLevelType | null = null;
  private initialized = false;
  get logLevel(): LogLevelType {
    return this._storedLogLevel ?? this.defaultLogLevel;
  }

  private _preInitQueue: Array<Parameters<typeof this.write>> = [];
  private _initNotCalledWarningTimeout: NodeJS.Timeout | null = null;

  constructor(
    protected isDev: boolean,
    protected defaultLogLevel: LogLevelType = LogLevelType.Warning,
    initWarnInterval: number = 500,
  ) {
    this._initNotCalledWarningTimeout = setTimeout(() => {
      if (!this.initialized) {
        this.innerWrite(
          LogLevelType.Warning,
          "ConsoleLogService has not been initialized. Child Logging classes may not have called init",
        );
      }
    }, initWarnInterval);
  }

  /**
   * Reads the stored log level. This method is not part of the constructor to give implementing classes a chance
   * to set up their storage before calling it.
   *
   * This method MUST be called in the constructor of the implementing class.
   * If it is not, a warning will be logged every 500ms until it is called.
   * @returns {Promise<void>}
   */
  protected async init(): Promise<void> {
    this._initNotCalledWarningTimeout && clearTimeout(this._initNotCalledWarningTimeout);
    return this.readStoredLogLevel().then((level) => {
      this._storedLogLevel = level;
      this.initialized = true;
      this._preInitQueue.forEach(([level, message, ...optionalParams]) => {
        this.innerWrite(level, message, ...optionalParams);
      });
      this._preInitQueue = [];
    });
  }

  protected abstract readStoredLogLevel(): Promise<LogLevelType>;
  protected abstract writeStoredLogLevel(level: LogLevelType): Promise<void>;

  protected get filter(): (level: LogLevelType) => boolean {
    return (level) => level >= this.logLevel;
  }

  updateLogLevel(level: LogLevelType) {
    this._storedLogLevel = level;
    void this.writeStoredLogLevel(level);
  }

  debug(message?: any, ...optionalParams: any[]) {
    if (!this.isDev) {
      return;
    }
    this.write(LogLevelType.Debug, message, ...optionalParams);
  }

  info(message?: any, ...optionalParams: any[]) {
    this.write(LogLevelType.Info, message, ...optionalParams);
  }

  warning(message?: any, ...optionalParams: any[]) {
    this.write(LogLevelType.Warning, message, ...optionalParams);
  }

  error(message?: any, ...optionalParams: any[]) {
    this.write(LogLevelType.Error, message, ...optionalParams);
  }

  write(level: LogLevelType, message?: any, ...optionalParams: any[]) {
    if (this.initialized === false) {
      // If log level is not set, enqueue the message
      this._preInitQueue.push([level, message, ...optionalParams]);
    } else {
      this.innerWrite(level, message, ...optionalParams);
    }
  }

  protected innerWrite(level: LogLevelType, message?: any, ...optionalParams: any[]) {
    if (!this.filter(level)) {
      return;
    }

    switch (level) {
      case LogLevelType.Debug:
        // eslint-disable-next-line
        console.log(message, ...optionalParams);
        break;
      case LogLevelType.Info:
        // eslint-disable-next-line
        console.log(message, ...optionalParams);
        break;
      case LogLevelType.Warning:
        // eslint-disable-next-line
        console.warn(message, ...optionalParams);
        break;
      case LogLevelType.Error:
        // eslint-disable-next-line
        console.error(message, ...optionalParams);
        break;
      default:
        break;
    }
  }
}
