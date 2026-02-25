import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { GoalieService } from '../../services/goalie.service';
import { TeamService } from '../../services/team.service';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Team } from '../../shared/interfaces/team.interface';
import {
  GoalieFormModalComponent,
  GoalieFormModalData,
} from '../../shared/components/goalie-form-modal/goalie-form-modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ButtonRouteComponent } from '../../shared/components/buttons/button-route/button-route.component';
import { visibilityByRoleMap } from './goalies.role-map';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { LocalStorageService, StorageKey } from '../../services/local-storage.service';

@Component({
  selector: 'app-goalies',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
    ButtonRouteComponent,
    DataTableComponent,
  ],
  template: `
    <div class="page-content" [appVisibilityMap]="visibilityByRoleMap">

      <!-- Header with Add Button -->
      <div class="goalies-header">
        <div class="goalies-header-left">
          <h2>{{ pageTitle() }}</h2>
        </div>
        <div class="goalies-header-actions" style="display: flex; gap: 10px; align-items: center;">
          <!-- View Toggle Button -->
          <app-button
            [materialIcon]="layoutMode() === 'card' ? 'table_rows' : 'grid_view'"
            [bg]="'white'"
            [bghover]="'gray_tone3'"
            [color]="'text_primary'"
            [colorhover]="'primary'"
            [width]="'auto'"
            [rounded]="false"
            [haveContent]="true"
            (clicked)="toggleLayout()"
          >
            {{ layoutMode() === 'card' ? 'Table View' : 'Card View' }}
          </app-button>

          <div class="add-goalie-button-wrapper" role-visibility-name="add-goalie-button" [attr.role-visibility-team-id]="teamId()">
            <app-button
              materialIcon="add"
              [bg]="'primary'"
              [bghover]="'primary_dark'"
              [color]="'white'"
              [colorhover]="'white'"
              [opacity]="1"
              [opacityhover]="1"
              [width]="'auto'"
              [rounded]="false"
              [haveContent]="true"
              (clicked)="openAddGoalieModal()"
            >
              Add a Goalie
            </app-button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="goalies-loading">
          <div class="loading-text">Loading goalies...</div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && goalies().length === 0) {
        <div class="goalies-empty">
          <div class="empty-text">No goalies found.</div>
        </div>
      }

      <!-- Content based on layout mode -->
      @if (!loading() && goalies().length > 0) {
        @if (layoutMode() === 'card') {
          <!-- Card View -->
          <div class="goalies-cards-container">
            @for (goalie of goalies(); track goalie.id) {
              <div class="goalie-card">
                <!-- Card Header -->
                <div class="goalie-card-header">
                  <div class="header-left">
                    <div class="goalie-name-row">
                      <div class="goalie-avatar">
                        {{ getGoalieInitials(goalie) }}
                      </div>
                      <div class="goalie-name-group">
                        <div 
                          class="goalie-name goalie-link"
                          (click)="viewGoalieProfile(goalie)"
                          (keyup.enter)="viewGoalieProfile(goalie)"
                          (keyup.space)="viewGoalieProfile(goalie)"
                          tabindex="0"
                          role="button"
                          [attr.aria-label]="'View ' + goalie.firstName + ' ' + goalie.lastName + ' profile'"
                        >{{ goalie.firstName }} {{ goalie.lastName }}</div>
                        <div class="goalie-jersey-row">
                          @if (goalie.jerseyNumber) {
                            <div class="goalie-jersey">#{{ goalie.jerseyNumber }}</div>
                          }
                          @if (goalie.birthYear) {
                            <div class="goalie-info-item">
                              <span class="goalie-info-label">Birth Year:</span>
                              <span class="goalie-info-value">{{ goalie.birthYear }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    <div class="goalie-info-row">
                      <div class="goalie-info-item">
                        <span class="goalie-info-label">Position:</span>
                        <span class="goalie-info-value">{{ goalie.position || 'Goalie' }}</span>
                      </div>
                      @if (goalie.height) {
                        <div class="goalie-info-item">
                          <span class="goalie-info-label">Height:</span>
                          <span class="goalie-info-value">{{ goalie.height }}</span>
                        </div>
                      }
                      @if (goalie.weight) {
                        <div class="goalie-info-item">
                          <span class="goalie-info-label">Weight:</span>
                          <span class="goalie-info-value">{{ goalie.weight }} lbs</span>
                        </div>
                      }
                      @if (goalie.shoots) {
                        <div class="goalie-info-item">
                          <span class="goalie-info-label">Shoots:</span>
                          <span class="goalie-info-value">{{ goalie.shoots }}</span>
                        </div>
                      }
                      @if (goalie.team) {
                        <div class="goalie-info-item">
                          <span class="goalie-info-label">Team:</span>
                          <div class="team-name-with-logo">
                            @if (goalie['teamLogo']) {
                              <img [src]="goalie['teamLogo']" [alt]="goalie.team" class="team-logo-small" />
                            }
                            @if (goalie.teamId) {
                              <span
                                class="goalie-info-value team-link"
                                (click)="goToTeamProfile(goalie.teamId)"
                                (keyup.enter)="goToTeamProfile(goalie.teamId)"
                                (keyup.space)="goToTeamProfile(goalie.teamId)"
                                tabindex="0"
                                role="button"
                                [attr.aria-label]="'View ' + goalie.team + ' profile'"
                              >{{ goalie.team }}</span>
                            } @else {
                              <span class="goalie-info-value">{{ goalie.team }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Stats Section -->
                <div class="goalie-stats-section">
                  <div class="stats-grid">
                    <div class="stat-item">
                      <div class="stat-label">GP</div>
                      <div class="stat-value">{{ goalie.gamesPlayed || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">W</div>
                      <div class="stat-value">{{ goalie.wins || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">Saves</div>
                      <div class="stat-value">{{ goalie.saves || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">GA</div>
                      <div class="stat-value">{{ goalie.goalsAgainst || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">L</div>
                      <div class="stat-value">{{ goalie.losses || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">SOG</div>
                      <div class="stat-value">{{ goalie.shotsOnGoal || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">G</div>
                      <div class="stat-value">{{ goalie.goals || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">A</div>
                      <div class="stat-value">{{ goalie.assists || 0 }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">PTS</div>
                      <div class="stat-value stat-value-highlight">{{ goalie.points || 0 }}</div>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="goalie-card-actions">
                  <app-button-route
                    [route]="'/teams-and-rosters/goalies/' + goalie.id + '/spray-chart'"
                    [bg]="'secondary'"
                    [bghover]="'secondary_dark'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    [materialIcon]="'scatter_plot'"
                    [haveContent]="true"
                    class="action-button"
                  >
                    Spray Chart
                  </app-button-route>
                  <app-button-route
                    [route]="'/teams-and-rosters/goalies/' + goalie.id + '/profile'"
                    [bg]="'green'"
                    [bghover]="'green_dark'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    [materialIcon]="'visibility'"
                    [haveContent]="true"
                    class="action-button"
                  >
                    Profile
                  </app-button-route>
                  <app-button
                    [bg]="'orange'"
                    [bghover]="'orange_dark'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    materialIcon="stylus"
                    [haveContent]="true"
                    (clicked)="editGoalie(goalie)"
                    class="action-button"
                    role-visibility-name="edit-action"
                  >
                    Edit
                  </app-button>
                  <app-button
                    [bg]="'primary'"
                    [bghover]="'primary_dark'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    [materialIcon]="'delete'"
                    [haveContent]="true"
                    (clicked)="deleteGoalie(goalie)"
                    class="action-button"
                    role-visibility-name="delete-action"
                  >
                    Delete
                  </app-button>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Table View -->
          <div class="goalies-table-container">
            <app-data-table
              [columns]="tableColumns"
              [data]="goalies()"
              [actions]="tableActions"
              [loading]="loading()"
              (actionClick)="onActionClick($event)"
              (sort)="onSort($event)"
              emptyMessage="No goalies found."
            ></app-data-table>
          </div>
        }
      }
    </div>
  `,
  styleUrl: './goalies.scss',
})
export class GoaliesComponent implements OnInit {
  // Role-based visibility map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private goalieService = inject(GoalieService);
  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storage = inject(LocalStorageService);

