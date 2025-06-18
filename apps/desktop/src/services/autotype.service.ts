import { ipcMain } from "electron";

import { autotype } from "@bitwarden/desktop-napi";

export class AutotypeService {
  constructor() {
    ipcMain.handle("autotype.getActiveWindows", async (event) => {
      return await this.getActiveWindows();
    });
    ipcMain.handle("autotype.getFocusedWindow", async (event) => {
      return await this.getFocusedWindow();
    });
    ipcMain.handle("autotype.setWindowForeground", async (event, handle: number) => {
      return await this.setWindowForeground(handle);
    });
    ipcMain.handle(
      "autotype.performAutotype",
      async (event, username: string, password: string, sendEnter: boolean) => {
        return await this.performAutotype(username, password, sendEnter);
      },
    );
  }

  async getActiveWindows() {
    return await autotype.getActiveWindows();
  }

  async getFocusedWindow() {
    return await autotype.getFocusedWindow();
  }

  async setWindowForeground(handle: number) {
    return await autotype.setWindowForeground(handle);
  }

  async performAutotype(username: string, password: string, sendEnter: boolean) {
    return await autotype.performAutotype(username, password, sendEnter);
  }
}
