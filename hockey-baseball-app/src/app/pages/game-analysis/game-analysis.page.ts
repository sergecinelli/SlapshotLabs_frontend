import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { Observable, forkJoin } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { ToastService } from '../../services/toast.service';
import { TeamService } from '../../services/team.service';
import { ScheduleService } from '../../services/schedule.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { Analysis } from '../../shared/interfaces/analysis.interface';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';
import { visibilityByRoleMap } from './game-analysis.role-map';
import {
  AnalysisModal,
  AnalysisModalData,
  AnalysisModalResult,
  GameOption,
} from '../../shared/components/analysis-modal/analysis.modal';
import { DisplayTextModal } from '../../shared/components/display-text-modal/display-text.modal';

@Component({
  selector: 'app-game-analysis',
  imports: [
    DataTableComponent,
    ButtonLoadingComponent,
    ComponentVisibilityByRoleDirective,
    BreadcrumbActionsDirective,
  ],
  templateUrl: './game-analysis.page.html',
  styleUrl: './game-analysis.page.scss',
})
export class GameAnalysisPage implements OnInit {
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private analysisService = inject(AnalysisService);
  private toast = inject(ToastService);
  private teamService = inject(TeamService);
  private scheduleService = inject(ScheduleService);
  private breadcrumbData = inject(BreadcrumbDataService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  gameId = '';
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
      roleVisibilityAuthorId: (item) => item['userId']?.toString() ?? '',
    },
  ];

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.gameId) {
      this.loadAnalytics();
      this.breadcrumbData.entityName.set(`Game #${this.gameId}`);
    }
  }

  onCreateAnalysis(): void {
    this.loadEntityOptionsAndOpenModal({ isEditMode: false });
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
    this.modalService.openModal(AnalysisModal, {
      name: analysis.title,
      icon: 'visibility',
      width: '100%',
      maxWidth: '900px',
      data: {
        mode: 'view',
        analysisType: 'game',
        analysis,
      } satisfies AnalysisModalData,
    });
  }

  private onEditAnalysis(analysis: Analysis): void {
    this.editingItemId.set(String(analysis.id));
    this.loadEntityOptionsAndOpenModal({ analysis, isEditMode: true });
  }

  private loadEntityOptionsAndOpenModal(data: { isEditMode: boolean; analysis?: Analysis }): void {
    if (!data.isEditMode) {
      this.isCreateLoading.set(true);
    }
    forkJoin({
      games: this.scheduleService.getGameList(),
      teams: this.teamService.getTeams(),
    }).subscribe({
      next: ({ games, teams }) => {
        this.isCreateLoading.set(false);
        this.editingItemId.set(null);
        const teamMap = new Map(teams.teams.map((t) => [Number(t.id), t.name]));
        const gameOptions: GameOption[] = games.map((g) => ({
          value: String(g.id),
          label: `${teamMap.get(g.away_team_id) ?? 'Unknown'} at ${teamMap.get(g.home_team_id) ?? 'Unknown'} - ${g.date ?? ''}`,
        }));
        this.openAnalysisModal(data, gameOptions);
      },
      error: (error) => {
        console.error('Failed to load games:', error);
        this.isCreateLoading.set(false);
        this.editingItemId.set(null);
      },
    });
  }

  private openAnalysisModal(
    data: { isEditMode: boolean; analysis?: Analysis },
    games: GameOption[],
  ): void {
    const modalData: AnalysisModalData = {
      mode: data.isEditMode ? 'edit' : 'create',
      analysisType: 'game',
      analysis: data.analysis,
      preSelectedEntityId: this.gameId,
      games,
    };

    this.modalService.openModal(AnalysisModal, {
      name: data.isEditMode ? 'Edit Game Analysis' : 'Create Game Analysis',
      icon: 'bar_chart',
      width: '100%',
      maxWidth: '900px',
      data: modalData,
      onCloseWithDataProcessing: (result: AnalysisModalResult) => {
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
    this.modalService.openModal(DisplayTextModal, {
      name: 'Delete Analysis',
      icon: 'report',
      data: {
        text: `Are you sure you want to delete the analysis <b>${analysis.title}</b>?`,
        buttonText: 'Delete',
        buttonIcon: 'delete',
        color: 'primary',
        colorSoft: 'primary_dark',
        withButtonLoading: true,
      },
      onCloseWithDataProcessing: () => {
        this.analysisService.deleteAnalysis(Number(analysis.id)).subscribe({
          next: () => {
            this.modalService.closeModal();
            this.loadAnalytics();
          },
          error: (error) => {
            console.error('Failed to delete analysis:', error);
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  private loadAnalytics(): void {
    this.loading.set(true);
    const numericId = parseInt(this.gameId, 10);

    this.analysisService.getAnalyses('game', numericId).subscribe({
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
