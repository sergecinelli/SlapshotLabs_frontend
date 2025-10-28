import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { ScheduleService } from '../../services/schedule.service';
import { Schedule, GameStatus, GameType } from '../../shared/interfaces/schedule.interface';
import { ScheduleFormModalComponent, ScheduleFormModalData } from '../../shared/components/schedule-form-modal/schedule-form-modal';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Schedule"></app-page-header>
      
      <!-- Add Schedule Button -->
      <div class="mb-4 flex justify-end">
        <button 
          mat-raised-button 
          color="primary" 
          (click)="openAddScheduleModal()"
          class="add-schedule-btn">
          <mat-icon>add</mat-icon>
          Add to Schedule
        </button>
      </div>
      
      <app-data-table
        [columns]="tableColumns"
        [data]="schedules()"
        [actions]="tableActions"
        [loading]="loading()"
        (actionClick)="onActionClick($event)"
        (sort)="onSort($event)"
        emptyMessage="No games scheduled."
      ></app-data-table>
    </div>
  `,
  styleUrl: './schedule.scss'
})
export class ScheduleComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private dialog = inject(MatDialog);

  schedules = signal<Schedule[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'homeTeam', label: 'Home Team', sortable: true, width: '150px' },
    { key: 'homeGoals', label: 'Home Goals', sortable: true, type: 'number', width: '90px' },
    { key: 'homeTeamGoalie', label: 'Home Goalie', sortable: true, width: '120px' },
    { key: 'awayTeam', label: 'Away Team', sortable: true, width: '150px' },
    { key: 'awayGoals', label: 'Away Goals', sortable: true, type: 'number', width: '90px' },
    { key: 'awayTeamGoalie', label: 'Away Goalie', sortable: true, width: '120px' },
    { key: 'gameType', label: 'Game Type', sortable: true, type: 'custom', width: '120px' },
    { key: 'tournamentName', label: 'Tournament', sortable: true, width: '130px' },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'time', label: 'Time', sortable: true, width: '80px' },
    { key: 'rink', label: 'Rink', sortable: true, width: '180px' },
    { key: 'status', label: 'Status', sortable: true, type: 'custom', width: '140px' }
  ];

  tableActions: TableAction[] = [
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'Delete', action: 'delete', variant: 'danger' }
  ];

  ngOnInit(): void {
    this.loadSchedules();
  }

  private loadSchedules(): void {
    this.loading.set(true);
    this.scheduleService.getGameList().subscribe({
      next: (games) => {
        // Map API response to Schedule interface
        const mappedSchedules: Schedule[] = games.map(game => ({
          id: game.id.toString(),
          homeTeam: `Team ${game.home_team_id}`, // TODO: Map to actual team names
          homeGoals: game.home_goals,
          homeTeamGoalie: `Goalie ${game.home_team_goalie_id}`, // TODO: Map to actual goalie names
          awayTeam: `Team ${game.away_team_id}`,
          awayGoals: game.away_goals,
          awayTeamGoalie: `Goalie ${game.away_team_goalie_id}`,
          gameType: game.game_type_group as GameType,
          tournamentName: game.tournament_name,
          date: game.date,
          time: game.time,
          rink: `Rink ${game.rink_id}`, // TODO: Map to actual rink name
          status: game.status === 0 ? GameStatus.NotStarted : 
                  game.status === 1 ? GameStatus.GameInProgress : 
                  GameStatus.GameOver,
          events: []
        }));
        
        this.schedules.set(mappedSchedules);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.loading.set(false);
      }
    });
  }

  onActionClick(event: { action: string, item: Record<string, unknown> }): void {
    const { action, item } = event;
    const schedule = item as Schedule;
    
    switch (action) {
      case 'edit':
        this.editSchedule(schedule);
        break;
      case 'delete':
        this.deleteSchedule(schedule);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  onSort(event: { column: string, direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sortedSchedules = [...this.schedules()].sort((a, b) => {
      const aValue = this.getNestedValue(a, column);
      const bValue = this.getNestedValue(b, column);
      
      if (aValue === bValue) return 0;
      
      const result = (aValue as string | number) < (bValue as string | number) ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });
    
    this.schedules.set(sortedSchedules);
  }

  private getNestedValue(obj: Schedule, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  private editSchedule(schedule: Schedule): void {
    const dialogRef = this.dialog.open(ScheduleFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        schedule: schedule,
        isEditMode: true
      } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const gameId = parseInt(schedule.id);
        this.scheduleService.updateGame(gameId, result).subscribe({
          next: () => {
            console.log('Game updated successfully');
            this.loadSchedules(); // Reload the list
          },
          error: (error) => {
            console.error('Error updating game:', error);
          }
        });
      }
    });
  }

  private deleteSchedule(schedule: Schedule): void {
    if (confirm(`Are you sure you want to delete the game between ${schedule.homeTeam} and ${schedule.awayTeam}?`)) {
      this.scheduleService.deleteSchedule(schedule.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedSchedules = this.schedules().filter(s => s.id !== schedule.id);
            this.schedules.set(updatedSchedules);
            console.log('Schedule deleted successfully');
          }
        },
        error: (error) => {
          console.error('Error deleting schedule:', error);
        }
      });
    }
  }

  openAddScheduleModal(): void {
    const dialogRef = this.dialog.open(ScheduleFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        isEditMode: false
      } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.scheduleService.createGame(result).subscribe({
          next: () => {
            console.log('Game added successfully');
            this.loadSchedules(); // Reload the list
          },
          error: (error) => {
            console.error('Error adding game:', error);
          }
        });
      }
    });
  }
}
