/**
 * Acts are Playwright setups that are intended to allow reuse across different tests.
 * They should have logic to ensure they are run only once per unique input.
 * They should also handle teardown of any resources they create.
 * Finally, they should return any data needed to interact with the setup.
 */

export * from "./authenticate-as";
