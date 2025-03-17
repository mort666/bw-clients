import { Meta, moduleMetadata, StoryObj } from "@storybook/angular";
import { map, of } from "rxjs";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import {
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
                  vaults: new Set([null, "1", "2"]),
                  folders: new Set(["1", "2"]),
                  collections: new Set(["1", "2"]),
                  itemTypes: new Set([
                    CipherType.Login,
                    CipherType.Card,
                    CipherType.Identity,
                    CipherType.SecureNote,
                    CipherType.SshKey,
                  ]),
                  fieldNames: new Set(["one", "two", "three"]),
                  anyHaveAttachment: true,
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
