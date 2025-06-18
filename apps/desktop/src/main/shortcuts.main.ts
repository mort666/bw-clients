/* eslint-disable no-console */

import { globalShortcut } from "electron";

import { Main } from "../main";
import { AutotypeService } from "../services/autotype.service";

export class ShortcutsMain {
  constructor(
    private main: Main,
    private autotypeService: AutotypeService,
  ) {}

  async init() {
    globalShortcut.register("CommandOrControl+Shift+L", async () => {
      console.log("Autofill shortcut triggered!");
      const focusedWindow = await this.autotypeService.getFocusedWindow();
      console.log(focusedWindow);
      // TODO: Look up cipher with focusedWindow.title
      const shouldAutofill = focusedWindow.title.indexOf("Notepad") > -1;
      if (shouldAutofill) {
        await this.autotypeService.performAutotype("testuser", "testpassword", true);
      }
    });

    globalShortcut.register("CommandOrControl+Shift+J", async () => {
      console.log("Autofill to window shortcut triggered!");

      const currentWindows = await this.autotypeService.getActiveWindows();
      let windowId: number = null;
      for (const w of currentWindows) {
        console.log(`Window ID: ${w.handle}, Title: ${w.title}`);
        if (w.title.indexOf("Notepad") > -1) {
          windowId = w.handle;
          break;
        }
      }

      if (windowId != null) {
        await this.autotypeService.setWindowForeground(windowId);
      }

      const focusedWindow = await this.autotypeService.getFocusedWindow();
      if (focusedWindow.handle === windowId) {
        await this.autotypeService.performAutotype("testuser", "testpassword", true);
      }
    });
  }

  destroy() {
    globalShortcut.unregisterAll();
  }
}
