import { test, expect } from "@playwright/test";

import { Play, SingleUserRecipe } from "@bitwarden/playwright-scenes";

test("login with password", async ({ page }) => {
  using scene = await Play.scene(new SingleUserRecipe({ email: "test@example.com" }));

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
});
