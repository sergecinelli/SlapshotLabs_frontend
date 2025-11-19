import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { Player, PlayerSeasonStats, PlayerRecentGameStats } from '../../shared/interfaces/player.interface';
import { PlayerFormModalComponent } from '../../shared/components/player-form-modal/player-form-modal';
import { ShotLocationDisplayComponent, ShotLocationData } from '../../shared/components/shot-location-display/shot-location-display';
import { SeasonService } from '../../services/season.service';
import { GameEventNameService, GameEventName } from '../../services/game-event-name.service';
import { GameMetadataService, ShotTypeResponse } from '../../services/game-metadata.service';
import { SprayChartUtilsService } from '../../services/spray-chart-utils.service';

@Component({
  selector: 'app-player-profile',
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
  templateUrl: './player-profile.html',
  styleUrl: './player-profile.scss'
})
export class PlayerProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private dialog = inject(MatDialog);
  private seasonService = inject(SeasonService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private sprayChartUtils = inject(SprayChartUtilsService);

  player: Player | null = null;
  loading = true;
  shotLocationData: ShotLocationData[] = [];
  
  // Table column definitions
  seasonStatsColumns: string[] = ['season', 'team', 'gamesPlayed', 'goals', 'assists', 'points', 'shotsOnGoal', 'scoringChances', 'penaltiesDrawn', 'turnovers', 'faceOffWinPercentage'];
  recentGameStatsColumns: string[] = ['season', 'date', 'vs', 'team', 'score', 'goals', 'assists', 'points', 'shotsOnGoal', 'scoringChances', 'penaltiesDrawn', 'turnovers', 'faceOffWinPercentage'];

  ngOnInit(): void {
    const playerId = this.route.snapshot.paramMap.get('id');
    if (playerId) {
      this.loadPlayer(playerId);
    } else {
      this.router.navigate(['/players']);
    }
  }

  private loadPlayer(id: string): void {
    this.loading = true;
    
    // Fetch player data, spray chart metadata, and spray chart data in parallel
    forkJoin({
      player: this.playerService.getPlayerById(id),
      seasons: this.seasonService.getSeasons(),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes()
    }).subscribe({
      next: ({ player, seasons, eventNames, shotTypes }) => {
        if (player) {
          this.player = player;
          
          // Get the last season (highest ID)
          const lastSeason = seasons.reduce((max, season) => 
            season.id > max.id ? season : max, seasons[0]
          );
          
          // Fetch spray chart data for the last season
          this.loadSprayChartData(id, lastSeason.id, eventNames, shotTypes);
        } else {
          console.error(`Player not found with ID: ${id}`);
          this.router.navigate(['/players']);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading player:', error);
        this.loading = false;
        this.router.navigate(['/players']);
      }
    });
  }

  private loadSprayChartData(
    playerId: string,
    seasonId: number,
    eventNames: GameEventName[],
    shotTypes: ShotTypeResponse[]
  ): void {
    // Fetch spray chart with season filter only (game_id and shot_type_id are empty)
    this.playerService.getPlayerSprayChart(playerId, { season_id: seasonId }).subscribe({
      next: (sprayChartEvents) => {
        this.shotLocationData = this.sprayChartUtils.transformPlayerSprayChartData(
          sprayChartEvents,
          eventNames,
          shotTypes
        );
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

    const dialogRef = this.dialog.open(PlayerFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        player: this.player,
        isEditMode: true
      },
      panelClass: 'player-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updatePlayer(result);
      }
    });
  }

  private updatePlayer(playerData: Partial<Player>): void {
    if (!this.player?.id) return;

    this.loading = true;
    this.playerService.updatePlayer(this.player.id, playerData).subscribe({
      next: (updatedPlayer) => {
        this.player = updatedPlayer;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating player:', error);
        this.loading = false;
      }
    });
  }

  onRequestAnalysis(): void {
    console.log('Request player analysis clicked');
    // TODO: Implement analysis request
  }
  
  getSeasonStats(): PlayerSeasonStats[] {
    return [
      {
        season: '2024/2025',
        logo: '',
        team: 'Toronto Maple Leafs',
        gamesPlayed: 25,
        goals: 12,
        assists: 18,
        points: 30,
        shotsOnGoal: 89,
        scoringChances: 45,
        penaltiesDrawn: 8,
        turnovers: 15,
        faceOffWinPercentage: 52.5
      },
      {
        season: '2023/2024',
        logo: '',
        team: 'Toronto Maple Leafs',
        gamesPlayed: 78,
        goals: 35,
        assists: 42,
        points: 77,
        shotsOnGoal: 245,
        scoringChances: 156,
        penaltiesDrawn: 23,
        turnovers: 67,
        faceOffWinPercentage: 48.9
      },
      {
        season: '2022/2023',
        logo: '',
        team: 'Boston Bruins',
        gamesPlayed: 72,
        goals: 28,
        assists: 55,
        points: 83,
        shotsOnGoal: 198,
        scoringChances: 134,
        penaltiesDrawn: 31,
        turnovers: 58,
        faceOffWinPercentage: 51.2
      }
    ];
  }
  
  getRecentGameStats(): PlayerRecentGameStats[] {
    return [
      {
        season: '2024/2025',
        date: 'Oct. 12, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Montreal Canadiens',
        score: '(W) 4 - 2',
        goals: 1,
        assists: 2,
        points: 3,
        shotsOnGoal: 4,
        scoringChances: 3,
        penaltiesDrawn: 1,
        turnovers: 2,
        faceOffWinPercentage: 60.0
      },
      {
        season: '2024/2025',
        date: 'Oct. 10, 2025',
        vs: '@',
        teamLogo: '',
        team: 'Ottawa Senators',
        score: '(L) 2 - 5',
        goals: 0,
        assists: 1,
        points: 1,
        shotsOnGoal: 3,
        scoringChances: 2,
        penaltiesDrawn: 0,
        turnovers: 3,
        faceOffWinPercentage: 45.5
      },
      {
        season: '2024/2025',
        date: 'Oct. 8, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Buffalo Sabres',
        score: '(W) 6 - 3',
        goals: 2,
        assists: 1,
        points: 3,
        shotsOnGoal: 6,
        scoringChances: 4,
        penaltiesDrawn: 2,
        turnovers: 1,
        faceOffWinPercentage: 55.8
      },
      {
        season: '2024/2025',
        date: 'Oct. 5, 2025',
        vs: '@',
        teamLogo: '',
        team: 'Florida Panthers',
        score: '(T) 3 - 3',
        goals: 1,
        assists: 0,
        points: 1,
        shotsOnGoal: 5,
        scoringChances: 2,
        penaltiesDrawn: 0,
        turnovers: 2,
        faceOffWinPercentage: 48.2
      },
      {
        season: '2024/2025',
        date: 'Oct. 2, 2025',
        vs: 'vs',
        teamLogo: '',
        team: 'Tampa Bay Lightning',
        score: '(W) 5 - 1',
        goals: 1,
        assists: 3,
        points: 4,
        shotsOnGoal: 3,
        scoringChances: 5,
        penaltiesDrawn: 1,
        turnovers: 0,
        faceOffWinPercentage: 62.5
      }
    ];
  }

  getShotLocationData(): ShotLocationData[] {
    return this.shotLocationData;
  }
}
