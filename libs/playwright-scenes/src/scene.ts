import { expect } from "@playwright/test";

import { UsingRequired } from "@bitwarden/common/platform/misc/using-required";

import { OrganizationWithUsersRecipe } from "./recipes/organization-with-users.recipe";
import { Recipe } from "./recipes/recipe";

export class Scene implements UsingRequired {
  private inited = false;
  private recipe?: Recipe<unknown>;
  private mangledMap = new Map<string, string>();

  [Symbol.dispose] = () => {
    if (!this.inited) {
      return;
    }

    if (!this.recipe) {
      throw new Error("Scene was not properly initialized");
    }

    // Fire off an unawaited promise to delete the side effects of the scene
    void this.recipe.down();
  };

  mangle(id: string): string {
    if (!this.inited) {
      throw new Error("Scene must be initialized before mangling ids");
    }

    return this.mangledMap.get(id) ?? id;
  }

  async init<T extends Recipe<TUp>, TUp>(recipe: T): Promise<void> {
    if (this.inited) {
      throw new Error("Scene has already been initialized");
    }
    this.recipe = recipe;
    this.inited = true;

    const response = await recipe.up();

    this.mangledMap = new Map(Object.entries(response.mangleMap));
  }
}

export class Play {
  static async scene<T extends Recipe<TUp>, TUp>(recipe: T): Promise<Scene> {
    const scene = new Scene();
    await scene.init(recipe);
    return scene;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- example usage of the framework
async function test() {
  // example usage
  const recipe = new OrganizationWithUsersRecipe({
    name: "My Org",
    numUsers: 3,
    domain: "example.com",
  });
  using scene = await Play.scene(recipe);

  expect(scene.mangle("my-id")).toBe("my-id");
}