  goalies = signal<Goalie[]>([]);
  teams: Team[] = []; // Store teams to pass to modals
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
    { label: 'Spray Chart', action: 'shot-spray-chart', variant: 'secondary', icon: 'scatter_plot' },
    { label: 'Profile', action: 'view-profile', variant: 'primary', icon: 'visibility' },
    { label: 'Edit', action: 'edit', variant: 'secondary', icon: 'stylus', roleVisibilityName: 'edit-action' },
    { label: 'Delete', action: 'delete', variant: 'danger', icon: 'delete', roleVisibilityName: 'delete-action' },
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
    if (confirm(`Are you sure you want to delete ${goalie.firstName} ${goalie.lastName}?`)) {
      this.goalieService.deleteGoalie(goalie.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedGoalies = this.goalies().filter((g) => g.id !== goalie.id);
            this.goalies.set(updatedGoalies);
            // this.snackBar.open(
            //   `Goalie ${goalie.firstName} ${goalie.lastName} deleted successfully`,
            //   'Close',
            //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
            // );
          } else {
            // this.snackBar.open(
            //   'Failed to delete goalie. Please try again.',
            //   'Close',
            //   { duration: 3000, panelClass: ['custom-snackbar', 'error-snackbar'] }
            // );
          }
        },
        error: (error) => {
          console.error('Error deleting goalie:', error);
          // this.snackBar.open(
          //   'Error deleting goalie. Please try again.',
          //   'Close',
          //   { duration: 3000, panelClass: ['custom-snackbar', 'error-snackbar'] }
          // );
        },
      });
    }
  }

  viewGoalieProfile(goalie: Goalie): void {
    this.router.navigate(['/teams-and-rosters/goalies', goalie.id, 'profile']);
  }

  goToTeamProfile(teamId: number): void {
    this.router.navigate([`/teams-and-rosters/teams/${teamId}/profile`]);
  }

  viewShotSprayChart(goalie: Goalie): void {
    this.router.navigate(['/teams-and-rosters/goalies', goalie.id, 'spray-chart']);
  }

  openAddGoalieModal(): void {
    const dialogRef = this.dialog.open(GoalieFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isEditMode: false,
        teams: this.teams,
        teamId: this.teamId(),
        teamName: this.teamName(),
      } as GoalieFormModalData,
      panelClass: 'goalie-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addGoalie(result);
      }
    });
  }

  private addGoalie(goalieData: Partial<Goalie>): void {
    this.goalieService.addGoalie(goalieData).subscribe({
      next: (newGoalie) => {
        const currentGoalies = this.goalies();
        // Add new goalie at the beginning (newest first)
        const updatedGoalies = [newGoalie, ...currentGoalies];
        this.goalies.set(updatedGoalies);
        // this.snackBar.open(
        //   `Goalie ${newGoalie.firstName} ${newGoalie.lastName} added successfully`,
        //   'Close',
        //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
        // );
      },
      error: (error) => {
        console.error('Error adding goalie:', error);
      },
    });
  }

  editGoalie(goalie: Goalie): void {
    const dialogRef = this.dialog.open(GoalieFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        goalie: goalie,
        isEditMode: true,
        teams: this.teams,
        teamId: this.teamId(),
        teamName: this.teamName(),
      } as GoalieFormModalData,
      panelClass: 'goalie-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateGoalie(result);
      }
    });
  }

  private updateGoalie(goalieData: Partial<Goalie>): void {
    this.goalieService.updateGoalie(goalieData.id!, goalieData).subscribe({
      next: (updatedGoalie) => {
        const currentGoalies = this.goalies();
        const index = currentGoalies.findIndex((g) => g.id === updatedGoalie.id);
        if (index !== -1) {
          const newGoalies = [...currentGoalies];
          newGoalies[index] = updatedGoalie;
          this.goalies.set(newGoalies);
          // this.snackBar.open(
          //   `Goalie ${updatedGoalie.firstName} ${updatedGoalie.lastName} updated successfully`,
          //   'Close',
          //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
          // );
        }
      },
      error: (error) => {
        console.error('Error updating goalie:', error);
      },
    });
  }
}
