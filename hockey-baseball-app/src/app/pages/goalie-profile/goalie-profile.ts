import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { GoalieService } from '../../services/goalie.service';
import { Goalie, GoalieSeasonStats, GoalieRecentGameStats } from '../../shared/interfaces/goalie.interface';

@Component({
  selector: 'app-goalie-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule
  ],
  templateUrl: './goalie-profile.html',
  styleUrl: './goalie-profile.scss'
})
export class GoalieProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalieService = inject(GoalieService);

  goalie: Goalie | null = null;
  loading = true;
  
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
    console.log(`Loading goalie with ID: ${id}`);
    
    this.goalieService.getGoalieById(id).subscribe({
      next: (goalie) => {
        if (goalie) {
          console.log('Goalie loaded successfully:', goalie);
          this.goalie = goalie;
        } else {
          console.error(`Goalie not found with ID: ${id}`);
          // Could redirect to 404 page or show error message
          // For now, navigate back to goalies list
          this.router.navigate(['/goalies']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading goalie:', error);
        this.loading = false;
        // Could show a user-friendly error message here
        this.router.navigate(['/goalies']);
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
}
