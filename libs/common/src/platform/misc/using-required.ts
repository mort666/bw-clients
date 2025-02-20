export type Disposable = { [Symbol.dispose]: () => void };

/**
 * Types implementing this type must be used together with the `using` keyword,
 * a rule which is enforced by the linter.
 *
 * @deprecated At this time only Chrome supports the `using` keyword.
 *             Wait for other browsers to catch up before using this type.
 * @example
 * ```
 * class Resource implements UsingRequired {
 *   [Symbol.dispose]() {
 *   // free the resource
 *   }
 * }
 *
 * function useResource() {
 *   using resource = new Resource();
 *   // resource is disposed when the block ends
 * }
 * ```
 */
// We want to use `interface` here because it creates a separate type.
// Type aliasing would not expose `UsingRequired` to the linter.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UsingRequired extends Disposable {}
