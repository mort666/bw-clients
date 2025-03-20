import { map } from "rxjs";

import { CipherType } from "../enums";
import { CipherView } from "../models/view/cipher.view";

export type VaultFilterMetadata = {
  vaults: Map<string | null, number>;
  fieldNames: Map<string, number>;
  itemTypes: Map<CipherType, number>;
  folders: Map<string, number>;
  collections: Map<string, number>;
  attachmentCount: number;
};

export class VaultFilterMetadataService {
  collectMetadata() {
    const setOrIncrement = <T>(map: Map<T, number>, key: T) => {
      const entry = map.get(key);

      if (entry == undefined) {
        map.set(key, 1);
      } else {
        map.set(key, entry + 1);
      }
    };

    return map<CipherView[], VaultFilterMetadata>((ciphers) => {
      return ciphers.reduce<VaultFilterMetadata>(
        (metadata, cipher) => {
          // Track type
          setOrIncrement(metadata.itemTypes, cipher.type);

          // Track vault
          setOrIncrement(metadata.vaults, cipher.organizationId ?? null);

          // Track all field names
          if (cipher.fields != null) {
            for (const field of cipher.fields) {
              setOrIncrement(metadata.fieldNames, field.name);
            }
          }

          // Track all folder ids
          if (cipher.folderId != null) {
            setOrIncrement(metadata.folders, cipher.folderId);
          }

          // Track all collections
          if (cipher.collectionIds != null) {
            for (const collectionId of cipher.collectionIds) {
              setOrIncrement(metadata.collections, collectionId);
            }
          }

          // Track if any have an attachment
          if (cipher.attachments != null && cipher.attachments.length > 0) {
            metadata.attachmentCount = metadata.attachmentCount + cipher.attachments.length;
          }

          return metadata;
        },
        {
          vaults: new Map<string | null, number>(),
          fieldNames: new Map<string, number>(),
          itemTypes: new Map<CipherType, number>(),
          folders: new Map<string, number>(),
          collections: new Map<string, number>(),
          attachmentCount: 0,
        },
      );
    });
  }
}
