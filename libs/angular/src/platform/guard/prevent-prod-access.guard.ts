import { inject } from "@angular/core";
import { CanMatchFn } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { PRODUCTION_REGIONS } from "@bitwarden/common/platform/services/default-environment.service";

// TODO: consider moving logic to service and also not showing when self hosted.
/**
 * Guard to prevent matching routes in production environments.
 * Allows for developer tooling that should only be accessible in non-production environments.
 */
export const preventProdAccessGuard: CanMatchFn = async (): Promise<boolean> => {
  const environmentService = inject(EnvironmentService);

  const environment = await firstValueFrom(environmentService.environment$);

  const region = environment.getRegion();

  const prodRegions = PRODUCTION_REGIONS.map((regionConfig) => regionConfig.key);

  if (prodRegions.includes(region)) {
    return false;
  }

  return true;
};
