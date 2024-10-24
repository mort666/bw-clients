import { CommonModule } from "@angular/common";
import { Component, OnDestroy } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { switchMap } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { LogLevelType } from "@bitwarden/common/platform/enums/log-level-type.enum";
import { MessageSender } from "@bitwarden/common/platform/messaging";
import {
  ButtonModule,
  DialogModule,
  FormFieldModule,
  RadioButtonModule,
} from "@bitwarden/components";

@Component({
  templateUrl: "set-log-level.component.html",
  standalone: true,
  imports: [
    CommonModule,
    JslibModule,
    DialogModule,
    ButtonModule,
    FormFieldModule,
    RadioButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class SetLogLevelComponent implements OnDestroy {
  LogLevelType = LogLevelType;
  formObj = new FormGroup({
    radio: new FormControl(this.logService.logLevel),
  });

  constructor(
    readonly logService: LogService,
    private messageSender: MessageSender,
  ) {
    this.formObj.controls.radio.valueChanges
      .pipe(
        switchMap((level) => this.onLogLevelUpdated(level)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
  ngOnDestroy(): void {}

  async onLogLevelUpdated(level: LogLevelType) {
    await this.logService.updateLogLevel(level);
    this.messageSender.send("logLevelUpdated", { level });
  }
}
