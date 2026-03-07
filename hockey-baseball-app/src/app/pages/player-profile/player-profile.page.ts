import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { AnalysisService } from '../../services/analysis.service';
import { AnalyticsApiIn } from '../../shared/interfaces/analysis.interface';
import { PlayerAnalysisModal } from '../../shared/components/player-analysis-modal/player-analysis.modal';
import { ToastService } from '../../services/toast.service';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { TeamService } from '../../services/team.service';
import { PositionService, PositionOption } from '../../services/position.service';
import { Team } from '../../shared/interfaces/team.interface';
import {
  Player,
  PlayerSeasonStats,
  PlayerRecentGameStats,
} from '../../shared/interfaces/player.interface';
import { PlayerFormModal } from '../../shared/components/player-form-modal/player-form.modal';
import {
  ShotLocationDisplayComponent,
  ShotLocationData,
} from '../../shared/components/shot-location-display/shot-location-display.component';
import { SeasonService } from '../../services/season.service';
import { Season } from '../../shared/interfaces/season.interface';
import { GameEventNameService, GameEventName } from '../../services/game-event-name.service';
import {
  GameMetadataService,
  ShotTypeResponse,
  GamePeriodResponse,
} from '../../services/game-metadata.service';
import {
  SprayChartTransformOptions,
  SprayChartUtilsService,
} from '../../services/spray-chart-utils.service';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { visibilityByRoleMap } from './player-profile.role-map';
import { StorageKey } from '../../services/local-storage.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { CachedSrcDirective } from '../../shared/directives/cached-src.directive';
import { BreadcrumbActionsDirective } from '../../shared/directives/breadcrumb-actions.directive';

