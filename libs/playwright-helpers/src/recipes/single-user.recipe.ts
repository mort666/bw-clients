import { Recipe } from "./recipe";

export class SingleUserRecipe extends Recipe<{
  email: string;
  emailVerified?: boolean;
  premium?: boolean;
}> {
  template: string = "SingleUserRecipe";
}
