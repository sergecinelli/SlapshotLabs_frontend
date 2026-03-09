import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { TeamService } from '../../services/team.service';
import { TryoutService } from '../../services/tryout.service';
import { TryoutEntry, TryoutTabType } from '../../shared/interfaces/tryout.interface';
import { Observable, forkJoin, finalize } from 'rxjs';
import { map } from 'rxjs/operators';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { PositionService } from '../../services/position.service';
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
} from '../../shared/components/tryout-add-modal/tryout-add.modal';
import { DisplayTextModal } from '../../shared/components/display-text-modal/display-text.modal';

const TRYOUT_TABS: TabItem[] = [
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
  private location = inject(Location);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  private breadcrumbData = inject(BreadcrumbDataService);
  private teamService = inject(TeamService);
  private tryoutService = inject(TryoutService);
  private toast = inject(ToastService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private positionService = inject(PositionService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  readonly tabItems = TRYOUT_TABS;

  activeTab = signal<TryoutTabType>('player');
  entries = signal<TryoutEntry[]>([]);
  loading = signal(true);
  isAddLoading = signal(false);
  teamName = signal('');
  teamId = signal<number | null>(null);

  activeTabIndex = computed(() => TRYOUT_TABS.findIndex((tab) => tab.key === this.activeTab()));

  tableColumns: TableColumn[] = [
    { key: 'team', label: 'Current Team', sortable: true, width: '200px' },
    { key: 'teamLevelName', label: 'Level', sortable: true, width: '80px' },
    { key: 'jerseyNumber', label: 'Number', sortable: true, type: 'number', width: '80px' },
    { key: 'firstName', label: 'First Name', sortable: true, width: '120px' },
    { key: 'lastName', label: 'Last Name', sortable: true, width: '120px' },
    { key: 'position', label: 'Position', sortable: true, width: '120px' },
    { key: 'shoots', label: 'Shoots', sortable: true, width: '80px' },
  ];

  tableActions: TableAction[] = [
    { label: 'Analysis', action: 'analysis', variant: 'blue', icon: 'bar_chart' },
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
    const user = this.authService.getCurrentUserValue();
    const teamId = user?.team_id ?? null;

    if (teamId) {
      this.teamId.set(teamId);
      this.teamService.getTeamById(String(teamId)).subscribe({
        next: (team) => {
          if (team) {
            this.teamName.set(team.name);
            const label = [team.name, team.group, team.level].filter(Boolean).join(' ');
            this.breadcrumbData.entityName.set(label);
          }
          this.loadEntries();
        },
        error: () => {
          this.loadEntries();
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  onTabChange(key: string): void {
    const tab = key as TryoutTabType;
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    this.location.replaceState('/tryout', `tab=${tab}`);
    this.loadEntries();
  }

  onActionClick(event: { action: string; item: TryoutEntry }): void {
    const { action, item } = event;
    switch (action) {
      case 'analysis': {
        const path = item.type === 'goalie' ? '/analytics/goalies' : '/analytics/players';
        this.router.navigate([path]);
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
    if (!teamId) return;

    this.isAddLoading.set(true);

    forkJoin({
      entries: this.loadAvailableEntries(),
      positions: this.positionService.getPositions(),
    })
      .pipe(finalize(() => this.isAddLoading.set(false)))
      .subscribe({
        next: ({ entries, positions }) => {
          this.modalService.openModal(TryoutAddModal, {
            name: 'Add Player to Tryout',
            icon: 'person_add',
            width: '800px',
            maxWidth: '95vw',
            data: {
              activeTab: this.activeTab(),
              teamId,
              entries,
              positions,
            } as TryoutAddModalData,
            onCloseWithDataProcessing: (result: { entries: Partial<TryoutEntry>[] }) => {
              const requests = result.entries.map((entry) =>
                this.tryoutService.addToTryout(teamId, entry)
              );
              forkJoin(requests).subscribe({
                next: () => {
                  this.toast.show('Player(s) added to tryout successfully', 'success');
                  this.modalService.closeModal();
                  this.loadEntries();
                },
                error: () => {
                  this.toast.show('Failed to add player(s) to tryout', 'error');
                  this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
                },
              });
            },
          });
        },
        error: () => {
          this.toast.show('Failed to load players', 'error');
        },
      });
  }

  private loadAvailableEntries(): Observable<TryoutEntry[]> {
    if (this.activeTab() === 'goalie') {
      return this.goalieService.getGoalies({ excludeDefault: true }).pipe(
        map((data) =>
          data.goalies.map((g) => ({
            id: g.id,
            playerId: g.id,
            firstName: g.firstName,
            lastName: g.lastName,
            position: g.position,
            shoots: g.shoots,
            jerseyNumber: g.jerseyNumber,
            team: g.team,
            teamId: g.teamId,
            teamLevelName: g.level,
            type: 'goalie' as const,
          }))
        )
      );
    }

    return this.playerService.getPlayers().pipe(
      map((data) =>
        data.players.map((p) => ({
          id: p.id,
          playerId: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          position: p.position,
          shoots: p.shoots,
          jerseyNumber: p.jerseyNumber,
          team: p.team,
          teamId: p.teamId,
          teamLogo: p.teamLogo,
          teamAgeGroup: p.teamAgeGroup,
          teamLevelName: p.teamLevelName,
          type: 'player' as const,
        }))
      )
    );
  }

  private removeFromTryout(entry: TryoutEntry): void {
    const teamId = this.teamId();
    if (!teamId) return;

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
        this.tryoutService.removeFromTryout(teamId, entry.id).subscribe({
          next: () => {
            this.modalService.closeModal();
            this.loadEntries();
          },
          error: (error) => {
            console.error('Failed to remove from tryout:', error);
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  private loadEntries(): void {
    const teamId = this.teamId();
    if (!teamId) return;

    this.loading.set(true);
    this.tryoutService.getTryoutEntries(teamId, this.activeTab()).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load tryout entries:', error);
        this.entries.set([]);
        this.loading.set(false);
      },
    });
  }
}
