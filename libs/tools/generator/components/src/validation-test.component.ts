import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";

import { FormFieldModule, InputModule } from "@bitwarden/components";

/** Minimal test case for validation not blocking `form.valueChanges`
 * @deprecated this type should not be used anywhere
 * */
@Component({
  selector: "tools-validation-test",
  templateUrl: "validation-test.component.html",
  standalone: true,
  imports: [FormFieldModule, InputModule, ReactiveFormsModule],
})
export class ValidationTestComponent implements OnInit, OnDestroy {
  constructor(private formBuilder: FormBuilder) {}

  protected form = this.formBuilder.group({
    someNumber: [null as number],
  });

  ngOnInit(): void {
    // dynamically configured validator
    this.form.get("someNumber").setValidators([Validators.max(10), Validators.min(4)]);

    // watch the form's values
    /* eslint no-console: 0 */
    this.form.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((v) => console.log(v));
  }

  private readonly destroyed$ = new Subject<void>();
  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
