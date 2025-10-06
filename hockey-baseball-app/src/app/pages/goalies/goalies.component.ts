import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table.component';
import { GoalieService } from '../../services/goalie.service';
import { Goalie } from '../../shared/interfaces/goalie.interface';

@Component({
  selector: 'app-goalies',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Goalies"></app-page-header>
      
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
  styleUrl: './goalies.component.scss'
})
export class GoaliesComponent implements OnInit {
  goalies = signal<Goalie[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'team', label: 'Team', sortable: true, type: 'dropdown', width: '100px' },
    { key: 'position', label: 'Pos', sortable: false, width: '60px' },
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
    { key: 'shotsOnGoalPerGame', label: 'SOG/Game', sortable: true, type: 'number', width: '80px' },
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

  constructor(
    private goalieService: GoalieService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadGoalies();
  }

  private loadGoalies(): void {
    this.loading.set(true);
    this.goalieService.getGoalies().subscribe({
      next: (data) => {
        this.goalies.set(data.goalies);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading goalies:', error);
        this.loading.set(false);
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
      
      const result = aValue < bValue ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });
    
    this.goalies.set(sortedGoalies);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private deleteGoalie(goalie: Goalie): void {
    if (confirm(`Are you sure you want to delete ${goalie.firstName} ${goalie.lastName}?`)) {
      this.goalieService.deleteGoalie(goalie.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedGoalies = this.goalies().filter(g => g.id !== goalie.id);
            this.goalies.set(updatedGoalies);
            console.log('Goalie deleted successfully');
          }
        },
        error: (error) => {
          console.error('Error deleting goalie:', error);
        }
      });
    }
  }

  private editGoalie(goalie: Goalie): void {
    console.log('Edit goalie:', goalie);
    // TODO: Navigate to edit form or open modal
  }

  private viewGoalieProfile(goalie: Goalie): void {
    console.log('View goalie profile:', goalie);
    // TODO: Navigate to goalie profile page
  }

  private viewShotSprayChart(goalie: Goalie): void {
    console.log('View shot spray chart for:', goalie);
    // TODO: Navigate to shot spray chart page
  }
}
