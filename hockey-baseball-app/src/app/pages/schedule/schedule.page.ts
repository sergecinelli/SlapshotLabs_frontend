import { Component, OnInit, signal, inject } from '@angular/core';
import {  } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { WeekPaginationComponent } from '../../shared/components/week-pagination/week-pagination.component';
import { ScheduleService, DashboardGame } from '../../services/schedule.service';
import { TeamService } from '../../services/team.service';
import { ArenaService } from '../../services/arena.service';
import { GoalieService } from '../../services/goalie.service';
import { PlayerService } from '../../services/player.service';
import {
  GameMetadataService,
  GameTypeResponse,
  GamePeriodResponse,
} from '../../services/game-metadata.service';
import { BannerService } from '../../services/banner.service';
import { Schedule, GameStatus } from '../../shared/interfaces/schedule.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { Arena, Rink } from '../../shared/interfaces/arena.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Player } from '../../shared/interfaces/player.interface';
import {
  ScheduleFormModal,
  ScheduleFormModalData,
} from '../../shared/components/schedule-form-modal/schedule-form.modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { visibilityByRoleMap } from './schedule.role-map';
import { getGameStatusLabel } from '../../shared/constants/game-status.constants';
import { forkJoin } from 'rxjs';
import { convertGMTToLocal, formatDateForDisplay } from '../../shared/utils/time-converter.util';

@Component({
  selector: 'app-schedule',
  imports: [
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
    WeekPaginationComponent,
    GameCardComponent,
  ],
  templateUrl: './schedule.page.html',
  styleUrl: './schedule.page.scss',
})
export class SchedulePage implements OnInit {
  // Role-based visibility map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private scheduleService = inject(ScheduleService);
  private teamService = inject(TeamService);
  private arenaService = inject(ArenaService);
  private goalieService = inject(GoalieService);
  private playerService = inject(PlayerService);
  private gameMetadataService = inject(GameMetadataService);
  private bannerService = inject(BannerService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  schedules = signal<Schedule[]>([]);
  deletingGameIds = new Set<string>();
  loading = signal(true);
  currentMonthStart = signal<Date>(this.getMonthStart(new Date()));
  currentMonthEnd = signal<Date>(this.getMonthEnd(this.currentMonthStart()));

  // Cached data for form modals
  teams: Team[] = [];
  arenas: Arena[] = [];
  rinks: Rink[] = [];
  goalies: Goalie[] = [];
  players: Player[] = [];
  gameTypes: GameTypeResponse[] = [];
  gamePeriods: GamePeriodResponse[] = [];

  // Store raw game data for edit mode
  rawGames = new Map<string, DashboardGame>();


  ngOnInit(): void {
    this.loadInitialData();
  }

  onMonthChange(event: { start: Date; end: Date }): void {
    this.currentMonthStart.set(event.start);
    this.currentMonthEnd.set(event.end);
    this.loadSchedules();
  }

  private getMonthStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  }

