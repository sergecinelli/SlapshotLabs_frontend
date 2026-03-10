import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { TeamService } from '../../services/team.service';
import { TryoutService } from '../../services/tryout.service';
import { RoleService } from '../../services/roles/role.service';
import { Role } from '../../services/roles/role.interface';
import {
  TryoutEntry,
  TryoutEntryType,
  TryoutTabType,
  TryoutStatus,
} from '../../shared/interfaces/tryout.interface';
import { Observable, forkJoin, finalize, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { PositionService } from '../../services/position.service';
import { Team } from '../../shared/interfaces/team.interface';
import { PlayerApiOutData } from '../../shared/interfaces/player.interface';
import { GoalieApiOutData } from '../../shared/interfaces/goalie.interface';
import { isDefaultGoalieName } from '../../shared/constants/goalie.constants';
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
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';
import { BreadcrumbCenterDirective } from '../../shared/directives/breadcrumb-center.directive';
import { visibilityByRoleMap } from './tryout.role-map';
import {
  TryoutAddModal,
  TryoutAddModalData,
  TryoutAddModalResult,
} from '../../shared/components/tryout-add-modal/tryout-add.modal';
import {
  TryoutStatusModal,
  TryoutStatusModalData,
  TryoutStatusModalResult,
} from '../../shared/components/tryout-status-modal/tryout-status.modal';
import { DisplayTextModal } from '../../shared/components/display-text-modal/display-text.modal';

const TRYOUT_TABS: TabItem[] = [
  { key: 'all', label: 'All', icon: 'groups' },
  { key: 'player', label: 'Players', icon: 'person' },
  { key: 'goalie', label: 'Goalies', icon: 'shield' },
];

@Component({
  selector: 'app-tryout',
  imports: [
    DataTableComponent,
    ButtonLoadingComponent,
    TabsSliderComponent,
    ComponentVisibilityByRoleDirective,
    BreadcrumbActionsDirective,
    BreadcrumbCenterDirective,
  ],
  templateUrl: './tryout.page.html',
  styleUrl: './tryout.page.scss',
})
export class TryoutPage implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  private teamService = inject(TeamService);
  private apiService = inject(ApiService);
  private tryoutService = inject(TryoutService);
  private roleService = inject(RoleService);
  private toast = inject(ToastService);
  private positionService = inject(PositionService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  readonly tabItems = TRYOUT_TABS;

  private readonly entryTypes: TryoutEntryType[] = ['player', 'goalie'];

  activeTab = signal<TryoutTabType>('all');
  private entriesCache = signal<Record<TryoutEntryType, TryoutEntry[]>>({
    player: [],
    goalie: [],
  });
  loading = signal(true);
  isAddLoading = signal(false);
  private statusLoadingId = signal<number | null>(null);
  teamName = signal('');
  teamId = signal<number | null>(null);

  activeTabIndex = computed(() => TRYOUT_TABS.findIndex((tab) => tab.key === this.activeTab()));

  filteredEntries = computed(() => {
    const role = this.roleService.current;
    const cache = this.entriesCache();
    const tab = this.activeTab();
    const all = tab === 'all' ? [...cache.player, ...cache.goalie] : cache[tab];

    if (role === Role.Admin || role === Role.Coach) {
      return all;
    }

    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) return [];

    const userId = Number(currentUser.id);
    // return all.filter((entry) => entry.userId === userId);
    return all;
  });

  tableColumns: TableColumn[] = [
    { key: 'team', label: 'Current Team', sortable: true, width: '200px' },
    { key: 'teamLevelName', label: 'Level', sortable: true, width: '80px' },
    { key: 'jerseyNumber', label: 'Number', sortable: true, type: 'number', width: '80px' },
    { key: 'firstName', label: 'First Name', sortable: true, width: '120px' },
    { key: 'lastName', label: 'Last Name', sortable: true, width: '120px' },
    { key: 'position', label: 'Position', sortable: true, width: '120px' },
    { key: 'shoots', label: 'Shoots', sortable: true, width: '80px' },
    { key: 'changedBy', label: 'Changed By', sortable: true, width: '120px' },
    { key: 'changedAt', label: 'Changed At', sortable: true, type: 'date', width: '140px' },
    { key: 'note', label: 'Note', sortable: false, width: '150px' },
    { key: 'status', label: 'Status', sortable: true, type: 'custom', width: '80px' },
  ];

  tableActions: TableAction[] = [
    {
      label: 'Change Status',
      action: 'change-status',
      variant: 'orange',
      icon: 'swap_horiz',
      roleVisibilityName: 'change-status-action',
      isLoading: (item) => item['tryoutId'] === this.statusLoadingId(),
    },
    {
      label: 'Analysis',
      action: 'analysis',
      variant: 'blue',
      icon: 'bar_chart',
      condition: (item) => item['hasAnalytics'] === true,
    },
    {
      label: 'Profile',
      action: 'view-profile',
      variant: 'green',
      icon: 'visibility',
      iconOnly: true,
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'red',
      icon: 'delete',
      iconOnly: true,
      roleVisibilityName: 'delete-action',
    },
  ];

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParams['tab'] as TryoutTabType | undefined;
    const validTabs: TryoutTabType[] = ['all', 'player', 'goalie'];
    if (tabParam && validTabs.includes(tabParam)) {
      this.activeTab.set(tabParam);
    }

    const user = this.authService.getCurrentUserValue();
    const role = this.roleService.current;
    const needsTeamFilter = role === Role.Player;
    const teamId = needsTeamFilter ? (user?.team_id ?? null) : null;

    this.teamId.set(teamId);

    if (teamId) {
      this.teamService.getTeamById(String(teamId)).subscribe({
        next: (team) => {
          if (team) {
            this.teamName.set(team.name);
          }
          this.loadAllEntries();
        },
        error: () => {
          this.loadAllEntries();
        },
      });
    } else {
      this.loadAllEntries();
    }
  }

  onTabChange(key: string): void {
    const tab = key as TryoutTabType;
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    this.location.replaceState('/tryout', `tab=${tab}`);
  }

  onActionClick(event: { action: string; item: TryoutEntry }): void {
    const { action, item } = event;
    switch (action) {
      case 'change-status':
        this.openChangeStatusModal(item);
        break;
      case 'analysis': {
        const segment = item.type === 'goalie' ? 'goalies' : 'players';
        this.router.navigate(['/analytics', segment, item.playerId]);
        break;
      }
      case 'view-profile': {
        const basePath =
          item.type === 'goalie' ? '/teams-and-rosters/goalies/' : '/teams-and-rosters/players/';
        this.router.navigate([basePath + item.playerId + '/profile']);
        break;
      }
      case 'delete':
        this.removeFromTryout(item);
        break;
    }
  }

  openAddModal(): void {
    const teamId = this.teamId();
    const tab = this.activeTab();

    this.isAddLoading.set(true);

    this.teamService
      .getTeams()
      .pipe(
        switchMap((teamsData) => {
          const teams = teamsData.teams;
          const teamMap = new Map(teams.map((t) => [parseInt(t.id), t]));

          return forkJoin({
            playerEntries: this.loadPlayerEntries(teamMap),
            goalieEntries: this.loadGoalieEntries(teamMap),
            positions: this.positionService.getPositions(),
          }).pipe(map((data) => ({ ...data, teams })));
        }),
        finalize(() => this.isAddLoading.set(false))
      )
      .subscribe({
        next: ({ playerEntries, goalieEntries, positions, teams }) => {
          this.modalService.openModal(TryoutAddModal, {
            name: 'Add to Tryout List',
            icon: 'person_add',
            width: '800px',
            maxWidth: '95vw',
            data: {
              activeTab: tab,
              teamId,
              playerEntries,
              goalieEntries,
              positions,
              teams: teamId ? [] : teams,
            } as TryoutAddModalData,
            onCloseWithDataProcessing: (result: TryoutAddModalResult) => {
              const type = result.type;
              const resolvedTeamId = result.teamId;
              const note = result.note || undefined;
              const requests = result.selectedIds.map((playerId) =>
                this.tryoutService.addToTryout(resolvedTeamId, playerId, type, note)
              );
              if (!requests.length) {
                this.modalService.closeModal();
                return;
              }
              forkJoin(requests).subscribe({
                next: () => {
                  const label = type === 'goalie' ? 'Goalie(s)' : 'Player(s)';
                  this.toast.show(`${label} added to tryout successfully`, 'success');
                  this.modalService.closeModal();
                  this.loadAllEntries();
                },
                error: () => {
                  this.toast.show('Failed to add to tryout', 'error');
                  this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
                },
              });
            },
          });
        },
        error: () => {
          this.toast.show('Failed to load data', 'error');
        },
      });
  }

  private openChangeStatusModal(entry: TryoutEntry): void {
    this.statusLoadingId.set(entry.tryoutId);

    this.tryoutService.getStatusHistory(entry.tryoutId, entry.type).subscribe({
      next: (statusHistory) => {
        this.statusLoadingId.set(null);
        this.modalService.openModal(TryoutStatusModal, {
          name: 'Change Status',
          icon: 'swap_horiz',
          width: '600px',
          maxWidth: '95vw',
          data: {
            entry,
            statusHistory,
          } as TryoutStatusModalData,
          onCloseWithDataProcessing: (result: TryoutStatusModalResult) => {
            this.tryoutService
              .updateTryoutStatus(entry.tryoutId, entry.type, result.status, result.note)
              .subscribe({
                next: () => {
                  this.toast.show('Status updated successfully', 'success');
                  this.modalService.closeModal();
                  this.loadAllEntries();
                },
                error: () => {
                  this.toast.show('Failed to update status', 'error');
                  this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
                },
              });
          },
        });
      },
      error: () => {
        this.statusLoadingId.set(null);
        this.toast.show('Failed to load status history', 'error');
      },
    });
  }

  private loadPlayerEntries(teamMap: Map<number, Team>): Observable<TryoutEntry[]> {
    return this.apiService.get<PlayerApiOutData[]>('/hockey/player/list').pipe(
      map((players) =>
        players.map((p) => {
          const team = teamMap.get(p.team_id);
          return {
            id: String(p.id),
            tryoutId: 0,
            playerId: String(p.id),
            firstName: p.first_name,
            lastName: p.last_name,
            position: this.mapPositionIdToName(p.position_id),
            shoots: p.shoots === 'R' ? 'Right Shot' : 'Left Shot',
            jerseyNumber: p.number,
            team: team?.name || '',
            teamId: p.team_id,
            teamLevelName: team?.level || '',
            type: 'player' as const,
            status: TryoutStatus.TryingOut,
            hasAnalytics: false,
            note: null,
            userId: null,
            changedBy: null,
            changedAt: null,
          };
        })
      )
    );
  }

  private loadGoalieEntries(teamMap: Map<number, Team>): Observable<TryoutEntry[]> {
    return this.apiService.get<GoalieApiOutData[]>('/hockey/goalie/list').pipe(
      map((goalies) =>
        goalies
          .filter((g) => !isDefaultGoalieName(g.first_name, g.last_name))
          .map((g) => {
            const team = teamMap.get(g.team_id);
            return {
              id: String(g.id),
              tryoutId: 0,
              playerId: String(g.id),
              firstName: g.first_name,
              lastName: g.last_name,
              position: 'Goalie',
              shoots: g.shoots === 'R' ? 'Right Shot' : 'Left Shot',
              jerseyNumber: g.number,
              team: team?.name || '',
              teamId: g.team_id,
              teamLevelName: team?.level || '',
              type: 'goalie' as const,
              status: TryoutStatus.TryingOut,
              hasAnalytics: false,
              note: null,
              userId: null,
              changedBy: null,
              changedAt: null,
            };
          })
      )
    );
  }

  private mapPositionIdToName(positionId: number): string {
    const positionMap: Record<number, string> = {
      1: 'Left Wing',
      2: 'Center',
      3: 'Right Wing',
      4: 'Left Defense',
      5: 'Right Defense',
      6: 'Goalie',
    };
    return positionMap[positionId] || 'Center';
  }

  private removeFromTryout(entry: TryoutEntry): void {
    this.modalService.openModal(DisplayTextModal, {
      name: 'Remove from Tryout',
      icon: 'report',
      data: {
        text: `Remove <b>${entry.firstName} ${entry.lastName}</b> from tryout list?`,
        buttonText: 'Remove',
        buttonIcon: 'delete',
        color: 'primary',
        colorSoft: 'primary_dark',
        withButtonLoading: true,
      },
      onCloseWithDataProcessing: () => {
        this.tryoutService.removeFromTryout(entry.tryoutId, entry.type).subscribe({
          next: () => {
            this.modalService.closeModal();
            this.loadAllEntries();
          },
          error: (error) => {
            console.error('Failed to remove from tryout:', error);
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  private loadAllEntries(): void {
    const teamId = this.teamId();
    this.loading.set(true);

    const requests = this.entryTypes.reduce(
      (acc, type) => {
        acc[type] = this.tryoutService
          .getTryoutEntries(teamId, type)
          .pipe(catchError(() => of([])));
        return acc;
      },
      {} as Record<TryoutEntryType, Observable<TryoutEntry[]>>
    );

    forkJoin(requests).subscribe({
      next: (cache) => {
        this.entriesCache.set(cache);
        this.loading.set(false);
      },
    });
  }
}
