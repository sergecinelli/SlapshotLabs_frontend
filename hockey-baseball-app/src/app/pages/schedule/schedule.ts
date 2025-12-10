import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { ButtonRouteComponent } from '../../shared/components/buttons/button-route/button-route.component';
import { WeekPaginationComponent } from '../../shared/components/week-pagination/week-pagination';
import { ScheduleService } from '../../services/schedule.service';
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
  ScheduleFormModalComponent,
  ScheduleFormModalData,
} from '../../shared/components/schedule-form-modal/schedule-form-modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './schedule.role-map';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
    ButtonRouteComponent,
    WeekPaginationComponent,
  ],
  template: `
    <div class="page-content" [appVisibilityMap]="visibilityByRoleMap">

      <!-- Header with Week Pagination and Add Button -->
      <div class="schedule-header">
        <div class="schedule-header-left"></div>
        <app-week-pagination
          [weekStart]="currentWeekStart()"
          [weekEnd]="currentWeekEnd()"
          [isFirstWeek]="false"
          [isLastWeek]="false"
          (weekChange)="onWeekChange($event)"
        />
        <div class="add-schedule-button-wrapper" role-visibility-name="add-schedule-button">
          <app-button
            [bg]="'primary'"
            [bghover]="'primary_dark'"
            [color]="'white'"
            [colorhover]="'white'"
            [materialIcon]="'add'"
            [haveContent]="true"
            (clicked)="openAddScheduleModal()"
          >
            Add to Schedule
          </app-button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="schedule-loading">
          <div class="loading-text">Loading games...</div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && schedules().length === 0) {
        <div class="schedule-empty">
          <div class="empty-text">No games scheduled.</div>
        </div>
      }

      <!-- Game Cards -->
      @if (!loading() && schedules().length > 0) {
        <div class="schedule-cards-container">
          @for (schedule of schedules(); track schedule.id) {
            <div class="schedule-game-card" [class.completed]="schedule.status === 3" [class.in-progress]="schedule.status === 2" [class.not-started]="schedule.status === 1">
              <!-- Card Header -->
              <div class="game-card-header">
                <div class="header-left">
                  <div class="game-date-time-row">
                    <div class="date-time-item">
                      <mat-icon class="date-time-icon">today</mat-icon>
                      <span class="game-date">{{ schedule.date }}</span>
                    </div>
                    @if (schedule.time) {
                      <div class="date-time-item">
                        <mat-icon class="date-time-icon">schedule</mat-icon>
                        <span class="game-time">{{ formatTimeTo12Hour(schedule.time) }}</span>
                        @if (schedule.statusName && schedule.status !== 1) {
                          <span class="game-period-separator">-</span>
                          <span class="game-period-text">{{ schedule.statusName }}</span>
                        }
                      </div>
                    }
                  </div>
                  @if (schedule.gameType || schedule.gameTypeName) {
                    <div class="game-type-info">
                      <div class="game-type-text">
                        @if (schedule.gameType && schedule.gameTypeName) {
                          <span class="game-type-bold">{{ schedule.gameType }}</span><span class="game-type-separator"> - </span>{{ schedule.gameTypeName }}
                        } @else {
                          <span class="game-type-bold">{{ schedule.gameType || schedule.gameTypeName }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
                <div class="header-right">
                  <div class="game-status-row">
                    <div class="status-badge" [class.live-badge]="schedule.status === 2" [class.upcoming-badge]="schedule.status === 1" [class.completed-badge]="schedule.status === 3">
                      @if (schedule.status === 2) {
                        <span class="live-indicator"></span>
                      }
                      <span class="status-text">{{ getCompletionStatus(schedule).toUpperCase() }}</span>
                    </div>
                    @if (schedule.statusName && (schedule.statusName.includes('OT') || schedule.statusName.includes('Overtime'))) {
                      <span class="game-period-badge">OT</span>
                    }
                  </div>
                  <div class="venue-info">
                    <div class="venue-name">
                      @if (schedule.arenaName && schedule.rinkName) {
                        {{ schedule.arenaName }} - {{ schedule.rinkName }}
                      } @else if (schedule.arenaRink) {
                        {{ schedule.arenaRink }}
                      } @else {
                        {{ getVenueName(schedule) }}
                      }
                    </div>
                    @if (getVenueLocation(schedule)) {
                      <div class="venue-location">{{ getVenueLocation(schedule) }}</div>
                    }
                  </div>
                </div>
              </div>

              <!-- Teams and Score Section -->
              <div class="game-teams-section">
                <!-- Home Team -->
                <div class="team-section" [class.winning]="isWinning(schedule, true)">
                  <div class="team-info">
                    @if (schedule.homeTeamLogo) {
                      <img [src]="schedule.homeTeamLogo" [alt]="schedule.homeTeam" class="team-logo" />
                    } @else {
                      <div class="team-logo-placeholder"></div>
                    }
                    <div class="team-name-group">
                      @if (schedule.homeTeamId) {
                        <div 
                          class="team-name team-link"
                          (click)="goToTeamProfile(schedule.homeTeamId!)"
                          (keyup.enter)="goToTeamProfile(schedule.homeTeamId!)"
                          (keyup.space)="goToTeamProfile(schedule.homeTeamId!)"
                          tabindex="0"
                          role="button"
                          [attr.aria-label]="'View ' + schedule.homeTeam + ' profile'"
                        >{{ schedule.homeTeam }}</div>
                      } @else {
                        <div class="team-name">{{ schedule.homeTeam }}</div>
                      }
                      <div class="team-location">{{ getTeamLocation(schedule, true) }}</div>
                      @if (schedule.homeTeamGoalie && schedule.homeTeamGoalieId) {
                        <div 
                          class="team-goalie goalie-link"
                          (click)="goToGoalieProfile(schedule.homeTeamGoalieId!)"
                          (keyup.enter)="goToGoalieProfile(schedule.homeTeamGoalieId!)"
                          (keyup.space)="goToGoalieProfile(schedule.homeTeamGoalieId!)"
                          tabindex="0"
                          role="button"
                          [attr.aria-label]="'View ' + schedule.homeTeamGoalie + ' profile'"
                        >
                          <mat-icon class="goalie-icon">sports_hockey</mat-icon>
                          <span>{{ schedule.homeTeamGoalie }}</span>
                        </div>
                      } @else if (schedule.homeTeamGoalie) {
                        <div class="team-goalie">
                          <mat-icon class="goalie-icon">sports_hockey</mat-icon>
                          <span>{{ schedule.homeTeamGoalie }}</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="team-score-wrapper">
                    <div class="team-score" [class.winning-score]="isWinning(schedule, true)">{{ schedule.homeGoals }}</div>
                  </div>
                </div>

                <!-- Score Separator -->
                <div class="score-separator">-</div>

                <!-- Away Team -->
                <div class="team-section" [class.winning]="isWinning(schedule, false)">
                  <div class="team-score-wrapper">
                    <div class="team-score" [class.winning-score]="isWinning(schedule, false)">{{ schedule.awayGoals }}</div>
                  </div>
                  <div class="team-info">
                    @if (schedule.awayTeamLogo) {
                      <img [src]="schedule.awayTeamLogo" [alt]="schedule.awayTeam" class="team-logo" />
                    } @else {
                      <div class="team-logo-placeholder"></div>
                    }
                    <div class="team-name-group">
                      @if (schedule.awayTeamId) {
                        <div 
                          class="team-name team-link"
                          (click)="goToTeamProfile(schedule.awayTeamId!)"
                          (keyup.enter)="goToTeamProfile(schedule.awayTeamId!)"
                          (keyup.space)="goToTeamProfile(schedule.awayTeamId!)"
                          tabindex="0"
                          role="button"
                          [attr.aria-label]="'View ' + schedule.awayTeam + ' profile'"
                        >{{ schedule.awayTeam }}</div>
                      } @else {
                        <div class="team-name">{{ schedule.awayTeam }}</div>
                      }
                      <div class="team-location">{{ getTeamLocation(schedule, false) }}</div>
                      @if (schedule.awayTeamGoalie && schedule.awayTeamGoalieId) {
                        <div 
                          class="team-goalie goalie-link"
                          (click)="goToGoalieProfile(schedule.awayTeamGoalieId!)"
                          (keyup.enter)="goToGoalieProfile(schedule.awayTeamGoalieId!)"
                          (keyup.space)="goToGoalieProfile(schedule.awayTeamGoalieId!)"
                          tabindex="0"
                          role="button"
                          [attr.aria-label]="'View ' + schedule.awayTeamGoalie + ' profile'"
                        >
                          <mat-icon class="goalie-icon">sports_hockey</mat-icon>
                          <span>{{ schedule.awayTeamGoalie }}</span>
                        </div>
                      } @else if (schedule.awayTeamGoalie) {
                        <div class="team-goalie">
                          <mat-icon class="goalie-icon">sports_hockey</mat-icon>
                          <span>{{ schedule.awayTeamGoalie }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="game-card-actions">
                @if (schedule.status === 2 || schedule.status === 3) {
                  <app-button-route
                    [route]="'/live-dashboard/' + schedule.id"
                    [bg]="'green'"
                    [bghover]="'green'"
                    [color]="'white'"
                    [colorhover]="'white'"
                    [materialIcon]="'dashboard'"
                    [haveContent]="true"
                    class="action-button"
                  >
                    Dashboard
                  </app-button-route>
                }
                <app-button
                  [bg]="'orange'"
                  [bghover]="'orange'"
                  [color]="'white'"
                  [colorhover]="'white'"
                  materialIcon="stylus"
                  [haveContent]="true"
                  (clicked)="editSchedule(schedule)"
                  class="action-button"
                  role-visibility-name="edit-action"
                >
                  Edit
                </app-button>
                <app-button
                  [bg]="'primary'"
                  [bghover]="'primary_dark'"
                  [color]="'white'"
                  [colorhover]="'white'"
                  [materialIcon]="'delete'"
                  [haveContent]="true"
                  (clicked)="deleteSchedule(schedule)"
                  class="action-button"
                  role-visibility-name="delete-action"
                >
                  Delete
                </app-button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './schedule.scss',
})
export class ScheduleComponent implements OnInit {
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
  loading = signal(true);
  currentWeekStart = signal<Date>(this.getWeekStart(new Date()));
  currentWeekEnd = signal<Date>(this.getWeekEnd(this.currentWeekStart()));

  // Cached data for form modals
  teams: Team[] = [];
  arenas: Arena[] = [];
  rinks: Rink[] = [];
  goalies: Goalie[] = [];
  players: Player[] = [];
  gameTypes: GameTypeResponse[] = [];
  gamePeriods: GamePeriodResponse[] = [];

  // Store raw game data for edit mode
  rawGames = new Map<
    string,
    {
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
      game_type_name?: string;
      game_period_id: number | null;
      game_period_name?: string;
      tournament_name?: string;
      status: number;
      date: string;
      time: string;
      season_id: number | null;
      arena_id: number | null;
      rink_id: number | null;
      analysis: string | null;
    }
  >();


  ngOnInit(): void {
    this.loadInitialData();
  }

  onWeekChange(event: { start: Date; end: Date }): void {
    this.currentWeekStart.set(event.start);
    this.currentWeekEnd.set(event.end);
    this.loadSchedules();
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  private getWeekEnd(weekStart: Date): Date {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
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

    const weekStart = this.currentWeekStart();
    const weekEnd = this.currentWeekEnd();
    const from = this.formatDateForAPI(weekStart);
    const to = this.formatDateForAPI(new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000)); // Add 1 day since 'to' is exclusive

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

        // Helper function to format date
        const formatDate = (dateStr: string): string => {
          if (!dateStr) return '';
          // If date is already formatted, return as is
          if (dateStr.includes(',')) {
            return dateStr;
          }
          // Otherwise format it
          try {
            const date = new Date(dateStr);
            const options: Intl.DateTimeFormatOptions = { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            };
            const formatted = date.toLocaleDateString('en-US', options);
            return formatted.replace(/(\w+), (\w+) (\d+)/, '$1., $2. $3');
          } catch {
            return dateStr;
          }
        };

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
            date: formatDate(game.date),
            dateTime: game.time ? `${formatDate(game.date)} ${game.time}` : formatDate(game.date),
            time: game.time,
            rink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaRink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaName: game.arena_id ? (arenaNameMap.get(game.arena_id) || '') : '',
            rinkName: game.rink_id ? (rinkNameMap.get(game.rink_id) || '') : '',
            arenaAddress: game.arena_id ? (arenaAddressMap.get(game.arena_id) || '') : '',
            status: statusValue,
            statusName: getStatusName(game.status, periodName),
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

  private loadSchedules(): void {
    // Reload just the schedules without refetching all data
    const weekStart = this.currentWeekStart();
    const weekEnd = this.currentWeekEnd();
    const from = this.formatDateForAPI(weekStart);
    const to = this.formatDateForAPI(new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000)); // Add 1 day since 'to' is exclusive

    this.loading.set(true);
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

        // Helper function to format date
        const formatDate = (dateStr: string): string => {
          if (!dateStr) return '';
          // If date is already formatted, return as is
          if (dateStr.includes(',')) {
            return dateStr;
          }
          // Otherwise format it
          try {
            const date = new Date(dateStr);
            const options: Intl.DateTimeFormatOptions = { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            };
            const formatted = date.toLocaleDateString('en-US', options);
            return formatted.replace(/(\w+), (\w+) (\d+)/, '$1., $2. $3');
          } catch {
            return dateStr;
          }
        };

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
            date: formatDate(game.date),
            dateTime: game.time ? `${formatDate(game.date)} ${game.time}` : formatDate(game.date),
            time: game.time,
            rink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaRink: game.rink_id ? (rinkMap.get(game.rink_id) || `Rink ${game.rink_id}`) : '',
            arenaName: game.arena_id ? (arenaNameMap.get(game.arena_id) || '') : '',
            rinkName: game.rink_id ? (rinkNameMap.get(game.rink_id) || '') : '',
            arenaAddress: game.arena_id ? (arenaAddressMap.get(game.arena_id) || '') : '',
            status: statusValue,
            statusName: getStatusName(game.status, periodName),
            events: [],
          };
        });

        this.schedules.set(mappedSchedules);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.loading.set(false);
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
    if (schedule.status === GameStatus.GameOver) {
      return 'Completed';
    } else if (schedule.status === GameStatus.GameInProgress) {
      return 'Live';
    } else {
      return 'Scheduled';
    }
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
    this.router.navigate([`/teams-and-rosters/teams/team-profile/${teamId}`]);
  }

  goToGoalieProfile(goalieId: number): void {
    this.router.navigate([`/teams-and-rosters/goalies/goalie-profile/${goalieId}`]);
  }

  editSchedule(schedule: Schedule): void {
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
        gamePeriods: this.gamePeriods,
      } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const gameId = parseInt(schedule.id);
        this.scheduleService.updateGame(gameId, result).subscribe({
          next: () => {
            this.loadSchedules(); // Reload the list
            this.bannerService.triggerRefresh(); // Refresh the banner
          },
          error: (error) => {
            console.error('Error updating game:', error);
          },
        });
      }
    });
  }

  deleteSchedule(schedule: Schedule): void {
    if (
      confirm(
        `Are you sure you want to delete the game between ${schedule.homeTeam} and ${schedule.awayTeam}?`
      )
    ) {
      const gameId = parseInt(schedule.id);
      this.scheduleService.deleteGame(gameId).subscribe({
        next: () => {
          this.loadSchedules(); // Always reload the list after successful API call
        },
        error: (error) => {
          console.error('Error deleting game:', error);
          alert('Error deleting game. Please try again.');
        },
      });
    }
  }

  openLiveDashboard(schedule: Schedule): void {
    this.router.navigate(['/live-dashboard', schedule.id]);
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
        gamePeriods: this.gamePeriods,
      } as ScheduleFormModalData,
      panelClass: 'schedule-form-modal-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.scheduleService.createGame(result).subscribe({
          next: () => {
            this.loadSchedules(); // Reload the list
            this.bannerService.triggerRefresh(); // Refresh the banner
          },
          error: (error) => {
            console.error('Error adding game:', error);
          },
        });
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
