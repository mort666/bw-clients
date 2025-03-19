import { SearchableValueType, getSearchableFields, searchable } from "./searchable.decorator";

describe("Searchable Decorator", () => {
  it("adds a searchable string", () => {
    class TestClass {
      @searchable() property = "test";
    }
    const instance = new TestClass();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "property", type: SearchableValueType.String, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toBe("test");
  });

  it("adds a searchable enum", () => {
    enum TestEnum {
      Option1,
      Option2,
    }
    class TestClass {
      @searchable({ strategy: { enum: TestEnum } }) property = TestEnum.Option1;
    }
    const instance = new TestClass();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "property", type: SearchableValueType.Enum, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toEqual({
      type: SearchableValueType.Enum,
      enum: TestEnum,
      value: TestEnum.Option1,
    });
  });

  it("add a searchable getter", () => {
    class TestClass {
      @searchable() get property() {
        return "test";
      }
    }
    const instance = new TestClass();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "property", type: SearchableValueType.String, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toBe("test");
  });

  it("overrides the name of the searchable field", () => {
    class TestClass {
      @searchable({ key: "customName", strategy: "string" }) property = "test";
    }
    const instance = new TestClass();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "customName", type: SearchableValueType.String, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toBe("test");
  });

  it("adds all fields to the searchable fields", () => {
    class TestClass {
      @searchable() property1 = "test";
      @searchable({ key: "customName", strategy: "string" }) property2 = "test";
      @searchable({ strategy: { enum: { Option1: 1, Option2: 2 } } }) property3 = 1;
      @searchable() get property4() {
        return "test";
      }
    }
    const instance = new TestClass();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "property1", type: SearchableValueType.String, getter: expect.any(Function) },
      { fieldName: "customName", type: SearchableValueType.String, getter: expect.any(Function) },
      { fieldName: "property3", type: SearchableValueType.Enum, getter: expect.any(Function) },
      { fieldName: "property4", type: SearchableValueType.String, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toBe("test");
    expect(searchableFields[1].getter(instance)).toBe("test");
    expect(searchableFields[2].getter(instance)).toEqual({
      type: SearchableValueType.Enum,
      enum: { Option1: 1, Option2: 2 },
      value: 1,
    });
    expect(searchableFields[3].getter(instance)).toBe("test");
  });
});

describe("getSearchableFields", () => {
  it("returns the searchable fields", () => {
    class TestClass {
      @searchable() property1 = "test";
      @searchable() get property2() {
        return "test";
      }
    }
    const instance = new TestClass();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "property1", type: SearchableValueType.String, getter: expect.any(Function) },
      { fieldName: "property2", type: SearchableValueType.String, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toBe("test");
    expect(searchableFields[1].getter(instance)).toBe("test");
  });

  it("throws when a target class is not searchable", () => {
    class TestClass {
      property1 = "test";
    }
    const instance = new TestClass();
    expect(() => getSearchableFields(instance)).toThrow("Target is not searchable");
  });

  it("recurses to get searchable fields from properties", () => {
    class Inner {
      @searchable() innerString = "innerVal";
    }
    class Outer {
      @searchable() outerString = "outerVal";
      inner = new Inner();
    }

    const instance = new Outer();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "outerString", type: SearchableValueType.String, getter: expect.any(Function) },
      { fieldName: "innerString", type: SearchableValueType.String, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toBe("outerVal");
    expect(searchableFields[1].getter(instance)).toBe("innerVal");
  });

  it("recurses to get searchable fields from arrays", () => {
    class Inner {
      @searchable() innerString;
      constructor(innerVal?: string) {
        this.innerString = innerVal ?? "innerVal";
      }
    }
    class Outer {
      @searchable() outerString = "outerVal";
      innerArray: Inner[] = [new Inner(), new Inner("secondInnerVal")];
    }

    const instance = new Outer();
    const searchableFields = getSearchableFields(instance);
    expect(searchableFields).toEqual([
      { fieldName: "outerString", type: SearchableValueType.String, getter: expect.any(Function) },
      { fieldName: "innerString", type: SearchableValueType.String, getter: expect.any(Function) },
      { fieldName: "innerString", type: SearchableValueType.String, getter: expect.any(Function) },
    ]);
    expect(searchableFields[0].getter(instance)).toBe("outerVal");
    expect(searchableFields[1].getter(instance)).toBe("innerVal");
    expect(searchableFields[2].getter(instance)).toBe("secondInnerVal");
  });
});
