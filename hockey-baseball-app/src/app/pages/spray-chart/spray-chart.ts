import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { forkJoin } from 'rxjs';
import { GoalieService } from '../../services/goalie.service';
import { Goalie } from '../../shared/interfaces/goalie.interface';
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
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private sprayChartUtils = inject(SprayChartUtilsService);

  goalie: Goalie | null = null;
  loading = true;
  shotLocationData: ShotLocationData[] = [];

  ngOnInit(): void {
    const goalieId = this.route.snapshot.paramMap.get('id');
    if (goalieId) {
      this.loadSprayChartData(goalieId);
    } else {
      this.router.navigate(['/goalies']);
    }
  }

  private loadSprayChartData(goalieId: string): void {
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

  goBack(): void {
    this.router.navigate(['/goalies']);
  }

  viewProfile(): void {
    if (this.goalie) {
      this.router.navigate(['/goalie-profile', this.goalie.id]);
    }
  }
}
