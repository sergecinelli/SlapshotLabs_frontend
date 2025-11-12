import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { TeamService } from '../../services/team.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { Team } from '../../shared/interfaces/team.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { TeamFormModalComponent } from '../../shared/components/team-form-modal/team-form-modal';
import { forkJoin } from 'rxjs';

// Additional interfaces for team profile specific data
export interface TeamGame {
  id: string;
  date: string;
  time: string;
  opponent: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals?: number;
  awayGoals?: number;
  gameType: string;
  rink: string;
  status: string;
  result?: string;
}

export interface TeamPlayer {
  id: string;
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  position: string;
  height: string;
  weight: number;
  shoots: string;
  birthYear?: number;
  team?: string;
}

export interface TeamSeasonStat {
  season: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
}

@Component({
  selector: 'app-team-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule
  ],
  templateUrl: './team-profile.html',
  styleUrl: './team-profile.scss'
})
export class TeamProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private dialog = inject(MatDialog);

  team: Team | null = null;
  roster: (Player | Goalie)[] = [];
  loading = true;
  loadingRoster = false;
  currentSeasonIndex = 0;
  
  // Table column definitions
  seasonStatsColumns: string[] = ['season', 'gamesPlayed', 'wins', 'losses', 'ties', 'points'];
  recentGamesColumns: string[] = ['date', 'opponent', 'result', 'gameType', 'rink'];
  upcomingGamesColumns: string[] = ['date', 'time', 'opponent', 'gameType', 'rink'];
  rosterColumns: string[] = ['jerseyNumber', 'firstName', 'lastName', 'position', 'height', 'weight', 'shoots'];

  ngOnInit(): void {
    const teamId = this.route.snapshot.paramMap.get('id');
    if (teamId) {
      this.loadTeam(teamId);
    } else {
      this.router.navigate(['/teams']);
    }
  }

  private loadTeam(id: string): void {
    this.loading = true;
    console.log(`Loading team with ID: ${id}`);
    
    this.teamService.getTeamById(id).subscribe({
      next: (team) => {
        if (team) {
          console.log('Team loaded successfully:', team);
          this.team = team;
          // Load roster data (players + goalies) for this team
          this.loadRoster(parseInt(id, 10));
        } else {
          console.error(`Team not found with ID: ${id}`);
          this.router.navigate(['/teams']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading team:', error);
        this.loading = false;
        this.router.navigate(['/teams']);
      }
    });
  }

  private loadRoster(teamId: number): void {
    this.loadingRoster = true;
    console.log(`Loading roster for team ID: ${teamId}`);
    
    // Fetch both players and goalies in parallel
    forkJoin({
      players: this.playerService.getPlayersByTeam(teamId),
      goalies: this.goalieService.getGoaliesByTeam(teamId)
    }).subscribe({
      next: ({ players, goalies }) => {
        console.log('Players loaded:', players);
        console.log('Goalies loaded:', goalies);
        // Combine players and goalies into one roster
        this.roster = [...players, ...goalies];
        this.loadingRoster = false;
      },
      error: (error) => {
        console.error('Error loading roster:', error);
        this.loadingRoster = false;
        // Keep roster empty on error
        this.roster = [];
      }
    });
  }

  onEditTeamProfile(): void {
    if (!this.team) return;

    const dialogRef = this.dialog.open(TeamFormModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        team: this.team,
        isEditMode: true
      },
      panelClass: 'team-form-modal-dialog',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateTeam(result);
      }
    });
  }

  private updateTeam(teamData: Partial<Team> & { logoFile?: File; logoRemoved?: boolean }): void {
    if (!this.team?.id) return;

    this.loading = true;
    const { logoFile, logoRemoved, ...team } = teamData;
    
    this.teamService.updateTeam(this.team.id, team, logoFile, logoRemoved).subscribe({
      next: (updatedTeam) => {
        console.log('Team updated successfully:', updatedTeam);
        this.team = updatedTeam;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating team:', error);
        this.loading = false;
      }
    });
  }

  onRequestTeamAnalysis(): void {
    console.log('Request team analysis clicked');
    // TODO: Implement analysis request
  }

  getCurrentSeason(): string {
    return '2024/2025';
  }

  getPreviousSeason(): string {
    return '2023/2024';
  }

  getTeamRecord(): string {
    const stats = this.getSeasonStats()[this.currentSeasonIndex];
    return `${stats.wins}-${stats.losses}-${stats.ties}`;
  }

  showPreviousSeason(): void {
    const seasonStats = this.getSeasonStats();
    this.currentSeasonIndex = (this.currentSeasonIndex + 1) % seasonStats.length;
  }

  getSeasonStats(): TeamSeasonStat[] {
    return [
      {
        season: '2024/2025',
        gamesPlayed: 25,
        wins: 18,
        losses: 5,
        ties: 2,
        points: 38
      },
      {
        season: '2023/2024',
        gamesPlayed: 82,
        wins: 50,
        losses: 25,
        ties: 7,
        points: 107
      },
      {
        season: '2022/2023',
        gamesPlayed: 82,
        wins: 45,
        losses: 30,
        ties: 7,
        points: 97
      }
    ];
  }

  getSeasonStatsDataSource(): TeamSeasonStat[] {
    return this.getSeasonStats();
  }

  getRecentGamesTitle(): string {
    return `Recent games (show last 5 games)`;
  }

  getUpcomingGamesTitle(): string {
    return `Upcoming games (show the next 5 games)`;
  }

  getRecentGames(): TeamGame[] {
    return [
      {
        id: '1',
        date: 'Oct 18, 2024',
        time: '7:00 PM',
        opponent: 'Montreal Canadiens',
        homeTeam: 'Toronto Maple Leafs',
        awayTeam: 'Montreal Canadiens',
        homeGoals: 4,
        awayGoals: 2,
        gameType: 'Regular Season',
        rink: 'Scotiabank Arena - Main Rink',
        status: 'Game Over',
        result: 'W 4-2'
      },
      {
        id: '2',
        date: 'Oct 15, 2024',
        time: '7:30 PM',
        opponent: 'Ottawa Senators',
        homeTeam: 'Ottawa Senators',
        awayTeam: 'Toronto Maple Leafs',
        homeGoals: 3,
        awayGoals: 1,
        gameType: 'Regular Season',
        rink: 'Canadian Tire Centre - Main Rink',
        status: 'Game Over',
        result: 'L 1-3'
      },
      {
        id: '3',
        date: 'Oct 12, 2024',
        time: '8:00 PM',
        opponent: 'Boston Bruins',
        homeTeam: 'Toronto Maple Leafs',
        awayTeam: 'Boston Bruins',
        homeGoals: 5,
        awayGoals: 1,
        gameType: 'Regular Season',
        rink: 'Scotiabank Arena - Main Rink',
        status: 'Game Over',
        result: 'W 5-1'
      },
      {
        id: '4',
        date: 'Oct 10, 2024',
        time: '7:00 PM',
        opponent: 'Buffalo Sabres',
        homeTeam: 'Buffalo Sabres',
        awayTeam: 'Toronto Maple Leafs',
        homeGoals: 3,
        awayGoals: 3,
        gameType: 'Regular Season',
        rink: 'KeyBank Center - Main Rink',
        status: 'Game Over',
        result: 'T 3-3'
      },
      {
        id: '5',
        date: 'Oct 8, 2024',
        time: '7:30 PM',
        opponent: 'Florida Panthers',
        homeTeam: 'Toronto Maple Leafs',
        awayTeam: 'Florida Panthers',
        homeGoals: 2,
        awayGoals: 1,
        gameType: 'Regular Season',
        rink: 'Scotiabank Arena - Main Rink',
        status: 'Game Over',
        result: 'W 2-1'
      }
    ];
  }

  getUpcomingGames(): TeamGame[] {
    return [
      {
        id: '6',
        date: 'Oct 22, 2024',
        time: '7:00 PM',
        opponent: 'Tampa Bay Lightning',
        homeTeam: 'Tampa Bay Lightning',
        awayTeam: 'Toronto Maple Leafs',
        gameType: 'Regular Season',
        rink: 'Amalie Arena - Main Rink',
        status: 'Not Started'
      },
      {
        id: '7',
        date: 'Oct 25, 2024',
        time: '7:30 PM',
        opponent: 'Detroit Red Wings',
        homeTeam: 'Toronto Maple Leafs',
        awayTeam: 'Detroit Red Wings',
        gameType: 'Regular Season',
        rink: 'Scotiabank Arena - Main Rink',
        status: 'Not Started'
      },
      {
        id: '8',
        date: 'Oct 27, 2024',
        time: '8:00 PM',
        opponent: 'Pittsburgh Penguins',
        homeTeam: 'Pittsburgh Penguins',
        awayTeam: 'Toronto Maple Leafs',
        gameType: 'Regular Season',
        rink: 'PPG Paints Arena - Main Rink',
        status: 'Not Started'
      },
      {
        id: '9',
        date: 'Oct 30, 2024',
        time: '7:00 PM',
        opponent: 'New York Rangers',
        homeTeam: 'Toronto Maple Leafs',
        awayTeam: 'New York Rangers',
        gameType: 'Regular Season',
        rink: 'Scotiabank Arena - Main Rink',
        status: 'Not Started'
      },
      {
        id: '10',
        date: 'Nov 1, 2024',
        time: '7:30 PM',
        opponent: 'Washington Capitals',
        homeTeam: 'Washington Capitals',
        awayTeam: 'Toronto Maple Leafs',
        gameType: 'Regular Season',
        rink: 'Capital One Arena - Main Rink',
        status: 'Not Started'
      }
    ];
  }

  getResultClass(result: string): string {
    if (result.startsWith('W')) {
      return 'win';
    } else if (result.startsWith('L')) {
      return 'loss';
    } else if (result.startsWith('T')) {
      return 'tie';
    }
    return '';
  }

  getTeamRoster(): (Player | Goalie)[] {
    return this.roster;
  }
}
