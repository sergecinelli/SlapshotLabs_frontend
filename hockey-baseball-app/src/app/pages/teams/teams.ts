import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { TeamService } from '../../services/team.service';
import { Team } from '../../shared/interfaces/team.interface';
import { TeamFormModalComponent, TeamFormModalData } from '../../shared/components/team-form-modal/team-form-modal';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Teams"></app-page-header>
      
      <!-- Add Team Button -->
      <div class="mb-4 flex justify-end">
        <button 
          mat-raised-button 
          color="primary" 
          (click)="openAddTeamModal()"
          class="add-team-btn">
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
  styleUrl: './teams.scss'
})
export class TeamsComponent implements OnInit {
  private teamService = inject(TeamService);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);

  teams = signal<Team[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Team Name', sortable: true, width: '150px' },
    { key: 'level', label: 'Level', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'division', label: 'Division', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'gamesPlayed', label: 'GP', sortable: true, type: 'number', width: '60px' },
    { key: 'wins', label: 'Wins', sortable: true, type: 'number', width: '70px' },
    { key: 'losses', label: 'Losses', sortable: true, type: 'number', width: '75px' },
    { key: 'points', label: 'Points', sortable: true, type: 'number', width: '75px' },
    { key: 'goalsFor', label: 'Goals For', sortable: true, type: 'number', width: '90px' },
    { key: 'goalsAgainst', label: 'Goals Against', sortable: true, type: 'number', width: '110px' }
  ];

  tableActions: TableAction[] = [
    { label: 'Delete', action: 'delete', variant: 'danger' },
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'View', action: 'view-profile', variant: 'primary' }
  ];

  ngOnInit(): void {
    this.loadTeams();
  }

  private loadTeams(): void {
    this.loading.set(true);
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams.set(data.teams);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading teams:', error);
        this.loading.set(false);
      }
    });
  }

  onActionClick(event: { action: string, item: Team }): void {
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
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  onSort(event: { column: string, direction: 'asc' | 'desc' }): void {
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
    return path.split('.').reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  private deleteTeam(team: Team): void {
    if (confirm(`Are you sure you want to delete ${team.name}?`)) {
      this.teamService.deleteTeam(team.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedTeams = this.teams().filter(t => t.id !== team.id);
            this.teams.set(updatedTeams);
            console.log('Team deleted successfully');
          }
        },
        error: (error) => {
          console.error('Error deleting team:', error);
        }
      });
    }
  }

  private viewTeamProfile(team: Team): void {
    console.log('Opening profile for team:', team.name, 'ID:', team.id);
    
    // Build the full URL including the base URL
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/team-profile/${team.id}`;
    
    console.log('Opening URL:', url);
    
    // Try to open the new tab
    const newTab = window.open(url, '_blank');
    
    // Check if popup was blocked
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      console.warn('Popup blocked! Trying alternative method.');
      // Fallback: create a link and click it
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.log('New tab opened successfully');
    }
  }

  openAddTeamModal(): void {
    const dialogRef = this.dialog.open(TeamFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isEditMode: false
      } as TeamFormModalData,
      panelClass: 'team-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
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
        isEditMode: true
      } as TeamFormModalData,
      panelClass: 'team-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateTeam(result);
      }
    });
  }

  private addTeam(teamData: Partial<Team>): void {
    this.teamService.addTeam(teamData).subscribe({
      next: (newTeam) => {
        const currentTeams = this.teams();
        this.teams.set([...currentTeams, newTeam]);
        console.log('Team added successfully');
      },
      error: (error) => {
        console.error('Error adding team:', error);
      }
    });
  }

  private updateTeam(teamData: Partial<Team>): void {
    this.teamService.updateTeam(teamData.id!, teamData).subscribe({
      next: (updatedTeam) => {
        const currentTeams = this.teams();
        const index = currentTeams.findIndex(t => t.id === updatedTeam.id);
        if (index !== -1) {
          const newTeams = [...currentTeams];
          newTeams[index] = updatedTeam;
          this.teams.set(newTeams);
          console.log('Team updated successfully');
        }
      },
      error: (error) => {
        console.error('Error updating team:', error);
      }
    });
  }
}
