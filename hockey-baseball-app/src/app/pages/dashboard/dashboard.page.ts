import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ScheduleService } from '../../services/schedule.service';
import { TeamService } from '../../services/team.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { ArenaService } from '../../services/arena.service';
import { ApiService } from '../../services/api.service';
import { TeamOptionsService } from '../../services/team-options.service';
import { PositionService } from '../../services/position.service';
import { GameMetadataService } from '../../services/game-metadata.service';
import { GameEventNameService } from '../../services/game-event-name.service';
import { Schedule, GameStatus, GameType } from '../../shared/interfaces/schedule.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Arena, Rink } from '../../shared/interfaces/arena.interface';
import {
  PlayerFormModal,
  PlayerFormModalData,
} from '../../shared/components/player-form-modal/player-form.modal';
import {
  TeamFormModal,
  TeamFormModalData,
} from '../../shared/components/team-form-modal/team-form.modal';
import {
  GoalieFormModal,
  GoalieFormModalData,
} from '../../shared/components/goalie-form-modal/goalie-form.modal';
import {
  ScheduleFormModal,
  ScheduleFormModalData,
} from '../../shared/components/schedule-form-modal/schedule-form.modal';
import {
  HighlightReelFormModal,
  HighlightReelFormModalData,
} from '../../shared/components/highlight-reel-form-modal/highlight-reel-form.modal';
import { HighlightReelUpsertPayload } from '../../shared/interfaces/highlight-reel.interface';
import { HighlightsService } from '../../services/highlights.service';
import { BannerService } from '../../services/banner.service';
import { Observable, forkJoin } from 'rxjs';
import { AnalysisService } from '../../services/analysis.service';
import { AnalyticsApiIn } from '../../shared/interfaces/analysis.interface';
import {
  GameAnalysisModal,
  GameOption,
} from '../../shared/components/game-analysis-modal/game-analysis.modal';
import { visibilityByRoleMap } from './dashboard.role-map';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { CardGridComponent } from '../../shared/components/card-grid/card-grid.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { GameCardSkeletonComponent } from '../../shared/components/game-card/game-card-skeleton.component';
import { getGameStatusLabel } from '../../shared/constants/statuses.constants';
import {
  convertGMTToLocalWithDateShift,
  formatDateForDisplay,
} from '../../shared/utils/time-converter.util';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatIconModule,
    ButtonLoadingComponent,
    CardGridComponent,
    ComponentVisibilityByRoleDirective,
    GameCardComponent,
    GameCardSkeletonComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
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
  private teamOptionsService = inject(TeamOptionsService);
  private positionService = inject(PositionService);
  private gameMetadataService = inject(GameMetadataService);
  private gameEventNameService = inject(GameEventNameService);
  private highlightsService = inject(HighlightsService);
  private bannerService = inject(BannerService);
  private modalService = inject(ModalService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private analysisService = inject(AnalysisService);

  upcomingGames = signal<Schedule[]>([]);
  gameResults = signal<Schedule[]>([]);
  loading = signal(true);
  teams = signal<Team[]>([]);
  teamsMap = new Map<number, Team>();
  arenas: Arena[] = [];
  rinks: Rink[] = [];

  addTeamLoading = signal(false);
  addPlayerLoading = signal(false);
  addGoalieLoading = signal(false);
  addGameLoading = signal(false);
  createHighlightLoading = signal(false);
  analysisLoadingId = signal<string | null>(null);

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
        const arenaAddressMap = new Map(
          arenas.map((a) => [a.id, a.address || a.arena_address || ''])
        );
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
            homeTeamGoalie:
              game.home_start_goalie_name ||
              (game.home_start_goalie_id ? `Goalie ${game.home_start_goalie_id}` : '—'),
            homeTeamGoalieId: game.home_start_goalie_id || undefined,
            awayTeam: awayTeam?.name || `Team ${game.away_team_id}`,
            awayTeamId: game.away_team_id,
            awayTeamLogo: `${apiUrl}/hockey/team/${game.away_team_id}/logo`,
            awayTeamAgeGroup: awayTeam?.group || '',
            awayTeamLevelName: awayTeam?.level || '',
            awayGoals: game.away_goals,
            awayTeamGoalie:
              game.away_start_goalie_name ||
              (game.away_start_goalie_id ? `Goalie ${game.away_start_goalie_id}` : '—'),
            awayTeamGoalieId: game.away_start_goalie_id || undefined,
            gameType: game.game_type || ('' as GameType),
            gameTypeName: game.game_type_name || undefined,
            tournamentName: game.tournament_name || undefined,
            date: formatDateForDisplay(convertGMTToLocalWithDateShift(game.date, game.time).date),
            time: convertGMTToLocalWithDateShift(game.date, game.time).time,
            rink: game.rink_id ? rinkMap.get(game.rink_id) || `Rink ${game.rink_id}` : '',
            arenaRink: game.rink_id ? rinkMap.get(game.rink_id) || `Rink ${game.rink_id}` : '',
            arenaName: game.arena_id ? arenaNameMap.get(game.arena_id) || '' : '',
            rinkName: game.rink_id ? rinkNameMap.get(game.rink_id) || '' : '',
            arenaAddress: game.arena_id ? arenaAddressMap.get(game.arena_id) || '' : '',
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

  openAddTeamModal(): void {
    this.addTeamLoading.set(true);
    forkJoin({
      ageGroups: this.teamOptionsService.getTeamAgeGroups(),
      levels: this.teamOptionsService.getTeamLevels(),
      divisions: this.teamOptionsService.getDivisions(),
    }).subscribe({
      next: ({ ageGroups, levels, divisions }) => {
        this.addTeamLoading.set(false);
        this.modalService.openModal(TeamFormModal, {
          name: 'Add Team',
          icon: 'groups',
          width: '900px',
          maxWidth: '95vw',
          data: { isEditMode: false, ageGroups, levels, divisions } as TeamFormModalData,
          onCloseWithDataProcessing: (result) => {
            const { logoFile, ...team } = result as Partial<Team> & {
              logoFile?: File;
              logoRemoved?: boolean;
            };
            this.teamService.addTeam(team, logoFile).subscribe({
              next: () => {
                this.toast.show('Team created successfully', 'success');
                this.modalService.closeModal();
                this.router.navigate(['/teams-and-rosters/teams']);
              },
              error: () => {
                this.toast.show('Failed to create team', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: (error) => {
        console.error('Error loading team options:', error);
        this.addTeamLoading.set(false);
      },
    });
  }

  openAddPlayerModal(): void {
    this.addPlayerLoading.set(true);
    this.positionService.getPositions().subscribe({
      next: (positions) => {
        this.addPlayerLoading.set(false);
        this.modalService.openModal(PlayerFormModal, {
          name: 'Add Player',
          icon: 'sports_hockey',
          width: '900px',
          maxWidth: '95vw',
          data: { isEditMode: false, teams: this.teams(), positions } as PlayerFormModalData,
          onCloseWithDataProcessing: (result: Partial<Player>) => {
            this.playerService.addPlayer(result).subscribe({
              next: () => {
                this.toast.show('Player created successfully', 'success');
                this.modalService.closeModal();
                this.router.navigate(['/teams-and-rosters/players']);
              },
              error: () => {
                this.toast.show('Failed to create player', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: (error) => {
        console.error('Error loading player form data:', error);
        this.addPlayerLoading.set(false);
      },
    });
  }

  openAddGoalieModal(): void {
    this.addGoalieLoading.set(true);
    this.positionService.getPositions().subscribe({
      next: (positions) => {
        this.addGoalieLoading.set(false);
        this.modalService.openModal(GoalieFormModal, {
          name: 'Add Goalie',
          icon: 'sports_hockey',
          width: '900px',
          maxWidth: '95vw',
          data: { isEditMode: false, teams: this.teams(), positions } as GoalieFormModalData,
          onCloseWithDataProcessing: (result: Partial<Goalie>) => {
            this.goalieService.addGoalie(result).subscribe({
              next: () => {
                this.toast.show('Goalie created successfully', 'success');
                this.modalService.closeModal();
                this.router.navigate(['/teams-and-rosters/goalies']);
              },
              error: () => {
                this.toast.show('Failed to create goalie', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: (error) => {
        console.error('Error loading goalie form data:', error);
        this.addGoalieLoading.set(false);
      },
    });
  }

  openAddGameModal(): void {
    this.addGameLoading.set(true);
    forkJoin({
      teams: this.teamService.getTeams(),
      arenas: this.arenaService.getArenas(),
      rinks: this.arenaService.getAllRinks(),
      goalies: this.goalieService.getGoalies(),
      players: this.playerService.getPlayers(),
      gameTypes: this.gameMetadataService.getGameTypes(),
      gamePeriods: this.gameMetadataService.getGamePeriods(),
    }).subscribe({
      next: ({ teams, arenas, rinks, goalies, players, gameTypes, gamePeriods }) => {
        this.addGameLoading.set(false);
        this.modalService.openModal(ScheduleFormModal, {
          name: 'Add Game',
          icon: 'event',
          width: '940px',
          maxWidth: '95vw',
          data: {
            isEditMode: false,
            teams: teams.teams,
            arenas,
            rinks,
            goalies: goalies.goalies,
            players: players.players,
            gameTypes,
            gamePeriods,
          } as ScheduleFormModalData,
          onCloseWithDataProcessing: (result: Record<string, unknown>) => {
            this.scheduleService.createGame(result).subscribe({
              next: () => {
                this.toast.show('Game created successfully', 'success');
                this.modalService.closeModal();
                this.bannerService.triggerRefresh();
                this.router.navigate(['/schedule']);
              },
              error: () => {
                this.toast.show('Failed to create game', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: (error) => {
        console.error('Error loading game form data:', error);
        this.addGameLoading.set(false);
      },
    });
  }

  viewGameAnalysis(game: Schedule): void {
    this.analysisLoadingId.set(game.id);
    forkJoin({
      games: this.scheduleService.getGameList(),
      teams: this.teamService.getTeams(),
    }).subscribe({
      next: ({ games, teams }) => {
        const teamMap = new Map(teams.teams.map((t) => [Number(t.id), t.name]));
        const gameOptions: GameOption[] = games.map((g) => ({
          value: String(g.id),
          label: `${teamMap.get(g.away_team_id) ?? 'Unknown'} at ${teamMap.get(g.home_team_id) ?? 'Unknown'} - ${g.date ?? ''}`,
        }));
        this.analysisLoadingId.set(null);
        this.openGameAnalysisModal(gameOptions, String(game.id));
      },
      error: () => {
        this.analysisLoadingId.set(null);
        this.toast.show('Failed to load game data', 'error');
      },
    });
  }

  private openGameAnalysisModal(games: GameOption[], preSelectedGameId: string): void {
    this.modalService.openModal(GameAnalysisModal, {
      name: 'Create Game Analysis',
      icon: 'bar_chart',
      width: '100%',
      maxWidth: '900px',
      data: {
        isEditMode: false,
        preSelectedGameId,
        games,
      },
      onCloseWithDataProcessing: (result: { isEditMode: boolean; apiData: AnalyticsApiIn }) => {
        const apiCall: Observable<unknown> = this.analysisService.createAnalysis(result.apiData);
        apiCall.subscribe({
          next: () => {
            this.toast.show('Analysis created successfully', 'success');
            this.modalService.closeModal();
            this.router.navigate(['/analytics/games']);
          },
          error: () => {
            this.toast.show('Failed to create analysis', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  createHighlightReel(): void {
    this.createHighlightLoading.set(true);
    forkJoin({
      teams: this.teamService.getTeams(),
      eventNames: this.gameEventNameService.getGameEventNames(),
      gamePeriods: this.gameMetadataService.getGamePeriods(),
      games: this.scheduleService.getGameList(),
    }).subscribe({
      next: ({ teams, eventNames, gamePeriods, games }) => {
        this.createHighlightLoading.set(false);
        this.modalService.openModal(HighlightReelFormModal, {
          name: 'Create Highlight Reel',
          icon: 'movie',
          width: '1400px',
          maxWidth: '95vw',
          data: {
            isEditMode: false,
            teams: teams.teams,
            eventNames,
            gamePeriods,
            games,
          } as HighlightReelFormModalData,
          onCloseWithDataProcessing: (result: HighlightReelUpsertPayload) => {
            this.highlightsService.createHighlightReel(result).subscribe({
              next: () => {
                this.toast.show('Highlight reel created successfully', 'success');
                this.modalService.closeModal();
                this.router.navigate(['/highlights']);
              },
              error: () => {
                this.toast.show('Failed to create highlight reel', 'error');
                this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
              },
            });
          },
        });
      },
      error: (error) => {
        console.error('Error loading highlight reel data:', error);
        this.createHighlightLoading.set(false);
      },
    });
  }
}
