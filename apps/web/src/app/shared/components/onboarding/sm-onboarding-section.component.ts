import { Component, ContentChildren, ElementRef, Input, QueryList, ViewChild } from "@angular/core";

import { SMOnboardingTaskComponent } from "./sm-onboarding-task.component";

@Component({
  selector: "sm-app-onboarding-section",
  templateUrl: "./sm-onboarding-section.component.html",
})
export class SMOnboardingSectionComponent {
  @ContentChildren(SMOnboardingTaskComponent) tasks: QueryList<SMOnboardingTaskComponent>;
  @Input() title: string;

  private _open: boolean;
  @Input() get open(): boolean {
    return this._open ? true : null;
  }
  set open(value: boolean) {
    this._open = value;
  }

  @ViewChild("details") detailsElement!: ElementRef<HTMLDetailsElement>;

  protected get amountCompleted(): number {
    return this.tasks.filter((task) => task.completed).length;
  }

  protected get barWidth(): number {
    return this.tasks.length === 0 ? 0 : (this.amountCompleted / this.tasks.length) * 100;
  }

  protected get getCompletionPercentage(): string {
    if (this.tasks.length <= 0) {
      return "0";
    }

    return this.barWidth.toString();
  }

  onToggle(event: Event) {
    this.open = (event.target as HTMLDetailsElement).open;
  }
}
