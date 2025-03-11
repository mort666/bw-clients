export const Type = Object.freeze({
  TimeOfDayRange: "TimeOfDayRange",
  DayOfWeek: "DayOfWeek",
  DayOfYear: "DayOfYear",
  Threshold: "Threshold",
});

export const EvaluatorTypes = Object.freeze(Object.keys(Type) as ReadonlyArray<keyof typeof Type>);
