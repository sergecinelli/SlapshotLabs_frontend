import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { TeamService } from '../../services/team.service';
import { TryoutService } from '../../services/tryout.service';
import { TryoutEntry, TryoutTabType } from '../../shared/interfaces/tryout.interface';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import {
  TabsSliderComponent,
  TabItem,
} from '../../shared/components/tabs-slider/tabs-slider.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './tryout.role-map';
import { TryoutAddModal, TryoutAddModalData } from '../../shared/components/tryout-add-modal/tryout-add.modal';

const TRYOUT_TABS: TabItem[] = [
  { key: 'player', label: 'Players', icon: 'person' },
  { key: 'goalie', label: 'Goalies', icon: 'shield' },
];

@Component({
  selector: 'app-tryout',
  imports: [
    DataTableComponent,
    ButtonComponent,
    TabsSliderComponent,
    ComponentVisibilityByRoleDirective,
  ],
  templateUrl: './tryout.page.html',
  styleUrl: './tryout.page.scss',
})
export class TryoutPage implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private breadcrumbData = inject(BreadcrumbDataService);
  private teamService = inject(TeamService);
  private tryoutService = inject(TryoutService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  readonly tabItems = TRYOUT_TABS;

  activeTab = signal<TryoutTabType>('player');
  entries = signal<TryoutEntry[]>([]);
  loading = signal(true);
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
    { label: 'Analysis', action: 'analysis', variant: 'secondary', icon: 'analytics' },
    {
      label: 'Profile',
      action: 'view-profile',
      variant: 'primary',
      icon: 'visibility',
      iconOnly: true,
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'danger',
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
        const basePath =
          item.type === 'goalie' ? '/analytics/goalies/' : '/analytics/players/';
        this.router.navigate([basePath + item.playerId]);
        break;
      }
      case 'view-profile': {
        const basePath =
          item.type === 'goalie'
            ? '/teams-and-rosters/goalies/'
            : '/teams-and-rosters/players/';
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

    const dialogRef = this.dialog.open(TryoutAddModal, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        activeTab: this.activeTab(),
        teamId,
      } as TryoutAddModalData,
      panelClass: 'tryout-add-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadEntries();
      }
    });
  }

  private removeFromTryout(entry: TryoutEntry): void {
    const teamId = this.teamId();
    if (!teamId) return;

    if (confirm(`Remove ${entry.firstName} ${entry.lastName} from tryout list?`)) {
      this.tryoutService.removeFromTryout(teamId, entry.id).subscribe({
        next: () => this.loadEntries(),
        error: (error) => console.error('Failed to remove from tryout:', error),
      });
    }
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
