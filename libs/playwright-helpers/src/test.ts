import { test as base } from "@playwright/test";

import { AuthFixture } from "./fixtures/auth.fixture";

interface TestParams {
  auth: AuthFixture;
}

export const test = base.extend<TestParams>({
  auth: async ({ page }, use) => {
    const authedPage = new AuthFixture(page);
    await use(authedPage);
  },
});
