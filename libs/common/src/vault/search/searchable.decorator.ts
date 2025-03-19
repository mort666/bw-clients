const searchableFields = Symbol("searchable");

/** The types of values that are searchable */
export enum SearchableValueType {
  String,
  Enum,
  Boolean,
}

/**
 * The union type representing expected return data for each kind of searchable value.
 * This is more complicated than a simple value because matchers for different types of values need
 * different data to perform the search.
 */
export type SearchableData = string | EnumSearchableData | BooleanSearchableData;

/** The packet of data used by the search logic to perform matching */
type SearchableGetter = {
  /** The search field */
  fieldName: string;
  /** The type of search to perform */
  type: SearchableValueType;
  /** A getter for the current value of this search field from a given instance */
  getter: (instance: unknown) => SearchableData;
};

type SearchableTypes = "string" | EnumMetadata | BooleanMetadata;

export interface Searchable {
  [searchableFields]: SearchableGetter[];
}

/** Guard function determining if an object contains Searchable fields */
export function isSearchable(x: unknown): x is Searchable {
  return typeof x === "object" && x !== null && searchableFields in x;
}

/**
 * Extract {@link SearchableGetter} array from a searchable object. This method recurses all properties to find any
 * searchable field in the tree.
 * @param target
 * @returns
 */
export function getSearchableFields(target: unknown): SearchableGetter[] {
  if (!isSearchable(target)) {
    throw new Error("Target is not searchable");
  }

  return recurseSearchableFields(target, (ancestor) => ancestor);
}

/**
 * Traverses an object and returns all searchable fields. Getters are updated to traverse the object in the same way.
 *
 * Arrays containing searchable objects are also traversed.
 *
 * @param target The target searchable object
 * @param traversal The breadcrumb traversal function to use to traverse an ancestor object to the current level.
 * @returns
 */
function recurseSearchableFields(
  target: Searchable,
  traversal: (ancestor: unknown) => unknown,
): SearchableGetter[] {
  const result = target[searchableFields].map((getterData) => ({
    ...getterData,
    getter: (ancestor: unknown) => getterData.getter(traversal(ancestor)),
  }));

  for (const [key, value] of Object.entries(target)) {
    const newTraversal = (ancestor: unknown) => (traversal(ancestor) as any)[key];

    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const arrayTraversal = (ancestor: unknown) => (newTraversal(ancestor) as any)[i];
        if (isSearchable(item)) {
          result.push(...recurseSearchableFields(item, arrayTraversal));
        }
      });
    } else if (isSearchable(value)) {
      result.push(...recurseSearchableFields(value, newTraversal));
    }
  }
  return result;
}

/**
 * The data needed to set up enum searching
 */
type EnumMetadata = {
  enum: { [name: string]: any };
};

function isEnumMetadata(type: unknown): type is EnumMetadata {
  return typeof type === "object" && type !== null && "enum" in type;
}

/**
 * The data needed to perform enum searching for a given field
 */
type EnumSearchableData = {
  type: SearchableValueType.Enum;
  enum: { [name: string]: any };
  value: any;
};

type BooleanMetadata = {
  boolean: boolean;
};

function isBooleanMetadata(type: unknown): type is BooleanMetadata {
  return typeof type === "object" && type !== null && "boolean" in type;
}

type BooleanSearchableData = {
  type: SearchableValueType.Boolean;
  boolean: boolean;
  value: boolean;
};

function getSearchableTypeValue(type: SearchableTypes): SearchableValueType {
  if (type === "string") {
    return SearchableValueType.String;
  }

  if (isEnumMetadata(type)) {
    return SearchableValueType.Enum;
  } else if (isBooleanMetadata(type)) {
    return SearchableValueType.Boolean;
  }

  throw new Error("Invalid searchable type");
}

export type SearchableOptions = {
  key?: string;
  strategy: SearchableTypes;
};

/**
 * Decorator indicating that a the decorated field or getter should be included in search results.
 *
 * Note: It is important that the strategy is set to the correct type. There is _no_ type validation to ensure this.
 * It is undefined behavior to set the strategy to a type that does not match the field or to use this decorator on a
 * type that it cannot process.
 *
 * @see {@link SearchableValueType} for the types of values that can be searched
 *
 * @param options.key Optional name of the searchable field. Defaults to the property name
 * @param options.strategy The type of searchable value. Defaults to string if no options are given
 */
export function searchable(options: SearchableOptions = { strategy: "string" }) {
  return (prototype: unknown, propertyKey: string) => {
    if (options.key == null) {
      options.key = propertyKey;
    }

    const target = prototype as Searchable & Record<string, any>;
    target[searchableFields] ??= [];

    const type = getSearchableTypeValue(options.strategy);

    const getter = (instance: unknown) => {
      const i = instance as Record<string, any>;
      switch (type) {
        case SearchableValueType.Enum: {
          return {
            type,
            enum: (options.strategy as EnumMetadata).enum,
            value: i[propertyKey],
          } as EnumSearchableData;
        }
        case SearchableValueType.String:
          return i[propertyKey];
        case SearchableValueType.Boolean: {
          return {
            type,
            boolean: (options.strategy as BooleanMetadata).boolean,
            value: i[propertyKey],
          } as BooleanSearchableData;
        }
        default:
          throw new Error("Invalid searchable type");
      }
    };

    target[searchableFields].push({
      fieldName: options.key,
      type,
      getter,
    });
  };
}
