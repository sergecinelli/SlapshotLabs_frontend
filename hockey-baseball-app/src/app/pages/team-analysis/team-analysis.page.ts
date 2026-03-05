import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { Observable, forkJoin } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { TeamService } from '../../services/team.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { Analysis, AnalyticsApiIn } from '../../shared/interfaces/analysis.interface';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './team-analysis.role-map';
import { TeamAnalysisModal } from '../../shared/components/team-analysis-modal/team-analysis.modal';
import { AnalysisViewModal } from '../../shared/components/analysis-view-modal/analysis-view.modal';

@Component({
  selector: 'app-team-analysis',
  imports: [DataTableComponent, ButtonLoadingComponent, ComponentVisibilityByRoleDirective],
  templateUrl: './team-analysis.page.html',
  styleUrl: './team-analysis.page.scss',
})
export class TeamAnalysisPage implements OnInit {
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private analysisService = inject(AnalysisService);
  private toast = inject(ToastService);
  private teamService = inject(TeamService);
  private breadcrumbData = inject(BreadcrumbDataService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  teamId = '';
  analytics = signal<Analysis[]>([]);
  loading = signal(true);
  isCreateLoading = signal(false);
  editingItemId = signal<string | null>(null);

  tableColumns: TableColumn[] = [
    { key: 'title', label: 'Title', sortable: true, width: '200px' },
    { key: 'author', label: 'Author', sortable: true, width: '150px' },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'time', label: 'Time', sortable: false, width: '100px' },
    { key: 'analysis', label: 'Analysis', sortable: false, width: '250px' },
  ];

  tableActions: TableAction[] = [
    {
      label: 'View',
      action: 'view',
      variant: 'green',
      icon: 'visibility',
    },
    {
      label: 'Edit',
      action: 'edit',
      variant: 'orange',
      icon: 'stylus',
      roleVisibilityName: 'edit-action',
      isLoading: (item) => this.editingItemId() === String(item['id']),
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'red',
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
    this.loadEntityOptionsAndOpenModal({
      isEditMode: false,
      preSelectedTeamId: this.teamId,
    });
  }

  onTableAction(event: { action: string; item: Analysis }): void {
    switch (event.action) {
      case 'view':
        this.onViewAnalysis(event.item);
        break;
      case 'edit':
        this.onEditAnalysis(event.item);
        break;
      case 'delete':
        this.onDeleteAnalysis(event.item);
        break;
    }
  }

  private onViewAnalysis(analysis: Analysis): void {
    this.modalService.openModal(AnalysisViewModal, {
      name: analysis.title,
      icon: 'visibility',
      width: '100%',
      maxWidth: '900px',
      data: analysis,
    });
  }

  private onEditAnalysis(analysis: Analysis): void {
    this.editingItemId.set(String(analysis.id));
    this.loadEntityOptionsAndOpenModal({ analysis, isEditMode: true });
  }

  private loadEntityOptionsAndOpenModal(data: Record<string, unknown>): void {
    const isEdit = !!data['isEditMode'];
    if (!isEdit) {
      this.isCreateLoading.set(true);
    }
    this.teamService.getTeams().subscribe({
      next: (result) => {
        this.isCreateLoading.set(false);
        this.editingItemId.set(null);
        this.openAnalysisModal({ ...data, teams: result.teams });
      },
      error: (error) => {
        console.error('Failed to load teams:', error);
        this.isCreateLoading.set(false);
        this.editingItemId.set(null);
      },
    });
  }

  private openAnalysisModal(data: Record<string, unknown>): void {
    this.modalService.openModal(TeamAnalysisModal, {
      name: data['isEditMode'] ? 'Edit Analysis' : 'Create Analysis',
      icon: 'bar_chart',
      width: '600px',
      data,
      onCloseWithDataProcessing: (result: {
        isEditMode: boolean;
        analysisId?: string;
        apiData: AnalyticsApiIn;
      }) => {
        const apiCall: Observable<unknown> = result.isEditMode
          ? this.analysisService.updateAnalysis(Number(result.analysisId!), result.apiData)
          : this.analysisService.createAnalysis(result.apiData);
        apiCall.subscribe({
          next: () => {
            this.toast.show(
              result.isEditMode ? 'Analysis updated successfully' : 'Analysis created successfully',
              'success'
            );
            this.modalService.closeModal();
            this.loadAnalytics();
          },
          error: () => {
            this.toast.show(
              result.isEditMode ? 'Failed to update analysis' : 'Failed to create analysis',
              'error'
            );
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  private onDeleteAnalysis(analysis: Analysis): void {
    if (confirm('Are you sure you want to delete this analysis?')) {
      this.analysisService.deleteAnalysis(Number(analysis.id)).subscribe({
        next: () => this.loadAnalytics(),
        error: (error) => console.error('Failed to delete analysis:', error),
      });
    }
  }

  private loadData(): void {
    this.loading.set(true);
    const numericId = parseInt(this.teamId, 10);

    forkJoin({
      team: this.teamService.getTeamById(this.teamId),
      analytics: this.analysisService.getAnalyses('team', numericId),
    }).subscribe({
      next: ({ team, analytics }) => {
        if (team) {
          this.breadcrumbData.entityName.set(team.name);
        }
        this.analytics.set(analytics.analytics);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load data:', error);
        this.analytics.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadAnalytics(): void {
    this.loading.set(true);
    const numericId = parseInt(this.teamId, 10);

    this.analysisService.getAnalyses('team', numericId).subscribe({
      next: (result) => {
        this.analytics.set(result.analytics);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load analytics:', error);
        this.analytics.set([]);
        this.loading.set(false);
      },
    });
  }
}
