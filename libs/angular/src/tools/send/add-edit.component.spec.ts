import { DatePreset, isDatePreset, asDatePreset, nameOfDatePreset } from "./add-edit.component";

describe("DatePreset utilities", () => {
  it("should validate all valid DatePreset values", () => {
    const validPresets: Array<any> = [
      DatePreset.OneHour,
      DatePreset.OneDay,
      DatePreset.TwoDays,
      DatePreset.ThreeDays,
      DatePreset.SevenDays,
      DatePreset.ThirtyDays,
      DatePreset.Custom,
      "never",
    ];
    validPresets.forEach((preset) => {
      expect(isDatePreset(preset)).toBe(true);
      expect(asDatePreset(preset)).toBe(preset);
      expect(nameOfDatePreset(preset)).toBeDefined();
    });
  });

  it("should reject invalid DatePreset values", () => {
    const invalidPresets: Array<any> = [5, -1, 999, null, undefined, "foo", {}, []];
    invalidPresets.forEach((preset) => {
      expect(isDatePreset(preset)).toBe(false);
      expect(asDatePreset(preset)).toBeUndefined();
      expect(nameOfDatePreset(preset)).toBeUndefined();
    });
  });

  it("should return correct names for valid presets", () => {
    expect(nameOfDatePreset(DatePreset.OneHour)).toBe("OneHour");
    expect(nameOfDatePreset(DatePreset.Custom)).toBe("Custom");
    expect(nameOfDatePreset("never")).toBe("Never");
  });
});
