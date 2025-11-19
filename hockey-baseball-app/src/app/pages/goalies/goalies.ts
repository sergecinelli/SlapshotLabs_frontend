import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { GoalieService } from '../../services/goalie.service';
import { TeamService } from '../../services/team.service';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { GoalieFormModalComponent, GoalieFormModalData } from '../../shared/components/goalie-form-modal/goalie-form-modal';
import { Router } from '@angular/router';

@Component({
  selector: 'app-goalies',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Goalies"></app-page-header>
      
      <!-- Add Goalie Button -->
      <div class="mb-4 flex justify-end">
        <button 
          mat-raised-button 
          color="primary" 
          (click)="openAddGoalieModal()"
          class="add-goalie-btn">
          <mat-icon>add</mat-icon>
          Add a Goalie
        </button>
      </div>
      
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
  `,
  styleUrl: './goalies.scss'
})
export class GoaliesComponent implements OnInit {
  private goalieService = inject(GoalieService);
  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  goalies = signal<Goalie[]>([]);
  teams: Team[] = [];  // Store teams to pass to modals
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'team', label: 'Team', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'position', label: 'Pos', sortable: false, width: '75px' },
    { key: 'height', label: 'Ht', sortable: true, width: '65px' },
    { key: 'weight', label: 'Wt', sortable: true, type: 'number', width: '65px' },
    { key: 'shoots', label: 'Shoots (R/L)', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'jerseyNumber', label: 'Jersey #', sortable: true, type: 'number', width: '70px' },
    { key: 'firstName', label: 'First Name', sortable: true, width: '100px' },
    { key: 'lastName', label: 'Last Name', sortable: true, width: '100px' },
    { key: 'birthYear', label: 'Birth Year', sortable: true, type: 'number', width: '90px' },
    { key: 'shotsOnGoal', label: 'SOG', sortable: true, type: 'number', width: '70px' },
    { key: 'saves', label: 'Saves', sortable: true, type: 'number', width: '75px' },
    { key: 'goalsAgainst', label: 'GA', sortable: true, type: 'number', width: '60px' },
    { key: 'shotsOnGoalPerGame', label: 'SOG/Game', sortable: true, type: 'number', width: '90px' },
    { key: 'gamesPlayed', label: 'GP', sortable: true, type: 'number', width: '60px' },
    { key: 'wins', label: 'Wins', sortable: true, type: 'number', width: '65px' },
    { key: 'losses', label: 'Losses', sortable: true, type: 'number', width: '75px' },
    { key: 'goals', label: 'Goals', sortable: true, type: 'number', width: '70px' },
    { key: 'assists', label: 'Assists', sortable: true, type: 'number', width: '75px' },
    { key: 'points', label: 'Pts', sortable: true, type: 'number', width: '60px' },
    { key: 'ppga', label: 'PPGA', sortable: true, type: 'number', width: '70px' },
    { key: 'shga', label: 'SHGA', sortable: true, type: 'number', width: '70px' }
  ];

  tableActions: TableAction[] = [
    { label: 'Delete', action: 'delete', variant: 'danger' },
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'Profile', action: 'view-profile', variant: 'primary' },
    { label: 'Spray Chart', icon: 'spray-chart', action: 'shot-spray-chart', variant: 'secondary', iconOnly: true },
  ];

  ngOnInit(): void {
    this.loadGoalies();
  }

  private loadGoalies(): void {
    this.loading.set(true);
    this.goalieService.getGoalies({ excludeDefault: true }).subscribe({
      next: (data) => {
        // Sort by creation date (newest to oldest) by default
        const sortedGoalies = this.sortByDate(data.goalies, 'desc');
        this.goalies.set(sortedGoalies);
        this.loading.set(false);
        // Fetch all teams separately for modals
        this.loadTeams();
      },
      error: (error) => {
        console.error('Error loading goalies:', error);
        this.loading.set(false);
      }
    });
  }

  private loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (data) => {
        this.teams = data.teams;
      },
      error: (error) => {
        console.error('Error loading teams:', error);
      }
    });
  }

  onActionClick(event: { action: string, item: Goalie }): void {
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

  onSort(event: { column: string, direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sortedGoalies = [...this.goalies()].sort((a, b) => {
      const aValue = this.getNestedValue(a, column);
      const bValue = this.getNestedValue(b, column);
      
      if (aValue === bValue) return 0;
      
      const result = (aValue as string | number) < (bValue as string | number) ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });
    
    this.goalies.set(sortedGoalies);
  }

  private getNestedValue(obj: Goalie, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  private sortByDate(goalies: Goalie[], direction: 'asc' | 'desc'): Goalie[] {
    return [...goalies].sort((a, b) => {
      const aDate = a.createdAt || new Date(0); // Use epoch if no date
      const bDate = b.createdAt || new Date(0);
      
      const result = aDate.getTime() - bDate.getTime();
      return direction === 'desc' ? -result : result; // desc = newest first
    });
  }

  private deleteGoalie(goalie: Goalie): void {
    if (confirm(`Are you sure you want to delete ${goalie.firstName} ${goalie.lastName}?`)) {
      this.goalieService.deleteGoalie(goalie.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedGoalies = this.goalies().filter(g => g.id !== goalie.id);
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
        }
      });
    }
  }

  private viewGoalieProfile(goalie: Goalie): void {
    // Build the full URL including the base URL
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/goalie-profile/${goalie.id}`;
    
    window.location.assign(url);
  }

  private viewShotSprayChart(goalie: Goalie): void {
    this.router.navigate(['/spray-chart', goalie.id]);
  }

  openAddGoalieModal(): void {
    const dialogRef = this.dialog.open(GoalieFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        isEditMode: false,
        teams: this.teams
      } as GoalieFormModalData,
      panelClass: 'goalie-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
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
      }
    });
  }

  private editGoalie(goalie: Goalie): void {
    const dialogRef = this.dialog.open(GoalieFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        goalie: goalie,
        isEditMode: true,
        teams: this.teams
      } as GoalieFormModalData,
      panelClass: 'goalie-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateGoalie(result);
      }
    });
  }

  private updateGoalie(goalieData: Partial<Goalie>): void {
    this.goalieService.updateGoalie(goalieData.id!, goalieData).subscribe({
      next: (updatedGoalie) => {
        const currentGoalies = this.goalies();
        const index = currentGoalies.findIndex(g => g.id === updatedGoalie.id);
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
      }
    });
  }
}
