import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button';
import { ScheduleService } from '../../services/schedule.service';
import { TeamService } from '../../services/team.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { ApiService } from '../../services/api.service';
import { Schedule, GameStatus, GameType } from '../../shared/interfaces/schedule.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { PlayerFormModalComponent, PlayerFormModalData } from '../../shared/components/player-form-modal/player-form-modal';
import { TeamFormModalComponent, TeamFormModalData } from '../../shared/components/team-form-modal/team-form-modal';
import { GoalieFormModalComponent, GoalieFormModalData } from '../../shared/components/goalie-form-modal/goalie-form-modal';
import { ScheduleFormModalComponent, ScheduleFormModalData } from '../../shared/components/schedule-form-modal/schedule-form-modal';
import { HighlightReelFormModalComponent, HighlightReelFormModalData } from '../../shared/components/highlight-reel-form-modal/highlight-reel-form-modal';
import { HighlightReelUpsertPayload } from '../../shared/interfaces/highlight-reel.interface';
import { HighlightsService } from '../../services/highlights.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, ActionButtonComponent, MatDialogModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private apiService = inject(ApiService);
  private highlightsService = inject(HighlightsService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  upcomingGames = signal<Schedule[]>([]);
  gameResults = signal<Schedule[]>([]);
  loading = signal(true);
  teams = signal<Team[]>([]);
  teamsMap = new Map<number, Team>();

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    
    // Load teams and games concurrently
    forkJoin({
      teams: this.teamService.getTeams(),
      games: this.scheduleService.getDashboardGames()
    }).subscribe({
      next: ({ teams, games }) => {
        // Store teams and create mapping
        this.teams.set(teams.teams);
        this.teamsMap = new Map(teams.teams.map(team => [parseInt(team.id), team]));
        
        // Map API response to Schedule interface
        const mapGameToSchedule = (game: { id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }): Schedule => {
          const homeTeam = this.teamsMap.get(game.home_team_id);
          const awayTeam = this.teamsMap.get(game.away_team_id);
          const apiUrl = this.apiService.getBaseUrl();
          
          return {
            id: game.id.toString(),
            homeTeam: homeTeam?.name || `Team ${game.home_team_id}`,
            homeTeamId: game.home_team_id,
            homeTeamLogo: `${apiUrl}/hockey/team/${game.home_team_id}/logo`,
            homeGoals: game.home_goals,
            homeTeamGoalie: `Goalie ${game.home_start_goalie_id}`, // TODO: Map to actual goalie names
            awayTeam: awayTeam?.name || `Team ${game.away_team_id}`,
            awayTeamId: game.away_team_id,
            awayTeamLogo: `${apiUrl}/hockey/team/${game.away_team_id}/logo`,
            awayGoals: game.away_goals,
            awayTeamGoalie: `Goalie ${game.away_start_goalie_id}`,
            gameType: game.game_type_group as GameType,
            tournamentName: game.tournament_name,
            date: game.date,
            time: game.time,
            rink: `Rink ${game.rink_id}`, // TODO: Map to actual rink name
            status: game.status === 0 ? GameStatus.NotStarted : 
                    game.status === 1 ? GameStatus.GameInProgress : 
                    GameStatus.GameOver,
            events: []
          };
        };
        
        const upcoming = games.upcoming_games.map(mapGameToSchedule);
        const completed = games.previous_games.map(mapGameToSchedule);
        
        this.upcomingGames.set(upcoming);
        this.gameResults.set(completed);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading.set(false);
      }
    });
  }

  // Action button handlers
  openAddTeamModal(): void {
    const dialogRef = this.dialog.open(TeamFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as TeamFormModalData,
      panelClass: 'team-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addTeam(result);
      }
    });
  }

  private addTeam(teamData: Partial<Team> & { logoFile?: File; logoRemoved?: boolean }): void {
    const { logoFile, ...team } = teamData;
    this.teamService.addTeam(team, logoFile).subscribe({
      next: (newTeam) => {
        this.router.navigate(['/teams']);
      },
      error: (error) => {
        console.error('Error adding team:', error);
      }
    });
  }

  openAddPlayerModal(): void {
    const dialogRef = this.dialog.open(PlayerFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as PlayerFormModalData,
      panelClass: 'player-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addPlayer(result);
      }
    });
  }

  private addPlayer(playerData: Partial<Player>): void {
    this.playerService.addPlayer(playerData).subscribe({
      next: (newPlayer) => {
        this.router.navigate(['/players']);
      },
      error: (error) => {
        console.error('Error adding player:', error);
      }
    });
  }

  openAddGoalieModal(): void {
    const dialogRef = this.dialog.open(GoalieFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as GoalieFormModalData,
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
        this.router.navigate(['/goalies']);
      },
      error: (error) => {
        console.error('Error adding goalie:', error);
      }
    });
  }

  openAddGameModal(): void {
    const dialogRef = this.dialog.open(ScheduleFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addGame(result);
      }
    });
  }

  private addGame(gameData: Record<string, unknown>): void {
    this.scheduleService.createGame(gameData).subscribe({
      next: () => {
        this.router.navigate(['/schedule']);
      },
      error: (error) => {
        console.error('Error adding game:', error);
      }
    });
  }

  createHighlightReel(): void {
    const dialogRef = this.dialog.open(HighlightReelFormModalComponent, {
      width: '1400px',
      maxWidth: '95vw',
      data: { isEditMode: false } as HighlightReelFormModalData,
      panelClass: 'schedule-form-modal-dialog',
      disableClose: true,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((result?: HighlightReelUpsertPayload) => {
      if (result) {
        this.highlightsService.createHighlightReel(result).subscribe({
          next: () => {
            this.router.navigate(['/highlights']);
          },
          error: (error) => {
            console.error('Error creating highlight reel:', error);
          }
        });
      }
    });
  }

  getTeamById(teamId: number): Team | undefined {
    return this.teamsMap.get(teamId);
  }
}
