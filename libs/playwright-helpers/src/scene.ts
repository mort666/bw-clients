import { test } from "@playwright/test";
import { webServerBaseUrl } from "@playwright-config";

import { UsingRequired } from "@bitwarden/common/platform/misc/using-required";

import { Recipe } from "./recipes/recipe";

// First seed points at the seeder API proxy, second is the seed path of the SeedController
const seedApiUrl = new URL("/seed/seed/", webServerBaseUrl).toString();

/**
 * A Scene contains logic to set up and tear down data for a test on the server.
 * It is created by running a Recipe, which contains the arguments the server requires to create the data.
 *
 * Scenes are `Disposable`, meaning they must be used with the `using` keyword and will be automatically torn down when disposed.
 * Options exist to modify this behavior.
 *
 * - {@link SceneOptions.noDown}: Useful for setting up data then using codegen to create tests that use the data. Remember to tear down the data manually.
 * - {@link SceneOptions.downAfterAll}: Useful for expensive setups that you want to share across all tests in a worker or for writing acts.
 */
export class Scene implements UsingRequired {
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

  /**
   * Chainable method to set the scene to not be torn down when disposed.
   * Note: if you do not tear down the scene, you are responsible for cleaning up any side effects.
   *
   * @returns The scene instance for chaining
   */
  noDown(): this {
    if (process.env.CI) {
      throw new Error("Cannot set noDown to true in CI environments");
    }

    seedIdsToTearDown.delete(this.seedId);
    seedIdsToWarnAbout.add(this.seedId);
    this.options.noDown = true;
    return this;
  }

  /** Chainable method to set the scene to not be torn down when disposed, but still torn down after all tests complete.
   *
   * @returns The scene instance for chaining
   */
  downAfterAll(): this {
    this.options.downAfterAll = true;
    return this;
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
    if (!this.inited || this.options.noDown || this.options.downAfterAll) {
      return;
    }

    if (!this.recipe) {
      throw new Error("Scene was not properly initialized");
    }

    // Fire off an unawaited promise to delete the side effects of the scene
    void this.recipe.down();
    seedIdsToTearDown.delete(this.seedId);
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
  /**
   * If true, the scene will not be torn down when disposed.
   * Note: if you do not tear down the scene, you are responsible for cleaning up any side effects.
   *
   * @default false
   */
  noDown?: boolean;
  /**
   * If true, this scene will be torn down after all tests complete, rather than when the scene is disposed.
   *
   * Note: after all, in this case, means after all tests _for the specific worker_ are complete. Parallelization
   * over multiple cores means that these will not be shared between workers, and each worker will tear down its own scenes.
   *
   * @default false
   */
  downAfterAll?: boolean;
};

const SCENE_OPTIONS_DEFAULTS: Readonly<SceneOptions> = Object.freeze({
  noDown: false,
  downAfterAll: false,
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
   * import { Play, SingleUserRecipe } from "@bitwarden/playwright-helpers";
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
    const opts = { ...SCENE_OPTIONS_DEFAULTS, ...options };
    if (opts.noDown && process.env.CI) {
      throw new Error("Cannot set noDown to true in CI environments");
    }
    const scene = new Scene(opts);
    await scene.init(recipe);
    if (!opts.noDown) {
      seedIdsToTearDown.add(scene.seedId);
    } else {
      seedIdsToWarnAbout.add(scene.seedId);
    }
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

const seedIdsToTearDown = new Set<string>();
const seedIdsToWarnAbout = new Set<string>();

// After all tests complete
test.afterAll(async () => {
  if (seedIdsToWarnAbout.size > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "Some scenes were not torn down. To tear them down manually run:\n",
      `curl -X DELETE -H 'Content-Type: application/json' -d '${JSON.stringify(Array.from(seedIdsToWarnAbout))}' ${new URL("batch", seedApiUrl).toString()}\n`,
    );
  }
  const response = await fetch(new URL("batch", seedApiUrl).toString(), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Array.from(seedIdsToTearDown)),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete recipes: ${response.statusText}`);
  }
});
