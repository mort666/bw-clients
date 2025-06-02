export const StorageLocation = {
  Both: "both",
  Disk: "disk",
  Memory: "memory",
} as const;

export type StorageLocation = (typeof StorageLocation)[keyof typeof StorageLocation];

export const HtmlStorageLocation = {
  Local: "local",
  Memory: "memory",
  Session: "session",
} as const;

export type HtmlStorageLocation = (typeof HtmlStorageLocation)[keyof typeof HtmlStorageLocation];

export type StorageOptions = {
  storageLocation?: StorageLocation;
  useSecureStorageLocation?: boolean;
  userId?: string;
  htmlStorageLocation?: HtmlStorageLocation;
  keySuffix?: string;
};