@Component({
  selector: 'app-player-profile',
  imports: [
    CachedSrcDirective,
    DecimalPipe,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    ShotLocationDisplayComponent,
    ComponentVisibilityByRoleDirective,
    ButtonLoadingComponent,
    RouterLink,
    BreadcrumbActionsDirective,
  ],
  templateUrl: './player-profile.page.html',
  styleUrl: './player-profile.page.scss',
})
export class PlayerProfilePage implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;
  protected StorageKey = StorageKey;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private modalService = inject(ModalService);
  private seasonService = inject(SeasonService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private sprayChartUtils = inject(SprayChartUtilsService);
  private breadcrumbData = inject(BreadcrumbDataService);
  private toast = inject(ToastService);
  private teamService = inject(TeamService);
  private positionService = inject(PositionService);
  private analysisService = inject(AnalysisService);

  player: Player | null = null;
  isEditLoading = signal(false);
  isAnalysisLoading = signal(false);
  loading = true;
  shotLocationData: ShotLocationData[] = [];
  seasonStats: PlayerSeasonStats[] = [];
  recentGameStats: PlayerRecentGameStats[] = [];
  seasons: Season[] = [];

  // Table column definitions
  seasonStatsColumns: string[] = [
    'season',
    'gamesPlayed',
    'goals',
    'assists',
    'points',
    'shotsOnGoal',
    'scoringChances',
    'penaltiesDrawn',
    'turnovers',
    'faceOffWinPercentage',
  ];
  recentGameStatsColumns: string[] = [
    'season',
    'date',
    'vsTeam',
    'score',
    'goals',
    'assists',
    'points',
    'shotsOnGoal',
    'scoringChances',
    'penaltiesDrawn',
    'turnovers',
    'faceOffWinPercentage',
  ];

  ngOnInit(): void {
    const playerId = this.route.snapshot.paramMap.get('id');
    if (playerId) {
      this.loadPlayer(playerId);
    } else {
      this.router.navigate(['/teams-and-rosters/players']);
    }
  }

  private loadPlayer(id: string): void {
    this.loading = true;

    // Fetch player data, spray chart metadata, spray chart data, team seasons, and recent games in parallel
    forkJoin({
      player: this.playerService.getPlayerById(id),
      seasons: this.seasonService.getSeasons(),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      periods: this.gameMetadataService.getGamePeriods(),
      teamSeasons: this.playerService.getPlayerTeamSeasons(id),
      recentGames: this.playerService.getPlayerRecentGames(id, 5),
    }).subscribe({
      next: ({ player, seasons, eventNames, shotTypes, periods, teamSeasons, recentGames }) => {
        if (player) {
          this.player = player;
          this.breadcrumbData.entityName.set(`${player.firstName} ${player.lastName}`);
          this.seasonStats = teamSeasons;
          this.recentGameStats = recentGames;
          this.seasons = seasons;

          // Get the last season (highest ID)
          const lastSeason = seasons.reduce(
            (max, season) => (season.id > max.id ? season : max),
            seasons[0]
          );

          // Fetch spray chart data for the last season
          this.loadSprayChartData(id, lastSeason.id, eventNames, shotTypes, periods);
        } else {
          console.error(`Player not found with ID: ${id}`);
          this.router.navigate(['/teams-and-rosters/players']);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading player:', error);
        this.loading = false;
        // Set empty arrays on error so component still renders
        this.seasonStats = [];
        this.recentGameStats = [];
        this.router.navigate(['/teams-and-rosters/players']);
      },
    });
  }

  private loadSprayChartData(
    playerId: string,
    seasonId: number,
    eventNames: GameEventName[],
    shotTypes: ShotTypeResponse[],
    periods: GamePeriodResponse[]
  ): void {
    // Fetch spray chart with season filter only (game_id and shot_type_id are empty)
    this.playerService.getPlayerSprayChart(playerId, { season_id: seasonId }).subscribe({
      next: (sprayChartEvents) => {
        // Create period names map
        const periodNames = new Map<number, string>();
        periods.forEach((period) => {
          periodNames.set(period.id, period.name);
        });

        const transformOptions: SprayChartTransformOptions = {
          defaultPlayerName:
            `${this.player?.firstName ?? ''} ${this.player?.lastName ?? ''}`.trim(),
          defaultTeamName: this.player?.team,
          periodNames,
          formatTime: (time) => time,
        };
        this.shotLocationData = this.sprayChartUtils.transformPlayerSprayChartData(
          sprayChartEvents,
          eventNames,
          shotTypes,
          transformOptions
        );
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spray chart data:', error);
        // Set empty array on error so component still renders
        this.shotLocationData = [];
        this.loading = false;
      },
    });
  }

  calculateAge(): number {
    if (!this.player) return 0;
    const currentYear = new Date().getFullYear();
    return currentYear - this.player.birthYear;
  }

  calculatePointsPerGame(): string {
    if (!this.player || this.player.gamesPlayed === 0) return '0.00';
    const ppg = this.player.points / this.player.gamesPlayed;
    return ppg.toFixed(2);
  }

  calculateGoalsPerGame(): string {
    if (!this.player || this.player.gamesPlayed === 0) return '0.00';
    const gpg = this.player.goals / this.player.gamesPlayed;
    return gpg.toFixed(2);
  }

  calculateAssistsPerGame(): string {
    if (!this.player || this.player.gamesPlayed === 0) return '0.00';
    const apg = this.player.assists / this.player.gamesPlayed;
    return apg.toFixed(2);
  }

  getAddress(): string {
    return this.player?.rink?.address || 'Toronto, ON';
  }

  onEditProfile(): void {
    if (!this.player) return;

    this.isEditLoading.set(true);
    forkJoin({
      teams: this.teamService.getTeams(),
      positions: this.positionService.getPositions(),
    }).subscribe({
      next: ({ teams, positions }) => {
        this.isEditLoading.set(false);
        this.openEditModal(teams.teams, positions);
      },
      error: () => {
        this.isEditLoading.set(false);
        this.toast.show('Failed to load form data', 'error');
      },
    });
  }

  private openEditModal(teams: Team[], positions: PositionOption[]): void {
    this.modalService.openModal(PlayerFormModal, {
      name: 'Edit Player',
      icon: 'sports_hockey',
      width: '800px',
      maxWidth: '95vw',
      data: {
        player: this.player,
        isEditMode: true,
        teams,
        positions,
      },
      onCloseWithDataProcessing: (result: Partial<Player>) => {
        if (!this.player?.id) return;

        this.playerService.updatePlayer(this.player.id, result).subscribe({
          next: (updatedPlayer) => {
            this.toast.show('Player updated successfully', 'success');
            this.modalService.closeModal();
            this.player = updatedPlayer;
          },
          error: () => {
            this.toast.show('Failed to update player', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  onRequestAnalysis(): void {
    if (!this.player) return;

    this.isAnalysisLoading.set(true);
    this.playerService.getPlayers().subscribe({
      next: (result) => {
        this.isAnalysisLoading.set(false);
        this.openAnalysisModal(result.players);
      },
      error: () => {
        this.isAnalysisLoading.set(false);
        this.toast.show('Failed to load players', 'error');
      },
    });
  }

  private openAnalysisModal(players: Player[]): void {
    this.modalService.openModal(PlayerAnalysisModal, {
      name: 'Create Player Analysis',
      icon: 'bar_chart',
      width: '100%',
      maxWidth: '900px',
      data: {
        isEditMode: false,
        preSelectedPlayerId: this.player!.id.toString(),
        players,
      },
      onCloseWithDataProcessing: (result: { isEditMode: boolean; apiData: AnalyticsApiIn }) => {
        const apiCall: Observable<unknown> = this.analysisService.createAnalysis(result.apiData);
        apiCall.subscribe({
          next: () => {
            this.toast.show('Analysis created successfully', 'success');
            this.modalService.closeModal();
            this.router.navigate(['/analytics/players']);
          },
          error: () => {
            this.toast.show('Failed to create analysis', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  getSeasonStats(): PlayerSeasonStats[] {
    return this.seasonStats;
  }

  getSeasonName(seasonId: number): string {
    const season = this.seasons.find((s) => s.id === seasonId);
    return season ? season.name : '';
  }

  getRecentGameStats(): PlayerRecentGameStats[] {
    return this.recentGameStats;
  }

  getShotLocationData(): ShotLocationData[] {
    return this.shotLocationData;
  }
}
