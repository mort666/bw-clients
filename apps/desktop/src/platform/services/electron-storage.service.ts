// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import * as fs from "fs";

import { ipcMain } from "electron";
import { Subject } from "rxjs";

import {
  AbstractStorageService,
  StorageUpdate,
} from "@bitwarden/common/platform/abstractions/storage.service";
import { NodeUtils } from "@bitwarden/node/node-utils";

// See: https://github.com/sindresorhus/electron-store/blob/main/index.d.ts
interface ElectronStoreOptions {
  defaults: unknown;
  name: string;
}

type ElectronStoreConstructor = new (options: ElectronStoreOptions) => ElectronStore;

// eslint-disable-next-line
const Store: ElectronStoreConstructor = require("electron-store");

interface ElectronStore {
  get: (key: string) => unknown;
  set: (key: string, obj: unknown) => void;
  delete: (key: string) => void;
}

interface BaseOptions<T extends string> {
  action: T;
  key: string;
}

interface SaveOptions extends BaseOptions<"save"> {
  obj: unknown;
}

type Options = BaseOptions<"get"> | BaseOptions<"has"> | SaveOptions | BaseOptions<"remove">;

export class ElectronStorageService implements AbstractStorageService {
  private store: ElectronStore;
  private updatesSubject = new Subject<StorageUpdate>();
  updates$;

  // In-memory copy of the data.json
  //
  // electron store and conf read the entire file per individual key accessed, which blocks the main
  // thread making in-memory store access slow, and causing a lot of file I/O.
  private fileCache: any = null;

  constructor(dir: string, defaults = {}) {
    if (!fs.existsSync(dir)) {
      NodeUtils.mkdirpSync(dir, "700");
    }
    const storeConfig: ElectronStoreOptions = {
      defaults: defaults,
      name: "data",
    };
    this.store = new Store(storeConfig);
    this.updates$ = this.updatesSubject.asObservable();
    this.fileCache = (this.store as any).store;

    ipcMain.handle("storageService", (event, options: Options) => {
      switch (options.action) {
        case "get":
          return this.get(options.key);
        case "has":
          return this.has(options.key);
        case "save":
          return this.save(options.key, options.obj);
        case "remove":
          return this.remove(options.key);
      }
    });
  }

  get valuesRequireDeserialization(): boolean {
    return true;
  }

  get<T>(key: string): Promise<T> {
    return Promise.resolve(this.fileCache[key]);
  }

  has(key: string): Promise<boolean> {
    return Promise.resolve(this.fileCache[key] !== undefined);
  }

  save(key: string, obj: unknown): Promise<void> {
    if (obj === undefined) {
      return this.remove(key);
    }

    if (obj instanceof Set) {
      obj = Array.from(obj);
    }

    this.fileCache[key] = obj;
    this.store.set(key, obj);

    this.updatesSubject.next({ key, updateType: "save" });
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    delete this.fileCache[key];
    this.store.delete(key);

    this.updatesSubject.next({ key, updateType: "remove" });
    return Promise.resolve();
  }
}
