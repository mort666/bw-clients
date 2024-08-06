import { firstValueFrom } from "rxjs";

import { View } from "@bitwarden/common/models/view/view";
import { CIPHERS_DISK } from "@bitwarden/common/platform/state";
import { UserId } from "@bitwarden/common/types/guid";

import {
  FakeActiveUserState,
  FakeStateProvider,
  mockAccountServiceWith,
  subscribeTo,
} from "../../../spec";

import { DefaultVaultState, TrackedRecord, VaultStateKeyDefinition } from "./default-vault-state";

const SomeUser = "SomeUser" as UserId;
const accountService = mockAccountServiceWith(SomeUser);

type SomeData = { encString: string };
type SomeView = { decString: string } & View;

describe("DefaultVaultState", () => {
  let sut: DefaultVaultState<SomeData, SomeView>;
  let TEST_KEY: VaultStateKeyDefinition<SomeData, SomeView>;

  let fakeStateProvider: FakeStateProvider;
  let fakeEncryptedState: FakeActiveUserState<TrackedRecord<string, SomeData>>;

  beforeEach(() => {
    TEST_KEY = new VaultStateKeyDefinition<SomeData, SomeView>(CIPHERS_DISK, "test", {
      encryptedOptions: {
        deserializer: (jsonValue) => jsonValue as SomeData,
        clearOn: [],
      },
      decryptedOptions: {
        decryptor: (data) => ({ decString: data.encString.toUpperCase() }) as SomeView,
        deserializer: (serialized) => serialized as SomeView,
      },
    });
    fakeStateProvider = new FakeStateProvider(accountService);

    fakeEncryptedState = fakeStateProvider.activeUser.getFake(TEST_KEY.toEncryptedKeyDefinition());

    sut = new DefaultVaultState(fakeStateProvider, TEST_KEY);
  });

  it("should create", () => {
    expect(sut).toBeTruthy();
  });

  it("should start with an empty state", async () => {
    expect(await firstValueFrom(sut.encryptedState$)).toBeNull();
    expect(await firstValueFrom(sut.decryptedState$)).toBeNull();
  });

  it("should update the state", async () => {
    const tracker = subscribeTo(sut.encryptedState$);
    const promise = tracker.expectEmission();
    fakeEncryptedState.nextState([
      { someKey: { encString: "someValue" } },
      { lastModified: new Date(), modifiedKeys: ["someKey"] },
    ]);
    const data = await promise;
    expect(data).toEqual({ someKey: { encString: "someValue" } });
  });

  it("should update the decrypted state", async () => {
    const tracker = subscribeTo(sut.decryptedState$);

    sut["forceDecryptedSubject"].next({ originalKey: { decString: "ORIGINAL_VALUE" } });

    await sut.update({
      someKey: { encString: "some_Value" },
    });

    const data = await tracker.expectEmission();

    expect(data).toEqual({ someKey: { decString: "SOME_VALUE" } as SomeView });
  });
});
