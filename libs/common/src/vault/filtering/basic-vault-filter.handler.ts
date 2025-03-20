import { LogService } from "../../platform/abstractions/log.service";
import { parseQuery } from "../search/parse";

export type BasicFilter = {
  vaults: string[];
  folders: string[];
  collections: string[];
  types: string[];
  fields: string[];
};

export class BasicVaultFilterHandler {
  constructor(private readonly logService: LogService) {}

  tryParse(rawFilter: string): { success: true; filter: BasicFilter } | { success: false } {
    // Parse into AST
    const ast = parseQuery(rawFilter, this.logService).ast;

    if (ast.type !== "search") {
      return { success: false };
    }

    return { success: false };
  }

  toFilter(basicFilter: BasicFilter) {
    const buildGroupAdvanced = (
      items: string[],
      selector: (item: string) => string,
      binaryOp: string,
    ) => {
      if (items == null || items.length === 0) {
        return null;
      }

      return `(${items.map(selector).join(` ${binaryOp} `)})`;
    };

    const buildGroup = (items: string[], preamble: string, binaryOp: string) => {
      // TODO: Maybe only quote item when there is containing whitespace so we create as "pretty" of a filter as possible
      return buildGroupAdvanced(items, (i) => `${preamble}:"${i}"`, binaryOp);
    };

    let filter = "";
    let addedItem = false;

    const vaultGroup = buildGroupAdvanced(
      basicFilter.vaults,
      (i) => {
        if (i == null) {
          return "in:my_vault";
        }

        return `in:org:"${i}"`;
      },
      "OR",
    );

    if (vaultGroup != null) {
      // vault is the first thing we might add, so no need to check if addedItem is already true
      addedItem = true;
      filter += vaultGroup;
    }

    const foldersGroup = buildGroup(basicFilter.folders, "in:folder", "OR");

    if (foldersGroup != null) {
      if (addedItem) {
        filter += " AND ";
      }
      addedItem = true;
      filter += foldersGroup;
    }

    const collectionsGroup = buildGroup(basicFilter.collections, "in:collection", "OR");
    if (collectionsGroup != null) {
      if (addedItem) {
        filter += " AND ";
      }
      addedItem = true;
      filter += collectionsGroup;
    }

    const typesGroup = buildGroup(basicFilter.types, "type", "OR");
    if (typesGroup != null) {
      if (addedItem) {
        filter += " AND ";
      }
      addedItem = true;
      filter += typesGroup;
    }

    const fieldsGroup = buildGroup(basicFilter.fields, "field", "AND");
    if (fieldsGroup != null) {
      if (addedItem) {
        filter += " AND ";
      }
      addedItem = true;
      filter += fieldsGroup;
    }

    return filter;
  }
}
