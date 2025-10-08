import { Recipe } from "./recipe";

export class OrganizationWithUsersRecipe extends Recipe<{
  name: string;
  numUsers: number;
  domain: string;
}> {
  template: string = "OrganizationWithUsersRecipe";
}
