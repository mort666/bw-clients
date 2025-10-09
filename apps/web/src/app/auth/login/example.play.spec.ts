import { test, expect } from "@playwright/test";

import { Play, SingleUserRecipe } from "@bitwarden/playwright-scenes";

test("has title", async ({ page }) => {
  await page.goto("");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Bitwarden/);
});

test("get started link", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  // Click the get started link.
  await page.getByRole("link", { name: "Get started" }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole("heading", { name: "Installation" })).toBeVisible();
});

test("login with password", async ({ page }) => {
  using _ = await Play.scene(new SingleUserRecipe({ email: "test@example.com" }), { noDown: true });
  await page.goto("");
});
