import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { TeamService } from '../../services/team.service';
import { Team } from '../../shared/interfaces/team.interface';

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

  team: Team | null = null;
  loading = true;
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

  onEditTeamProfile(): void {
    console.log('Edit team profile clicked');
    // TODO: Open edit modal or navigate to edit page
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

  getTeamRoster(): TeamPlayer[] {
    return [
      { id: '1', jerseyNumber: 34, firstName: 'Auston', lastName: 'Matthews', position: 'C', height: '6\'3"', weight: 220, shoots: 'L', birthYear: 1997, team: 'Toronto Maple Leafs' },
      { id: '2', jerseyNumber: 16, firstName: 'Mitchell', lastName: 'Marner', position: 'RW', height: '6\'0"', weight: 180, shoots: 'R', birthYear: 1997, team: 'Toronto Maple Leafs' },
      { id: '3', jerseyNumber: 88, firstName: 'William', lastName: 'Nylander', position: 'RW', height: '6\'1"', weight: 196, shoots: 'R', birthYear: 1996, team: 'Toronto Maple Leafs' },
      { id: '4', jerseyNumber: 11, firstName: 'Max', lastName: 'Domi', position: 'C', height: '5\'10"', weight: 194, shoots: 'L', birthYear: 1995, team: 'Toronto Maple Leafs' },
      { id: '5', jerseyNumber: 23, firstName: 'Matthew', lastName: 'Knies', position: 'LW', height: '6\'3"', weight: 227, shoots: 'L', birthYear: 2002, team: 'Toronto Maple Leafs' },
      { id: '6', jerseyNumber: 29, firstName: 'Pontus', lastName: 'Holmberg', position: 'C', height: '6\'0"', weight: 190, shoots: 'R', birthYear: 1999, team: 'Toronto Maple Leafs' },
      { id: '7', jerseyNumber: 74, firstName: 'Bobby', lastName: 'McMann', position: 'LW', height: '6\'2"', weight: 208, shoots: 'L', birthYear: 1996, team: 'Toronto Maple Leafs' },
      { id: '8', jerseyNumber: 89, firstName: 'Nicholas', lastName: 'Robertson', position: 'LW', height: '5\'9"', weight: 164, shoots: 'L', birthYear: 2001, team: 'Toronto Maple Leafs' },
      { id: '9', jerseyNumber: 18, firstName: 'Steven', lastName: 'Lorentz', position: 'C', height: '6\'4"', weight: 200, shoots: 'R', birthYear: 1996, team: 'Toronto Maple Leafs' },
      { id: '10', jerseyNumber: 24, firstName: 'Connor', lastName: 'Dewar', position: 'C', height: '6\'0"', weight: 187, shoots: 'L', birthYear: 1999, team: 'Toronto Maple Leafs' },
      { id: '11', jerseyNumber: 2, firstName: 'Jake', lastName: 'McCabe', position: 'D', height: '6\'1"', weight: 204, shoots: 'L', birthYear: 1993, team: 'Toronto Maple Leafs' },
      { id: '12', jerseyNumber: 22, firstName: 'Morgan', lastName: 'Rielly', position: 'D', height: '6\'1"', weight: 222, shoots: 'L', birthYear: 1994, team: 'Toronto Maple Leafs' },
      { id: '13', jerseyNumber: 8, firstName: 'Chris', lastName: 'Tanev', position: 'D', height: '6\'2"', weight: 196, shoots: 'R', birthYear: 1989, team: 'Toronto Maple Leafs' },
      { id: '14', jerseyNumber: 95, firstName: 'Oliver', lastName: 'Ekman-Larsson', position: 'D', height: '6\'2"', weight: 192, shoots: 'L', birthYear: 1991, team: 'Toronto Maple Leafs' },
      { id: '15', jerseyNumber: 25, firstName: 'Conor', lastName: 'Timmins', position: 'D', height: '6\'2"', weight: 194, shoots: 'R', birthYear: 1998, team: 'Toronto Maple Leafs' },
      { id: '16', jerseyNumber: 37, firstName: 'Timothy', lastName: 'Liljegren', position: 'D', height: '6\'0"', weight: 192, shoots: 'R', birthYear: 1999, team: 'Toronto Maple Leafs' },
      { id: '17', jerseyNumber: 46, firstName: 'Simon', lastName: 'Benoit', position: 'D', height: '6\'4"', weight: 198, shoots: 'L', birthYear: 1998, team: 'Toronto Maple Leafs' },
      { id: '18', jerseyNumber: 3, firstName: 'Jani', lastName: 'Hakanpää', position: 'D', height: '6\'7"', weight: 222, shoots: 'R', birthYear: 1992, team: 'Toronto Maple Leafs' },
      { id: '19', jerseyNumber: 60, firstName: 'Joseph', lastName: 'Woll', position: 'G', height: '6\'4"', weight: 203, shoots: 'L', birthYear: 1998, team: 'Toronto Maple Leafs' },
      { id: '20', jerseyNumber: 36, firstName: 'Anthony', lastName: 'Stolarz', position: 'G', height: '6\'6"', weight: 243, shoots: 'L', birthYear: 1994, team: 'Toronto Maple Leafs' },
      { id: '21', jerseyNumber: 31, firstName: 'Matt', lastName: 'Murray', position: 'G', height: '6\'4"', weight: 178, shoots: 'L', birthYear: 1994, team: 'Toronto Maple Leafs' }
    ];
  }
}