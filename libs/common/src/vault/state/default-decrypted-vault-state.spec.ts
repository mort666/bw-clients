import { Subject } from "rxjs";

import { StateDefinition } from "@bitwarden/common/platform/state/state-definition";
import { UserId } from "@bitwarden/common/types/guid";
import { DecryptedVaultStateDefinition } from "@bitwarden/common/vault/state/decrypted-vault-state-definition";
import {
  VaultRecord,
  VaultStateDecryptor,
} from "@bitwarden/common/vault/state/decrypted-vault-state-types";
import { DefaultDecryptedVaultState } from "@bitwarden/common/vault/state/default-decrypted-vault-state";

import { FakeStateProvider, mockAccountServiceWith, subscribeTo } from "../../../spec";

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
  const fakeProvider = new FakeStateProvider(accountService);
  let keyDefinition: DecryptedVaultStateDefinition<TestInputType, TestViewType>;
  let encryptedInput$: Subject<VaultRecord<string, TestInputType>>;
  let sut: DefaultDecryptedVaultState<TestInputType, TestViewType>;

  beforeEach(() => {
    const mockDecryptor = jest.fn().mockImplementation(testDecryptor);

    encryptedInput$ = new Subject<VaultRecord<string, TestInputType>>();

    keyDefinition = new DecryptedVaultStateDefinition(TEST_STATE, "test_key", {
      decryptor: mockDecryptor,
      deserializer: (v) => v,
      clearOn: ["logout", "lock"],
    });

    sut = new DefaultDecryptedVaultState<TestInputType, TestViewType>(
      fakeProvider,
      encryptedInput$.asObservable(),
      keyDefinition,
    );
  });

  it("should create", () => {
    expect(sut).toBeTruthy();
  });

  it("should decrypt input without any previous decrypted state", async () => {
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
  });
});
