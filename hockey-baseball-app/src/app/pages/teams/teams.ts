import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TeamService } from '../../services/team.service';
import { Team } from '../../shared/interfaces/team.interface';
import { TeamFormModalComponent, TeamFormModalData } from '../../shared/components/team-form-modal/team-form-modal';
import { TeamOptionsService } from '../../services/team-options.service';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { visibilityByRoleMap } from './teams.role-map';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
  ],
  template: `
    <div class="page-content" [appVisibilityMap]="visibilityByRoleMap">

      <!-- Header with Add Button -->
      <div class="teams-header">
        <div class="teams-header-left"></div>
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

      <!-- Team Cards -->
      @if (!loading() && teams().length > 0) {
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
                <app-button
                  [bg]="'secondary'"
                  [bghover]="'secondary_tone1'"
                  [color]="'white'"
                  [colorhover]="'white'"
                  [materialIcon]="'people'"
                  [haveContent]="true"
                  (clicked)="viewTeamPlayers(team)"
                  class="action-button"
                >
                  Players
                </app-button>
                <app-button
                  [bg]="'secondary'"
                  [bghover]="'secondary_tone1'"
                  [color]="'white'"
                  [colorhover]="'white'"
                  [materialIcon]="'sports_hockey'"
                  [haveContent]="true"
                  (clicked)="viewTeamGoalies(team)"
                  class="action-button"
                >
                  Goalies
                </app-button>
                <app-button
                  [bg]="'green'"
                  [bghover]="'green'"
                  [color]="'white'"
                  [colorhover]="'white'"
                  [materialIcon]="'visibility'"
                  [haveContent]="true"
                  (clicked)="viewTeamProfile(team)"
                  class="action-button"
                >
                  View
                </app-button>
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

  teams = signal<Team[]>([]);
  loading = signal(true);

  ngOnInit(): void {
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
