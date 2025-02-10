import { Component, Input, OnInit } from "@angular/core";
import { FormGroup, ReactiveFormsModule } from "@angular/forms";

import {
  CardComponent,
  FormFieldModule,
  SectionComponent,
  SectionHeaderComponent,
} from "@bitwarden/components";

import { BuilderFieldComponent } from "./builder-field.component";

export type SectionConfig = {
  label: string;
  items: FormConfig[];
};

export type FormConfig = {
  label: string;
  control: FormControlTypeType;
  property: string;
};

const FormControlType = {
  text: "text",
  password: "password",
  email: "email",
  number: "number",
} as const;

export type FormControlTypeType = (typeof FormControlType)[keyof typeof FormControlType];

@Component({
  selector: "vault-form-builder",
  templateUrl: "form-builder.component.html",
  imports: [
    ReactiveFormsModule,

    CardComponent,
    FormFieldModule,
    SectionComponent,
    SectionHeaderComponent,

    BuilderFieldComponent,
  ],
  standalone: true,
})
export class FormBuilderComponent implements OnInit {
  @Input({ required: true }) config!: SectionConfig[];
  @Input({ required: true }) formGroup!: FormGroup<any>;

  protected controlTypes = FormControlType;

  constructor() {}

  ngOnInit() {}
}
