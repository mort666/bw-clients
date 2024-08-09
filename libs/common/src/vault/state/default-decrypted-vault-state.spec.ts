import { ReplaySubject } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";
import { DecryptedVaultStateDefinition } from "@bitwarden/common/vault/state/decrypted-vault-state-definition";
import {
  VaultRecord,
  VaultStateDecryptor,
} from "@bitwarden/common/vault/state/decrypted-vault-state-types";
import { DefaultDecryptedVaultState } from "@bitwarden/common/vault/state/default-decrypted-vault-state";

import { FakeStateProvider, mockAccountServiceWith, subscribeTo } from "../../../spec";
// eslint-disable-next-line import/no-restricted-paths
import { StateDefinition } from "../../platform/state/state-definition";

const SomeUser = "some-user" as UserId;
const accountService = mockAccountServiceWith(SomeUser);

type TestInputType = { id: string; encValue: string };
type TestViewType = { id: string; value: string };

const TEST_STATE = new StateDefinition("test", "disk");

const testDecryptor: VaultStateDecryptor<TestInputType, TestViewType> = (input) =>
  Promise.resolve(
    input.map((i) => ({
      id: i.id,
      value: i.encValue.toUpperCase(),
    })),
  );

describe("DefaultDecryptedVaultState", () => {
  let fakeProvider: FakeStateProvider;
  let keyDefinition: DecryptedVaultStateDefinition<TestInputType, TestViewType>;
  let encryptedInput$: ReplaySubject<VaultRecord<string, TestInputType>>;
  let mockDecryptor: jest.Mock<ReturnType<typeof testDecryptor>, Parameters<typeof testDecryptor>>;

  beforeEach(() => {
    fakeProvider = new FakeStateProvider(accountService);
    mockDecryptor = jest.fn().mockImplementation(testDecryptor);

    encryptedInput$ = new ReplaySubject<VaultRecord<string, TestInputType>>(1);

    keyDefinition = new DecryptedVaultStateDefinition(TEST_STATE, "test_key", {
      decryptor: mockDecryptor,
      deserializer: (v) => v,
      clearOn: ["logout", "lock"],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("should create", () => {
    const sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
      fakeProvider,
      encryptedInput$.asObservable(),
      keyDefinition,
    );

    expect(sut).toBeTruthy();
  });

  it("should emit null when encrypted input is null", async () => {
    encryptedInput$.next(null);

    const sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
      fakeProvider,
      encryptedInput$.asObservable(),
      keyDefinition,
    );

    const tracked = subscribeTo(sut.state$);

    await tracked.pauseUntilReceived(1);

    expect(tracked.emissions.length).toEqual(1);
    expect(tracked.emissions[0]).toEqual(null);
  });

  it("should decrypt input without any previous decrypted state", async () => {
    const fakeState = fakeProvider.activeUser.mockFor(keyDefinition.key, null);
    const sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
      fakeProvider,
      encryptedInput$.asObservable(),
      keyDefinition,
    );

    const tracked = subscribeTo(sut.state$);

    encryptedInput$.next({
      "1": { id: "1", encValue: "a" },
      "2": { id: "2", encValue: "b" },
    });

    const decrypted = await tracked.expectEmission();

    expect(decrypted).toEqual({
      "1": { id: "1", value: "A" },
      "2": { id: "2", value: "B" },
    });

    // The decrypted value should be stored in the state
    expect(fakeState.nextMock).toHaveBeenCalledTimes(1);
    expect(fakeState.nextMock).toHaveBeenCalledWith([SomeUser, decrypted]);
  });

  it("should skip the new decrypted value if decrypted state emits during decryption", async () => {
    jest.useFakeTimers();
    const fakeState = fakeProvider.activeUser.mockFor(keyDefinition.key, {
      "1": { id: "1", value: "A" },
    });

    mockDecryptor.mockImplementation(async (input) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return await testDecryptor(input);
    });

    const sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
      fakeProvider,
      encryptedInput$.asObservable(),
      keyDefinition,
    );

    const tracked = subscribeTo(sut.state$);

    encryptedInput$.next({
      "1": { id: "1", encValue: "a" },
      "2": { id: "2", encValue: "b" },
    });

    // Advance time to mid-decryption
    await jest.advanceTimersByTimeAsync(50);
    expect(mockDecryptor).toHaveBeenCalledTimes(1);

    // Should have no emissions yet
    expect(tracked.emissions.length).toEqual(0);

    // Simulate the stored decrypted state being cleared from another context
    fakeState.nextState(null);

    // Advance time to finish the now outdated decryption
    await jest.advanceTimersByTimeAsync(50);

    expect(tracked.emissions.length).toEqual(1);
    expect(tracked.emissions[0]).toEqual(null);

    // No decrypted values should have been stored in the state
    expect(fakeState.nextMock).toHaveBeenCalledTimes(0);
  });

  it("should emit the latest decrypted value if the input emits multiple times during decryption", async () => {
    jest.useFakeTimers();

    const fakeState = fakeProvider.activeUser.mockFor(keyDefinition.key, null);
    mockDecryptor.mockImplementation(async (input) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return await testDecryptor(input);
    });

    const sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
      fakeProvider,
      encryptedInput$.asObservable(),
      keyDefinition,
    );

    const tracked = subscribeTo(sut.state$);

    encryptedInput$.next({
      "1": { id: "1", encValue: "a" },
    });

    // Advance time to mid-decryption
    await jest.advanceTimersByTimeAsync(50);
    expect(mockDecryptor).toHaveBeenCalledTimes(1);

    // Should have no emissions yet
    expect(tracked.emissions.length).toEqual(0);

    // Emit a new value during the first decryption
    encryptedInput$.next({
      "1": { id: "1", encValue: "a" },
      "2": { id: "2", encValue: "b" },
    });

    // Advance time to finish the first decryption
    await jest.advanceTimersByTimeAsync(50);
    expect(mockDecryptor).toHaveBeenCalledTimes(2);

    // Should have no emissions yet
    expect(tracked.emissions.length).toEqual(0);

    // Advance time to finish the second decryption
    await jest.advanceTimersByTimeAsync(50);

    // state$ should have emitted the latest decrypted value
    expect(tracked.emissions.length).toEqual(1);
    expect(tracked.emissions[0]).toEqual({
      "1": { id: "1", value: "A" },
      "2": { id: "2", value: "B" },
    });

    // Only the latest decrypted value should be stored in the state
    expect(fakeState.nextMock).toHaveBeenCalledTimes(1);
    expect(fakeState.nextMock).toHaveBeenCalledWith([SomeUser, tracked.emissions[0]]);
  });

  describe("partial updates", () => {
    it("should only decrypt field that pass the shouldUpdate check", async () => {
      const fakeState = fakeProvider.activeUser.mockFor(keyDefinition.key, {
        "1": { id: "1", value: "A" },
        "2": { id: "2", value: "B" },
      });

      // Mock shouldUpdate to only update field with id "1"
      const shouldUpdate = jest.fn().mockImplementation((next, prev) => next.id == "1");
      keyDefinition.options.shouldUpdate = shouldUpdate;

      const sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
        fakeProvider,
        encryptedInput$.asObservable(),
        keyDefinition,
      );

      const tracked = subscribeTo(sut.state$);

      // Emit a new encrypted value
      encryptedInput$.next({
        "1": { id: "1", encValue: "new_value" },
        "2": { id: "2", encValue: "b" },
      });

      const decrypted = await tracked.expectEmission();

      // Each record should have been checked against shouldUpdate
      expect(shouldUpdate).toHaveBeenCalledTimes(2);
      expect(shouldUpdate).toHaveBeenCalledWith(
        { id: "1", encValue: "new_value" },
        { id: "1", value: "A" },
      );
      expect(shouldUpdate).toHaveBeenCalledWith(
        { id: "2", encValue: "b" },
        { id: "2", value: "B" },
      );

      // Only the first record should have been decrypted
      expect(mockDecryptor).toHaveBeenCalledTimes(1);
      expect(mockDecryptor).toHaveBeenCalledWith([{ id: "1", encValue: "new_value" }]);

      // We should see the expected decrypted values emitted
      expect(decrypted).toEqual({
        "1": { id: "1", value: "NEW_VALUE" },
        "2": { id: "2", value: "B" },
      });

      // The decrypted value should be stored in the state
      expect(fakeState.nextMock).toHaveBeenCalledTimes(1);
      expect(fakeState.nextMock).toHaveBeenCalledWith([SomeUser, decrypted]);
    });

    it("should not update the state if no fields pass the shouldUpdate check", async () => {
      const fakeState = fakeProvider.activeUser.mockFor(keyDefinition.key, {
        "1": { id: "1", value: "A" },
        "2": { id: "2", value: "B" },
      });

      // Mock shouldUpdate to never update
      const shouldUpdate = jest.fn().mockImplementation(() => false);
      keyDefinition.options.shouldUpdate = shouldUpdate;

      const sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
        fakeProvider,
        encryptedInput$.asObservable(),
        keyDefinition,
      );

      const tracked = subscribeTo(sut.state$);

      // Re-emit the same encrypted input
      encryptedInput$.next({
        "1": { id: "1", encValue: "a" },
        "2": { id: "2", encValue: "b" },
      });

      const decrypted = await tracked.expectEmission();

      // Each record should have been checked against shouldUpdate
      expect(shouldUpdate).toHaveBeenCalledTimes(2);
      expect(shouldUpdate).toHaveBeenCalledWith(
        { id: "1", encValue: "a" },
        { id: "1", value: "A" },
      );
      expect(shouldUpdate).toHaveBeenCalledWith(
        { id: "2", encValue: "b" },
        { id: "2", value: "B" },
      );

      // No records should have been decrypted
      expect(mockDecryptor).toHaveBeenCalledTimes(0);

      // We should see the previous decrypted values emitted
      expect(decrypted).toEqual({
        "1": { id: "1", value: "A" },
        "2": { id: "2", value: "B" },
      });

      // The state should not have been updated
      expect(fakeState.nextMock).toHaveBeenCalledTimes(0);
    });
  });
});
