import { webServerBaseUrl } from "@playwright-config";

// First seed points at the seeder API proxy, second is the seed path of the SeedController
const seedApiUrl = new URL("/seed/seed/", webServerBaseUrl).toString();

export abstract class Recipe<TUp> {
  abstract template: string;
  private seedId?: string;

  get currentSeedId(): string {
    if (!this.seedId) {
      throw new Error("Recipe has not been seeded yet");
    }
    return this.seedId;
  }

  constructor(private upArgs: TUp) {}
  async up(): Promise<Record<string, string>> {
    const result = await recipeUp(this.template, this.upArgs);
    this.seedId = result.seedId;
    return result.result;
  }

  async down(): Promise<void> {
    if (!this.seedId) {
      return;
    }

    await recipeDown(this.seedId);
    this.seedId = undefined;
  }
}

async function recipeUp<TUp>(template: string, args: TUp): Promise<SeedResult> {
  const response = await fetch(seedApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template: template,
      arguments: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to seed recipe: ${response.statusText}`);
  }

  return (await response.json()) as SeedResult;
}

async function recipeDown(seedId: string): Promise<void> {
  const url = new URL(`${seedId}`, seedApiUrl).toString();
  const response = await fetch(url, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete recipe: ${response.statusText}`);
  }
}

export interface SeedResult {
  result: Record<string, string>;
  seedId: string;
}
