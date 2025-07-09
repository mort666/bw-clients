/* eslint-disable @typescript-eslint/no-empty-object-type -- used in type-fest's code*/
import { RequiredKeysOf, Simplify, Primitive } from "type-fest";

type Function = (...args: any[]) => any;

/** FIXME: this is pulled from type-fest-v4. remove when we update package */
export type ConditionalSimplifyDeep<
  Type,
  ExcludeType = never,
  IncludeType = unknown,
> = Type extends ExcludeType
  ? Type
  : Type extends IncludeType
    ? { [TypeKey in keyof Type]: ConditionalSimplifyDeep<Type[TypeKey], ExcludeType, IncludeType> }
    : Type;
export type BuiltIns = Primitive | void | Date | RegExp;
export type NonRecursiveType = BuiltIns | Function | (new (...arguments_: any[]) => unknown);
export type SimplifyDeep<Type, ExcludeType = never> = ConditionalSimplifyDeep<
  Type,
  ExcludeType | NonRecursiveType | Set<unknown> | Map<unknown, unknown>,
  object
>;

type SimplifyDeepExcludeArray<T> = SimplifyDeep<T, UnknownArray>;
export type UnknownArray = readonly unknown[];
export type UnknownRecord = Record<PropertyKey, unknown>;
export type UnknownArrayOrTuple = readonly [...unknown[]];
export type OmitIndexSignature<ObjectType> = {
  [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? never
    : KeyType]: ObjectType[KeyType];
};
export type PickIndexSignature<ObjectType> = {
  [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? KeyType
    : never]: ObjectType[KeyType];
};

type MergeDeepRecordProperty<Destination, Source> = undefined extends Source
  ?
      | MergeDeepOrReturn<Source, Exclude<Destination, undefined>, Exclude<Source, undefined>>
      | undefined
  : MergeDeepOrReturn<Source, Destination, Source>;
type RequiredFilter<Type, Key extends keyof Type> = undefined extends Type[Key]
  ? Type[Key] extends undefined
    ? Key
    : never
  : Key;

// Returns `never` if the key is required otherwise return the key type.
type OptionalFilter<Type, Key extends keyof Type> = undefined extends Type[Key]
  ? Type[Key] extends undefined
    ? never
    : Key
  : never;

export type EnforceOptional<ObjectType> = Simplify<
  {
    [Key in keyof ObjectType as RequiredFilter<ObjectType, Key>]: ObjectType[Key];
  } & {
    [Key in keyof ObjectType as OptionalFilter<ObjectType, Key>]?: Exclude<
      ObjectType[Key],
      undefined
    >;
  }
>;

type MergeDeepOrReturn<DefaultType, Destination, Source> = SimplifyDeepExcludeArray<
  [undefined] extends [Destination | Source]
    ? DefaultType
    : Destination extends UnknownRecord
      ? Source extends UnknownRecord
        ? MergeDeepRecord<Destination, Source>
        : DefaultType
      : Destination extends UnknownArrayOrTuple
        ? Source extends UnknownArrayOrTuple
          ? MergeDeepArrayOrTuple<Destination, Source>
          : DefaultType
        : DefaultType
>;

type MergeDeepArrayOrTuple<
  Destination extends UnknownArrayOrTuple,
  Source extends UnknownArrayOrTuple,
> = Array<Exclude<Destination, undefined>[number] | Exclude<Source, undefined>[number]>;

type MergeDeepRecord<
  Destination extends UnknownRecord,
  Source extends UnknownRecord,
> = DoMergeDeepRecord<OmitIndexSignature<Destination>, OmitIndexSignature<Source>> &
  Merge<PickIndexSignature<Destination>, PickIndexSignature<Source>>;

type DoMergeDeepRecord<Destination extends UnknownRecord, Source extends UnknownRecord> =
  // Case in rule 1: The destination contains the key but the source doesn't.
  {
    [Key in keyof Destination as Key extends keyof Source ? never : Key]: Destination[Key];
  } & {
    // Case in rule 2: The source contains the key but the destination doesn't.
    [Key in keyof Source as Key extends keyof Destination ? never : Key]: Source[Key];
  } & {
    // Case in rule 3: Both the source and the destination contain the key.
    [Key in keyof Source as Key extends keyof Destination ? Key : never]: MergeDeepRecordProperty<
      Destination[Key],
      Source[Key]
    >;
  };
type SimpleMerge<Destination, Source> = {
  [Key in keyof Destination as Key extends keyof Source ? never : Key]: Destination[Key];
} & Source;

export type Merge<Destination, Source> = Simplify<
  SimpleMerge<PickIndexSignature<Destination>, PickIndexSignature<Source>> &
    SimpleMerge<OmitIndexSignature<Destination>, OmitIndexSignature<Source>>
>;
export type IfNever<T, TypeIfNever = true, TypeIfNotNever = false> =
  IsNever<T> extends true ? TypeIfNever : TypeIfNotNever;
export type IsNever<T> = [T] extends [never] ? true : false;

type MergeDeep<Destination, Source> = SimplifyDeepExcludeArray<
  [undefined] extends [Destination | Source]
    ? never
    : Destination extends UnknownRecord
      ? Source extends UnknownRecord
        ? MergeDeepRecord<Destination, Source>
        : never
      : Destination extends UnknownArrayOrTuple
        ? Source extends UnknownArrayOrTuple
          ? MergeDeepArrayOrTuple<Destination, Source>
          : never
        : never
>;
export type ConditionalKeys<Base, Condition> = {
  // Map through all the keys of the given base type.
  [Key in keyof Base]-?: Base[Key] extends Condition // Pick only keys with types extending the given `Condition` type.
    ? // Retain this key
      // If the value for the key extends never, only include it if `Condition` also extends never
      IfNever<Base[Key], IfNever<Condition, Key, never>, Key>
    : // Discard this key since the condition fails.
      never;
  // Convert the produced object into a union type of the keys which passed the conditional test.
}[keyof Base];

/** END FIXME: this is pulled from type-fest-v4. remove when we update package */

export type OptionsWithDefaultsDeep<Options, Defaults> =
  // FIXME: replace with MergeDeep<Options, Defaults> when type-fest is updated to v4+
  MergeDeep<Options, Defaults>;

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
  const Defaults extends DefaultsForDeep<Options>,
>(
  options: Options,
  defaults: Defaults,
): OptionsWithDefaultsDeep<Options, DefaultsForDeep<Options>> {
  const result = { ...options } as any;
  for (const key in defaults) {
    if (result[key] == null) {
      result[key] = (defaults as any)[key];
    }
  }
  return result as OptionsWithDefaultsDeep<Options, DefaultsForDeep<Options>>;
}
