import { Simplify, Primitive, ConditionalKeys } from "type-fest";

type Function = (...args: any[]) => any;

/** FIXME: taken from type-fest-v4. remove once we upgrade */
export type RequiredKeysOf<BaseType extends object> = BaseType extends unknown // For distributing `BaseType`
  ? Exclude<keyof BaseType, OptionalKeysOf<BaseType>>
  : never; // Should never happen
export type OptionalKeysOf<BaseType extends object> = BaseType extends unknown // For distributing `BaseType`
  ? keyof {
      [Key in keyof BaseType as BaseType extends Record<Key, BaseType[Key]> ? never : Key]: never;
    } &
      keyof BaseType // Intersect with `keyof BaseType` to ensure result of `OptionalKeysOf<BaseType>` is always assignable to `keyof BaseType`
  : never; // Should never happen

/** END FIXME: taken from type-fest-v4. remove once we upgrade */

// Merges options with defaults, deeply preferring default types over options types.
// FIXME: It's likely the type-fests `MergeDeep` will be a better fit for this, but that is in v4+,
// marked experimental, _and_ caused flaky build failures when testing.
export type OptionsWithDefaultsDeep<Options, Defaults> = Simplify<
  {
    [K in keyof Required<Options> & keyof Defaults]: Defaults[K] extends Primitive | Function
      ? Defaults[K]
      : Defaults[K] extends object
        ? // note: exclude undefined here so that if the type is a union with undefined, we can still get the keys correctly
          OptionsWithDefaultsDeep<Exclude<Options[K], undefined>, Defaults[K]>
        : never; // should only ever be primitive, function, or object
  } & {
    [K in Exclude<keyof Required<Options>, keyof Defaults>]: Options[K];
  }
>;

type DefaultsForDeep<Options extends object> = Simplify<
  Omit<
    Required<{
      [K in keyof Options]: Required<Options>[K] extends Primitive | Function
        ? Options[K]
        : Required<Options>[K] extends object
          ? DefaultsForDeep<Required<Options>[K]>
          : never; // should only ever be primitive, function, or object
    }>,
    RequiredPrimitiveKeysOf<Options> | RequiredMethodKeysOf<Options>
  >
>;

// Returns only the keys of `Obj` that are required and not records
type RequiredPrimitiveKeysOf<Obj extends object> = RequiredKeysOf<
  Omit<Obj, ConditionalKeys<Obj, object>>
>;

// Returns only the keys of `Obj` that are required and are functions
type RequiredMethodKeysOf<Obj extends object> = RequiredKeysOf<
  Pick<Obj, ConditionalKeys<Obj, Function>>
>;

export function mergeOptions<
  Options extends object,
  // const Defaults extends DefaultsForDeep<Options>,
>(
  options: Options,
  defaults: DefaultsForDeep<Options>, //Defaults,
): OptionsWithDefaultsDeep<Options, DefaultsForDeep<Options>> {
  const result = { ...options } as any;
  for (const key in defaults) {
    if (result[key] == null) {
      result[key] = (defaults as any)[key];
    }
  }
  return result as OptionsWithDefaultsDeep<Options, DefaultsForDeep<Options>>;
}