  private getMonthEnd(monthStart: Date): Date {
    const end = new Date(monthStart);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadInitialData(): void {
    this.loading.set(true);

    const monthStart = this.currentMonthStart();
    const monthEnd = this.currentMonthEnd();
    const from = this.formatDateForAPI(monthStart);
    const to = this.formatDateForAPI(new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000)); // Add 1 day since 'to' is exclusive

    // Load all necessary data for the schedule page and form
    forkJoin({
      schedules: this.scheduleService.getGameList(from, to),
      teams: this.teamService.getTeams(),
      arenas: this.arenaService.getArenas(),
      rinks: this.arenaService.getAllRinks(),
      goalies: this.goalieService.getGoalies(),
      players: this.playerService.getPlayers(),
      gameTypes: this.gameMetadataService.getGameTypes(),
      gamePeriods: this.gameMetadataService.getGamePeriods(),
    }).subscribe({
      next: ({ schedules, teams, arenas, rinks, goalies, players, gameTypes, gamePeriods }) => {
        // Note: teamLevels and divisions are loaded to populate teamOptionsService maps
        // They are used indirectly by teamDataMapper when transforming teams
        // Store data for form modals
        this.teams = teams.teams;
        this.arenas = arenas;
        this.rinks = rinks;
        this.goalies = goalies.goalies;
        this.players = players.players;
        this.gameTypes = gameTypes;
        this.gamePeriods = gamePeriods;

        // Create mappings
        const teamMap = new Map(this.teams.map((t) => [parseInt(t.id), t.name]));
        const teamDataMap = new Map(
          this.teams.map((t) => [
            parseInt(t.id),
            {
              name: t.name,
              ageGroup: t.group,
              levelName: t.level,
              logo: t.logo,
            },
          ])
        );
        const goalieMap = new Map(
          this.goalies.map((g) => [parseInt(g.id), `${g.firstName} ${g.lastName}`])
        );
        const rinkMap = new Map(
          this.rinks.map((r) => {
            const arena = this.arenas.find((a) => a.id === r.arena_id);
            const arenaName = arena?.name || '';
            const rinkName = r.name || '';
            return [r.id, arena ? `${arenaName} – ${rinkName}` : rinkName];
          })
        );
        const arenaNameMap = new Map(
          this.arenas.map((a) => [a.id, a.name || ''])
        );
        const rinkNameMap = new Map(
          this.rinks.map((r) => [r.id, r.name || ''])
        );
        const arenaAddressMap = new Map(
          this.arenas.map((a) => [a.id, a.address || a.arena_address || ''])
        );

        // Create game type mapping - map game_type_id to game type group name
        const gameTypeMap = new Map<number, string>();
        this.gameTypes.forEach((type) => {
          gameTypeMap.set(type.id, type.name);
        });

        // Create game period mapping - map game_period_id to game period name
        const gamePeriodMap = new Map<number, string>();
        this.gamePeriods.forEach((period) => {
          gamePeriodMap.set(period.id, period.name);
        });

        // Store raw game data for edit mode
        schedules.forEach((game) => {
          this.rawGames.set(game.id.toString(), game);
        });

        // Helper function to format date (uses formatDateForDisplay from utils)
        const formatDate = formatDateForDisplay;

        // Helper function to get status name
        const getStatusName = (status: number, periodName?: string): string => {
          if (periodName) {
            return periodName;
          }
          switch (status) {
            case 1:
              return 'Not Started';
            case 2:
              return 'Live';
            case 3:
              return 'Game Over';
            default:
              return 'Unknown';
          }
        };

        // Map API response to Schedule interface
        const mappedSchedules: Schedule[] = schedules.map((game) => {
          const statusValue =
            game.status === 1
              ? GameStatus.NotStarted
              : game.status === 2
                ? GameStatus.GameInProgress
                : GameStatus.GameOver;

          const homeTeamData = teamDataMap.get(game.home_team_id);
          const awayTeamData = teamDataMap.get(game.away_team_id);
          const homeGoalieName = game.home_start_goalie_name || 
            (game.home_start_goalie_id ? goalieMap.get(game.home_start_goalie_id) : undefined);
          const awayGoalieName = game.away_start_goalie_name || 
            (game.away_start_goalie_id ? goalieMap.get(game.away_start_goalie_id) : undefined);
          const periodName = game.game_period_name || 
            (game.game_period_id ? gamePeriodMap.get(game.game_period_id) : undefined);

          // Convert GMT date and time to local timezone
          const localDateTime = convertGMTToLocal(game.date, game.time);

          return {
            id: game.id.toString(),
            homeTeam: homeTeamData?.name || teamMap.get(game.home_team_id) || `Team ${game.home_team_id}`,
            homeTeamId: game.home_team_id,
            homeTeamLogo: homeTeamData?.logo,
            homeTeamAgeGroup: homeTeamData?.ageGroup || '',
            homeTeamLevelName: homeTeamData?.levelName || '',
            homeGoals: game.home_goals,
            homeTeamGoalie: homeGoalieName,
            homeTeamGoalieId: game.home_start_goalie_id || undefined,
            awayTeam: awayTeamData?.name || teamMap.get(game.away_team_id) || `Team ${game.away_team_id}`,
            awayTeamId: game.away_team_id,
            awayTeamLogo: awayTeamData?.logo,
            awayTeamAgeGroup: awayTeamData?.ageGroup || '',
            awayTeamLevelName: awayTeamData?.levelName || '',
            awayGoals: game.away_goals,
            awayTeamGoalie: awayGoalieName,
            awayTeamGoalieId: game.away_start_goalie_id || undefined,
            gameType: game.game_type || gameTypeMap.get(game.game_type_id) || '',
            gameTypeName: game.game_type_name || '',
            tournamentName: game.tournament_name || undefined,
            date: formatDate(localDateTime.date),
            dateTime: localDateTime.time ? `${formatDate(localDateTime.date)} ${localDateTime.time}` : formatDate(localDateTime.date),
            time: localDateTime.time,
            rink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaRink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaName: game.arena_id ? (arenaNameMap.get(game.arena_id) || '') : '',
            rinkName: game.rink_id ? (rinkNameMap.get(game.rink_id) || '') : '',
            arenaAddress: game.arena_id ? (arenaAddressMap.get(game.arena_id) || '') : '',
            status: statusValue,
            statusName: getStatusName(game.status, periodName),
            periodName: periodName || undefined,
            events: [],
          };
        });

        this.schedules.set(mappedSchedules);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.loading.set(false);
      },
    });
  }

