import { Observable } from "rxjs";

import {
  ActiveUserState,
  StateProvider,
  UserKeyDefinition,
  UserKeyDefinitionOptions,
} from "@bitwarden/common/platform/state";
import {
  trackedRecord,
  TrackedRecords,
} from "@bitwarden/common/platform/state/deserialization-helpers";
import { StateDefinition } from "@bitwarden/common/platform/state/state-definition";

export type TrackedKeyDefinitionOptions<TValue> = UserKeyDefinitionOptions<TValue>;

export class TrackedKeyDefinition<TValue, TKey extends string | number = string> {
  constructor(
    readonly stateDefinition: StateDefinition,
    readonly key: string,
    readonly options: TrackedKeyDefinitionOptions<TValue>,
  ) {}

  /**
   * Converts the tracked key definition to a state provider key definition
   */
  toKeyDefinition() {
    return new UserKeyDefinition<TrackedRecords<TValue, TKey>>(this.stateDefinition, this.key, {
      ...this.options,
      deserializer: trackedRecord<TValue, TKey>((v) => this.options.deserializer(v)),
    });
  }
}

export class TrackedState<TValue, TKey extends string | number = string> {
  private activeUserState: ActiveUserState<TrackedRecords<TValue, TKey>>;

  trackedState$: Observable<TrackedRecords<TValue, TKey>>;

  constructor(provider: StateProvider, keyDefinition: TrackedKeyDefinition<TValue, TKey>) {
    this.activeUserState = provider.getActive(keyDefinition.toKeyDefinition());
    this.trackedState$ = this.activeUserState.state$;
  }

  // Maybe go this route if we need dependency injection? But, other options are cleaner imo
  async update(configureState: (state: Record<TKey, TValue>) => [Record<TKey, TValue>, TKey[]]) {
    const [newState, changedKeys] = await this.activeUserState.update(([state]) => {
      return configureState(state);
    });
    return [newState, changedKeys];
  }

  async upsert(values: Record<TKey, TValue>) {
    await this.activeUserState.update((state) => {
      const [current] = state;
      Object.entries(values).forEach(([id, value]) => {
        current[id as TKey] = value as TValue;
      });
      return [current, Object.keys(values) as TKey[]];
    });
  }

  async replace(values: Record<TKey, TValue>) {
    await this.activeUserState.update((_) => {
      // Need a way to indicate that all values were replaced.
      // i.e. A derived state won't know to clear out old values
      return [values, Object.keys(values) as TKey[]];
    });
  }

  async delete(ids: TKey | TKey[]) {
    await this.activeUserState.update((state) => {
      const [current] = state;
      if (Array.isArray(ids)) {
        ids.forEach((i) => delete current[i]);
      } else {
        delete current[ids];
      }
      return [current, Array.isArray(ids) ? ids : [ids]];
    });
  }
}
