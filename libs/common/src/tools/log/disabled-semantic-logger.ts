import { Primitive } from "type-fest";

import { SemanticLogger } from "./semantic-logger.abstraction";

/** Disables semantic logs. Still panics. */
export class DisabledSemanticLogger implements SemanticLogger {
  debug(_labels: Record<string, Primitive> | string, _message?: string): void {}

  info(_labels: Record<string, Primitive> | string, _message?: string): void {}

  warn(_labels: Record<string, Primitive> | string, _message?: string): void {}

  error(_labels: Record<string, Primitive> | string, _message?: string): void {}

  panic(_labels: Record<string, Primitive> | string, message?: string): never {
    throw new Error(message);
  }
}
