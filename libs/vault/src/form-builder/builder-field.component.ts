import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { AbstractControl, FormControl, ReactiveFormsModule } from "@angular/forms";

import { FormFieldModule, IconButtonModule } from "@bitwarden/components";

import { FormConfig } from "./form-builder.component";

@Component({
  selector: "vault-field-text",
  template: `
    <bit-form-field>
      <bit-label>{{ config.label }}</bit-label>
      <input bitInput type="text" [formControl]="control" />
    </bit-form-field>
  `,
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldModule],
})
export class FieldTextComponent {
  @Input({ required: true }) config!: FormConfig;
  @Input({ required: true }) control!: FormControl<any>;

  constructor() {}
}

@Component({
  selector: "vault-field-password",
  template: `
    <bit-form-field>
      <bit-label>{{ config.label }}</bit-label>
      <input bitInput type="password" [formControl]="control" />
      <button type="button" bitIconButton bitSuffix bitPasswordInputToggle></button>
    </bit-form-field>
  `,
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldModule, IconButtonModule],
})
export class FieldPasswordComponent {
  @Input({ required: true }) config!: FormConfig;
  @Input({ required: true }) control!: FormControl<any>;

  constructor() {}
}

@Component({
  selector: "vault-builder-field",
  template: `<ng-container
    *ngComponentOutlet="getComponent(); inputs: { config: config, control: control }"
  />`,
  imports: [CommonModule],
  standalone: true,
})
export class BuilderFieldComponent {
  @Input({ required: true }) config!: FormConfig;
  @Input({ required: true }) control!: AbstractControl<any>;

  constructor() {}

  getComponent() {
    switch (this.config.control) {
      case "text":
        return FieldTextComponent;
      case "password":
        return FieldPasswordComponent;
      default:
        return null;
    }
  }
}
