import { webServerBaseUrl } from "@playwright-config";

import { UsingRequired } from "@bitwarden/common/platform/misc/using-required";

import { Recipe } from "./recipes/recipe";

// First seed points at the seeder API proxy, second is the seed path of the SeedController
const seedApiUrl = new URL("/seed/seed/", webServerBaseUrl).toString();

class Scene implements UsingRequired {
  private inited = false;
  private _recipe?: Recipe<unknown>;
  private mangledMap = new Map<string, string>();

  constructor(private options: SceneOptions) {}

  private get recipe(): Recipe<unknown> {
    if (!this.inited) {
      throw new Error("Scene must be initialized before accessing recipe");
    }
    if (!this._recipe) {
      throw new Error("Scene was not properly initialized");
    }
    return this._recipe;
  }

  get seedId(): string {
    if (!this.inited) {
      throw new Error("Scene must be initialized before accessing seedId");
    }
    if (!this.recipe) {
      throw new Error("Scene was not properly initialized");
    }
    return this.recipe.currentSeedId;
  }

  [Symbol.dispose] = () => {
    if (!this.inited || this.options.noDown) {
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
    this._recipe = recipe;
    this.inited = true;

    const mangleMap = await recipe.up();

    this.mangledMap = new Map(Object.entries(mangleMap));
  }
}

export type SceneOptions = {
  //
  /**
   * If true, the scene will not be torn down when disposed.
   * Note: if you do not tear down the scene, you are responsible for cleaning up any side effects.
   *
   * @default false
   */
  noDown?: boolean;
};

const SCENE_OPTIONS_DEFAULTS: Readonly<SceneOptions> = Object.freeze({
  noDown: false,
});

export class Play {
  /**
   * Runs server-side recipes to create a test scene. Automatically destroys the scene when disposed.
   *
   * Scenes also expose a `mangle` method that can be used to mangle magic string in the same way the server reports them
   * back to avoid collisions. For example, if a recipe creates a user with the email `test@example.com`, you can call
   * `scene.mangle("test@example.com")` to get the actual email address of the user created in the scene.
   *
   * Example usage:
   * ```ts
   * import { Play, SingleUserRecipe } from "@bitwarden/playwright-scenes";
   *
   * test("my test", async ({ page }) => {
   *  using scene = await Play.scene(new SingleUserRecipe({ email: "
   *  expect(scene.mangle("my-id")).not.toBe("my-id");
   * });
   *
   * @param recipe The recipe to run to create the scene
   * @param options Options for the scene
   * @returns
   */
  static async scene<T extends Recipe<TUp>, TUp>(
    recipe: T,
    options: SceneOptions = {},
  ): Promise<Scene> {
    const scene = new Scene({ SCENE_OPTIONS_DEFAULTS, ...options });
    await scene.init(recipe);
    return scene;
  }

  static async DeleteAllScenes(): Promise<void> {
    const response = await fetch(seedApiUrl, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete recipes: ${response.statusText}`);
    }
  }
}
