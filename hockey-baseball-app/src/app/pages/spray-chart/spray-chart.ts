import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { forkJoin } from 'rxjs';
import { GoalieService } from '../../services/goalie.service';
import { PlayerService } from '../../services/player.service';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { ShotLocationDisplayComponent, ShotLocationData } from '../../shared/components/shot-location-display/shot-location-display';
import { GameEventNameService, GameEventName } from '../../services/game-event-name.service';
import { GameMetadataService, ShotTypeResponse } from '../../services/game-metadata.service';
import { SprayChartUtilsService } from '../../services/spray-chart-utils.service';

@Component({
  selector: 'app-spray-chart',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    ShotLocationDisplayComponent
  ],
  templateUrl: './spray-chart.html',
  styleUrl: './spray-chart.scss'
})
export class SprayChartComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalieService = inject(GoalieService);
  private playerService = inject(PlayerService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private sprayChartUtils = inject(SprayChartUtilsService);

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
      this.router.navigate(['/goalies']);
    }
  }

  private loadGoalieSprayChartData(goalieId: string): void {
    this.loading = true;
    
    // Fetch goalie data, spray chart metadata, and spray chart data in parallel
    forkJoin({
      goalie: this.goalieService.getGoalieById(goalieId),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      sprayChartEvents: this.goalieService.getGoalieSprayChart(goalieId, {}) // Empty filter = all seasons
    }).subscribe({
      next: ({ goalie, eventNames, shotTypes, sprayChartEvents }) => {
        if (goalie) {
          this.goalie = goalie;
          this.shotLocationData = this.sprayChartUtils.transformSprayChartData(
            sprayChartEvents,
            eventNames,
            shotTypes
          );
        } else {
          console.error(`Goalie not found with ID: ${goalieId}`);
          this.router.navigate(['/goalies']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spray chart data:', error);
        this.loading = false;
        this.router.navigate(['/goalies']);
      }
    });
  }

  private loadPlayerSprayChartData(playerId: string): void {
    this.loading = true;
    
    // Fetch player data, spray chart metadata, and spray chart data in parallel
    forkJoin({
      player: this.playerService.getPlayerById(playerId),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      sprayChartEvents: this.playerService.getPlayerSprayChart(playerId, {}) // Empty filter = all seasons
    }).subscribe({
      next: ({ player, eventNames, shotTypes, sprayChartEvents }) => {
        if (player) {
          this.player = player;
          this.shotLocationData = this.sprayChartUtils.transformPlayerSprayChartData(
            sprayChartEvents,
            eventNames,
            shotTypes
          );
        } else {
          console.error(`Player not found with ID: ${playerId}`);
          this.router.navigate(['/players']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spray chart data:', error);
        this.loading = false;
        this.router.navigate(['/players']);
      }
    });
  }

  goBack(): void {
    if (this.entityType === 'player') {
      this.router.navigate(['/players']);
    } else {
      this.router.navigate(['/goalies']);
    }
  }

  viewProfile(): void {
    if (this.goalie) {
      this.router.navigate(['/goalie-profile', this.goalie.id]);
    } else if (this.player) {
      this.router.navigate(['/player-profile', this.player.id]);
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
}
