import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { organizationPermissionsGuard } from "../../admin-console/organizations/guards/org-permissions.guard";

import { RiskInsightsComponent } from "./risk-insights.component";

const routes: Routes = [
  {
    path: "risk-insights",
    canActivate: [organizationPermissionsGuard((o) => o.useRiskInsights)],
    component: RiskInsightsComponent,
    data: {
      titleId: "RiskInsights",
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccessIntelligenceRoutingModule {}
