import { Subject } from "rxjs";
import { Primitive } from "type-fest";

import { LogService } from "../../platform/abstractions/log.service";
import { LogLevelType } from "../../platform/enums";

import { EcsFormat, ErrorFormat, EventFormat, LogFormat, UserFormat } from "./ecs-format";
import { ServiceFormat } from "./ecs-format/service";
import { SemanticLogger } from "./semantic-logger.abstraction";

type ClientInfo = ServiceFormat & { log: { logger: string } };

export class EcsLogger implements SemanticLogger {
  constructor(
    private logger: LogService,
    private clientInfo: ClientInfo,
    private now = () => Date.now(),
  ) {
    this.pipe = new Subject();
  }

  private pipe: Subject<EcsFormat>;

  log$() {
    return this.pipe.asObservable();
  }

  event(info: EventFormat) {}

  debug(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Debug, message);
  }

  info(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Info, message);
  }

  warn(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Warning, message);
  }

  caught(error: Error, labels?: Record<string, Primitive>) {
    const log: LogFormat & ErrorFormat & Partial<UserFormat> = {
      ...this.clientInfo,
      error: {
        message: error.message,
        stack_trace: error.stack,
        type: error.name,
      },
      labels,
      event: {
        kind: "event",
        category: "process",
        type: "error",
        ...this.clientInfo.event,
      },
      log: {
        level: stringifyLevel(LogLevelType.Error),
        ...this.clientInfo.log,
      },
      "@timestamp": this.now(),
    };

    this.write(log);
  }

  error(labels: Record<string, Primitive> | string, message?: string): void {
    this.log(labels, LogLevelType.Error, message);
  }

  panic(labels: Record<string, Primitive> | string, message?: string): never {
    const panicMessage = this.log(labels, LogLevelType.Error, message) ?? "a fatal error occurred";
    throw new Error(panicMessage);
  }

  private log(
    content: Record<string, Primitive> | string,
    level: LogLevelType,
    maybeMessage?: string,
  ) {
    const labels = typeof content === "string" ? { content } : content;
    const message =
      maybeMessage ?? (typeof content === "string" ? content : "message not provided");

    const log: LogFormat & EventFormat = {
      ...this.clientInfo,
      message,
      labels,
      event: {
        kind: "event",
        category: "process",
        type: level === LogLevelType.Error ? "error" : "info",
        severity: level,
        ...this.clientInfo.event,
      },
      log: {
        level: stringifyLevel(level),
        ...this.clientInfo.log,
      },
      "@timestamp": this.now(),
    };

    this.write(log);

    return log.message;
  }

  private write(event: EcsFormat) {
    this.pipe.next(event);
  }
}

function stringifyLevel(level: LogLevelType) {
  switch (level) {
    case LogLevelType.Debug:
      return "debug";
    case LogLevelType.Info:
      return "info";
    case LogLevelType.Warning:
      return "warn";
    case LogLevelType.Error:
      return "error";
    default:
      return "info";
  }
}
