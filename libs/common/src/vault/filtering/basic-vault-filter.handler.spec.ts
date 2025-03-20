import { mock } from "jest-mock-extended";

import { BasicFilter, BasicVaultFilterHandler } from "./basic-vault-filter.handler";

describe("BasicVaultFilterHandler", () => {
  const sut = new BasicVaultFilterHandler(mock());

  describe("tryParse", () => {
    it("success", () => {
      const result = sut.tryParse(
        '(in:collection:"My Collection" OR in:collection:"Other Collection")',
      );

      if (!result.success) {
        fail("Result is expected to succeed");
      }

      expect(result.filter).toBe({});
    });
  });

  describe("toFilter", () => {
    const cases: { input: BasicFilter; output: string }[] = [
      {
        input: {
          vaults: [null, "org_vault"],
          collections: ["collection_one", "collection_two"],
          fields: ["one", "two"],
          types: ["Login", "Card"],
          folders: ["folder_one", "folder_two"],
        },
        output:
          '(in:my_vault OR in:org:"org_vault") AND (in:folder:"folder_one" OR in:folder:"folder_two") AND (in:collection:"collection_one" AND in:collection:"collection_two") AND (type:"Login" OR type:"Card") AND (field:"one" AND field:"two")',
      },
      {
        input: {
          vaults: [null],
          collections: [],
          fields: [],
          types: [],
          folders: [],
        },
        output: "(in:my_vault)",
      },
      {
        input: {
          vaults: [],
          collections: [],
          fields: ["Banking"],
          types: [],
          folders: [],
        },
        output: '(field:"Banking")',
      },
    ];

    it.each(cases)("translates basic filter to $output", ({ input, output }) => {
      const actualOutput = sut.toFilter(input);

      expect(actualOutput).toEqual(output);
    });
  });
});
