import { Component, ElementRef, Input, ViewChild } from "@angular/core";

@Component({
  selector: "sm-app-onboarding-task",
  templateUrl: "./sm-onboarding-task.component.html",
  host: {
    class: "tw-max-w-max",
  },
})
export class SMOnboardingTaskComponent {
  @Input()
  completed = false;

  @Input()
  title: string;

  @Input()
  route: string | any[];

  @Input()
  description: string = "";

  @Input()
  externalLink: string = undefined;

  @Input()
  externalButton: string = undefined;

  @Input()
  onAction: (setComplete: boolean) => void;

  @Input()
  onCompleteButtonPress: () => void;

  private _open: boolean;
  @Input() get open(): boolean {
    return this._open ? true : null;
  }
  set open(value: boolean) {
    this._open = value;
  }

  @ViewChild("details") detailsElement!: ElementRef<HTMLDetailsElement>;

  onToggle(event: Event) {
    this.open = (event.target as HTMLDetailsElement).open;
  }

  onClick() {
    this.onAction(!this.completed);
    this.open = null;
  }

  navigateExternalLink() {
    if (this.onAction) {
      this.onAction(!this.completed);
    }
    window.open(this.externalLink, "_blank");
  }

  completeButtonPress() {
    this.onCompleteButtonPress();
    this.open = null;
  }
}
