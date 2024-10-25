import { Component } from "@angular/core";

import { ValidationTestComponent } from "@bitwarden/generator-components";

@Component({
  standalone: true,
  selector: "credential-generator",
  templateUrl: "credential-generator.component.html",
  imports: [ValidationTestComponent],
})
export class CredentialGeneratorComponent {}
