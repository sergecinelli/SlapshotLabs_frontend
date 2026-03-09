import { Component, OnInit, signal, inject } from '@angular/core';
import { ModalEvent, ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TeamService } from '../../services/team.service';
import { Team } from '../../shared/interfaces/team.interface';
import {
  TeamFormModal,
  TeamFormModalData,
} from '../../shared/components/team-form-modal/team-form.modal';
import { TeamOptionsService } from '../../services/team-options.service';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ButtonRouteComponent } from '../../shared/components/buttons/button-route/button-route.component';
import { visibilityByRoleMap } from './teams.role-map';
import { Observable, forkJoin } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { DisplayTextModal } from '../../shared/components/display-text-modal/display-text.modal';
import { AnalyticsApiIn } from '../../shared/interfaces/analysis.interface';
import { TeamAnalysisModal } from '../../shared/components/team-analysis-modal/team-analysis.modal';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { LocalStorageService, StorageKey } from '../../services/local-storage.service';
import { CachedSrcDirective } from '../../shared/directives/cached-src.directive';
import { CardGridComponent } from '../../shared/components/card-grid/card-grid.component';
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-teams',
  imports: [
    CachedSrcDirective,
    MatIconModule,
    MatTooltipModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
    ButtonLoadingComponent,
    ButtonRouteComponent,
    CardGridComponent,
    DataTableComponent,
    BreadcrumbActionsDirective,
    LoadingSpinnerComponent,
  ],
  templateUrl: './teams.page.html',
  styleUrl: './teams.page.scss',
})
export class TeamsPage implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private teamService = inject(TeamService);
  private modalService = inject(ModalService);
  private toast = inject(ToastService);
  private teamOptionsService = inject(TeamOptionsService);
  private router = inject(Router);
  private storage = inject(LocalStorageService);
  private analysisService = inject(AnalysisService);

  teams = signal<Team[]>([]);
  editingTeamId = signal<string | null>(null);
  analysisLoadingId = signal<string | null>(null);
  isAddLoading = signal(false);
  loading = signal(true);
  layoutMode = signal<'card' | 'table'>('table'); // Default to table

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Team Name', sortable: true, width: '200px' },
    { key: 'group', label: 'Group', sortable: true, width: '100px' },
    { key: 'level', label: 'Level', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'division', label: 'Division', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'gamesPlayed', label: 'GP', sortable: true, type: 'number', width: '60px' },
    { key: 'wins', label: 'Wins', sortable: true, type: 'number', width: '70px' },
    { key: 'losses', label: 'Losses', sortable: true, type: 'number', width: '75px' },
    { key: 'points', label: 'Points', sortable: true, type: 'number', width: '75px' },
    { key: 'goalsFor', label: 'Goals For', sortable: true, type: 'number', width: '90px' },
    { key: 'goalsAgainst', label: 'Goals Against', sortable: true, type: 'number', width: '110px' },
  ];

  tableActions: TableAction[] = [
    {
      label: 'Enter Analysis',
      action: 'analysis',
      variant: 'blue',
      icon: 'bar_chart',
      isLoading: (item) => this.analysisLoadingId() === item['id'],
    },
    { label: 'Schedule', action: 'schedules', variant: 'gray', icon: 'scoreboard' },
    { label: 'Players', action: 'players', variant: 'gray', icon: 'people' },
    { label: 'Goalies', action: 'goalies', variant: 'gray', icon: 'shield' },
    {
      label: 'View',
      action: 'view-profile',
      variant: 'green',
      icon: 'visibility',
      iconOnly: true,
      route: (item) => `/teams-and-rosters/teams/${item['id']}/profile`,
    },
    {
      label: 'Edit',
      action: 'edit',
      variant: 'orange',
      icon: 'stylus',
      iconOnly: true,
      roleVisibilityName: 'edit-action',
      isLoading: (item) => this.editingTeamId() === item['id'],
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
    // Initialize layout mode from local storage
    const savedMode = this.storage.get(StorageKey.LayoutMode);
    if (savedMode === 'card' || savedMode === 'table') {
      this.layoutMode.set(savedMode);
    }

    // Load team options first to populate the mapping, then load teams
    this.loading.set(true);
    forkJoin({
      levels: this.teamOptionsService.getTeamLevels(),
      divisions: this.teamOptionsService.getDivisions(),
    }).subscribe({
      next: () => {
        // Options loaded, now fetch teams with correct mappings
        this.loadTeams();
      },
      error: (error) => {
        console.error('Error loading team options:', error);
        // Still try to load teams even if options fail
        this.loadTeams();
      },
    });
  }

  toggleLayout(): void {
    const newMode = this.layoutMode() === 'card' ? 'table' : 'card';
    this.layoutMode.set(newMode);
    this.storage.set(StorageKey.LayoutMode, newMode);
  }

  private loadTeams(): void {
    this.loading.set(true);
    this.teamService.getTeams().subscribe({
      next: (data) => {
        // Sort by creation date (newest to oldest) by default
        const sortedTeams = this.sortByDate(data.teams, 'desc');
        this.teams.set(sortedTeams);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading teams:', error);
        this.loading.set(false);
      },
    });
  }

  onActionClick(event: { action: string; item: Team }): void {
    const { action, item } = event;

    switch (action) {
      case 'delete':
        this.deleteTeam(item);
        break;
      case 'edit':
        this.editTeam(item);
        break;
      case 'view-profile':
        this.viewTeamProfile(item);
        break;
      case 'players':
        this.viewTeamPlayers(item);
        break;
      case 'goalies':
        this.viewTeamGoalies(item);
        break;
      case 'schedules':
        this.viewTeamGames(item);
        break;
      case 'analysis':
        this.viewTeamAnalysis(item);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  onSort(event: { column: string; direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sortedTeams = [...this.teams()].sort((a, b) => {
      const aValue = this.getNestedValue(a, column);
      const bValue = this.getNestedValue(b, column);

      if (aValue === bValue) return 0;

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = (aValue as string | number) < (bValue as string | number) ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });

    this.teams.set(sortedTeams);
  }

  private getNestedValue(obj: Team, path: string): unknown {
    return path
      .split('.')
      .reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  private sortByDate(teams: Team[], direction: 'asc' | 'desc'): Team[] {
    return [...teams].sort((a, b) => {
      const aDate = a.createdAt || new Date(0); // Use epoch if no date
      const bDate = b.createdAt || new Date(0);

      const result = aDate.getTime() - bDate.getTime();
      return direction === 'desc' ? -result : result; // desc = newest first
    });
  }

  deleteTeam(team: Team): void {
    this.modalService.openModal(DisplayTextModal, {
      name: 'Delete Team',
      icon: 'report',
      data: {
        text: `Are you sure you want to delete <b>${team.name}</b>?`,
        buttonText: 'Delete',
        buttonIcon: 'delete',
        color: 'primary',
        colorSoft: 'primary_dark',
        withButtonLoading: true,
      },
      onCloseWithDataProcessing: () => {
        this.teamService.deleteTeam(team.id).subscribe({
          next: (success) => {
            if (success) {
              const updatedTeams = this.teams().filter((t) => t.id !== team.id);
              this.teams.set(updatedTeams);
              this.modalService.closeModal();
              this.toast.show('Team deleted successfully', 'success');
            } else {
              this.toast.show('Failed to delete team', 'error');
              this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
            }
          },
          error: (error) => {
            console.error('Error deleting team:', error);
            this.toast.show('Failed to delete team', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  viewTeamProfile(team: Team): void {
    this.router.navigate(['/teams-and-rosters/teams', team.id, 'profile']);
  }

  viewTeamPlayers(team: Team): void {
    this.router.navigate(['/teams-and-rosters/players'], {
      queryParams: {
        teamId: team.id,
        teamName: team.name,
      },
    });
  }

  viewTeamGoalies(team: Team): void {
    this.router.navigate(['/teams-and-rosters/goalies'], {
      queryParams: {
        teamId: team.id,
        teamName: team.name,
      },
    });
  }

  getPlayersQueryParams(team: Team): Record<string, string | number> {
    return {
      teamId: team.id,
      teamName: team.name,
    };
  }

  getGoaliesQueryParams(team: Team): Record<string, string | number> {
    return {
      teamId: team.id,
      teamName: team.name,
    };
  }

  viewTeamGames(team: Team): void {
    this.router.navigate(['/teams-and-rosters/teams', team.id, 'schedule']);
  }

  viewTeamAnalysis(team: Team): void {
    this.analysisLoadingId.set(team.id);
    this.teamService.getTeams().subscribe({
      next: (result) => {
        this.analysisLoadingId.set(null);
        this.modalService.openModal(TeamAnalysisModal, {
          name: 'Create Team Analysis',
          icon: 'bar_chart',
          width: '100%',
          maxWidth: '900px',
          data: {
            isEditMode: false,
            preSelectedTeamId: team.id.toString(),
            teams: result.teams,
          },
          onCloseWithDataProcessing: (modalResult: {
            isEditMode: boolean;
            apiData: AnalyticsApiIn;
          }) => {
            const apiCall: Observable<unknown> = this.analysisService.createAnalysis(
              modalResult.apiData
            );
            apiCall.subscribe({
              next: () => {
                this.toast.show('Analysis created successfully', 'success');
                this.modalService.closeModal();
                this.router.navigate(['/analytics/teams']);
              },
              error: () => {
                this.toast.show('Failed to create analysis', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: () => {
        this.analysisLoadingId.set(null);
        this.toast.show('Failed to load teams', 'error');
      },
    });
  }

  openAddTeamModal(): void {
    this.isAddLoading.set(true);

    forkJoin({
      ageGroups: this.teamOptionsService.getTeamAgeGroups(),
      levels: this.teamOptionsService.getTeamLevels(),
      divisions: this.teamOptionsService.getDivisions(),
    }).subscribe({
      next: ({ ageGroups, levels, divisions }) => {
        this.isAddLoading.set(false);
        this.modalService.openModal(TeamFormModal, {
          name: 'Add Team',
          icon: 'groups',
          width: '900px',
          maxWidth: '95vw',
          data: {
            isEditMode: false,
            ageGroups,
            levels,
            divisions,
          } as TeamFormModalData,
          onCloseWithDataProcessing: (result) => {
            const { logoFile, ...team } = result as Partial<Team> & {
              logoFile?: File;
              logoRemoved?: boolean;
            };
            this.teamService.addTeam(team, logoFile).subscribe({
              next: () => {
                this.toast.show('Team created successfully', 'success');
                this.modalService.closeModal();
                this.loadTeams();
              },
              error: () => {
                this.toast.show('Failed to create team', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: () => {
        this.isAddLoading.set(false);
        this.toast.show('Failed to load team options', 'error');
      },
    });
  }

  editTeam(team: Team): void {
    this.editingTeamId.set(team.id);

    forkJoin({
      ageGroups: this.teamOptionsService.getTeamAgeGroups(),
      levels: this.teamOptionsService.getTeamLevels(),
      divisions: this.teamOptionsService.getDivisions(),
    }).subscribe({
      next: ({ ageGroups, levels, divisions }) => {
        this.editingTeamId.set(null);
        this.modalService.openModal(TeamFormModal, {
          name: 'Edit Team',
          icon: 'groups',
          width: '900px',
          maxWidth: '95vw',
          data: {
            team: team,
            isEditMode: true,
            ageGroups,
            levels,
            divisions,
          } as TeamFormModalData,
          onCloseWithDataProcessing: (result) => {
            const { logoFile, logoRemoved, ...teamData } = result as Partial<Team> & {
              logoFile?: File;
              logoRemoved?: boolean;
            };
            this.teamService.updateTeam(teamData.id!, teamData, logoFile, logoRemoved).subscribe({
              next: (updatedTeam) => {
                this.toast.show('Team updated successfully', 'success');
                this.modalService.closeModal();
                const currentTeams = this.teams();
                const index = currentTeams.findIndex((t) => t.id === updatedTeam.id);
                if (index !== -1) {
                  const newTeams = [...currentTeams];
                  newTeams[index] = updatedTeam;
                  this.teams.set(newTeams);
                }
              },
              error: () => {
                this.toast.show('Failed to update team', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: () => {
        this.editingTeamId.set(null);
        this.toast.show('Failed to load team options', 'error');
      },
    });
  }
}
