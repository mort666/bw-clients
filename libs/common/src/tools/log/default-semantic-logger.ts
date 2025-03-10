import { Jsonify, Primitive } from "type-fest";

import { LogService } from "../../platform/abstractions/log.service";
import { LogLevelType } from "../../platform/enums";

import { SemanticLogger } from "./semantic-logger.abstraction";

/** Sends semantic logs to the console.
 *  @remarks the behavior of this logger is based on `LogService`; it
 *   replaces dynamic messages (`%s`) with a JSON-formatted semantic log.
 */
export class DefaultSemanticLogger<Context extends object> implements SemanticLogger {
  /** Instantiates a console semantic logger
   *  @param context a static payload that is cloned when the logger
   *   logs a message. The `messages`, `level`, and `labels` fields
   *   are reserved for use by loggers.
   */
  constructor(
    private logger: LogService,
    context: Jsonify<Context>,
    private now = () => Date.now(),
  ) {
    this.context = context && typeof context === "object" ? context : {};
  }

  readonly context: object;

  debug(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Debug, message);
  }

  info(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Info, message);
  }

  warn(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Warning, message);
  }

  error(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Error, message);
  }

  panic(labels: Record<string, Primitive> | string, message?: string): never {
    this.log(labels, LogLevelType.Error, message);
    const panicMessage =
      message ?? (typeof labels === "string" ? labels : "a fatal error occurred");
    throw new Error(panicMessage);
  }

  private log(labels: Record<string, Primitive> | string, level: LogLevelType, message?: string) {
    const log = {
      ...this.context,
      message,
      labels: labels as unknown,
      level: stringifyLevel(level),
      "@timestamp": this.now(),
    };

    if (typeof labels === "string" && !message) {
      log.message = labels;
      delete log.labels;
    }

    this.logger.write(level, log);
  }
}

function stringifyLevel(level: LogLevelType) {
  switch (level) {
    case LogLevelType.Debug:
      return "debug";
    case LogLevelType.Info:
      return "information";
    case LogLevelType.Warning:
      return "warning";
    case LogLevelType.Error:
      return "error";
    default:
      return `${level}`;
  }
}
