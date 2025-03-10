import { Primitive } from "type-fest";

/** Semantic/structural logging component */
export interface SemanticLogger {
  /** Logs a message at debug priority.
   *  Debug messages are used for diagnostics, and are typically disabled
   *  in production builds.
   *  @param message - a message to record in the log's `message` field.
   */
  debug(message: string): void;

  /** Logs the content at debug priority.
   *  Debug messages are used for diagnostics, and are typically disabled
   *  in production builds.
   *  @param labels - JSON content included in the log's `content` field.
   *  @param message - a message to record in the log's `message` field.
   */
  debug(labels: Record<string, Primitive>, message?: string): void;

  /** combined signature for overloaded methods */
  debug(labels: Record<string, Primitive> | string, message?: string): void;

  /** Logs a message at informational priority.
   *  Information messages are used for status reports.
   *  @param message - a message to record in the log's `message` field.
   */
  info(message: string): void;

  /** Logs the content at informational priority.
   *  Information messages are used for status reports.
   *  @param labels - JSON content included in the log's `content` field.
   *  @param message - a message to record in the log's `message` field.
   */
  info(labels: Record<string, Primitive>, message?: string): void;

  /** combined signature for overloaded methods */
  info(labels: Record<string, Primitive> | string, message?: string): void;

  /** Logs a message at warn priority.
   *  Warn messages are used to indicate a operation that may affect system
   *  stability occurred.
   *  @param message - a message to record in the log's `message` field.
   */
  warn(message: string): void;

  /** Logs the content at warn priority.
   *  Warn messages are used to indicate a operation that may affect system
   *  stability occurred.
   *  @param labels - JSON content included in the log's `content` field.
   *  @param message - a message to record in the log's `message` field.
   */
  warn(labels: Record<string, Primitive>, message?: string): void;

  /** combined signature for overloaded methods */
  warn(labels: Record<string, Primitive> | string, message?: string): void;

  /** Logs a message at error priority.
   *  Error messages are used to indicate a operation that affects system
   *  stability occurred and the system was able to recover.
   *  @param message - a message to record in the log's `message` field.
   */
  error(message: string): void;

  /** Logs the content at debug priority.
   *  Error messages are used to indicate a operation that affects system
   *  stability occurred and the system was able to recover.
   *  @param labels - JSON content included in the log's `content` field.
   *  @param message - a message to record in the log's `message` field.
   */
  error(labels: Record<string, Primitive>, message?: string): void;

  /** combined signature for overloaded methods */
  error(labels: Record<string, Primitive> | string, message?: string): void;

  /** Logs a message at panic priority and throws an error.
   *  Panic messages are used to indicate a operation that affects system
   *  stability occurred and the system cannot recover. Panic messages
   *  log an error and throw an `Error`.
   *  @param message - a message to record in the log's `message` field.
   */
  panic(message: string): never;

  /** Logs the content at debug priority and throws an error.
   *  Panic messages are used to indicate a operation that affects system
   *  stability occurred and the system cannot recover. Panic messages
   *  log an error and throw an `Error`.
   *  @param labels - JSON content included in the log's `content` field.
   *  @param message - a message to record in the log's `message` field.
   */
  panic(labels: Record<string, Primitive>, message?: string): never;

  /** combined signature for overloaded methods */
  panic(labels: Record<string, Primitive> | string, message?: string): never;
}
