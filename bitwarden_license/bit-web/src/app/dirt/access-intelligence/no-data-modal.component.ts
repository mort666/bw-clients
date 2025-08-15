import { DialogRef, DIALOG_DATA } from "@angular/cdk/dialog";
import { Component, Inject } from "@angular/core";
import { Router } from "@angular/router";

import { ButtonModule } from "@bitwarden/components";

@Component({
  selector: "tools-no-data-modal",
  templateUrl: "./no-data-modal.component.html",
  standalone: true,
  imports: [ButtonModule],
})
export class NoDataModalComponent {
  constructor(
    public dialogRef: DialogRef<boolean>,
    @Inject(DIALOG_DATA) public data: any,
    private router: Router,
  ) {}

  async navigateToPolicy(): Promise<void> {
    // Check if we have the organizationId
    if (!this.data.organizationId) {
      return;
    }

    // Close the modal first
    this.dialogRef.close(true);

    // Add a small delay to ensure modal closes before navigation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Try to navigate using router first
    try {
      const result = await this.router.navigate([
        "/organizations",
        this.data.organizationId,
        "settings",
        "policies",
      ]);

      // If router navigation fails, use window.location as fallback
      if (!result) {
        window.location.href = `/#/organizations/${this.data.organizationId}/settings/policies`;
      }
    } catch {
      // Fallback to window.location if router navigation throws an error
      window.location.href = `/#/organizations/${this.data.organizationId}/settings/policies`;
    }
  }

  async runReport(): Promise<void> {
    // Close the modal first
    this.dialogRef.close(true);

    // Add a small delay to ensure modal closes before triggering the report
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger the report generation
    if (this.data.riskInsightsDataService) {
      this.data.riskInsightsDataService.triggerReport();
    }
  }
}
