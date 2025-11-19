import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { GoalieService } from '../../services/goalie.service';
import { Goalie, GoalieSeasonStats, GoalieRecentGameStats } from '../../shared/interfaces/goalie.interface';
import { ShotLocationDisplayComponent, ShotLocationData } from '../../shared/components/shot-location-display/shot-location-display';
import { SeasonService } from '../../services/season.service';
import { GameEventNameService, GameEventName } from '../../services/game-event-name.service';
import { GameMetadataService, ShotTypeResponse } from '../../services/game-metadata.service';
import { SprayChartUtilsService } from '../../services/spray-chart-utils.service';

@Component({
  selector: 'app-goalie-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    ShotLocationDisplayComponent
  ],
  templateUrl: './goalie-profile.html',
  styleUrl: './goalie-profile.scss'
})
export class GoalieProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalieService = inject(GoalieService);
  private seasonService = inject(SeasonService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private sprayChartUtils = inject(SprayChartUtilsService);

  goalie: Goalie | null = null;
  loading = true;
  shotLocationData: ShotLocationData[] = [];
  
  // Table column definitions
  seasonStatsColumns: string[] = ['season', 'team', 'gamesPlayed', 'wins', 'losses', 'ties', 'goalsAgainst', 'shotsAgainst', 'saves', 'savePercentage'];
  recentGameStatsColumns: string[] = ['season', 'date', 'vs', 'team', 'score', 'goalsAgainst', 'shotsAgainst', 'saves', 'savePercentage'];

  ngOnInit(): void {
    const goalieId = this.route.snapshot.paramMap.get('id');
    if (goalieId) {
      this.loadGoalie(goalieId);
    } else {
      this.router.navigate(['/goalies']);
    }
  }

  private loadGoalie(id: string): void {
    this.loading = true;
    
    // Fetch goalie data, spray chart metadata, and spray chart data in parallel
    forkJoin({
      goalie: this.goalieService.getGoalieById(id),
      seasons: this.seasonService.getSeasons(),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes()
    }).subscribe({
      next: ({ goalie, seasons, eventNames, shotTypes }) => {
        if (goalie) {
          this.goalie = goalie;
          
          // Get the last season (highest ID)
          const lastSeason = seasons.reduce((max, season) => 
            season.id > max.id ? season : max, seasons[0]
          );
          
          // Fetch spray chart data for the last season
          this.loadSprayChartData(id, lastSeason.id, eventNames, shotTypes);
        } else {
          console.error(`Goalie not found with ID: ${id}`);
          this.router.navigate(['/goalies']);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading goalie:', error);
        this.loading = false;
        this.router.navigate(['/goalies']);
      }
    });
  }

  private loadSprayChartData(
    goalieId: string,
    seasonId: number,
    eventNames: GameEventName[],
    shotTypes: ShotTypeResponse[]
  ): void {
    // Fetch spray chart with season filter only (game_id and shot_type_id are empty)
    this.goalieService.getGoalieSprayChart(goalieId, { season_id: seasonId }).subscribe({
      next: (sprayChartEvents) => {
        this.shotLocationData = this.sprayChartUtils.transformSprayChartData(
          sprayChartEvents,
          eventNames,
          shotTypes
        );
        console.log(this.shotLocationData);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading spray chart data:', error);
        // Set empty array on error so component still renders
        this.shotLocationData = [];
        this.loading = false;
      }
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
    return [
      {
        season: '2024/2025',
        logo: '',
        team: 'Florida Panthers',
        gamesPlayed: 20,
        wins: 5,
        losses: 10,
        ties: 5,
        goalsAgainst: 15,
        shotsAgainst: 95,
        saves: 80,
        savePercentage: 0.842
      },
      {
        season: '2023/2024',
        logo: '',
        team: 'Toronto Maple Leaves',
        gamesPlayed: 20,
        wins: 5,
        losses: 10,
        ties: 5,
        goalsAgainst: 15,
        shotsAgainst: 95,
        saves: 80,
        savePercentage: 0.842
      },
      {
        season: '2022/2023',
        logo: '',
        team: 'Toronto Maple Leaves',
        gamesPlayed: 20,
        wins: 5,
        losses: 10,
        ties: 5,
        goalsAgainst: 15,
        shotsAgainst: 95,
        saves: 80,
        savePercentage: 0.842
      }
    ];
  }
  
  getRecentGameStats(): GoalieRecentGameStats[] {
    return [
      {
        season: '2025/2026',
        date: 'Oct. 10, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Toronto Maple Leafs',
        score: '(L/W/T) 5 - 3',
        goalsAgainst: 5,
        shotsAgainst: 28,
        saves: 23,
        savePercentage: 0.821
      },
      {
        season: '2025/2026',
        date: 'Oct. 10, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Toronto Maple Leafs',
        score: '(L/W/T) 5 - 3',
        goalsAgainst: 5,
        shotsAgainst: 28,
        saves: 23,
        savePercentage: 0.821
      },
      {
        season: '2025/2026',
        date: 'Oct. 10, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Toronto Maple Leafs',
        score: '(L/W/T) 5 - 3',
        goalsAgainst: 5,
        shotsAgainst: 28,
        saves: 23,
        savePercentage: 0.821
      },
      {
        season: '2025/2026',
        date: 'Oct. 10, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Toronto Maple Leafs',
        score: '(L/W/T) 5 - 3',
        goalsAgainst: 5,
        shotsAgainst: 28,
        saves: 23,
        savePercentage: 0.821
      },
      {
        season: '2025/2026',
        date: 'Oct. 10, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Toronto Maple Leafs',
        score: '(L/W/T) 5 - 3',
        goalsAgainst: 5,
        shotsAgainst: 28,
        saves: 23,
        savePercentage: 0.821
      }
    ];
  }

  getShotLocationData(): ShotLocationData[] {
    return this.shotLocationData;
  }
}
