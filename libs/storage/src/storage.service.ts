import { StorageOptions } from "./storage-options";

export abstract class StorageService {
  abstract get valuesRequireDeserialization(): boolean;
  abstract get<T>(key: string, options?: StorageOptions): Promise<T>;
  abstract has(key: string, options?: StorageOptions): Promise<boolean>;
  abstract save<T>(key: string, obj: T, options?: StorageOptions): Promise<void>;
  abstract remove(key: string, options?: StorageOptions): Promise<void>;
}
