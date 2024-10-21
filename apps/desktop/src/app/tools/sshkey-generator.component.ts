import { Component, EventEmitter, Output } from "@angular/core";

import { GeneratedCredential } from "@bitwarden/generator-core";

@Component({
  selector: "app-ssh-generator",
  templateUrl: "sshkey-generator.component.html",
})
export class SshKeyGeneratorDialogComponent {
  privateKey: GeneratedCredential;
  @Output() generated = new EventEmitter<GeneratedCredential>();

  onGenerated(privateKey: GeneratedCredential) {
    this.privateKey = privateKey;
  }

  onSave() {
    this.generated.emit(this.privateKey);
  }

  onCancel() {
    this.generated.emit(null);
  }
}
