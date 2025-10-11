import * as fs from "fs";
import * as path from "path";

import { Page, test } from "@playwright/test";
import { webServerBaseUrl } from "@playwright-config";

import { Play, Scene, SingleUserRecipe } from "@bitwarden/playwright-helpers";

const hostname = new URL(webServerBaseUrl).hostname;
const dataDir = process.env.PLAYWRIGHT_DATA_DIR ?? "playwright-data";
// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function dataFilePath(email: string): string {
  return path.join(dataDir, `auth-${email}.json`);
}
function sessionFilePath(email: string): string {
  return path.join(dataDir, `session-${email}.json`);
}
function localFilePath(email: string): string {
  return path.join(dataDir, `local-${email}.json`);
}

type AuthedUserData = {
  email: string;
  password: string;
  scene: Scene;
};

type AuthenticatedContext = {
  /** The Playwright page we authenticated */
  page: Page;
  /** The Scene used to authenticate */
  scene: Scene;
};

/**
 * A map of already authenticated emails to their scenes.
 */
const AuthenticatedEmails = new Map<string, AuthedUserData>();

export class AuthFixture {
  constructor(private readonly page: Page) {}

  async authenticate(email: string, password: string): Promise<AuthenticatedContext> {
    if (AuthenticatedEmails.has(email)) {
      return await this.resumeSession(email, password);
    }

    // start a new session
    return await this.newSession(email, password);
  }

  async resumeSession(email: string, password: string): Promise<AuthenticatedContext> {
    await this.page.context().storageState({ path: dataFilePath(email) });

    if (AuthenticatedEmails.get(email)!.password !== password) {
      throw new Error(
        `Email ${email} is already authenticated with a different password (${
          AuthenticatedEmails.get(email)!.password
        })`,
      );
    }
    if (!fs.existsSync(sessionFilePath(email))) {
      throw new Error("No session file found");
    }

    // Load stored state and session into a new page
    await loadLocal(this.page, email);
    await loadSession(this.page, email);

    await this.page.goto("/#/");

    return {
      page: this.page,
      scene: AuthenticatedEmails.get(email)!.scene,
    };
  }

  async newSession(email: string, password: string): Promise<AuthenticatedContext> {
    using scene = await Play.scene(new SingleUserRecipe({ email }), {
      downAfterAll: true,
    });
    await this.page.goto("/#/login");

    await this.page
      .getByRole("textbox", { name: "Email address (required)" })
      .fill(scene.mangle("test@example.com"));
    await this.page.getByRole("textbox", { name: "Email address (required)" }).press("Enter");
    await this.page
      .getByRole("textbox", { name: "Master password (required)" })
      .fill(scene.mangle("asdfasdfasdf"));
    await this.page.getByRole("button", { name: "Log in with master password" }).click();
    await this.page.getByRole("button", { name: "Add it later" }).click();
    await this.page.getByRole("link", { name: "Skip to web app" }).click();

    // Store the scene for future use
    AuthenticatedEmails.set(email, { email, password, scene });

    // Save storage state to avoid logging in again
    await saveLocal(this.page, email);
    await saveSession(this.page, email);

    return { page: this.page, scene };
  }
}

async function saveSession(page: Page, email: string): Promise<void> {
  // Get session storage and store as env variable
  const json = await page.evaluate(() => JSON.stringify(sessionStorage));
  fs.writeFileSync(sessionFilePath(email), json, "utf-8");
}

async function loadSession(page: Page, email: string): Promise<void> {
  if (!fs.existsSync(sessionFilePath(email))) {
    throw new Error("No session file found");
  }
  // Set session storage in a new context
  const sessionStorage = JSON.parse(fs.readFileSync(sessionFilePath(email), "utf-8"));
  await page.addInitScript(
    ({ storage, hostname }) => {
      if (window.location.hostname === hostname) {
        for (const [key, value] of Object.entries(storage)) {
          window.sessionStorage.setItem(key, value as any);
        }
      }
    },
    { storage: sessionStorage, hostname: hostname },
  );
}

async function saveLocal(page: Page, email: string): Promise<void> {
  // Get session storage and store as env variable
  const json = await page.evaluate(() => JSON.stringify(localStorage));
  fs.writeFileSync(localFilePath(email), json, "utf-8");
}

async function loadLocal(page: Page, email: string): Promise<void> {
  if (!fs.existsSync(localFilePath(email))) {
    throw new Error("No local file found");
  }
  // Set session storage in a new context
  const localStorage = JSON.parse(fs.readFileSync(localFilePath(email), "utf-8"));
  await page.addInitScript(
    ({ storage, hostname }) => {
      if (window.location.hostname === hostname) {
        for (const [key, value] of Object.entries(storage)) {
          window.localStorage.setItem(key, value as any);
        }
      }
    },
    { storage: localStorage, hostname: hostname },
  );
}

test.afterAll(async () => {
  // clean up all the saved data files
  for (const email of AuthenticatedEmails.keys()) {
    const dataPath = dataFilePath(email);
    if (fs.existsSync(dataPath)) {
      fs.unlinkSync(dataPath);
    }
    const sessionPath = sessionFilePath(email);
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
    }
    const localPath = localFilePath(email);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
});
