import { FormControl } from "@angular/forms";

import { OrganizationUserType } from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { ProductTierType } from "@bitwarden/common/billing/enums";

import {
  orgSeatLimitReachedValidator,
  isFixedSeatPlan,
  isDynamicSeatPlan,
} from "./org-seat-limit-reached.validator";

const orgFactory = (props: Partial<Organization> = {}) =>
  Object.assign(
    new Organization(),
    {
      id: "myOrgId",
      enabled: true,
      type: OrganizationUserType.Admin,
    },
    props,
  );

describe("orgSeatLimitReachedValidator", () => {
  const allOrganizationUserEmails = ["user1@example.com"];
  const dummyOrg: Organization = null;
  const dummyOccupiedSeatCount = 1;

  it("should return null when control value is empty", () => {
    const validatorFn = orgSeatLimitReachedValidator(
      dummyOrg,
      allOrganizationUserEmails,
      "You cannot invite more than 2 members without upgrading your plan.",
      dummyOccupiedSeatCount,
    );
    const control = new FormControl("");

    const result = validatorFn(control);

    expect(result).toBeNull();
  });

  it("should return null when control value is null", () => {
    const validatorFn = orgSeatLimitReachedValidator(
      dummyOrg,
      allOrganizationUserEmails,
      "You cannot invite more than 2 members without upgrading your plan.",
      dummyOccupiedSeatCount,
    );
    const control = new FormControl(null);

    const result = validatorFn(control);

    expect(result).toBeNull();
  });

  it("should return null when max seats are not exceeded on free plan", () => {
    const organization = orgFactory({
      productTierType: ProductTierType.Free,
      seats: 2,
    });

    const OccupiedSeatCount = 1;

    const validatorFn = orgSeatLimitReachedValidator(
      organization,
      allOrganizationUserEmails,
      "You cannot invite more than 2 members without upgrading your plan.",
      OccupiedSeatCount,
    );
    const control = new FormControl("user2@example.com");

    const result = validatorFn(control);

    expect(result).toBeNull();
  });

  it("should return null when max seats are not exceeded on teams starter plan", () => {
    const organization = orgFactory({
      productTierType: ProductTierType.TeamsStarter,
      seats: 10,
    });

    const occupiedSeatCount = 0;

    const validatorFn = orgSeatLimitReachedValidator(
      organization,
      allOrganizationUserEmails,
      "You cannot invite more than 10 members without upgrading your plan.",
      occupiedSeatCount,
    );

    const control = new FormControl(
      "user2@example.com," +
        "user3@example.com," +
        "user4@example.com," +
        "user5@example.com," +
        "user6@example.com," +
        "user7@example.com," +
        "user8@example.com," +
        "user9@example.com," +
        "user10@example.com",
    );

    const result = validatorFn(control);

    expect(result).toBeNull();
  });

  it("should return validation error when max seats are exceeded on free plan", () => {
    const organization = orgFactory({
      productTierType: ProductTierType.Free,
      seats: 2,
    });
    const errorMessage = "You cannot invite more than 2 members without upgrading your plan.";

    const occupiedSeatCount = 1;

    const validatorFn = orgSeatLimitReachedValidator(
      organization,
      allOrganizationUserEmails,
      "You cannot invite more than 2 members without upgrading your plan.",
      occupiedSeatCount,
    );
    const control = new FormControl("user2@example.com,user3@example.com");

    const result = validatorFn(control);

    expect(result).toStrictEqual({ seatLimitReached: { message: errorMessage } });
  });

  it("should return null when on dynamic seat plan", () => {
    const control = new FormControl("user2@example.com,user3@example.com");
    const organization = orgFactory({
      productTierType: ProductTierType.Enterprise,
      seats: 100,
    });

    const validatorFn = orgSeatLimitReachedValidator(
      organization,
      allOrganizationUserEmails,
      "Enterprise plan dummy error.",
      dummyOccupiedSeatCount,
    );

    const result = validatorFn(control);

    expect(result).toBeNull();
  });

  it("should only count unique input email addresses", () => {
    const control = new FormControl(
      "sameUser1@example.com,sameUser1@example.com,user2@example.com,user3@example.com",
    );
    const organization = orgFactory({
      productTierType: ProductTierType.Families,
      seats: 6,
    });

    const occupiedSeatCount = 3;
    const validatorFn = orgSeatLimitReachedValidator(
      organization,
      allOrganizationUserEmails,
      "Family plan dummy error.",
      occupiedSeatCount,
    );

    const result = validatorFn(control);

    expect(result).toBeNull();
  });
});

describe("isFixedSeatPlan", () => {
  test.each([
    [ProductTierType.Free, true],
    [ProductTierType.Families, true],
    [ProductTierType.TeamsStarter, true],
    [ProductTierType.Enterprise, false],
    [null, false],
    [undefined, false],
  ])("should return %s for %s", (input, expected) => {
    expect(isFixedSeatPlan(input as ProductTierType)).toBe(expected);
  });
});

describe("isDynamicSeatPlan", () => {
  test.each([
    [ProductTierType.Enterprise, true],
    [ProductTierType.Free, false],
    [ProductTierType.Families, false],
    [ProductTierType.TeamsStarter, false],
    [null, false],
    [undefined, false],
  ])("should return %s for %s", (input, expected) => {
    expect(isDynamicSeatPlan(input as ProductTierType)).toBe(expected);
  });
});
