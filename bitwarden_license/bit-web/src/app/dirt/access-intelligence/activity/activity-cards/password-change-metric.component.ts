import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subject, switchMap, takeUntil, of, BehaviorSubject, combineLatest } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import {
  AllActivitiesService,
  ApplicationHealthReportDetailEnriched,
  SecurityTasksApiService,
  TaskMetrics,
} from "@bitwarden/bit-common/dirt/reports/risk-insights";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { OrganizationId } from "@bitwarden/common/types/guid";
import {
  ButtonModule,
  ProgressModule,
  ToastService,
  TypographyModule,
} from "@bitwarden/components";

import { DefaultAdminTaskService } from "../../../../vault/services/default-admin-task.service";
import { RenderMode } from "../../models/activity.models";
import { AccessIntelligenceSecurityTasksService } from "../../shared/security-tasks.service";

@Component({
  selector: "dirt-password-change-metric",
  imports: [CommonModule, TypographyModule, JslibModule, ProgressModule, ButtonModule],
  templateUrl: "./password-change-metric.component.html",
  providers: [AccessIntelligenceSecurityTasksService, DefaultAdminTaskService],
})
export class PasswordChangeMetricComponent implements OnInit {
  protected taskMetrics$ = new BehaviorSubject<TaskMetrics>({ totalTasks: 0, completedTasks: 0 });
  private completedTasks: number = 0;
  private totalTasks: number = 0;
  private allApplicationsDetails: ApplicationHealthReportDetailEnriched[] = [];

  atRiskAppsCount: number = 0;
  atRiskPasswordsCount: number = 0;
  private organizationId!: OrganizationId;
  private destroyRef = new Subject<void>();
  renderMode: RenderMode = "noCriticalApps";

  constructor(
    private activatedRoute: ActivatedRoute,
    private securityTasksApiService: SecurityTasksApiService,
    private allActivitiesService: AllActivitiesService,
    protected toastService: ToastService,
    protected i18nService: I18nService,
    protected accessIntelligenceSecurityTasksService: AccessIntelligenceSecurityTasksService,
  ) {}

  async ngOnInit(): Promise<void> {
    combineLatest([this.activatedRoute.paramMap, this.allActivitiesService.taskCreatedCount$])
      .pipe(
        switchMap(([params, _]) => {
          const orgId = params.get("organizationId");
          if (orgId) {
            this.organizationId = orgId as OrganizationId;
            return this.securityTasksApiService.getTaskMetrics(this.organizationId);
          }
          return of({ totalTasks: 0, completedTasks: 0 });
        }),
        takeUntil(this.destroyRef),
      )
      .subscribe((metrics) => {
        this.taskMetrics$.next(metrics);
      });

    combineLatest([
      this.taskMetrics$,
      this.allActivitiesService.reportSummary$,
      this.allActivitiesService.atRiskPasswordsCount$,
      this.allActivitiesService.allApplicationsDetails$,
    ])
      .pipe(takeUntil(this.destroyRef))
      .subscribe(([taskMetrics, summary, atRiskPasswordsCount, allApplicationsDetails]) => {
        this.atRiskAppsCount = summary.totalCriticalAtRiskApplicationCount;
        this.atRiskPasswordsCount = atRiskPasswordsCount;
        this.completedTasks = taskMetrics.completedTasks;
        this.totalTasks = taskMetrics.totalTasks;
        this.allApplicationsDetails = allApplicationsDetails;

        // No critical apps setup
        this.renderMode =
          summary.totalCriticalApplicationCount === 0 ? RenderMode.noCriticalApps : this.renderMode;

        // Critical apps setup with at-risk apps but no tasks
        this.renderMode =
          summary.totalCriticalApplicationCount > 0 &&
          summary.totalCriticalAtRiskApplicationCount >= 0 &&
          taskMetrics.totalTasks === 0
            ? RenderMode.criticalAppsWithAtRiskAppsAndNoTasks
            : this.renderMode;

        // Critical apps setup with at-risk apps and tasks
        this.renderMode =
          summary.totalAtRiskApplicationCount > 0 &&
          summary.totalCriticalAtRiskApplicationCount >= 0 &&
          taskMetrics.totalTasks > 0
            ? RenderMode.criticalAppsWithAtRiskAppsAndTasks
            : this.renderMode;

        this.allActivitiesService.setPasswordChangeProgressMetricHasProgressBar(
          this.renderMode === RenderMode.criticalAppsWithAtRiskAppsAndTasks,
        );
      });
  }

  get completedPercent(): number {
    if (this.totalTasks === 0) {
      return 0;
    }
    return Math.round((this.completedTasks / this.totalTasks) * 100);
  }

  get completedTasksCount(): number {
    switch (this.renderMode) {
      case RenderMode.noCriticalApps:
      case RenderMode.criticalAppsWithAtRiskAppsAndNoTasks:
        return 0;

      case RenderMode.criticalAppsWithAtRiskAppsAndTasks:
        return this.completedTasks;

      default:
        return 0;
    }
  }

  get totalTasksCount(): number {
    switch (this.renderMode) {
      case RenderMode.noCriticalApps:
        return 0;

      case RenderMode.criticalAppsWithAtRiskAppsAndNoTasks:
        return this.atRiskAppsCount;

      case RenderMode.criticalAppsWithAtRiskAppsAndTasks:
        return this.totalTasks;

      default:
        return 0;
    }
  }

  get canAssignTasks(): boolean {
    return this.atRiskAppsCount > this.totalTasks ? true : false;
  }

  get renderModes() {
    return RenderMode;
  }

  async assignTasks() {
    await this.accessIntelligenceSecurityTasksService.assignTasks(
      this.organizationId,
      this.allApplicationsDetails,
    );
  }
}
