import { NgModule } from "@angular/core";

import { PricingCardComponent, CartSummaryComponent } from "@bitwarden/pricing";

import { HeaderModule } from "../../layouts/header/header.module";
import { BillingServicesModule } from "../services";
import { BillingSharedModule } from "../shared";

import { BillingHistoryViewComponent } from "./billing-history-view.component";
import { IndividualBillingRoutingModule } from "./individual-billing-routing.module";
import { PremiumVNextComponent } from "./premium/premium-vnext.component";
import { PremiumComponent } from "./premium/premium.component";
import { SubscriptionComponent } from "./subscription.component";
import { UserSubscriptionComponent } from "./user-subscription.component";

@NgModule({
  imports: [
    IndividualBillingRoutingModule,
    BillingSharedModule,
    BillingServicesModule,
    HeaderModule,
    PricingCardComponent,
    CartSummaryComponent,
  ],
  declarations: [
    SubscriptionComponent,
    BillingHistoryViewComponent,
    UserSubscriptionComponent,
    PremiumComponent,
    PremiumVNextComponent,
  ],
})
export class IndividualBillingModule {}
