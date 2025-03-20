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

import { FilterBuilderComponent } from "./filter-builder.component";
import { BasicVaultFilterHandler } from "@bitwarden/common/vault/filtering/basic-vault-filter.handler";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { ConsoleLogService } from "@bitwarden/common/platform/services/console-log.service";

export default {
  title: "Filter/Filter Builder",
  component: FilterBuilderComponent,
  decorators: [
    moduleMetadata({
      imports: [],
      providers: [
        {
          provide: I18nService,
          useValue: new I18nMockService({
            search: "Search",
            multiSelectLoading: "Loading",
            multiSelectNotFound: "Not Found",
            multiSelectClearAll: "Clear All",
            removeItem: "Remove Item",
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
                  fieldNames: new Map([
                    ["one", 1],
                    ["two", 1],
                    ["three", 1],
                  ]),
                  attachmentCount: 1,
                } satisfies VaultFilterMetadata;
              });
            },
          } satisfies VaultFilterMetadataService,
        },
        {
          provide: BasicVaultFilterHandler,
          useClass: BasicVaultFilterHandler,
          deps: [LogService],
        },
        {
          provide: LogService,
          useValue: new ConsoleLogService(true),
        },
      ],
    }),
  ],
} as Meta;

type Story = StoryObj<FilterBuilderComponent>;

export const Default: Story = {
  render: (args) => ({
    props: args,
    template: /*html*/ `
      <app-filter-builder [ciphers]="ciphers" (searchFilterEvent)="searchFilterEvent($event)" (saveFilterEvent)="saveFilterEvent($event)"></app-filter-builder>

    `,
  }),
  args: {
    ciphers: of([]),
    searchFilterEvent: (d: any) => {
      console.log(d.raw);
    },
    saveFilterEvent: (s: string) => {
      alert(JSON.stringify(s));
    },
  },
};
