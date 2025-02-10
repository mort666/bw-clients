import { FormControl, FormGroup } from "@angular/forms";
import { Meta, StoryObj, componentWrapperDecorator, moduleMetadata } from "@storybook/angular";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { I18nMockService } from "@bitwarden/components";

import { FormBuilderComponent } from "./form-builder.component";

export default {
  title: "Vault/Form Builder",
  component: FormBuilderComponent,
  decorators: [
    moduleMetadata({
      imports: [FormBuilderComponent],
      providers: [
        {
          provide: I18nService,
          useValue: new I18nMockService({ toggleVisibility: "Toggle visibility" }),
        },
      ],
    }),
    componentWrapperDecorator((story) => `<div class="tw-bg-background-alt tw-p-3">${story}</div>`),
  ],
} as Meta;

type Story = StoryObj<FormBuilderComponent>;

export const Default: Story = {
  args: {
    config: [
      {
        label: "Login credentials",
        items: [
          {
            label: "Username",
            control: "text",
            property: "username",
          },
          {
            label: "Password",
            control: "password",
            property: "password",
          },
        ],
      },
    ],
    formGroup: new FormGroup({
      username: new FormControl("Example"),
      password: new FormControl("Secret"),
    }),
  },
  argTypes: {
    formGroup: { table: { disable: true } },
  },
};

export const Identity: Story = {
  args: {
    config: [
      {
        label: "Personal details",
        items: [
          // title: EncString;
          {
            label: "First name",
            control: "text",
            property: "firstName",
          },
          {
            label: "Middle name",
            control: "text",
            property: "middleName",
          },
          {
            label: "Last name",
            control: "text",
            property: "lastName",
          },
          {
            label: "Username",
            control: "text",
            property: "username",
          },
          {
            label: "Company",
            control: "text",
            property: "company",
          },
        ],
      },
      {
        label: "Identification",
        items: [
          {
            label: "Social Security number",
            control: "text",
            property: "ssn",
          },
          {
            label: "Passport number",
            control: "text",
            property: "passportNumber",
          },
          {
            label: "License number",
            control: "text",
            property: "licenseNumber",
          },
        ],
      },
      {
        label: "Contact info",
        items: [
          {
            label: "Email",
            control: "text",
            property: "email",
          },
          {
            label: "Phone",
            control: "text",
            property: "phone",
          },
        ],
      },
      {
        label: "Address",
        items: [
          {
            label: "Address 1",
            control: "text",
            property: "address1",
          },
          {
            label: "Address 2",
            control: "text",
            property: "address2",
          },
          {
            label: "Address 3",
            control: "text",
            property: "address3",
          },
          {
            label: "City / Town",
            control: "text",
            property: "city",
          },
          {
            label: "State / Province",
            control: "text",
            property: "state",
          },
          {
            label: "Zip / Postal code",
            control: "text",
            property: "postalCode",
          },
          {
            label: "Country",
            control: "text",
            property: "country",
          },
        ],
      },
    ],
    formGroup: new FormGroup({
      // Personal details
      firstName: new FormControl(""),
      middleName: new FormControl(""),
      lastName: new FormControl(""),
      username: new FormControl(""),
      company: new FormControl(""),
      // Identification
      ssn: new FormControl(""),
      passportNumber: new FormControl(""),
      licenseNumber: new FormControl(""),
      // Contact info
      email: new FormControl(""),
      phone: new FormControl(""),
      // Address
      address1: new FormControl(""),
      address2: new FormControl(""),
      address3: new FormControl(""),
      city: new FormControl(""),
      state: new FormControl(""),
      postalCode: new FormControl(""),
      country: new FormControl(""),
    }),
  },
  argTypes: {
    formGroup: { table: { disable: true } },
  },
};
