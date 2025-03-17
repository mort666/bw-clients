import { firstValueFrom } from "rxjs";

import { StateProvider, UserKeyDefinition } from "../../platform/state";
import { UserId } from "../../types/guid";

/** Utility for spooling data to and from append-only storage. */
export class Spooler<T> {
  /** Instantiates a spooler
   *  @param state loads and stores the spool
   *  @param location where spooled records are stored
   *  @param userId user performing the spooling
   */
  constructor(
    private state: StateProvider,
    private location: UserKeyDefinition<T[]>,
    private userId: UserId,
  ) {}

  private buffer = new Array<T>();

  /** Append a value to append-only storage */
  async spool(value: T) {
    // TODO: encrypt spooled records? Or should that be done by the calling code?
    //       either way, the value pushed to `this.buffer` should be ready-to-spool.
    this.buffer.push(value);

    await this.state.setUserState(this.location, this.buffer, this.userId);
  }

  /** Read all values from append-only storage  */
  async read(): Promise<T[]> {
    // TODO: decrypt spooled records? Or should that be done by the calling code?
    return await firstValueFrom(this.state.getUserState$(this.location, this.userId));
  }

  /** Read all values from append-only storage  */
  async unspool(): Promise<T[]> {
    const results = await this.read();
    await this.clear();
    return results;
  }

  /** Erase append-only storage  */
  async clear() {
    await this.state.setUserState(this.location, null, this.userId);
  }
}
