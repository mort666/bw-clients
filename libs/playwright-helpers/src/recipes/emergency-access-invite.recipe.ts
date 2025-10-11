import { Recipe } from "./recipe";

export class EmergencyAccessInviteRecipe extends Recipe<{
  email: string;
}> {
  template: string = "EmergencyAccessInviteRecipe";
}
