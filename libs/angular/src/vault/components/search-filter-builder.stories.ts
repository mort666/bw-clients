import { Meta, moduleMetadata, StoryObj } from "@storybook/angular";
import { map, of } from "rxjs";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherType, FieldType } from "@bitwarden/common/vault/enums";
import {
  CustomFieldMetadata,
  VaultFilterMetadata,
  VaultFilterMetadataService,
} from "@bitwarden/common/vault/filtering/vault-filter-metadata.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { I18nMockService } from "@bitwarden/components";
// eslint-disable-next-line no-restricted-imports
import { SearchComponent } from "@bitwarden/components/src/search/search.component";

import { FilterBuilderComponent } from "./filter-builder.component";

export default {
  title: "Filter/In Search",
  component: SearchComponent,
  decorators: [
    moduleMetadata({
      imports: [FilterBuilderComponent],
      providers: [
        {
          provide: I18nService,
          useValue: new I18nMockService({
            search: "Search",
            multiSelectLoading: "Loading",
            multiSelectNotFound: "Not Found",
            multiSelectClearAll: "Clear All",
          }),
        },
        {
          provide: VaultFilterMetadataService,
          useValue: {
            collectMetadata: () => {
              return map<CipherView[], VaultFilterMetadata>((_ciphers) => {
                return {
                  vaults: new Map([
                    [null, 1],
                    ["1", 1],
                    ["2", 1],
                  ]),
                  folders: new Map([
                    ["1", 1],
                    ["2", 1],
                  ]),
                  collections: new Map([
                    ["1", 1],
                    ["2", 1],
                  ]),
                  itemTypes: new Map([
                    [CipherType.Login, 1],
                    [CipherType.Card, 1],
                    [CipherType.Identity, 1],
                    [CipherType.SecureNote, 1],
                    [CipherType.SshKey, 1],
                  ]),
                  customFields: new Map<CustomFieldMetadata, number>([
                    [{ name: "one", type: FieldType.Boolean, linkedType: null }, 1],
                    [{ name: "one", type: FieldType.Boolean, linkedType: null }, 1],
                    [{ name: "one", type: FieldType.Boolean, linkedType: null }, 1],
                  ]),
                  attachmentCount: 1,
                } satisfies VaultFilterMetadata;
              });
            },
          } satisfies VaultFilterMetadataService,
        },
      ],
    }),
  ],
} as Meta;

export const Default: StoryObj<SearchComponent & FilterBuilderComponent> = {
  render: (args) => ({
    props: args,
    template: /*html*/ `
      <bit-search [history]="history">
        <div filter class="tw-absolute tw-w-full tw-z-[1000] tw-float-left tw-m-0 tw-p-5 tw-bg-background tw-rounded-xl tw-border tw-border-solid tw-border-secondary-300">
          <app-filter-builder [ciphers]="ciphers"></app-filter-builder>
        </div>
      </bit-search>
      <p>Other content below</p>
    `,
  }),
  args: {
    ciphers: of([]),
    history: ["One", "Two"],
  },
};
