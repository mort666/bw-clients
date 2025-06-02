import { Observable } from "rxjs";

export type StorageUpdateType = "save" | "remove";

export type StorageUpdate = {
  key: string;
  updateType: StorageUpdateType;
};

export interface ObservableStorageService {
  /**
   * Provides an {@link Observable} that represents a stream of updates that
   * have happened in this storage service or in the storage this service provides
   * an interface to.
   */
  get updates$(): Observable<StorageUpdate>;
}
