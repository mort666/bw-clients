import { map, merge, Observable, Subject, take } from "rxjs";

import {
  ActiveUserState,
  StateProvider,
  UserKeyDefinition,
} from "@bitwarden/common/platform/state";

type StateId = string;
type StateValue = any;

type DeltaState<TId, TValue> = [state: Record<TId, TValue>, delta: TId[]];

class TrackedState<TId, TValue> {
  private activeUserState: ActiveUserState<Record<TValue, TId>>;
  private deltaSubject$: Subject<DeltaState<TId, TValue>> = new Subject();

  /**
   * Emits a stream of data. Emits null if the user does not have specified state.
   * Never emits if there is no active user.
   */
  readonly state$: Observable<Record<TId, TValue>>;

  /**
   * Emits a stream of tuples, with the first element being the current state data and
   * the second element being the list of ids that have changed.
   */
  readonly deltaState$: Observable<DeltaState<TId, TValue>>;

  constructor(
    provider: StateProvider,
    private keyDefinition: UserKeyDefinition<Record<TId, TValue>>,
  ) {
    this.activeUserState = provider.getActive(keyDefinition);

    this.deltaState$ = merge(
      this.activeUserState.state$.pipe(
        take(1),
        map((state) => [state, Object.keys(state)]),
      ),
      this.deltaSubject$,
    ).pi;
  }

  upsert(values: Record<TId, TValue>): Promise<void> {
    const newState = await this.activeUserState.update((state) => {
      Object.entries(values).forEach(([id, value]) => {
        state[id] = value;
      });
      return state;
    });
    this.deltaSubject$.next([newState, Object.keys(values)]);
  }

  replace();

  delete(id: TId | TId[]);
}
