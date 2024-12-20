// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { AbstractStorageService } from "../abstractions/storage.service";

export class MemoryStorageService extends AbstractStorageService {
  protected store = new Map<string, unknown>();

  get valuesRequireDeserialization(): boolean {
    return false;
  }

  get<T>(key: string): Promise<T> {
    if (this.store.has(key)) {
      const obj = this.store.get(key);
      return Promise.resolve(obj as T);
    }
    return Promise.resolve(null);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) != null;
  }

  save<T>(key: string, obj: T): Promise<void> {
    if (obj == null) {
      return this.remove(key);
    }
    // TODO: Remove once foreground/background contexts are separated in browser
    // Needed to ensure ownership of all memory by the context running the storage service
    const toStore = structuredClone(obj);
    this.store.set(key, toStore);
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}
