import { test, expect } from "@playwright/test";

import { Play, SingleUserRecipe } from "@bitwarden/playwright-helpers";

test("login with password", async ({ page }) => {
  using scene = await Play.scene(new SingleUserRecipe({ email: "test@example.com" }));

  await page.goto("https://localhost:8080/#/login");
  await page.getByRole("textbox", { name: "Email address (required)" }).click();
  await page
    .getByRole("textbox", { name: "Email address (required)" })
    .fill(scene.mangle("test@example.com"));
  await page.getByRole("textbox", { name: "Email address (required)" }).press("Enter");
  await page.getByRole("textbox", { name: "Master password (required)" }).click();
  await page
    .getByRole("textbox", { name: "Master password (required)" })
    .fill(scene.mangle("asdfasdfasdf"));
  await page.getByRole("button", { name: "Log in with master password" }).click();
  await expect(page.getByRole("button", { name: "Add it later" })).toBeVisible();
  await page.getByRole("button", { name: "Add it later" }).click();
  await expect(page.locator("bit-simple-dialog")).toContainText(
    "You can't autofill passwords without the browser extension",
  );
  await page.getByRole("link", { name: "Skip to web app" }).click();
  await expect(page.locator("app-vault")).toContainText("There are no items to list. New item");
});
