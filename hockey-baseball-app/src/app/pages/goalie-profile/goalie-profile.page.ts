import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { Observable, forkJoin } from 'rxjs';
import { ModalService, ModalEvent } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { AnalysisService } from '../../services/analysis.service';
import { AnalyticsApiIn } from '../../shared/interfaces/analysis.interface';
import { GoalieAnalysisModal } from '../../shared/components/goalie-analysis-modal/goalie-analysis.modal';
import { GoalieService } from '../../services/goalie.service';
import {
  Goalie,
  GoalieSeasonStats,
  GoalieRecentGameStats,
} from '../../shared/interfaces/goalie.interface';
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
import { StorageKey } from '../../services/local-storage.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { CachedSrcDirective } from '../../shared/directives/cached-src.directive';

@Component({
  selector: 'app-goalie-profile',
  imports: [
    CachedSrcDirective,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    ShotLocationDisplayComponent,
    ButtonLoadingComponent,
  ],
  templateUrl: './goalie-profile.page.html',
  styleUrl: './goalie-profile.page.scss',
})
export class GoalieProfilePage implements OnInit {
  protected StorageKey = StorageKey;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalieService = inject(GoalieService);
  private seasonService = inject(SeasonService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private sprayChartUtils = inject(SprayChartUtilsService);
  private breadcrumbData = inject(BreadcrumbDataService);
  private modalService = inject(ModalService);
  private toast = inject(ToastService);
  private analysisService = inject(AnalysisService);

  goalie: Goalie | null = null;
  isAnalysisLoading = signal(false);
  loading = true;
  shotLocationData: ShotLocationData[] = [];
  seasonStats: GoalieSeasonStats[] = [];
  recentGameStats: GoalieRecentGameStats[] = [];
  seasons: Season[] = [];

  // Table column definitions
  seasonStatsColumns: string[] = [
    'season',
    'team',
    'gamesPlayed',
    'wins',
    'losses',
    'ties',
    'goalsAgainst',
    'shotsAgainst',
    'saves',
    'savePercentage',
  ];
  recentGameStatsColumns: string[] = [
    'season',
    'date',
    'vsTeam',
    'score',
    'goalsAgainst',
    'shotsAgainst',
    'saves',
    'savePercentage',
  ];

  ngOnInit(): void {
    const goalieId = this.route.snapshot.paramMap.get('id');
    if (goalieId) {
      this.loadGoalie(goalieId);
    } else {
      this.router.navigate(['/teams-and-rosters/goalies']);
    }
  }

  private loadGoalie(id: string): void {
    this.loading = true;

    // Fetch goalie data, spray chart metadata, spray chart data, team seasons, and recent games in parallel
    forkJoin({
      goalie: this.goalieService.getGoalieById(id),
      seasons: this.seasonService.getSeasons(),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      periods: this.gameMetadataService.getGamePeriods(),
      teamSeasons: this.goalieService.getGoalieTeamSeasons(id),
      recentGames: this.goalieService.getGoalieRecentGames(id, 5),
    }).subscribe({
      next: ({ goalie, seasons, eventNames, shotTypes, periods, teamSeasons, recentGames }) => {
        if (goalie) {
          this.goalie = goalie;
          this.breadcrumbData.entityName.set(`${goalie.firstName} ${goalie.lastName}`);
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
          console.error(`Goalie not found with ID: ${id}`);
          this.router.navigate(['/teams-and-rosters/goalies']);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading goalie:', error);
        this.loading = false;
        // Set empty arrays on error so component still renders
        this.seasonStats = [];
        this.recentGameStats = [];
        this.router.navigate(['/teams-and-rosters/goalies']);
      },
    });
  }

  private loadSprayChartData(
    goalieId: string,
    seasonId: number,
    eventNames: GameEventName[],
    shotTypes: ShotTypeResponse[],
    periods: GamePeriodResponse[]
  ): void {
    // Fetch spray chart with season filter only (game_id and shot_type_id are empty)
    this.goalieService.getGoalieSprayChart(goalieId, { season_id: seasonId }).subscribe({
      next: (sprayChartEvents) => {
        // Create period names map
        const periodNames = new Map<number, string>();
        periods.forEach((period) => {
          periodNames.set(period.id, period.name);
        });

        const transformOptions: SprayChartTransformOptions = {
          defaultPlayerName:
            `${this.goalie?.firstName ?? ''} ${this.goalie?.lastName ?? ''}`.trim(),
          defaultTeamName: this.goalie?.team,
          periodNames,
          formatTime: (time) => time,
        };
        this.shotLocationData = this.sprayChartUtils.transformSprayChartData(
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
    if (!this.goalie) return 0;
    const currentYear = new Date().getFullYear();
    return currentYear - this.goalie.birthYear;
  }

  calculateSavePercentage(): string {
    if (!this.goalie || this.goalie.shotsOnGoal === 0) return '0.00';
    const savePercentage = (this.goalie.saves / this.goalie.shotsOnGoal) * 100;
    return savePercentage.toFixed(2);
  }

  calculateGoalsAgainstAverage(): string {
    if (!this.goalie || this.goalie.gamesPlayed === 0) return '0.00';
    const gaa = this.goalie.goalsAgainst / this.goalie.gamesPlayed;
    return gaa.toFixed(2);
  }

  calculateWinPercentage(): string {
    if (!this.goalie || this.goalie.gamesPlayed === 0) return '0.00';
    const winPercentage = (this.goalie.wins / this.goalie.gamesPlayed) * 100;
    return winPercentage.toFixed(1);
  }

  getCountry(): string {
    // Return default mocked country value
    // If goalie has country data, use it, otherwise default to Canada
    return this.goalie?.country || 'Canada';
  }

  getSeasonStats(): GoalieSeasonStats[] {
    return this.seasonStats;
  }

  getSeasonName(seasonId: number): string {
    const season = this.seasons.find((s) => s.id === seasonId);
    return season ? season.name : '';
  }

  getRecentGameStats(): GoalieRecentGameStats[] {
    return this.recentGameStats;
  }

  getShotLocationData(): ShotLocationData[] {
    return this.shotLocationData;
  }

  onGoalieAnalysis(): void {
    if (!this.goalie) return;

    this.isAnalysisLoading.set(true);
    this.goalieService.getGoalies().subscribe({
      next: (result) => {
        this.isAnalysisLoading.set(false);
        this.openAnalysisModal(result.goalies);
      },
      error: () => {
        this.isAnalysisLoading.set(false);
        this.toast.show('Failed to load goalies', 'error');
      },
    });
  }

  private openAnalysisModal(goalies: Goalie[]): void {
    this.modalService.openModal(GoalieAnalysisModal, {
      name: 'Create Goalie Analysis',
      icon: 'bar_chart',
      width: '100%',
      maxWidth: '900px',
      data: {
        isEditMode: false,
        preSelectedGoalieId: this.goalie!.id.toString(),
        goalies,
      },
      onCloseWithDataProcessing: (result: { isEditMode: boolean; apiData: AnalyticsApiIn }) => {
        const apiCall: Observable<unknown> = this.analysisService.createAnalysis(result.apiData);
        apiCall.subscribe({
          next: () => {
            this.toast.show('Analysis created successfully', 'success');
            this.modalService.closeModal();
            this.router.navigate(['/analytics/goalies']);
          },
          error: () => {
            this.toast.show('Failed to create analysis', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }
}
