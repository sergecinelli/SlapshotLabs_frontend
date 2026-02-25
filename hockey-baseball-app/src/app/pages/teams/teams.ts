import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TeamService } from '../../services/team.service';
import { Team } from '../../shared/interfaces/team.interface';
import { TeamFormModalComponent, TeamFormModalData } from '../../shared/components/team-form-modal/team-form-modal';
import { TeamOptionsService } from '../../services/team-options.service';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ButtonRouteComponent } from '../../shared/components/buttons/button-route/button-route.component';
import { visibilityByRoleMap } from './teams.role-map';
import { forkJoin } from 'rxjs';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { LocalStorageService, StorageKey } from '../../services/local-storage.service';

@Component({
  selector: 'app-teams',
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
      <div class="teams-header">
        <div class="teams-header-left"></div>
        <div class="teams-header-actions" style="display: flex; gap: 10px; align-items: center;">
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

          <div class="add-team-button-wrapper" role-visibility-name="add-team-button">
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
              (clicked)="openAddTeamModal()"
            >
              Add a Team
            </app-button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="teams-loading">
          <div class="loading-text">Loading teams...</div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && teams().length === 0) {
        <div class="teams-empty">
          <div class="empty-text">No teams found.</div>
        </div>
      }

      <!-- Content based on layout mode -->
      @if (!loading() && teams().length > 0) {
        @if (layoutMode() === 'card') {
          <!-- Card View -->
          <div class="teams-cards-container">
            @for (team of teams(); track team.id) {
              <div class="team-card">
                <!-- Card Header -->
                <div class="team-card-header">
                  <div class="header-left">
                    <div class="team-name-row">
                      @if (team.logo) {
                        <img [src]="team.logo" [alt]="team.name" class="team-logo" />
                      } @else {
                        <div class="team-logo-placeholder"></div>
                      }
                      <div class="team-name-group">
                        <div 
                          class="team-name team-link"
                          (click)="viewTeamProfile(team)"
                          (keyup.enter)="viewTeamProfile(team)"
                          (keyup.space)="viewTeamProfile(team)"
                          tabindex="0"
                          role="button"
                          [attr.aria-label]="'View ' + team.name + ' profile'"
                        >{{ team.name }}</div>
                        @if (team.abbreviation) {
                          <div class="team-abbreviation">{{ team.abbreviation }}</div>
                        }
                      </div>
                    </div>
                    <div class="team-info-row">
                      <div class="team-info-item">
                        <span class="team-info-label">Group:</span>
                        <span class="team-info-value">{{ team.group }}</span>
                      </div>
                      <div class="team-info-item">
                        <span class="team-info-label">Level:</span>
                        <span class="team-info-value">{{ team.level }}</span>
                      </div>
                      @if (team.division) {
                        <div class="team-info-item">
                          <span class="team-info-label">Division:</span>
                          <span class="team-info-value">{{ team.division }}</span>
                        </div>
                      }
                      @if (team.city) {
                        <div class="team-info-item">
                          <span class="team-info-label">City:</span>
                          <span class="team-info-value">{{ team.city }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Stats Section -->
                <div class="team-stats-section">
                  <div class="stats-grid">
                    <div class="stat-item">
                      <div class="stat-label">GP</div>
                      <div class="stat-value">{{ team.gamesPlayed }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">W</div>
                      <div class="stat-value">{{ team.wins }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">L</div>
                      <div class="stat-value">{{ team.losses }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">T</div>
                      <div class="stat-value">{{ team.ties }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">PTS</div>
                      <div class="stat-value stat-value-highlight">{{ team.points }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">GF</div>
                      <div class="stat-value">{{ team.goalsFor }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">GA</div>
                      <div class="stat-value">{{ team.goalsAgainst }}</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-label">GD</div>
                      <div class="stat-value">{{ team.goalsFor - team.goalsAgainst }}</div>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="team-card-actions">
                  <app-button-route
                    [route]="'/teams-and-rosters/players'"
                    [queryParams]="getPlayersQueryParams(team)"
                    [bg]="'secondary'"
                    [bghover]="'secondary_tone1'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    [materialIcon]="'people'"
                    [haveContent]="true"
                    class="action-button"
                  >
                    Players
                  </app-button-route>
                  <app-button-route
                    [route]="'/teams-and-rosters/goalies'"
                    [queryParams]="getGoaliesQueryParams(team)"
                    [bg]="'secondary'"
                    [bghover]="'secondary_tone1'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    [materialIcon]="'sports_hockey'"
                    [haveContent]="true"
                    class="action-button"
                  >
                    Goalies
                  </app-button-route>
                  <app-button-route
                    [route]="'/teams-and-rosters/teams/team-profile/' + team.id"
                    [bg]="'green'"
                    [bghover]="'green'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    [materialIcon]="'visibility'"
                    [haveContent]="true"
                    class="action-button"
                  >
                    View
                  </app-button-route>
                  <app-button
                    [bg]="'orange'"
                    [bghover]="'orange'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    materialIcon="stylus"
                    [haveContent]="true"
                    (clicked)="editTeam(team)"
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
                    (clicked)="deleteTeam(team)"
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
          <div class="teams-table-container">
            <app-data-table
              [columns]="tableColumns"
              [data]="teams()"
              [actions]="tableActions"
              [loading]="loading()"
              (actionClick)="onActionClick($event)"
              (sort)="onSort($event)"
              emptyMessage="No teams found."
            ></app-data-table>
          </div>
        }
      }
    </div>
  `,
  styleUrl: './teams.scss',
})
export class TeamsComponent implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private teamOptionsService = inject(TeamOptionsService);
  private router = inject(Router);
  private storage = inject(LocalStorageService);

  teams = signal<Team[]>([]);
  loading = signal(true);
  layoutMode = signal<'card' | 'table'>('table'); // Default to table

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Team Name', sortable: true, width: '150px' },
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
    { label: 'Players', action: 'players', variant: 'secondary', icon: 'people' },
    { label: 'Goalies', action: 'goalies', variant: 'secondary', icon: 'sports_hockey' },
    { label: 'View', action: 'view-profile', variant: 'primary', icon: 'visibility' },
    { label: 'Edit', action: 'edit', variant: 'secondary', icon: 'stylus', roleVisibilityName: 'edit-action' },
    { label: 'Delete', action: 'delete', variant: 'danger', icon: 'delete', roleVisibilityName: 'delete-action' },
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
    if (confirm(`Are you sure you want to delete ${team.name}?`)) {
      this.teamService.deleteTeam(team.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedTeams = this.teams().filter((t) => t.id !== team.id);
            this.teams.set(updatedTeams);
            // this.snackBar.open(
            //   `Team ${team.name} deleted successfully`,
            //   'Close',
            //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
            // );
          } else {
            // this.snackBar.open(
            //   'Failed to delete team. Please try again.',
            //   'Close',
            //   { duration: 3000, panelClass: ['custom-snackbar', 'error-snackbar'] }
            // );
          }
        },
        error: (error) => {
          console.error('Error deleting team:', error);
          // this.snackBar.open(
          //   'Error deleting team. Please try again.',
          //   'Close',
          //   { duration: 3000, panelClass: ['custom-snackbar', 'error-snackbar'] }
          // );
        },
      });
    }
  }

  viewTeamProfile(team: Team): void {
    this.router.navigate(['/teams-and-rosters/teams/team-profile', team.id]);
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

  openAddTeamModal(): void {
    const dialogRef = this.dialog.open(TeamFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isEditMode: false,
      } as TeamFormModalData,
      panelClass: 'team-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addTeam(result);
      }
    });
  }

  editTeam(team: Team): void {
    const dialogRef = this.dialog.open(TeamFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        team: team,
        isEditMode: true,
      } as TeamFormModalData,
      panelClass: 'team-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateTeam(result);
      }
    });
  }

  private addTeam(teamData: Partial<Team> & { logoFile?: File; logoRemoved?: boolean }): void {
    const { logoFile, ...team } = teamData;
    this.teamService.addTeam(team, logoFile).subscribe({
      next: () => {
        // Refresh the entire list to ensure data consistency
        this.loadTeams();
        // this.snackBar.open(
        //   `Team ${newTeam.name} added successfully`,
        //   'Close',
        //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
        // );
      },
      error: (error) => {
        console.error('Error adding team:', error);
      },
    });
  }

  private updateTeam(teamData: Partial<Team> & { logoFile?: File; logoRemoved?: boolean }): void {
    const { logoFile, logoRemoved, ...team } = teamData;
    this.teamService.updateTeam(team.id!, team, logoFile, logoRemoved).subscribe({
      next: (updatedTeam) => {
        const currentTeams = this.teams();
        const index = currentTeams.findIndex((t) => t.id === updatedTeam.id);
        if (index !== -1) {
          const newTeams = [...currentTeams];
          newTeams[index] = updatedTeam;
          this.teams.set(newTeams);
          // this.snackBar.open(
          //   `Team ${updatedTeam.name} updated successfully`,
          //   'Close',
          //   { duration: 3000, panelClass: ['custom-snackbar', 'success-snackbar'] }
          // );
        }
      },
      error: (error) => {
        console.error('Error updating team:', error);
      },
    });
  }
}
