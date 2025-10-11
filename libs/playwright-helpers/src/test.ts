import { test as base } from "@playwright/test";

import { AuthFixture } from "./fixtures/auth.fixture";

interface TestParams {
  auth: AuthFixture;
}

export const test = base.extend<TestParams>({
  auth: async ({ browserName }, use) => {
    const authedPage = new AuthFixture(browserName);
    await authedPage.init();

    await use(authedPage);

    await authedPage.close();
  },
});
