import * as fs from "fs";

import { Page, expect } from "@playwright/test";
import { webServerBaseUrl } from "@playwright-config";

import { Play, Scene, SingleUserRecipe } from "@bitwarden/playwright-helpers";

const hostname = new URL(webServerBaseUrl).hostname;
const dataDir = process.env.PLAYWRIGHT_DATA_DIR ?? "playwright-data";
// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

type AuthedUserData = {
  email: string;
  password: string;
  scene: Scene;
};

type AuthenticatedContext = {
  page: Page;
  scene: Scene;
};

/**
 * A map of already authenticated emails to their scenes.
 */
const AuthenticatedEmails = new Map<string, AuthedUserData>();

function dataFilePath(email: string): string {
  return `${dataDir}/auth-${email}.json`;
}
function sessionFilePath(email: string): string {
  return `${dataDir}/session-${email}.json`;
}

/**
 * Helper to ensure a user exists and is authenticated in playwright tests.
 */
export async function authenticateAs(
  page: Page,
  email: string,
  password: string,
): Promise<AuthenticatedContext> {
  // Return existing scene if already authenticated
  if (AuthenticatedEmails.has(email)) {
    if (AuthenticatedEmails.get(email)!.password !== password) {
      throw new Error(
        `Email ${email} is already authenticated with a different password (${AuthenticatedEmails.get(email)!.password})`,
      );
    }

    await page.context().storageState({ path: dataFilePath(email) });
    await loadSession(page, email);
    return {
      page,
      scene: AuthenticatedEmails.get(email)!.scene,
    };
  }

  return newAuthenticateAs(page, email, password);
}

async function newAuthenticateAs(
  page: Page,
  email: string,
  password: string,
): Promise<AuthenticatedContext> {
  using scene = await Play.scene(new SingleUserRecipe({ email }), {
    downAfterAll: true,
  });
  await page.goto("/#/login");

  await page.locator("#login_input_email").fill(scene.mangle("test@example.com"));
  await page.locator("#login_button_continue").click();

  await page.locator("#login_input_password").fill("asdfasdfasdf");
  await page.locator("#login_button_submit").click();

  await expect(page.getByRole("button", { name: "Add it later" })).toBeVisible();
  await page.getByRole("button", { name: "Add it later" }).click();
  await expect(page.locator("bit-simple-dialog")).toContainText(
    "You can't autofill passwords without the browser extension",
  );
  await page.getByRole("link", { name: "Skip to web app" }).click();
  await expect(page.locator("app-vault")).toContainText("There are no items to list. New item");

  // Store the scene for future use
  AuthenticatedEmails.set(email, { email, password, scene });

  // Save storage state to avoid logging in again
  await page.context().storageState({ path: dataFilePath(email) });
  await saveSession(page, email);

  return { page, scene };
}

async function saveSession(page: Page, email: string): Promise<void> {
  // Get session storage and store as env variable
  const json = await page.evaluate(() => JSON.stringify(sessionStorage));
  fs.writeFileSync("playwright/.auth/session.json", json, "utf-8");
}

async function loadSession(page: Page, email: string): Promise<void> {
  if (!fs.existsSync(sessionFilePath(email))) {
    throw new Error("No session file found");
  }
  // Set session storage in a new context
  const sessionStorage = JSON.parse(fs.readFileSync(sessionFilePath(email), "utf-8"));
  await page.addInitScript((storage) => {
    if (window.location.hostname === hostname) {
      for (const [key, value] of Object.entries(storage)) {
        window.sessionStorage.setItem(key, value as any);
      }
    }
  }, sessionStorage);
}
