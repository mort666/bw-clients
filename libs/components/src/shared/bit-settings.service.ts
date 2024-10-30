import { effect, Injectable, signal, WritableSignal } from "@angular/core";

/** Global settings for the Bitwarden Design System */
@Injectable({ providedIn: "root" })
export class BitSettingsService {
  compactMode: WritableSignal<boolean> = signal(false);

  constructor() {
    effect(() => {
      this.compactMode()
        ? document.body.classList.add("tw-bit-compact")
        : document.body.classList.remove("tw-bit-compact");
    });
  }
}
