import { Component, OnInit, signal, inject , ChangeDetectionStrategy } from '@angular/core';
import {  } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ScheduleService } from '../../services/schedule.service';
import { TeamService } from '../../services/team.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { ArenaService } from '../../services/arena.service';
import { ApiService } from '../../services/api.service';
import { Schedule, GameStatus, GameType } from '../../shared/interfaces/schedule.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Arena, Rink } from '../../shared/interfaces/arena.interface';
import { PlayerFormModal, PlayerFormModalData } from '../../shared/components/player-form-modal/player-form.modal';
import { TeamFormModal, TeamFormModalData } from '../../shared/components/team-form-modal/team-form.modal';
import { GoalieFormModal, GoalieFormModalData } from '../../shared/components/goalie-form-modal/goalie-form.modal';
import { ScheduleFormModal, ScheduleFormModalData } from '../../shared/components/schedule-form-modal/schedule-form.modal';
import { HighlightReelFormModal, HighlightReelFormModalData } from '../../shared/components/highlight-reel-form-modal/highlight-reel-form.modal';
import { HighlightReelUpsertPayload } from '../../shared/interfaces/highlight-reel.interface';
import { HighlightsService } from '../../services/highlights.service';
import { BannerService } from '../../services/banner.service';
import { forkJoin } from 'rxjs';
import { visibilityByRoleMap } from './dashboard.role-map';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { GameCardSkeletonComponent } from '../../shared/components/game-card/game-card-skeleton.component';
import { getGameStatusLabel } from '../../shared/constants/game-status.constants';
import { convertGMTToLocalWithDateShift, formatDateForDisplay } from '../../shared/utils/time-converter.util';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatIconModule,
    ButtonComponent,
    MatDialogModule,
    ComponentVisibilityByRoleDirective,
    GameCardComponent,
    GameCardSkeletonComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  // Role-based visibility map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private scheduleService = inject(ScheduleService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private arenaService = inject(ArenaService);
  private apiService = inject(ApiService);
  private highlightsService = inject(HighlightsService);
  private bannerService = inject(BannerService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  upcomingGames = signal<Schedule[]>([]);
  gameResults = signal<Schedule[]>([]);
  loading = signal(true);
  teams = signal<Team[]>([]);
  teamsMap = new Map<number, Team>();
  arenas: Arena[] = [];
  rinks: Rink[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    // Load teams, games, arenas, and rinks concurrently
    forkJoin({
      teams: this.teamService.getTeams(),
      games: this.scheduleService.getDashboardGames(),
      arenas: this.arenaService.getArenas(),
      rinks: this.arenaService.getAllRinks(),
    }).subscribe({
      next: ({ teams, games, arenas, rinks }) => {
        // Store teams and create mapping
        this.teams.set(teams.teams);
        this.teamsMap = new Map(teams.teams.map((team) => [parseInt(team.id), team]));
        this.arenas = arenas;
        this.rinks = rinks;

        // Create mappings for arenas and rinks
        const arenaNameMap = new Map(arenas.map((a) => [a.id, a.name || '']));
        const rinkNameMap = new Map(rinks.map((r) => [r.id, r.name || '']));
        const arenaAddressMap = new Map(arenas.map((a) => [a.id, a.address || a.arena_address || '']));
        const rinkMap = new Map(
          rinks.map((r) => {
            const arena = arenas.find((a) => a.id === r.arena_id);
            const arenaName = arena?.name || '';
            const rinkName = r.name || '';
            return [r.id, arena ? `${arenaName} – ${rinkName}` : rinkName];
          })
        );


        // Helper function to get status name
        const getStatusName = (status: number): string => {
          const statusEnum =
            status === 0 || status === 1
              ? GameStatus.NotStarted
              : status === 2
                ? GameStatus.GameInProgress
                : GameStatus.GameOver;
          return getGameStatusLabel(statusEnum);
        };

        // Map API response to Schedule interface
        const mapGameToSchedule = (game: {
          id: number;
          home_team_id: number;
          home_goals: number;
          home_start_goalie_id: number | null;
          home_start_goalie_name?: string;
          away_team_id: number;
          away_goals: number;
          away_start_goalie_id: number | null;
          away_start_goalie_name?: string;
          game_type_id: number;
          game_type?: string;
          game_type_name: string | null;
          game_period_name?: string;
          tournament_name?: string;
          date: string;
          time: string;
          rink_id: number | null;
          status: number;
          season_id?: number | null;
          arena_id?: number | null;
        }): Schedule => {
          const homeTeam = this.teamsMap.get(game.home_team_id);
          const awayTeam = this.teamsMap.get(game.away_team_id);
          const apiUrl = this.apiService.getBaseUrl();
          const statusValue =
            game.status === 0 || game.status === 1
              ? GameStatus.NotStarted
              : game.status === 2
                ? GameStatus.GameInProgress
                : GameStatus.GameOver;

          return {
            id: game.id.toString(),
            homeTeam: homeTeam?.name || `Team ${game.home_team_id}`,
            homeTeamId: game.home_team_id,
            homeTeamLogo: `${apiUrl}/hockey/team/${game.home_team_id}/logo`,
            homeTeamAgeGroup: homeTeam?.group || '',
            homeTeamLevelName: homeTeam?.level || '',
            homeGoals: game.home_goals,
            homeTeamGoalie: game.home_start_goalie_name || (game.home_start_goalie_id ? `Goalie ${game.home_start_goalie_id}` : '—'),
            homeTeamGoalieId: game.home_start_goalie_id || undefined,
            awayTeam: awayTeam?.name || `Team ${game.away_team_id}`,
            awayTeamId: game.away_team_id,
            awayTeamLogo: `${apiUrl}/hockey/team/${game.away_team_id}/logo`,
            awayTeamAgeGroup: awayTeam?.group || '',
            awayTeamLevelName: awayTeam?.level || '',
            awayGoals: game.away_goals,
            awayTeamGoalie: game.away_start_goalie_name || (game.away_start_goalie_id ? `Goalie ${game.away_start_goalie_id}` : '—'),
            awayTeamGoalieId: game.away_start_goalie_id || undefined,
            gameType: game.game_type || '' as GameType,
            gameTypeName: game.game_type_name || undefined,
            tournamentName: game.tournament_name || undefined,
            date: formatDateForDisplay(convertGMTToLocalWithDateShift(game.date, game.time).date),
            time: convertGMTToLocalWithDateShift(game.date, game.time).time,
            rink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaRink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaName: game.arena_id ? (arenaNameMap.get(game.arena_id) || '') : '',
            rinkName: game.rink_id ? (rinkNameMap.get(game.rink_id) || '') : '',
            arenaAddress: game.arena_id ? (arenaAddressMap.get(game.arena_id) || '') : '',
            status: statusValue,
            statusName: getStatusName(game.status),
            periodName: game.game_period_name || undefined,
            events: [],
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
      },
    });
  }

  // Action button handlers
  openAddTeamModal(): void {
    const dialogRef = this.dialog.open(TeamFormModal, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as TeamFormModalData,
      panelClass: 'team-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addTeam(result);
      }
    });
  }

  private addTeam(teamData: Partial<Team> & { logoFile?: File; logoRemoved?: boolean }): void {
    const { logoFile, ...team } = teamData;
    this.teamService.addTeam(team, logoFile).subscribe({
      next: () => {
        this.router.navigate(['/teams-and-rosters/teams']);
      },
      error: (error) => {
        console.error('Error adding team:', error);
      },
    });
  }

  openAddPlayerModal(): void {
    const dialogRef = this.dialog.open(PlayerFormModal, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as PlayerFormModalData,
      panelClass: 'player-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addPlayer(result);
      }
    });
  }

  private addPlayer(playerData: Partial<Player>): void {
    this.playerService.addPlayer(playerData).subscribe({
      next: () => {
        this.router.navigate(['/teams-and-rosters/players']);
      },
      error: (error) => {
        console.error('Error adding player:', error);
      },
    });
  }

  openAddGoalieModal(): void {
    const dialogRef = this.dialog.open(GoalieFormModal, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as GoalieFormModalData,
      panelClass: 'goalie-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addGoalie(result);
      }
    });
  }

  private addGoalie(goalieData: Partial<Goalie>): void {
    this.goalieService.addGoalie(goalieData).subscribe({
      next: () => {
        this.router.navigate(['/teams-and-rosters/goalies']);
      },
      error: (error) => {
        console.error('Error adding goalie:', error);
      },
    });
  }

  openAddGameModal(): void {
    const dialogRef = this.dialog.open(ScheduleFormModal, {
      width: '800px',
      maxWidth: '95vw',
      data: { isEditMode: false } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addGame(result);
      }
    });
  }

  private addGame(gameData: Record<string, unknown>): void {
    this.scheduleService.createGame(gameData).subscribe({
      next: () => {
        this.bannerService.triggerRefresh(); // Refresh the banner
        this.router.navigate(['/schedule']);
      },
      error: (error) => {
        console.error('Error adding game:', error);
      },
    });
  }

  createHighlightReel(): void {
    const dialogRef = this.dialog.open(HighlightReelFormModal, {
      width: '1400px',
      maxWidth: '95vw',
      data: { isEditMode: false } as HighlightReelFormModalData,
      panelClass: 'schedule-form-modal-dialog',
      disableClose: true,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result?: HighlightReelUpsertPayload) => {
      if (result) {
        this.highlightsService.createHighlightReel(result).subscribe({
          next: () => {
            this.router.navigate(['/highlights']);
          },
          error: (error) => {
            console.error('Error creating highlight reel:', error);
          },
        });
      }
    });
  }
}