  private loadSchedules(showLoading = true): void {
    // Reload just the schedules without refetching all data
    const monthStart = this.currentMonthStart();
    const monthEnd = this.currentMonthEnd();
    const from = this.formatDateForAPI(monthStart);
    const to = this.formatDateForAPI(new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000)); // Add 1 day since 'to' is exclusive

    if (showLoading) {
      this.loading.set(true);
    }
    this.scheduleService.getGameList(from, to).subscribe({
      next: (games) => {
        const teamMap = new Map(this.teams.map((t) => [parseInt(t.id), t.name]));
        const teamDataMap = new Map(
          this.teams.map((t) => [
            parseInt(t.id),
            {
              name: t.name,
              ageGroup: t.group,
              levelName: t.level,
              logo: t.logo,
            },
          ])
        );
        const goalieMap = new Map(
          this.goalies.map((g) => [parseInt(g.id), `${g.firstName} ${g.lastName}`])
        );
        const rinkMap = new Map(
          this.rinks.map((r) => {
            const arena = this.arenas.find((a) => a.id === r.arena_id);
            const arenaName = arena?.name || '';
            const rinkName = r.name || '';
            return [r.id, arena ? `${arenaName} – ${rinkName}` : rinkName];
          })
        );
        const arenaNameMap = new Map(
          this.arenas.map((a) => [a.id, a.name || ''])
        );
        const rinkNameMap = new Map(
          this.rinks.map((r) => [r.id, r.name || ''])
        );
        const arenaAddressMap = new Map(
          this.arenas.map((a) => [a.id, a.address || a.arena_address || ''])
        );

        // Create game type mapping - map game_type_id to game type group name
        const gameTypeMap = new Map<number, string>();
        this.gameTypes.forEach((type) => {
          gameTypeMap.set(type.id, type.name);
        });

        // Create game period mapping - map game_period_id to game period name
        const gamePeriodMap = new Map<number, string>();
        this.gamePeriods.forEach((period) => {
          gamePeriodMap.set(period.id, period.name);
        });

        // Store raw game data for edit mode
        games.forEach((game) => {
          this.rawGames.set(game.id.toString(), game);
        });

        // Helper function to format date (uses formatDateForDisplay from utils)
        const formatDate = formatDateForDisplay;

        // Helper function to get status name
        const getStatusName = (status: number, periodName?: string): string => {
          if (periodName) {
            return periodName;
          }
          switch (status) {
            case 1:
              return 'Not Started';
            case 2:
              return 'Live';
            case 3:
              return 'Game Over';
            default:
              return 'Unknown';
          }
        };

        const mappedSchedules: Schedule[] = games.map((game) => {
          const statusValue =
            game.status === 1
              ? GameStatus.NotStarted
              : game.status === 2
                ? GameStatus.GameInProgress
                : GameStatus.GameOver;

          const homeTeamData = teamDataMap.get(game.home_team_id);
          const awayTeamData = teamDataMap.get(game.away_team_id);
          const homeGoalieName = game.home_start_goalie_name || 
            (game.home_start_goalie_id ? goalieMap.get(game.home_start_goalie_id) : undefined);
          const awayGoalieName = game.away_start_goalie_name || 
            (game.away_start_goalie_id ? goalieMap.get(game.away_start_goalie_id) : undefined);
          const periodName = game.game_period_name || 
            (game.game_period_id ? gamePeriodMap.get(game.game_period_id) : undefined);

          // Convert GMT date and time to local timezone
          const localDateTime = convertGMTToLocal(game.date, game.time);

          return {
            id: game.id.toString(),
            homeTeam: homeTeamData?.name || teamMap.get(game.home_team_id) || `Team ${game.home_team_id}`,
            homeTeamId: game.home_team_id,
            homeTeamLogo: homeTeamData?.logo,
            homeTeamAgeGroup: homeTeamData?.ageGroup || '',
            homeTeamLevelName: homeTeamData?.levelName || '',
            homeGoals: game.home_goals,
            homeTeamGoalie: homeGoalieName,
            homeTeamGoalieId: game.home_start_goalie_id || undefined,
            awayTeam: awayTeamData?.name || teamMap.get(game.away_team_id) || `Team ${game.away_team_id}`,
            awayTeamId: game.away_team_id,
            awayTeamLogo: awayTeamData?.logo,
            awayTeamAgeGroup: awayTeamData?.ageGroup || '',
            awayTeamLevelName: awayTeamData?.levelName || '',
            awayGoals: game.away_goals,
            awayTeamGoalie: awayGoalieName,
            awayTeamGoalieId: game.away_start_goalie_id || undefined,
            gameType: game.game_type || gameTypeMap.get(game.game_type_id) || '',
            gameTypeName: game.game_type_name || '',
            tournamentName: game.tournament_name || undefined,
            date: formatDate(localDateTime.date),
            dateTime: localDateTime.time ? `${formatDate(localDateTime.date)} ${localDateTime.time}` : formatDate(localDateTime.date),
            time: localDateTime.time,
            rink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaRink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaName: game.arena_id ? (arenaNameMap.get(game.arena_id) || '') : '',
            rinkName: game.rink_id ? (rinkNameMap.get(game.rink_id) || '') : '',
            arenaAddress: game.arena_id ? (arenaAddressMap.get(game.arena_id) || '') : '',
            status: statusValue,
            statusName: getStatusName(game.status, periodName),
            periodName: periodName || undefined,
            events: [],
          };
        });

        this.schedules.set(mappedSchedules);
        if (showLoading) {
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        if (showLoading) {
          this.loading.set(false);
        }
      },
    });
  }

