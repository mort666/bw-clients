import { NgModule } from "@angular/core";

import { ButtonModule } from "../button";

import { SearchComponent } from "./search.component";

@NgModule({
  imports: [SearchComponent, ButtonModule],
  exports: [SearchComponent],
})
export class SearchModule {}
