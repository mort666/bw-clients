import { firstValueFrom } from "rxjs";

import { CIPHERS_DISK } from "@bitwarden/common/platform/state";
import { TrackedRecords } from "@bitwarden/common/platform/state/deserialization-helpers";
import { UserId } from "@bitwarden/common/types/guid";
import {
  TrackedKeyDefinition,
  TrackedState,
} from "@bitwarden/common/vault/state/other-tracked-state";

import { FakeActiveUserState, FakeStateProvider, mockAccountServiceWith } from "../../../spec";

const SomeUser = "SomeUser" as UserId;
const accountService = mockAccountServiceWith(SomeUser);
type SomeType = { foo: boolean; bar: boolean };

const TRACKED_KEY = new TrackedKeyDefinition<SomeType>(CIPHERS_DISK, "ciphers_tracked", {
  deserializer: (jsonValue) => jsonValue as SomeType,
  clearOn: [],
});

describe("TrackedState", () => {
  let sut: TrackedState<SomeType>;

  let fakeStateProvider: FakeStateProvider;
  let fakeState: FakeActiveUserState<TrackedRecords<SomeType, string>>;

  beforeEach(() => {
    fakeStateProvider = new FakeStateProvider(accountService);
    fakeState = fakeStateProvider.activeUser.getFake(TRACKED_KEY.toKeyDefinition());
    sut = new TrackedState<SomeType, string>(fakeStateProvider, TRACKED_KEY);
  });

  it("should create", () => {
    expect(sut).toBeTruthy();
  });

  it("should have trackedState$", async () => {
    fakeState.nextState([{ "1": { foo: true, bar: false } }, ["1"]]);
    expect(await firstValueFrom(sut.trackedState$)).toEqual([
      { "1": { foo: true, bar: false } },
      ["1"],
    ]);
  });

  it("should upsert", async () => {
    fakeState.nextState([{ "2": { foo: false, bar: false } }, []]);
    await sut.upsert({ "1": { foo: true, bar: false } });
    expect(await firstValueFrom(sut.trackedState$)).toEqual([
      { "1": { foo: true, bar: false }, "2": { foo: false, bar: false } },
      ["1"],
    ]);
  });

  it("should replace", async () => {
    fakeState.nextState([{ "2": { foo: false, bar: false } }, []]);
    await sut.replace({ "1": { foo: true, bar: false } });
    expect(await firstValueFrom(sut.trackedState$)).toEqual([
      { "1": { foo: true, bar: false } },
      ["1"],
    ]);
  });

  it("should delete", async () => {
    fakeState.nextState([{ "1": { foo: true, bar: false } }, []]);
    await sut.delete("1");
    expect(await firstValueFrom(sut.trackedState$)).toEqual([{}, ["1"]]);
  });

  it("should update", async () => {});
});
