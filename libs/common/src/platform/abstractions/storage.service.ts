import { Observable } from "rxjs";

import { StorageOptions } from "../models/domain/storage-options";

export type StorageUpdateType = "save" | "remove";
export type StorageUpdate = {
  key: string;
  updateType: StorageUpdateType;
};

export interface ObservableStorageService {
  get$<T>(key: string): Observable<T>;
}

export abstract class AbstractStorageService {
  abstract get valuesRequireDeserialization(): boolean;
  abstract get<T>(key: string, options?: StorageOptions): Promise<T>;
  abstract has(key: string, options?: StorageOptions): Promise<boolean>;
  abstract save<T>(key: string, obj: T, options?: StorageOptions): Promise<void>;
  abstract remove(key: string, options?: StorageOptions): Promise<void>;
}
