import { Component, OnInit, computed, signal, inject, Type } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, map } from 'rxjs';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { AnalysisService } from '../../services/analysis.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { TeamService } from '../../services/team.service';
import { ScheduleService } from '../../services/schedule.service';
import { Analysis, AnalyticsApiIn, AnalysisType } from '../../shared/interfaces/analysis.interface';
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
import { DisplayTextModal } from '../../shared/components/display-text-modal/display-text.modal';
import { PlayerAnalysisModal } from '../../shared/components/player-analysis-modal/player-analysis.modal';
import { GoalieAnalysisModal } from '../../shared/components/goalie-analysis-modal/goalie-analysis.modal';
import { TeamAnalysisModal } from '../../shared/components/team-analysis-modal/team-analysis.modal';
import {
  GameAnalysisModal,
  GameOption,
} from '../../shared/components/game-analysis-modal/game-analysis.modal';
import { AnalysisViewModal } from '../../shared/components/analysis-view-modal/analysis-view.modal';

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
  private router = inject(Router);
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

  private readonly analysisTypes: AnalysisType[] = ['team', 'player', 'goalie', 'game'];

  activeTab = signal<AnalysisType>('team');
  private analyticsCache = signal<Record<AnalysisType, Analysis[]>>({
    team: [],
    player: [],
    goalie: [],
    game: [],
  });
  analytics = computed(() => this.analyticsCache()[this.activeTab()]);
  loading = signal(true);
  isCreateLoading = signal(false);
  editingItemId = signal<string | null>(null);
  showTabs = signal(true);

  activeTabIndex = computed(() => ANALYSIS_TABS.findIndex((tab) => tab.key === this.activeTab()));
  buttonConfig = computed(() => ANALYSIS_TYPE_CONFIG[this.activeTab()]);

  private readonly commonColumns: TableColumn[] = [
    { key: 'title', label: 'Title', sortable: true, width: '200px' },
    { key: 'author', label: 'Author', sortable: true, width: '150px' },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'time', label: 'Time', sortable: false, width: '100px' },
    { key: 'analysis', label: 'Analysis', sortable: false, width: '250px' },
  ];

  private readonly columnsByType: Record<AnalysisType, TableColumn[]> = {
    team: [
      { key: 'entityName', label: 'Name', sortable: true, width: '180px' },
      { key: 'city', label: 'City', sortable: true, width: '140px' },
      ...this.commonColumns,
    ],
    player: [
      { key: 'entityName', label: 'Name', sortable: true, width: '180px' },
      { key: 'number', label: 'Number', sortable: true, width: '100px' },
      ...this.commonColumns,
    ],
    goalie: [
      { key: 'entityName', label: 'Name', sortable: true, width: '180px' },
      { key: 'number', label: 'Number', sortable: true, width: '100px' },
      ...this.commonColumns,
    ],
    game: [
      { key: 'entityName', label: 'Game', sortable: true, width: '200px' },
      { key: 'score', label: 'Score', sortable: false, width: '100px' },
      { key: 'gameDate', label: 'Game Date', sortable: true, width: '120px' },
      ...this.commonColumns,
    ],
  };

  tableColumns = computed(() => this.columnsByType[this.activeTab()]);

  private readonly baseActions: TableAction[] = [
    {
      label: 'Edit',
      action: 'edit',
      variant: 'orange',
      icon: 'stylus',
      roleVisibilityName: 'edit-action',
      isLoading: (item: Record<string, unknown>) => this.editingItemId() === String(item['id']),
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'red',
      icon: 'delete',
      roleVisibilityName: 'delete-action',
      roleVisibilityAuthorId: (item: Record<string, unknown>) => item['userId']?.toString() ?? '',
    },
  ];

  tableActions = computed(() => {
    const tab = this.activeTab();

    if (tab === 'game') {
      return [
        {
          label: 'Dashboard',
          action: 'dashboard',
          variant: 'green' as const,
          icon: 'dashboard',
        },
        {
          label: 'View',
          action: 'view',
          variant: 'green' as const,
          icon: 'visibility',
        },
        ...this.baseActions,
      ];
    }

    return [
      {
        label: 'View',
        action: 'view',
        variant: 'green' as const,
        icon: 'visibility',
      },
      ...this.baseActions,
    ];
  });

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
    this.loadAllAnalytics();
  }

  onTabChange(key: string): void {
    const tab = key as AnalysisType;
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    this.location.replaceState('/analytics', `tab=${tab}`);
  }

  onCreateAnalysis(): void {
    this.loadEntityOptionsAndOpenModal(this.activeTab(), { isEditMode: false });
  }

  onTableAction(event: { action: string; item: Analysis }): void {
    switch (event.action) {
      case 'view':
        this.onViewAnalysis(event.item);
        break;
      case 'dashboard':
        this.router.navigate(['/schedule/live', event.item.entityId]);
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
    this.editingItemId.set(analysis.id);
    this.loadEntityOptionsAndOpenModal(analysis.type, { analysis, isEditMode: true });
  }

  private loadEntityOptionsAndOpenModal(type: AnalysisType, data: Record<string, unknown>): void {
    const isCreate = !data['isEditMode'];
    if (isCreate) this.isCreateLoading.set(true);

    const entityLoaders: Record<AnalysisType, Observable<Record<string, unknown>>> = {
      player: this.playerService.getPlayers().pipe(map((r) => ({ players: r.players }))),
      goalie: this.goalieService.getGoalies().pipe(map((r) => ({ goalies: r.goalies }))),
      team: this.teamService.getTeams().pipe(map((r) => ({ teams: r.teams }))),
      game: forkJoin({
        games: this.scheduleService.getGameList(),
        teams: this.teamService.getTeams(),
      }).pipe(
        map(({ games, teams }) => {
          const teamMap = new Map(teams.teams.map((t) => [Number(t.id), t.name]));
          return {
            games: games.map(
              (g): GameOption => ({
                value: String(g.id),
                label: `${teamMap.get(g.away_team_id) ?? 'Unknown'} at ${teamMap.get(g.home_team_id) ?? 'Unknown'} - ${g.date ?? ''}`,
              })
            ),
          };
        })
      ),
    };

    entityLoaders[type].subscribe({
      next: (entityData) => {
        if (isCreate) this.isCreateLoading.set(false);
        this.editingItemId.set(null);
        this.openAnalysisModal(type, { ...data, ...entityData });
      },
      error: (error) => {
        console.error('Failed to load entity options:', error);
        if (isCreate) this.isCreateLoading.set(false);
        this.editingItemId.set(null);
      },
    });
  }

  private openAnalysisModal(type: AnalysisType, data: Record<string, unknown>): void {
    const componentMap: Record<AnalysisType, Type<unknown>> = {
      player: PlayerAnalysisModal,
      goalie: GoalieAnalysisModal,
      team: TeamAnalysisModal,
      game: GameAnalysisModal,
    };

    const labelMap: Record<AnalysisType, string> = {
      player: 'Player',
      goalie: 'Goalie',
      team: 'Team',
      game: 'Game',
    };

    const label = labelMap[type];

    this.modalService.openModal(componentMap[type], {
      name: data['isEditMode'] ? `Edit ${label} Analysis` : `Create ${label} Analysis`,
      icon: 'bar_chart',
      width: '900px',
      maxWidth: '95vw',
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
            this.loadAllAnalytics();
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
        text: 'Are you sure you want to delete this analysis?',
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
            this.loadAllAnalytics();
          },
          error: (error) => {
            console.error('Failed to delete analysis:', error);
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  private loadAllAnalytics(): void {
    this.loading.set(true);

    const requests = this.analysisTypes.reduce(
      (acc, type) => {
        acc[type] = this.analysisService.getAnalyses(type).pipe(map((result) => result.analytics));
        return acc;
      },
      {} as Record<AnalysisType, Observable<Analysis[]>>
    );

    forkJoin(requests).subscribe({
      next: (cache) => {
        this.analyticsCache.set(cache);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load analytics:', error);
        this.analyticsCache.set({ team: [], player: [], goalie: [], game: [] });
        this.loading.set(false);
      },
    });
  }
}
