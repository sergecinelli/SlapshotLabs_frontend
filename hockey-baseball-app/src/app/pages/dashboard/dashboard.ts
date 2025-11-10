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
import { Schedule, GameStatus, GameType } from '../../shared/interfaces/schedule.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { PlayerFormModalComponent, PlayerFormModalData } from '../../shared/components/player-form-modal/player-form-modal';
import { TeamFormModalComponent, TeamFormModalData } from '../../shared/components/team-form-modal/team-form-modal';
import { GoalieFormModalComponent, GoalieFormModalData } from '../../shared/components/goalie-form-modal/goalie-form-modal';
import { ScheduleFormModalComponent, ScheduleFormModalData } from '../../shared/components/schedule-form-modal/schedule-form-modal';

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
  private dialog = inject(MatDialog);
  private router = inject(Router);

  upcomingGames = signal<Schedule[]>([]);
  gameResults = signal<Schedule[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadGames();
  }

  private loadGames(): void {
    this.loading.set(true);
    this.scheduleService.getDashboardGames().subscribe({
      next: (data) => {
        // Map API response to Schedule interface
        const mapGameToSchedule = (game: { id: number; home_team_id: number; home_goals: number; home_start_goalie_id: number; away_team_id: number; away_goals: number; away_start_goalie_id: number; game_type_group: string; tournament_name?: string; date: string; time: string; rink_id: number; status: number }): Schedule => ({
          id: game.id.toString(),
          homeTeam: `Team ${game.home_team_id}`, // TODO: Map to actual team names
          homeGoals: game.home_goals,
          homeTeamGoalie: `Goalie ${game.home_start_goalie_id}`, // TODO: Map to actual goalie names
          awayTeam: `Team ${game.away_team_id}`,
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
        });
        
        const upcoming = data.upcoming_games.map(mapGameToSchedule);
        const completed = data.previous_games.map(mapGameToSchedule);
        
        this.upcomingGames.set(upcoming);
        this.gameResults.set(completed);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading games:', error);
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
        console.log('Team added successfully:', newTeam);
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
        console.log('Player added successfully:', newPlayer);
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
        console.log('Goalie added successfully:', newGoalie);
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
        console.log('Game added successfully');
        this.router.navigate(['/schedule']);
      },
      error: (error) => {
        console.error('Error adding game:', error);
      }
    });
  }

  createHighlightReel(): void {
    console.log('Create Highlight Reel clicked');
    // TODO: Implement highlight reel creation functionality
  }

  getTeamLogo(teamName: string): string {
    // TODO: Implement actual team logo logic
    // For now, return a placeholder or team initial
    return teamName.charAt(0).toUpperCase();
  }
}
