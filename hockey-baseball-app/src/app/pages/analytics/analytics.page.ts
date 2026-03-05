import { Component, OnInit, computed, signal, inject, Type } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, map } from 'rxjs';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { AnalysisService } from '../../services/analysis.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { TeamService } from '../../services/team.service';
import { ScheduleService } from '../../services/schedule.service';
import { Analysis, AnalysisApiIn, AnalysisType } from '../../shared/interfaces/analysis.interface';
import { ANALYSIS_TABS, ANALYSIS_TYPE_CONFIG } from '../../shared/constants/analysis.constants';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import {
  TabsSliderComponent,
  TabItem,
} from '../../shared/components/tabs-slider/tabs-slider.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './analytics.role-map';
import { PlayerAnalysisModal } from '../../shared/components/player-analysis-modal/player-analysis.modal';
import { GoalieAnalysisModal } from '../../shared/components/goalie-analysis-modal/goalie-analysis.modal';
import { TeamAnalysisModal } from '../../shared/components/team-analysis-modal/team-analysis.modal';
import { GameAnalysisModal } from '../../shared/components/game-analysis-modal/game-analysis.modal';

@Component({
  selector: 'app-analytics',
  imports: [
    DataTableComponent,
    ButtonLoadingComponent,
    TabsSliderComponent,
    ComponentVisibilityByRoleDirective,
  ],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.scss',
})
export class AnalyticsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private modalService = inject(ModalService);
  private analysisService = inject(AnalysisService);
  private toast = inject(ToastService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private teamService = inject(TeamService);
  private scheduleService = inject(ScheduleService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  readonly tabItems: TabItem[] = ANALYSIS_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: tab.icon,
  }));

  activeTab = signal<AnalysisType>('team');
  analyses = signal<Analysis[]>([]);
  loading = signal(true);
  isCreateLoading = signal(false);
  showTabs = signal(true);

  activeTabIndex = computed(() => ANALYSIS_TABS.findIndex((tab) => tab.key === this.activeTab()));
  buttonConfig = computed(() => ANALYSIS_TYPE_CONFIG[this.activeTab()]);

  tableColumns: TableColumn[] = [
    { key: 'entityName', label: 'Name', sortable: true, width: '200px' },
    { key: 'analysisBy', label: 'Analysis By', sortable: true, width: '150px' },
    { key: 'analysisText', label: 'Analysis', sortable: false, width: '300px' },
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
    const defaultTab = this.route.snapshot.data['defaultTab'] as AnalysisType | undefined;
    const tabParam = this.route.snapshot.queryParams['tab'] as AnalysisType | undefined;
    const validTabs: AnalysisType[] = ['team', 'player', 'goalie', 'game'];
    const tab = validTabs.includes(defaultTab!)
      ? defaultTab!
      : validTabs.includes(tabParam!)
        ? tabParam!
        : 'team';

    this.showTabs.set(!defaultTab);
    this.activeTab.set(tab);
    this.loadAnalyses();
  }

  onTabChange(key: string): void {
    const tab = key as AnalysisType;
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    this.location.replaceState('/analytics', `tab=${tab}`);
    this.loadAnalyses();
  }

  onCreateAnalysis(): void {
    this.isCreateLoading.set(true);
    const type = this.activeTab();

    this.loadEntityOptions(type).subscribe({
      next: (entityOptions) => {
        this.isCreateLoading.set(false);
        this.openAnalysisModal(type, { isEditMode: false, entityOptions });
      },
      error: () => {
        this.isCreateLoading.set(false);
        this.toast.show('Failed to load data', 'error');
      },
    });
  }

  private loadEntityOptions(
    type: AnalysisType
  ): Observable<{ value: string; label: string }[]> {
    const loaderMap: Record<AnalysisType, Observable<{ value: string; label: string }[]>> = {
      player: this.playerService
        .getPlayers()
        .pipe(
          map((r) => r.players.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })))
        ),
      goalie: this.goalieService
        .getGoalies()
        .pipe(
          map((r) =>
            r.goalies.map((g) => ({ value: g.id, label: `${g.firstName} ${g.lastName}` }))
          )
        ),
      team: this.teamService
        .getTeams()
        .pipe(
          map((r) => r.teams.map((t) => ({ value: String(t.id), label: t.name })))
        ),
      game: this.scheduleService
        .getGameList()
        .pipe(
          map((games) =>
            games.map((g) => ({
              value: String(g.id),
              label: `${g.away_team_name} at ${g.home_team_name} - ${g.date ?? ''}`,
            }))
          )
        ),
    };

    return loaderMap[type];
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
    this.openAnalysisModal(analysis.type, { analysis, isEditMode: true });
  }

  private openAnalysisModal(type: AnalysisType, data: Record<string, unknown>): void {
    const componentMap: Record<AnalysisType, Type<unknown>> = {
      player: PlayerAnalysisModal,
      goalie: GoalieAnalysisModal,
      team: TeamAnalysisModal,
      game: GameAnalysisModal,
    };

    this.modalService.openModal(componentMap[type], {
      name: 'Create Analysis',
      icon: 'analytics',
      width: '600px',
      data,
      onCloseWithDataProcessing: (result: {
        isEditMode: boolean;
        analysisId?: number;
        apiData: AnalysisApiIn;
      }) => {
        const apiCall = result.isEditMode
          ? this.analysisService.updateAnalysis(String(result.analysisId!), result.apiData)
          : this.analysisService.createAnalysis(result.apiData);
        apiCall.subscribe({
          next: () => {
            this.toast.show(
              result.isEditMode ? 'Analysis updated successfully' : 'Analysis created successfully',
              'success'
            );
            this.modalService.closeModal();
            this.loadAnalyses();
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
      this.analysisService.deleteAnalysis(analysis.id).subscribe({
        next: () => this.loadAnalyses(),
        error: (error) => console.error('Failed to delete analysis:', error),
      });
    }
  }

  private loadAnalyses(): void {
    this.loading.set(true);

    this.analysisService.getAnalyses(this.activeTab()).subscribe({
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
