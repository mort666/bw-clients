import { Component, EventEmitter, Output } from "@angular/core";

import { GeneratedCredential } from "@bitwarden/generator-core";

@Component({
  selector: "app-ssh-generator",
  templateUrl: "sshkey-generator.component.html",
})
export class SshKeyGeneratorDialogComponent {
  privateKey: string;
  @Output() generated = new EventEmitter<string>();

  onGenerated(privateKey: GeneratedCredential) {
    this.privateKey = privateKey.credential;
  }

  onSave() {
    this.generated.emit(this.privateKey);
  }

  onCancel() {
    this.generated.emit(null);
  }
}
