import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { GoalieService } from '../../services/goalie.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { Analysis } from '../../shared/interfaces/analysis.interface';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './goalie-analysis.role-map';
import { GoalieAnalysisModal } from '../../shared/components/goalie-analysis-modal/goalie-analysis.modal';

@Component({
  selector: 'app-goalie-analysis',
  imports: [DataTableComponent, ButtonComponent, ComponentVisibilityByRoleDirective],
  templateUrl: './goalie-analysis.page.html',
  styleUrl: './goalie-analysis.page.scss',
})
export class GoalieAnalysisPage implements OnInit {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private analysisService = inject(AnalysisService);
  private goalieService = inject(GoalieService);
  private breadcrumbData = inject(BreadcrumbDataService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  goalieId = '';
  analyses = signal<Analysis[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'analysisBy', label: 'Analysis By', sortable: true, width: '150px' },
    { key: 'analysisText', label: 'Analysis', sortable: false, width: '400px' },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'time', label: 'Time', sortable: false, width: '100px' },
  ];

  tableActions: TableAction[] = [
    {
      label: 'Edit',
      action: 'edit',
      variant: 'secondary',
      icon: 'stylus',
      roleVisibilityName: 'edit-action',
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'danger',
      icon: 'delete',
      roleVisibilityName: 'delete-action',
    },
  ];

  ngOnInit(): void {
    this.goalieId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.goalieId) {
      this.loadData();
    }
  }

  onCreateAnalysis(): void {
    const dialogRef = this.dialog.open(GoalieAnalysisModal, {
      width: '600px',
      data: { isEditMode: false, preSelectedGoalieId: this.goalieId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAnalyses();
      }
    });
  }

  onTableAction(event: { action: string; item: Analysis }): void {
    switch (event.action) {
      case 'edit':
        this.onEditAnalysis(event.item);
        break;
      case 'delete':
        this.onDeleteAnalysis(event.item);
        break;
    }
  }

  private onEditAnalysis(analysis: Analysis): void {
    const dialogRef = this.dialog.open(GoalieAnalysisModal, {
      width: '600px',
      data: { analysis, isEditMode: true },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAnalyses();
      }
    });
  }

  private onDeleteAnalysis(analysis: Analysis): void {
    if (confirm('Are you sure you want to delete this analysis?')) {
      this.analysisService.deleteAnalysis(analysis.id).subscribe({
        next: () => this.loadAnalyses(),
        error: (error) => console.error('Failed to delete analysis:', error),
      });
    }
  }

  private loadData(): void {
    this.loading.set(true);
    const numericId = parseInt(this.goalieId, 10);

    forkJoin({
      goalie: this.goalieService.getGoalieById(this.goalieId),
      analyses: this.analysisService.getAnalyses('goalie', numericId),
    }).subscribe({
      next: ({ goalie, analyses }) => {
        if (goalie) {
          this.breadcrumbData.entityName.set(`${goalie.firstName} ${goalie.lastName}`);
        }
        this.analyses.set(analyses.analyses);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load data:', error);
        this.analyses.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadAnalyses(): void {
    this.loading.set(true);
    const numericId = parseInt(this.goalieId, 10);

    this.analysisService.getAnalyses('goalie', numericId).subscribe({
      next: (result) => {
        this.analyses.set(result.analyses);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load analyses:', error);
        this.analyses.set([]);
        this.loading.set(false);
      },
    });
  }
}
