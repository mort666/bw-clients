import { Recipe } from "./recipe";

export class SingleUserRecipe extends Recipe<{
  email: string;
}> {
  template: string = "SingleUserRecipe";
}
