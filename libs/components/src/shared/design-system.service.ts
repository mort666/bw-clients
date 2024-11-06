import { effect, Injectable, signal, WritableSignal } from "@angular/core";

/** Global config for the Bitwarden Design System */
@Injectable({ providedIn: "root" })
export class DesignSystemService {
  /**
   * When true, enables "compact mode".
   *
   * Component authors can hook into compact mode with the `bit-compact:` Tailwind variant.
   **/
  compactMode: WritableSignal<boolean> = signal(false);

  constructor() {
    effect(() => {
      this.compactMode()
        ? document.body.classList.add("tw-bit-compact")
        : document.body.classList.remove("tw-bit-compact");
    });
  }
}
