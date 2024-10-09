import { Directive, HostBinding, Input } from "@angular/core";

// Increments for each instance of this component
let nextId = 0;

@Directive({
  selector: "input[bitRange]",
  standalone: true,
})
export class BitRangeDirective {
  @HostBinding() @Input() id = `bit-range-${nextId++}`;

  // constructor(
  //   @Optional() @Self() private ngControl: NgControl,
  //   private elementRef: ElementRef<HTMLInputElement>,
  // ) {}
}
