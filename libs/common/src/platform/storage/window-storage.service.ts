// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { concat, filter, map, Observable, of, Subject } from "rxjs";

import {
  AbstractStorageService,
  ObservableStorageService,
  StorageUpdate,
} from "../abstractions/storage.service";
import { StorageOptions } from "../models/domain/storage-options";

export class WindowStorageService implements AbstractStorageService, ObservableStorageService {
  private readonly updatesSubject = new Subject<StorageUpdate & { value: unknown }>();

  constructor(private readonly storage: Storage) {}

  get valuesRequireDeserialization(): boolean {
    return true;
  }

  get$<T>(key: string): Observable<T> {
    return concat(
      of(this.getValue(key)),
      this.updatesSubject.pipe(
        filter((update) => update.key === key),
        map((update) => update.value as T),
      ),
    );
  }

  private getValue<T>(key: string) {
    const jsonValue = this.storage.getItem(key);
    if (jsonValue != null) {
      return JSON.parse(jsonValue) as T;
    }

    return null;
  }

  get<T>(key: string, options?: StorageOptions): Promise<T> {
    return Promise.resolve(this.getValue(key));
  }

  async has(key: string, options?: StorageOptions): Promise<boolean> {
    return (await this.get(key, options)) != null;
  }

  save<T>(key: string, obj: T, options?: StorageOptions): Promise<void> {
    if (obj == null) {
      return this.remove(key, options);
    }

    if (obj instanceof Set) {
      obj = Array.from(obj) as T;
    }

    this.storage.setItem(key, JSON.stringify(obj));
    this.updatesSubject.next({ key, updateType: "save", value: obj });
  }

  remove(key: string, options?: StorageOptions): Promise<void> {
    this.storage.removeItem(key);
    this.updatesSubject.next({ key, updateType: "remove", value: null });
    return Promise.resolve();
  }

  getKeys(): string[] {
    return Object.keys(this.storage);
  }
}
