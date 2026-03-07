import { Component, OnInit, signal, inject } from '@angular/core';
import { ModalEvent, ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GoalieService } from '../../services/goalie.service';
import { TeamService } from '../../services/team.service';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Team } from '../../shared/interfaces/team.interface';
import {
  GoalieFormModal,
  GoalieFormModalData,
} from '../../shared/components/goalie-form-modal/goalie-form.modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ButtonRouteComponent } from '../../shared/components/buttons/button-route/button-route.component';
import { PositionService } from '../../services/position.service';
import { visibilityByRoleMap } from './goalies.role-map';
import { DisplayTextModal } from '../../shared/components/display-text-modal/display-text.modal';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { LocalStorageService, StorageKey } from '../../services/local-storage.service';
import { TryoutService } from '../../services/tryout.service';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { AnalyticsApiIn } from '../../shared/interfaces/analysis.interface';
import { GoalieAnalysisModal } from '../../shared/components/goalie-analysis-modal/goalie-analysis.modal';
import { CachedSrcDirective } from '../../shared/directives/cached-src.directive';
import { CardGridComponent } from '../../shared/components/card-grid/card-grid.component';
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';

@Component({
  selector: 'app-goalies',
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
    RouterLink,
    BreadcrumbActionsDirective,
  ],
  templateUrl: './goalies.page.html',
  styleUrl: './goalies.page.scss',
})
export class GoaliesPage implements OnInit {
  // Role-based visibility map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private goalieService = inject(GoalieService);
  private teamService = inject(TeamService);
  private modalService = inject(ModalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storage = inject(LocalStorageService);
  private tryoutService = inject(TryoutService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private positionService = inject(PositionService);
  private analysisService = inject(AnalysisService);

  goalies = signal<Goalie[]>([]);
  teams: Team[] = []; // Store teams to pass to modals
  editingGoalieId = signal<string | null>(null);
  analysisLoadingId = signal<string | null>(null);
  isAddLoading = signal(false);
  loading = signal(true);
  teamId = signal<string | null>(null);
  teamName = signal<string>('Goalies');
  pageTitle = signal<string>('Goalies');
  layoutMode = signal<'card' | 'table'>('table'); // Default to table
  tableColumns: TableColumn[] = [
    { key: 'firstName', label: 'First Name', sortable: true, width: '120px' },
    { key: 'lastName', label: 'Last Name', sortable: true, width: '120px' },
    { key: 'jerseyNumber', label: '#', sortable: true, type: 'number', width: '50px' },
    { key: 'position', label: 'Position', sortable: true, width: '100px' },
    { key: 'team', label: 'Team', sortable: true, width: '150px' },
    { key: 'gamesPlayed', label: 'GP', sortable: true, type: 'number', width: '60px' },
    { key: 'wins', label: 'W', sortable: true, type: 'number', width: '60px' },
    { key: 'losses', label: 'L', sortable: true, type: 'number', width: '60px' },
    { key: 'saves', label: 'Saves', sortable: true, type: 'number', width: '60px' },
    { key: 'goalsAgainst', label: 'GA', sortable: true, type: 'number', width: '60px' },
    { key: 'shotsOnGoal', label: 'SOG', sortable: true, type: 'number', width: '60px' },
    { key: 'goals', label: 'G', sortable: true, type: 'number', width: '60px' },
    { key: 'assists', label: 'A', sortable: true, type: 'number', width: '60px' },
    { key: 'points', label: 'PTS', sortable: true, type: 'number', width: '60px' },
  ];

  tableActions: TableAction[] = [
    {
      label: 'Enter Analysis',
      action: 'analysis',
      variant: 'blue',
      icon: 'bar_chart',
      isLoading: (item) => this.analysisLoadingId() === item['id'],
    },
    {
      label: 'Spray Chart',
      action: 'shot-spray-chart',
      variant: 'purple',
      icon: 'scatter_plot',
      iconOnly: true,
    },
    {
      label: 'Add To Tryout',
      action: 'add-to-tryout',
      variant: 'gray',
      icon: 'person_add',
      iconOnly: true,
    },
    {
      label: 'Profile',
      action: 'view-profile',
      variant: 'green',
      icon: 'visibility',
      iconOnly: true,
      route: (item) => `/teams-and-rosters/goalies/${item['id']}/profile`,
    },
    {
      label: 'Edit',
      action: 'edit',
      variant: 'orange',
      icon: 'stylus',
      iconOnly: true,
      roleVisibilityName: 'edit-action',
      roleVisibilityTeamId: (item) => item['teamId']?.toString(),
      isLoading: (item) => this.editingGoalieId() === item['id'],
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'red',
      icon: 'delete',
      iconOnly: true,
      roleVisibilityName: 'delete-action',
      roleVisibilityTeamId: (item) => item['teamId']?.toString(),
    },
  ];

  ngOnInit(): void {
    // Initialize layout mode from local storage
    const savedMode = this.storage.get(StorageKey.LayoutMode);
    if (savedMode === 'card' || savedMode === 'table') {
      this.layoutMode.set(savedMode);
    }

    // Check for teamId query parameter
    this.route.queryParams.subscribe((params) => {
      const teamId = params['teamId'];
      const teamName = params['teamName'];

      if (teamId) {
        this.teamId.set(teamId);
        if (teamName) {
          this.teamName.set(teamName);
          this.pageTitle.set(`Goalies | ${teamName}`);
        }
        this.loadGoaliesByTeam(parseInt(teamId, 10));
      } else {
        this.teamId.set(null);
        this.teamName.set('Goalies');
        this.pageTitle.set('Goalies');
        this.loadGoalies();
      }
    });
  }

  toggleLayout(): void {
    const newMode = this.layoutMode() === 'card' ? 'table' : 'card';
    this.layoutMode.set(newMode);
    this.storage.set(StorageKey.LayoutMode, newMode);
  }

  private loadGoalies(): void {
    this.loading.set(true);
    this.goalieService.getGoalies({ excludeDefault: true }).subscribe({
      next: (data) => {
        // Load teams first to get team data for mapping
        this.loadTeams(() => {
          // Map goalies with team information
          const mappedGoalies = data.goalies.map((goalie) => {
            if (goalie.teamId) {
              const team = this.teams.find((t) => parseInt(t.id) === goalie.teamId);
              if (team) {
                return {
                  ...goalie,
                  teamLogo: team.logo,
                };
              }
            }
            return goalie;
          });
          // Sort by creation date (newest to oldest) by default
          const sortedGoalies = this.sortByDate(mappedGoalies, 'desc');
          this.goalies.set(sortedGoalies);
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error loading goalies:', error);
        this.loading.set(false);
      },
    });
  }

  private loadGoaliesByTeam(teamId: number): void {
    this.loading.set(true);
    this.goalieService.getGoaliesByTeam(teamId, { excludeDefault: true }).subscribe({
      next: (goalies) => {
        // Load teams first to get team data for mapping
        this.loadTeams(() => {
          // Map goalies with team information
          const mappedGoalies = goalies.map((goalie) => {
            if (goalie.teamId) {
              const team = this.teams.find((t) => parseInt(t.id) === goalie.teamId);
              if (team) {
                return {
                  ...goalie,
                  teamLogo: team.logo,
                };
              }
            }
            return goalie;
          });
          // Sort by creation date (newest to oldest) by default
          const sortedGoalies = this.sortByDate(mappedGoalies, 'desc');
          this.goalies.set(sortedGoalies);
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error loading goalies for team:', error);
        this.loading.set(false);
      },
    });
  }

  private loadTeams(callback?: () => void): void {
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams = data.teams;
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.error('Error loading teams:', error);
        if (callback) {
          callback();
        }
      },
    });
  }

  onActionClick(event: { action: string; item: Goalie }): void {
    const { action, item } = event;

    switch (action) {
      case 'delete':
        this.deleteGoalie(item);
        break;
      case 'edit':
        this.editGoalie(item);
        break;
      case 'view-profile':
        this.viewGoalieProfile(item);
        break;
      case 'shot-spray-chart':
        this.viewShotSprayChart(item);
        break;
      case 'analysis':
        this.viewGoalieAnalysis(item);
        break;
      case 'add-to-tryout':
        this.addToTryout(item);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  onSort(event: { column: string; direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sortedGoalies = [...this.goalies()].sort((a, b) => {
      const aValue = this.getNestedValue(a, column);
      const bValue = this.getNestedValue(b, column);

      if (aValue === bValue) return 0;

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = (aValue as string | number) < (bValue as string | number) ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });

    this.goalies.set(sortedGoalies);
  }

  private getNestedValue(obj: Goalie, path: string): unknown {
    return path
      .split('.')
      .reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  private sortByDate(goalies: Goalie[], direction: 'asc' | 'desc'): Goalie[] {
    return [...goalies].sort((a, b) => {
      const aDate = a.createdAt || new Date(0); // Use epoch if no date
      const bDate = b.createdAt || new Date(0);

      const result = aDate.getTime() - bDate.getTime();
      return direction === 'desc' ? -result : result; // desc = newest first
    });
  }

  protected getGoalieInitials(goalie: Goalie): string {
    const first = goalie.firstName?.[0] || '';
    const last = goalie.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'G';
  }

  deleteGoalie(goalie: Goalie): void {
    this.modalService.openModal(DisplayTextModal, {
      name: 'Delete Goalie',
      icon: 'report',
      data: {
        text: `Are you sure you want to delete <b>${goalie.firstName} ${goalie.lastName}</b>?`,
        buttonText: 'Delete',
        buttonIcon: 'delete',
        color: 'primary',
        colorSoft: 'primary_dark',
        withButtonLoading: true,
      },
      onCloseWithDataProcessing: () => {
        this.goalieService.deleteGoalie(goalie.id).subscribe({
          next: (success) => {
            if (success) {
              const updatedGoalies = this.goalies().filter((g) => g.id !== goalie.id);
              this.goalies.set(updatedGoalies);
              this.modalService.closeModal();
              this.toast.show('Goalie deleted successfully', 'success');
            } else {
              this.toast.show('Failed to delete goalie', 'error');
              this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
            }
          },
          error: (error) => {
            console.error('Error deleting goalie:', error);
            this.toast.show('Failed to delete goalie', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  viewGoalieProfile(goalie: Goalie): void {
    this.router.navigate(['/teams-and-rosters/goalies', goalie.id, 'profile']);
  }

  viewShotSprayChart(goalie: Goalie): void {
    this.router.navigate(['/teams-and-rosters/goalies', goalie.id, 'spray-chart']);
  }

  viewGoalieAnalysis(goalie: Goalie): void {
    this.analysisLoadingId.set(goalie.id);
    this.goalieService.getGoalies().subscribe({
      next: (result) => {
        this.analysisLoadingId.set(null);
        this.modalService.openModal(GoalieAnalysisModal, {
          name: 'Create Goalie Analysis',
          icon: 'bar_chart',
          width: '100%',
          maxWidth: '900px',
          data: {
            isEditMode: false,
            preSelectedGoalieId: goalie.id.toString(),
            goalies: result.goalies,
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
                this.router.navigate(['/analytics/goalies']);
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
        this.toast.show('Failed to load goalies', 'error');
      },
    });
  }

  openAddGoalieModal(): void {
    this.isAddLoading.set(true);

    this.positionService.getPositions().subscribe({
      next: (positions) => {
        this.isAddLoading.set(false);
        this.modalService.openModal(GoalieFormModal, {
          name: 'Add Goalie',
          icon: 'sports_hockey',
          width: '800px',
          maxWidth: '95vw',
          data: {
            isEditMode: false,
            teams: this.teams,
            positions: positions,
            teamId: this.teamId(),
            teamName: this.teamName(),
          } as GoalieFormModalData,
          onCloseWithDataProcessing: (result: Partial<Goalie>) => {
            this.goalieService.addGoalie(result).subscribe({
              next: (newGoalie) => {
                this.toast.show('Goalie created successfully', 'success');
                this.modalService.closeModal();
                const currentGoalies = this.goalies();
                const updatedGoalies = [newGoalie, ...currentGoalies];
                this.goalies.set(updatedGoalies);
              },
              error: () => {
                this.toast.show('Failed to create goalie', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: () => {
        this.isAddLoading.set(false);
        this.toast.show('Failed to load positions', 'error');
      },
    });
  }

  editGoalie(goalie: Goalie): void {
    this.editingGoalieId.set(goalie.id);

    this.positionService.getPositions().subscribe({
      next: (positions) => {
        this.editingGoalieId.set(null);
        this.modalService.openModal(GoalieFormModal, {
          name: 'Edit Goalie',
          icon: 'sports_hockey',
          width: '800px',
          maxWidth: '95vw',
          data: {
            goalie: goalie,
            isEditMode: true,
            teams: this.teams,
            positions: positions,
            teamId: this.teamId(),
            teamName: this.teamName(),
          } as GoalieFormModalData,
          onCloseWithDataProcessing: (result: Partial<Goalie>) => {
            this.goalieService.updateGoalie(result.id!, result).subscribe({
              next: (updatedGoalie) => {
                this.toast.show('Goalie updated successfully', 'success');
                this.modalService.closeModal();
                const currentGoalies = this.goalies();
                const index = currentGoalies.findIndex((g) => g.id === updatedGoalie.id);
                if (index !== -1) {
                  const newGoalies = [...currentGoalies];
                  newGoalies[index] = updatedGoalie;
                  this.goalies.set(newGoalies);
                }
              },
              error: () => {
                this.toast.show('Failed to update goalie', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: () => {
        this.editingGoalieId.set(null);
        this.toast.show('Failed to load positions', 'error');
      },
    });
  }

  addToTryout(goalie: Goalie): void {
    const user = this.authService.getCurrentUserValue();
    const teamId = user?.team_id;
    if (!teamId) return;

    this.tryoutService
      .addToTryout(teamId, {
        playerId: goalie.id,
        firstName: goalie.firstName,
        lastName: goalie.lastName,
        position: goalie.position,
        shoots: goalie.shoots,
        jerseyNumber: goalie.jerseyNumber,
        team: goalie.team,
        teamId: goalie.teamId,
        teamLevelName: goalie.level,
        type: 'goalie',
      })
      .subscribe({
        error: (error) => console.error('Failed to add to tryout:', error),
      });
  }
}
