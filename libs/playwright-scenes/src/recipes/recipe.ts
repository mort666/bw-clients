import * as playwrightConfig from "../../../../playwright.config";

const { webServer } = playwrightConfig.default as { webServer: { url: string } };

export abstract class Recipe<TUp> {
  abstract template: string;
  private seedId?: string;

  constructor(private upArgs: TUp) {}
  async up(): Promise<Record<string, string>> {
    const response = await fetch(`${webServer.url}/api/seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: this.template,
        arguments: this.upArgs,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to seed recipe: ${response.statusText}`);
    }

    const result = JSON.parse(await response.json()) as SeedResult;
    this.seedId = result.seedId;
    return result.mangleMap;
  }

  async down(): Promise<void> {
    const response = await fetch(`${webServer.url}/api/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: this.template,
        seedId: this.seedId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete recipe: ${response.statusText}`);
    }
  }
}

export interface SeedResult {
  mangleMap: Record<string, string>;
  seedId: string;
}
