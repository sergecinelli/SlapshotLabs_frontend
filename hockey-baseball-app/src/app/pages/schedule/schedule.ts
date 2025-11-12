import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { ScheduleService } from '../../services/schedule.service';
import { TeamService } from '../../services/team.service';
import { ArenaService } from '../../services/arena.service';
import { GoalieService } from '../../services/goalie.service';
import { PlayerService } from '../../services/player.service';
import { GameMetadataService } from '../../services/game-metadata.service';
import { Schedule, GameStatus, GameType } from '../../shared/interfaces/schedule.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { Arena, Rink } from '../../shared/interfaces/arena.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { ScheduleFormModalComponent, ScheduleFormModalData } from '../../shared/components/schedule-form-modal/schedule-form-modal';
import { forkJoin } from 'rxjs';

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
  private teamService = inject(TeamService);
  private arenaService = inject(ArenaService);
  private goalieService = inject(GoalieService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  schedules = signal<Schedule[]>([]);
  loading = signal(true);
  
  // Cached data for form modals
  teams: Team[] = [];
  arenas: Arena[] = [];
  rinks: Rink[] = [];
  goalies: Goalie[] = [];
  players: Player[] = [];
  gameTypes: any[] = [];
  gamePeriods: any[] = [];
  
  // Store raw game data for edit mode
  rawGames: Map<string, any> = new Map();

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
    { 
      label: 'Dashboard', 
      action: 'dashboard', 
      variant: 'primary',
      condition: (item: Record<string, unknown>) => {
        const status = item['status'] as GameStatus;
        return status === GameStatus.GameInProgress || status === GameStatus.GameOver;
      }
    },
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'Delete', action: 'delete', variant: 'danger' }
  ];

  ngOnInit(): void {
    this.loadInitialData();
  }
  
  private loadInitialData(): void {
    this.loading.set(true);
    
    // Load all necessary data for the schedule page and form
    forkJoin({
      schedules: this.scheduleService.getGameList(),
      teams: this.teamService.getTeams(),
      arenas: this.arenaService.getArenas(),
      rinks: this.arenaService.getAllRinks(),
      goalies: this.goalieService.getGoalies(),
      players: this.playerService.getPlayers(),
      gameTypes: this.gameMetadataService.getGameTypes(),
      gamePeriods: this.gameMetadataService.getGamePeriods()
    }).subscribe({
      next: ({ schedules, teams, arenas, rinks, goalies, players, gameTypes, gamePeriods }) => {
        // Store data for form modals
        this.teams = teams.teams;
        this.arenas = arenas;
        this.rinks = rinks;
        this.goalies = goalies.goalies;
        this.players = players.players;
        this.gameTypes = gameTypes;
        this.gamePeriods = gamePeriods;
        
        // Create mappings
        const teamMap = new Map(this.teams.map(t => [parseInt(t.id), t.name]));
        const goalieMap = new Map(this.goalies.map(g => [parseInt(g.id), `${g.firstName} ${g.lastName}`]));
        const rinkMap = new Map(this.rinks.map(r => {
          const arena = this.arenas.find(a => a.id === r.arena_id);
          return [r.id, arena ? `${arena.name} - ${r.name}` : r.name];
        }));
        
        // Store raw game data for edit mode
        schedules.forEach(game => {
          this.rawGames.set(game.id.toString(), game);
        });
        
        // Map API response to Schedule interface
        const mappedSchedules: Schedule[] = schedules.map(game => ({
          id: game.id.toString(),
          homeTeam: teamMap.get(game.home_team_id) || `Team ${game.home_team_id}`,
          homeGoals: game.home_goals,
          homeTeamGoalie: goalieMap.get(game.home_start_goalie_id) || `Goalie ${game.home_start_goalie_id}`,
          awayTeam: teamMap.get(game.away_team_id) || `Team ${game.away_team_id}`,
          awayGoals: game.away_goals,
          awayTeamGoalie: goalieMap.get(game.away_start_goalie_id) || `Goalie ${game.away_start_goalie_id}`,
          gameType: game.game_type_group as GameType,
          tournamentName: game.tournament_name,
          date: game.date,
          time: game.time,
          rink: rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`,
          status: game.status === 1 ? GameStatus.NotStarted : 
                  game.status === 2 ? GameStatus.GameInProgress : 
                  GameStatus.GameOver,
          events: []
        }));
        
        this.schedules.set(mappedSchedules);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.loading.set(false);
      }
    });
  }

  private loadSchedules(): void {
    // Reload just the schedules without refetching all data
    this.scheduleService.getGameList().subscribe({
      next: (games) => {
        const teamMap = new Map(this.teams.map(t => [parseInt(t.id), t.name]));
        const goalieMap = new Map(this.goalies.map(g => [parseInt(g.id), `${g.firstName} ${g.lastName}`]));
        const rinkMap = new Map(this.rinks.map(r => {
          const arena = this.arenas.find(a => a.id === r.arena_id);
          return [r.id, arena ? `${arena.name} - ${r.name}` : r.name];
        }));
        
        // Store raw game data for edit mode
        games.forEach(game => {
          this.rawGames.set(game.id.toString(), game);
        });
        
        const mappedSchedules: Schedule[] = games.map(game => ({
          id: game.id.toString(),
          homeTeam: teamMap.get(game.home_team_id) || `Team ${game.home_team_id}`,
          homeGoals: game.home_goals,
          homeTeamGoalie: goalieMap.get(game.home_start_goalie_id) || `Goalie ${game.home_start_goalie_id}`,
          awayTeam: teamMap.get(game.away_team_id) || `Team ${game.away_team_id}`,
          awayGoals: game.away_goals,
          awayTeamGoalie: goalieMap.get(game.away_start_goalie_id) || `Goalie ${game.away_start_goalie_id}`,
          gameType: game.game_type_group as GameType,
          tournamentName: game.tournament_name,
          date: game.date,
          time: game.time,
          rink: rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`,
          status: game.status === 1 ? GameStatus.NotStarted : 
                  game.status === 2 ? GameStatus.GameInProgress : 
                  GameStatus.GameOver,
          events: []
        }));
        
        this.schedules.set(mappedSchedules);
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
      }
    });
  }

  onActionClick(event: { action: string, item: Record<string, unknown> }): void {
    const { action, item } = event;
    const schedule = item as Schedule;
    
    switch (action) {
      case 'dashboard':
        this.openLiveDashboard(schedule);
        break;
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
    const rawGameData = this.rawGames.get(schedule.id);
    
    const dialogRef = this.dialog.open(ScheduleFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        schedule: schedule,
        gameData: rawGameData, // Pass raw API data
        isEditMode: true,
        teams: this.teams,
        arenas: this.arenas,
        rinks: this.rinks,
        goalies: this.goalies,
        players: this.players,
        gameTypes: this.gameTypes,
        gamePeriods: this.gamePeriods
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
      const gameId = parseInt(schedule.id);
      this.scheduleService.deleteGame(gameId).subscribe({
        next: (response) => {
          console.log('Game deleted successfully', response);
          this.loadSchedules(); // Always reload the list after successful API call
        },
        error: (error) => {
          console.error('Error deleting game:', error);
          alert('Error deleting game. Please try again.');
        }
      });
    }
  }

  private openLiveDashboard(schedule: Schedule): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/live-dashboard', schedule.id])
    );
    window.location.assign(url);
  }

  openAddScheduleModal(): void {
    const dialogRef = this.dialog.open(ScheduleFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        isEditMode: false,
        teams: this.teams,
        arenas: this.arenas,
        rinks: this.rinks,
        goalies: this.goalies,
        players: this.players,
        gameTypes: this.gameTypes,
        gamePeriods: this.gamePeriods
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