  getStatusDisplay(schedule: Schedule): string {
    if (schedule.status === GameStatus.GameOver) {
      return 'Final';
    } else if (schedule.status === GameStatus.GameInProgress) {
      return 'Live';
    } else {
      return 'Not Started';
    }
  }

  getCompletionStatus(schedule: Schedule): string {
    return getGameStatusLabel(schedule.status);
  }

  getVenueName(schedule: Schedule): string {
    if (schedule.arenaRink) {
      // Extract arena name from "Arena Name – Rink Name" format
      const parts = schedule.arenaRink.split(' – ');
      return parts[0] || schedule.arenaRink;
    }
    return '';
  }

  getVenueLocation(schedule: Schedule): string {
    if (schedule.arenaAddress) {
      // Extract city and state from address if available
      const parts = schedule.arenaAddress.split(',');
      if (parts.length >= 2) {
        return parts.slice(-2).join(',').trim();
      }
      return schedule.arenaAddress;
    }
    return '';
  }

  getTeamLocation(schedule: Schedule, isHome: boolean): string {
    if (isHome) {
      // Try to extract location from team name or use age group/level
      if (schedule.homeTeamAgeGroup && schedule.homeTeamLevelName) {
        return `${schedule.homeTeamAgeGroup} ${schedule.homeTeamLevelName}`;
      }
      return schedule.homeTeamAgeGroup || schedule.homeTeamLevelName || '';
    } else {
      if (schedule.awayTeamAgeGroup && schedule.awayTeamLevelName) {
        return `${schedule.awayTeamAgeGroup} ${schedule.awayTeamLevelName}`;
      }
      return schedule.awayTeamAgeGroup || schedule.awayTeamLevelName || '';
    }
  }

