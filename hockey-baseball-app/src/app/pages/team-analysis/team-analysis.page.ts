import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { TeamService } from '../../services/team.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { Analysis } from '../../shared/interfaces/analysis.interface';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './team-analysis.role-map';
import { TeamAnalysisModal } from '../../shared/components/team-analysis-modal/team-analysis.modal';

@Component({
  selector: 'app-team-analysis',
  imports: [DataTableComponent, ButtonComponent, ComponentVisibilityByRoleDirective],
  templateUrl: './team-analysis.page.html',
  styleUrl: './team-analysis.page.scss',
})
export class TeamAnalysisPage implements OnInit {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private analysisService = inject(AnalysisService);
  private teamService = inject(TeamService);
  private breadcrumbData = inject(BreadcrumbDataService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  teamId = '';
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
    this.teamId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.teamId) {
      this.loadData();
    }
  }

  onCreateAnalysis(): void {
    const dialogRef = this.dialog.open(TeamAnalysisModal, {
      width: '600px',
      data: { isEditMode: false, preSelectedTeamId: this.teamId },
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
    const dialogRef = this.dialog.open(TeamAnalysisModal, {
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
    const numericId = parseInt(this.teamId, 10);

    forkJoin({
      team: this.teamService.getTeamById(this.teamId),
      analyses: this.analysisService.getAnalyses('team', numericId),
    }).subscribe({
      next: ({ team, analyses }) => {
        if (team) {
          this.breadcrumbData.entityName.set(team.name);
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
    const numericId = parseInt(this.teamId, 10);

    this.analysisService.getAnalyses('team', numericId).subscribe({
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
