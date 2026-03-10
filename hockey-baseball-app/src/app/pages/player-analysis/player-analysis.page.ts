import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { Observable, forkJoin } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { PlayerService } from '../../services/player.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { Analysis } from '../../shared/interfaces/analysis.interface';
import { Player } from '../../shared/interfaces/player.interface';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';
import { visibilityByRoleMap } from './player-analysis.role-map';
import {
  AnalysisModal,
  AnalysisModalData,
  AnalysisModalResult,
} from '../../shared/components/analysis-modal/analysis.modal';
import { DisplayTextModal } from '../../shared/components/display-text-modal/display-text.modal';

@Component({
  selector: 'app-player-analysis',
  imports: [
    DataTableComponent,
    ButtonLoadingComponent,
    ComponentVisibilityByRoleDirective,
    BreadcrumbActionsDirective,
  ],
  templateUrl: './player-analysis.page.html',
  styleUrl: './player-analysis.page.scss',
})
export class PlayerAnalysisPage implements OnInit {
  private route = inject(ActivatedRoute);
  private modalService = inject(ModalService);
  private analysisService = inject(AnalysisService);
  private toast = inject(ToastService);
  private playerService = inject(PlayerService);
  private breadcrumbData = inject(BreadcrumbDataService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  playerId = '';
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
    this.playerId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.playerId) {
      this.loadData();
    }
  }

  onCreateAnalysis(): void {
    this.loadEntityOptionsAndOpenModal({ isEditMode: false });
  }

  private loadEntityOptionsAndOpenModal(data: { isEditMode: boolean; analysis?: Analysis }): void {
    if (!data.isEditMode) {
      this.isCreateLoading.set(true);
    }
    this.playerService.getPlayers().subscribe({
      next: (result) => {
        this.isCreateLoading.set(false);
        this.editingItemId.set(null);
        this.openAnalysisModal(data, result.players);
      },
      error: (error) => {
        console.error('Failed to load players:', error);
        this.isCreateLoading.set(false);
        this.editingItemId.set(null);
      },
    });
  }

  private openAnalysisModal(
    data: { isEditMode: boolean; analysis?: Analysis },
    players: Player[],
  ): void {
    const modalData: AnalysisModalData = {
      mode: data.isEditMode ? 'edit' : 'create',
      analysisType: 'player',
      analysis: data.analysis,
      preSelectedEntityId: this.playerId,
      players,
    };

    this.modalService.openModal(AnalysisModal, {
      name: data.isEditMode ? 'Edit Player Analysis' : 'Create Player Analysis',
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
        analysisType: 'player',
        analysis,
      } satisfies AnalysisModalData,
    });
  }

  private onEditAnalysis(analysis: Analysis): void {
    this.editingItemId.set(String(analysis.id));
    this.loadEntityOptionsAndOpenModal({ analysis, isEditMode: true });
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

  private loadData(): void {
    this.loading.set(true);
    const numericId = parseInt(this.playerId, 10);

    forkJoin({
      player: this.playerService.getPlayerById(this.playerId),
      analytics: this.analysisService.getAnalyses('player', numericId),
    }).subscribe({
      next: ({ player, analytics }) => {
        if (player) {
          this.breadcrumbData.entityName.set(`${player.firstName} ${player.lastName}`);
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
    const numericId = parseInt(this.playerId, 10);

    this.analysisService.getAnalyses('player', numericId).subscribe({
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
