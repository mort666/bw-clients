import { ItemCreatedProgressEvent } from "./examples/example-achievements";
import { ItemCreatedProgress } from "./examples/example-validators";
import { mapProgressByName } from "./util";

describe("mapProgressByName", () => {
  it("creates a map containing a progress value", () => {
    const result = mapProgressByName([ItemCreatedProgressEvent]);

    expect(result.get(ItemCreatedProgress)).toEqual(ItemCreatedProgressEvent.achievement.value);
  });
});