  isWinning(schedule: Schedule, isHome: boolean): boolean {
    if (schedule.status !== GameStatus.GameOver) {
      return false;
    }
    if (isHome) {
      return schedule.homeGoals > schedule.awayGoals;
    } else {
      return schedule.awayGoals > schedule.homeGoals;
    }
  }

  goToTeamProfile(teamId: number): void {
    this.router.navigate([`/teams-and-rosters/teams/${teamId}/profile`]);
  }

  goToGoalieProfile(goalieId: number): void {
    this.router.navigate([`/teams-and-rosters/goalies/${goalieId}/profile`]);
  }

  editSchedule(schedule: Schedule): void {
    const rawGameData = this.rawGames.get(schedule.id);

    const dialogRef = this.dialog.open(ScheduleFormModal, {
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
        gamePeriods: this.gamePeriods,
      } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        // Reload the list without showing loading indicator
        this.loadSchedules(false);
        this.bannerService.triggerRefresh(); // Refresh the banner
      }
    });
  }

  deleteSchedule(schedule: Schedule): void {
    if (
      confirm(
        `Are you sure you want to delete the game between ${schedule.homeTeam} and ${schedule.awayTeam}?`
      )
    ) {
      const gameId = schedule.id;
      this.deletingGameIds.add(gameId);
      const numericGameId = parseInt(gameId);
      this.scheduleService.deleteGame(numericGameId).subscribe({
        next: () => {
          this.deletingGameIds.delete(gameId);
          
          // Remove the game from the list immediately without full reload
          const currentSchedules = this.schedules();
          const updatedSchedules = currentSchedules.filter((s) => s.id !== gameId);
          this.schedules.set(updatedSchedules);
          
          // Also remove from rawGames map
          this.rawGames.delete(gameId);
          
          // Refresh the banner
          this.bannerService.triggerRefresh();
        },
        error: (error) => {
          this.deletingGameIds.delete(gameId);
          console.error('Error deleting game:', error);
          alert('Error deleting game. Please try again.');
        },
      });
    }
  }

  openLiveDashboard(schedule: Schedule): void {
    this.router.navigate(['/schedule/live', schedule.id]);
  }

  openAddScheduleModal(): void {
    const dialogRef = this.dialog.open(ScheduleFormModal, {
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
        gamePeriods: this.gamePeriods,
      } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        // Reload the list without showing loading indicator
        this.loadSchedules(false);
        this.bannerService.triggerRefresh(); // Refresh the banner
      }
    });
  }

  /**
   * Format time from 24-hour format to 12-hour AM/PM format
   * @param time Time string in format "HH:MM:SS" or "HH:MM"
   * @returns Time in format "H:MM AM/PM"
   */
  public formatTimeTo12Hour(time: string): string {
    if (!time) return '';

    // Parse time string (format: "HH:MM:SS" or "HH:MM")
    const parts = time.split(':');
    if (parts.length < 2) return time;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];

    if (isNaN(hours)) return time;

    // Convert to 12-hour format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12

    return `${hours}:${minutes} ${ampm}`;
  }
}
