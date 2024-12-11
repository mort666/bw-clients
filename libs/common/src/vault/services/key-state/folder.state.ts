import { Jsonify } from "type-fest";

import { FOLDER_DISK, FOLDER_MEMORY, UserKeyDefinition } from "../../../platform/state";
import { FolderData } from "../../models/data/folder.data";
import { FolderView } from "../../models/view/folder.view";

export const FOLDER_ENCRYPTED_FOLDERS = UserKeyDefinition.record<FolderData>(
  FOLDER_DISK,
  "folder",
  {
    deserializer: (obj: Jsonify<FolderData>) => FolderData.fromJSON(obj),
    clearOn: ["logout"],
    debug: {
      enableUpdateLogging: true,
      enableRetrievalLogging: true,
    },
  },
);

export const FOLDER_DECRYPTED_FOLDERS = new UserKeyDefinition<FolderView[]>(
  FOLDER_MEMORY,
  "folderViews",
  {
    deserializer: (obj: Jsonify<FolderView[]>) => obj?.map((f) => FolderView.fromJSON(f)) ?? [],
    clearOn: ["logout", "lock"],
    debug: {
      enableUpdateLogging: true,
      enableRetrievalLogging: true,
    },
  },
);
