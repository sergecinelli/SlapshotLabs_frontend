import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { TeamService } from '../../services/team.service';
import { Team } from '../../shared/interfaces/team.interface';
import { TeamFormModalComponent, TeamFormModalData } from '../../shared/components/team-form-modal/team-form-modal';
import { TeamOptionsService } from '../../services/team-options.service';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './teams.role-map';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    DataTableComponent,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    ComponentVisibilityByRoleDirective,
  ],
  template: `
    <div class="p-6 pt-0" [appVisibilityMap]="visibilityByRoleMap">
      <app-page-header title="Teams"></app-page-header>

      <!-- Add Team Button -->
      <div class="mb-4 flex justify-end" role-visibility-name="add-team-button">
        <button
          mat-raised-button
          color="primary"
          (click)="openAddTeamModal()"
          class="add-team-btn"
        >
          <mat-icon>add</mat-icon>
          Add a Team
        </button>
      </div>

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
  `,
  styleUrl: './teams.scss',
})
export class TeamsComponent implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private teamOptionsService = inject(TeamOptionsService);

  teams = signal<Team[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Team Name', sortable: true, width: '150px' },
    { key: 'group', label: 'Group', sortable: true, width: '100px' },
    { key: 'level', label: 'Level', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'division', label: 'Division', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'gamesPlayed', label: 'GP', sortable: true, type: 'number', width: '60px' },
    { key: 'wins', label: 'Wins', sortable: true, type: 'number', width: '70px' },
    { key: 'losses', label: 'Losses', sortable: true, type: 'number', width: '75px' },
    { key: 'ties', label: 'Ties', sortable: true, type: 'number', width: '60px' },
    { key: 'points', label: 'Points', sortable: true, type: 'number', width: '75px' },
    { key: 'goalsFor', label: 'Goals For', sortable: true, type: 'number', width: '90px' },
    { key: 'goalsAgainst', label: 'Goals Against', sortable: true, type: 'number', width: '110px' },
  ];

  tableActions: TableAction[] = [
    {
      label: 'Delete', action: 'delete', variant: 'danger', roleVisibilityName: 'delete-action',
      roleVisibilityTeamId: (item: Record<string, unknown>) => item['id']?.toString() ?? '',
    },
    {
      label: 'Edit', action: 'edit', variant: 'secondary', roleVisibilityName: 'edit-action',
      roleVisibilityTeamId: (item: Record<string, unknown>) => item['id']?.toString() ?? '',
    },
    { label: 'View', action: 'view-profile', variant: 'primary' },
    { label: 'Players', action: 'players', variant: 'secondary' },
    { label: 'Goalies', action: 'goalies', variant: 'secondary' },
  ];

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

  private deleteTeam(team: Team): void {
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

  private viewTeamProfile(team: Team): void {
    // Build the full URL including the base URL
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/team-profile/${team.id}`;

    window.location.assign(url);
  }

  private viewTeamPlayers(team: Team): void {
    // Navigate to players page with team context
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/teams/players?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}`;

    window.location.assign(url);
  }

  private viewTeamGoalies(team: Team): void {
    // Navigate to goalies page with team context
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/teams/goalies?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}`;

    window.location.assign(url);
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

  private editTeam(team: Team): void {
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
