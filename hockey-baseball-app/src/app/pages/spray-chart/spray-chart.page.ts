import { Component, OnInit, inject } from '@angular/core';
import {  } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GoalieService } from '../../services/goalie.service';
import { PlayerService } from '../../services/player.service';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Player } from '../../shared/interfaces/player.interface';
import {
  ShotLocationDisplayComponent,
  ShotLocationData,
} from '../../shared/components/shot-location-display/shot-location-display.component';
import { GameEventNameService } from '../../services/game-event-name.service';
import { GameMetadataService } from '../../services/game-metadata.service';
import {
  SprayChartTransformOptions,
  SprayChartUtilsService,
} from '../../services/spray-chart-utils.service';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';

@Component({
  selector: 'app-spray-chart',
  imports: [
    ShotLocationDisplayComponent,
    ButtonComponent,
  ],
  templateUrl: './spray-chart.page.html',
  styleUrl: './spray-chart.page.scss',
})
export class SprayChartPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalieService = inject(GoalieService);
  private playerService = inject(PlayerService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private sprayChartUtils = inject(SprayChartUtilsService);
  private breadcrumbData = inject(BreadcrumbDataService);

  goalie: Goalie | null = null;
  player: Player | null = null;
  loading = true;
  shotLocationData: ShotLocationData[] = [];
  entityType: 'goalie' | 'player' | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const type = this.route.snapshot.queryParamMap.get('type') || 'goalie';

    if (id) {
      this.entityType = type as 'goalie' | 'player';
      if (type === 'player') {
        this.loadPlayerSprayChartData(id);
      } else {
        this.loadGoalieSprayChartData(id);
      }
    } else {
      this.router.navigate(['/teams-and-rosters/goalies']);
    }
  }

  private loadGoalieSprayChartData(goalieId: string): void {
    this.loading = true;

    // Fetch goalie data, spray chart metadata, and spray chart data in parallel
    forkJoin({
      goalie: this.goalieService.getGoalieById(goalieId),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      periods: this.gameMetadataService.getGamePeriods(),
      sprayChartEvents: this.goalieService.getGoalieSprayChart(goalieId, {}), // Empty filter = all seasons
    }).subscribe({
      next: ({ goalie, eventNames, shotTypes, periods, sprayChartEvents }) => {
        if (goalie) {
          this.goalie = goalie;
          this.breadcrumbData.entityName.set(`${goalie.firstName} ${goalie.lastName}`);
          // Create period names map
          const periodNames = new Map<number, string>();
          periods.forEach((period) => {
            periodNames.set(period.id, period.name);
          });

          const transformOptions: SprayChartTransformOptions = {
            defaultPlayerName: `${goalie.firstName} ${goalie.lastName}`,
            defaultTeamName: goalie.team,
            periodNames,
            formatTime: (time) => time,
            flipCoordinates: true, // Flip coordinates for goalie perspective
          };
          this.shotLocationData = this.sprayChartUtils.transformSprayChartData(
            sprayChartEvents,
            eventNames,
            shotTypes,
            transformOptions
          );
        } else {
          console.error(`Goalie not found with ID: ${goalieId}`);
          this.router.navigate(['/teams-and-rosters/goalies']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spray chart data:', error);
        this.loading = false;
        this.router.navigate(['/teams-and-rosters/goalies']);
      },
    });
  }

  private loadPlayerSprayChartData(playerId: string): void {
    this.loading = true;

    // Fetch player data, spray chart metadata, and spray chart data in parallel
    forkJoin({
      player: this.playerService.getPlayerById(playerId),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      periods: this.gameMetadataService.getGamePeriods(),
      sprayChartEvents: this.playerService.getPlayerSprayChart(playerId, {}), // Empty filter = all seasons
    }).subscribe({
      next: ({ player, eventNames, shotTypes, periods, sprayChartEvents }) => {
        if (player) {
          this.player = player;
          this.breadcrumbData.entityName.set(`${player.firstName} ${player.lastName}`);
          // Create period names map
          const periodNames = new Map<number, string>();
          periods.forEach((period) => {
            periodNames.set(period.id, period.name);
          });

          const transformOptions: SprayChartTransformOptions = {
            defaultPlayerName: `${player.firstName} ${player.lastName}`,
            defaultTeamName: player.team,
            periodNames,
            formatTime: (time) => time,
          };
          this.shotLocationData = this.sprayChartUtils.transformPlayerSprayChartData(
            sprayChartEvents,
            eventNames,
            shotTypes,
            transformOptions
          );
        } else {
          console.error(`Player not found with ID: ${playerId}`);
          this.router.navigate(['/teams-and-rosters/players']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spray chart data:', error);
        this.loading = false;
        this.router.navigate(['/teams-and-rosters/players']);
      },
    });
  }

  goBack(): void {
    if (this.entityType === 'player') {
      this.router.navigate(['/teams-and-rosters/players']);
    } else {
      this.router.navigate(['/teams-and-rosters/goalies']);
    }
  }

  viewProfile(): void {
    if (this.goalie) {
      this.router.navigate(['/teams-and-rosters/goalies', this.goalie.id, 'profile']);
    } else if (this.player) {
      this.router.navigate(['/teams-and-rosters/players', this.player.id, 'profile']);
    }
  }

  get displayName(): string {
    if (this.goalie) {
      return `${this.goalie.firstName} ${this.goalie.lastName}`;
    } else if (this.player) {
      return `${this.player.firstName} ${this.player.lastName}`;
    }
    return '';
  }

  get goalieId(): number | undefined {
    return this.goalie ? Number(this.goalie.id) : undefined;
  }

  get goalieName(): string | undefined {
    return this.goalie ? `${this.goalie.firstName} ${this.goalie.lastName}` : undefined;
  }

  get teamId(): number | undefined {
    if (this.goalie?.teamId) {
      return Number(this.goalie.teamId);
    } else if (this.player?.teamId) {
      return Number(this.player.teamId);
    }
    return undefined;
  }

  get teamName(): string | undefined {
    return this.goalie?.team || this.player?.team;
  }
}
