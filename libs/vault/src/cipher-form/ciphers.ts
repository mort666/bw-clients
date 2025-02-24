import { FormControl, FormGroup } from "@angular/forms";

import { CipherType } from "@bitwarden/common/vault/enums";

import { SectionConfig } from "../form-builder/form-builder.component";

export const CipherForms: Record<CipherType, SectionConfig[]> = {
  [CipherType.Identity]: [
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
  [CipherType.Login]: [],
  [CipherType.SecureNote]: [],
  [CipherType.Card]: [],
  [CipherType.SshKey]: [],
};

export function cipherFormToFormGroup(config: SectionConfig[]): FormGroup {
  const group = new FormGroup({});
  config.forEach((section) => {
    section.items.forEach((item) => {
      group.addControl(item.property, new FormControl(""));
    });
  });
  return group;
}
