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
    let filter = "";
    let addedItem = false;

    const addGroupAdvanced = (
      items: string[],
      selector: (item: string) => string,
      binaryOp: string,
    ) => {
      if (items == null || items.length === 0) {
        return;
      }

      const group = `(${items.map(selector).join(` ${binaryOp} `)})`;
      if (addedItem) {
        filter += " AND ";
      }
      addedItem = true;
      filter += group;
    };

    const addGroup = (items: string[], preamble: string, binaryOp: string) => {
      // TODO: Maybe only quote item when there is containing whitespace so we create as "pretty" of a filter as possible
      addGroupAdvanced(items, (i) => `${preamble}:"${i}"`, binaryOp);
    };

    addGroupAdvanced(
      basicFilter.vaults,
      (i) => (i == null ? "in:my_vault" : `in:org:"${i}"`),
      "OR",
    );
    addGroup(basicFilter.folders, "in:folder", "OR");
    addGroup(basicFilter.collections, "in:collection", "AND");
    addGroup(basicFilter.types, "type", "OR");
    addGroup(basicFilter.fields, "field", "AND");

    return filter;
  }
}
