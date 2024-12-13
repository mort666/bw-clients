import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

import { HeaderModule } from "../../layouts/header/header.module";
import { WebLayoutModule } from "../../layouts/web-layout.module";
import { SharedModule } from "../../shared";

@Component({
  standalone: true,
  templateUrl: "files-layout.component.html",
  imports: [SharedModule, HeaderModule, WebLayoutModule, RouterModule],
})
export class FilesLayoutComponent {}
