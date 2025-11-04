import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ActionButtonComponent } from '../../shared/components/action-button/action-button';
import { TurnoverFormModalComponent } from '../../shared/components/turnover-form-modal/turnover-form-modal';
import { ShotFormModalComponent } from '../../shared/components/shot-form-modal/shot-form-modal';
import { FaceoffFormModalComponent } from '../../shared/components/faceoff-form-modal/faceoff-form-modal';
import { GoalieChangeFormModalComponent } from '../../shared/components/goalie-change-form-modal/goalie-change-form-modal';
import { PenaltyFormModalComponent } from '../../shared/components/penalty-form-modal/penalty-form-modal';
import { GameMetadataService, GamePeriodResponse } from '../../services/game-metadata.service';
import { TeamService } from '../../services/team.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { forkJoin } from 'rxjs';
interface Team {
  name: string;
  logo: string;
  score: number;
  record: string;
  sog: number;
}

interface GameStats {
  faceoffWinPct: number;
  defensiveZoneExit: {
    long: number;
    skate: number;
    soWin: number;
    soLose: number;
    pass: number;
  };
  offensiveZoneEntry: {
    pass: number;
    dump: number;
    carry: number;
    skated: number;
  };
  shots: {
    shotsOnGoal: number;
    missedNet: number;
    scoringChances: number;
    blocked: number;
  };
  turnovers: {
    offZone: number;
    neutralZone: number;
    defZone: number;
  };
}

interface GameEvent {
  id: number;
  period: string;
  time: string;
  team: string;
  event: string;
  player: string;
  description: string;
}

@Component({
  selector: 'app-live-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, ActionButtonComponent, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './live-dashboard.html',
  styleUrl: './live-dashboard.scss'
})
export class LiveDashboardComponent implements OnInit {
  private dialog = inject(MatDialog);
  private gameMetadataService = inject(GameMetadataService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  
  // TODO: Replace with actual game ID from route or service
  gameId = 1; // This should come from the route or be fetched from the API
  turnoverEventId = 1; // This should be the ID for "Turnover" event type from game-event-name API
  faceoffEventId = 2; // This should be the ID for "Faceoff" event type from game-event-name API
  goalieChangeEventId = 3; // This should be the ID for "Goalie Change" event type from game-event-name API
  penaltyEventId = 4; // This should be the ID for "Penalty" event type from game-event-name API
  
  // TODO: Replace with actual team IDs from game data
  homeTeamId = 1; // This should come from the game API
  awayTeamId = 2; // This should come from the game API
  
  // Game periods fetched from API
  gamePeriods: GamePeriodResponse[] = [];
  periodOptions: { value: number; label: string }[] = [];
  
  // Teams fetched from API (only home and away)
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  
  // Players and goalies for both teams
  playerOptions: { value: number; label: string; teamId: number }[] = [];
  goalieOptions: { value: number; label: string; teamId: number }[] = [];
  
  // Loading state
  isLoadingGameData = true;
  
  // Mock tournament data
  tournamentName = signal('LITE5');
  tournamentType = signal('U11B3');
  tournamentCategory = signal('Tournament');
  tournamentDate = signal('Apr 4, 2025, 4:35 PM');
  arenaInfo = signal('Earl Nicholas Arena - C');
  
  // Mock game data
  homeTeam = signal<Team>({
    name: 'BURLINGTON JR RAIDERS BLACK',
    logo: 'BRB',
    score: 2,
    record: '(0 - 1 - 0)',
    sog: 0
  });

  awayTeam = signal<Team>({
    name: 'WATERLOO WOLVES',
    logo: 'WW',
    score: 1,
    record: '(0 - 0 - 0)',
    sog: 0
  });

  period = signal('2ND Period');
  
  // Mock stats
  homeStats = signal<GameStats>({
    faceoffWinPct: 40,
    defensiveZoneExit: {
      long: 0,
      skate: 0,
      soWin: 0,
      soLose: 0,
      pass: 0
    },
    offensiveZoneEntry: {
      pass: 0,
      dump: 7,
      carry: 2,
      skated: 7
    },
    shots: {
      shotsOnGoal: 0,
      missedNet: 0,
      scoringChances: 0,
      blocked: 0
    },
    turnovers: {
      offZone: 0,
      neutralZone: 0,
      defZone: 0
    }
  });

  awayStats = signal<GameStats>({
    faceoffWinPct: 60,
    defensiveZoneExit: {
      long: 0,
      skate: 0,
      soWin: 0,
      soLose: 0,
      pass: 0
    },
    offensiveZoneEntry: {
      pass: 0,
      dump: 3,
      carry: 4,
      skated: 4
    },
    shots: {
      shotsOnGoal: 0,
      missedNet: 0,
      scoringChances: 0,
      blocked: 0
    },
    turnovers: {
      offZone: 0,
      neutralZone: 0,
      defZone: 0
    }
  });

  ngOnInit(): void {
    this.loadGameData();
  }

  /**
   * Load all game data (periods, teams, players, goalies)
   * First loads periods and teams, then loads players/goalies for the correct teams
   */
  private loadGameData(): void {
    // First, load periods and teams in parallel
    forkJoin({
      periods: this.gameMetadataService.getGamePeriods(),
      teams: this.teamService.getTeams()
    }).subscribe({
      next: ({ periods, teams }) => {
        // Set periods
        this.gamePeriods = periods;
        this.periodOptions = this.gameMetadataService.transformGamePeriodsToOptions(periods);
        
        // Filter and set only home and away teams
        const allTeams = teams.teams;
        
        let homeTeam = allTeams.find(t => parseInt(t.id) === this.homeTeamId);
        let awayTeam = allTeams.find(t => parseInt(t.id) === this.awayTeamId);
        
        // If specific teams not found, use first 2 teams from the list
        if (!homeTeam || !awayTeam) {
          if (allTeams.length >= 2) {
            homeTeam = allTeams[0];
            awayTeam = allTeams[1];
            // Update the IDs so player/goalie fetch works
            this.homeTeamId = parseInt(homeTeam.id);
            this.awayTeamId = parseInt(awayTeam.id);
          } else if (allTeams.length === 1) {
            homeTeam = allTeams[0];
            awayTeam = allTeams[0]; // Use same team twice if only one exists
            this.homeTeamId = parseInt(homeTeam.id);
            this.awayTeamId = parseInt(homeTeam.id);
          }
        }
        
        this.teamOptions = [];
        if (homeTeam) {
          this.teamOptions.push({
            value: parseInt(homeTeam.id),
            label: homeTeam.name,
            logo: homeTeam.logo
          });
        }
        if (awayTeam && awayTeam.id !== homeTeam?.id) {
          this.teamOptions.push({
            value: parseInt(awayTeam.id),
            label: awayTeam.name,
            logo: awayTeam.logo
          });
        } else if (awayTeam && awayTeam.id === homeTeam?.id && allTeams.length > 1) {
          // If away team is same as home, try to find a different one
          const differentTeam = allTeams.find(t => t.id !== homeTeam?.id);
          if (differentTeam) {
            this.teamOptions.push({
              value: parseInt(differentTeam.id),
              label: differentTeam.name,
              logo: differentTeam.logo
            });
          }
        }
        
        // Now load players and goalies for the correct teams
        forkJoin({
          homeTeamPlayers: this.playerService.getPlayersByTeam(this.homeTeamId),
          awayTeamPlayers: this.playerService.getPlayersByTeam(this.awayTeamId),
          homeTeamGoalies: this.goalieService.getGoaliesByTeam(this.homeTeamId),
          awayTeamGoalies: this.goalieService.getGoaliesByTeam(this.awayTeamId)
        }).subscribe({
          next: ({ homeTeamPlayers, awayTeamPlayers, homeTeamGoalies, awayTeamGoalies }) => {
            // Set players from both teams
            this.playerOptions = [
              ...homeTeamPlayers.map(player => ({
                value: parseInt(player.id),
                label: `${player.firstName} ${player.lastName}`,
                teamId: this.homeTeamId
              })),
              ...awayTeamPlayers.map(player => ({
                value: parseInt(player.id),
                label: `${player.firstName} ${player.lastName}`,
                teamId: this.awayTeamId
              }))
            ];
            
            // Set goalies from both teams
            this.goalieOptions = [
              ...homeTeamGoalies.map(goalie => ({
                value: parseInt(goalie.id),
                label: `${goalie.firstName} ${goalie.lastName}`,
                teamId: this.homeTeamId
              })),
              ...awayTeamGoalies.map(goalie => ({
                value: parseInt(goalie.id),
                label: `${goalie.firstName} ${goalie.lastName}`,
                teamId: this.awayTeamId
              }))
            ];
            
            this.isLoadingGameData = false;
          },
          error: (error) => {
            console.error('Failed to load players/goalies:', error);
            this.isLoadingGameData = false;
          }
        });
      },
      error: (error) => {
        console.error('Failed to load game data:', error);
        this.isLoadingGameData = false;
      }
    });
  }

  // Mock game events
  gameEvents = signal<GameEvent[]>([
    {
      id: 1,
      period: '1ST',
      time: '8:53',
      team: '[Logo] Name',
      event: 'GOAL (Short Handed Goal)',
      player: 'Joe Smith',
      description: 'Breakaway'
    },
    {
      id: 2,
      period: '',
      time: '3:53',
      team: '[Logo] Name',
      event: 'PENALTY (2 min, Elbowing)',
      player: 'Sam Harrison',
      description: 'Tripping Penalty'
    },
    {
      id: 3,
      period: '2ND',
      time: '8:53',
      team: '[Logo] Name',
      event: 'GOAL (Short Handed Goal)',
      player: 'Joe Smith',
      description: 'Breakaway'
    },
    {
      id: 4,
      period: '',
      time: '3:53',
      team: '[Logo] Name',
      event: 'PENALTY (2 min, Elbowing)',
      player: 'Sam Harrison',
      description: 'Tripping Penalty'
    },
    {
      id: 5,
      period: '',
      time: '8:53',
      team: '[Logo] Name',
      event: 'GOAL (Short Handed Goal)',
      player: 'Joe Smith',
      description: 'Breakaway'
    },
    {
      id: 6,
      period: '',
      time: '3:53',
      team: '[Logo] Name',
      event: 'PENALTY (2 min, Elbowing)',
      player: 'Sam Harrison',
      description: 'Tripping Penalty'
    }
  ]);

  // Defensive Zone Exit increment/decrement methods
  incrementDefensiveZoneExit(team: 'away' | 'home', type: 'long' | 'skate' | 'soWin' | 'soLose' | 'pass'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      this.awayStats.set({
        ...currentStats,
        defensiveZoneExit: {
          ...currentStats.defensiveZoneExit,
          [type]: currentStats.defensiveZoneExit[type] + 1
        }
      });
    } else {
      const currentStats = this.homeStats();
      this.homeStats.set({
        ...currentStats,
        defensiveZoneExit: {
          ...currentStats.defensiveZoneExit,
          [type]: currentStats.defensiveZoneExit[type] + 1
        }
      });
    }
  }

  decrementDefensiveZoneExit(team: 'away' | 'home', type: 'long' | 'skate' | 'soWin' | 'soLose' | 'pass'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      if (currentStats.defensiveZoneExit[type] > 0) {
        this.awayStats.set({
          ...currentStats,
          defensiveZoneExit: {
            ...currentStats.defensiveZoneExit,
            [type]: currentStats.defensiveZoneExit[type] - 1
          }
        });
      }
    } else {
      const currentStats = this.homeStats();
      if (currentStats.defensiveZoneExit[type] > 0) {
        this.homeStats.set({
          ...currentStats,
          defensiveZoneExit: {
            ...currentStats.defensiveZoneExit,
            [type]: currentStats.defensiveZoneExit[type] - 1
          }
        });
      }
    }
  }

  // Offensive Zone Entry increment/decrement methods
  incrementOffensiveZoneEntry(team: 'away' | 'home', type: 'pass' | 'dump' | 'carry' | 'skated'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      this.awayStats.set({
        ...currentStats,
        offensiveZoneEntry: {
          ...currentStats.offensiveZoneEntry,
          [type]: currentStats.offensiveZoneEntry[type] + 1
        }
      });
    } else {
      const currentStats = this.homeStats();
      this.homeStats.set({
        ...currentStats,
        offensiveZoneEntry: {
          ...currentStats.offensiveZoneEntry,
          [type]: currentStats.offensiveZoneEntry[type] + 1
        }
      });
    }
  }

  decrementOffensiveZoneEntry(team: 'away' | 'home', type: 'pass' | 'dump' | 'carry' | 'skated'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      if (currentStats.offensiveZoneEntry[type] > 0) {
        this.awayStats.set({
          ...currentStats,
          offensiveZoneEntry: {
            ...currentStats.offensiveZoneEntry,
            [type]: currentStats.offensiveZoneEntry[type] - 1
          }
        });
      }
    } else {
      const currentStats = this.homeStats();
      if (currentStats.offensiveZoneEntry[type] > 0) {
        this.homeStats.set({
          ...currentStats,
          offensiveZoneEntry: {
            ...currentStats.offensiveZoneEntry,
            [type]: currentStats.offensiveZoneEntry[type] - 1
          }
        });
      }
    }
  }

  // Turnover increment/decrement methods
  incrementTurnover(team: 'away' | 'home', zone: 'offZone' | 'neutralZone' | 'defZone'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      this.awayStats.set({
        ...currentStats,
        turnovers: {
          ...currentStats.turnovers,
          [zone]: currentStats.turnovers[zone] + 1
        }
      });
    } else {
      const currentStats = this.homeStats();
      this.homeStats.set({
        ...currentStats,
        turnovers: {
          ...currentStats.turnovers,
          [zone]: currentStats.turnovers[zone] + 1
        }
      });
    }
  }

  decrementTurnover(team: 'away' | 'home', zone: 'offZone' | 'neutralZone' | 'defZone'): void {
    if (team === 'away') {
      const currentStats = this.awayStats();
      if (currentStats.turnovers[zone] > 0) {
        this.awayStats.set({
          ...currentStats,
          turnovers: {
            ...currentStats.turnovers,
            [zone]: currentStats.turnovers[zone] - 1
          }
        });
      }
    } else {
      const currentStats = this.homeStats();
      if (currentStats.turnovers[zone] > 0) {
        this.homeStats.set({
          ...currentStats,
          turnovers: {
            ...currentStats.turnovers,
            [zone]: currentStats.turnovers[zone] - 1
          }
        });
      }
    }
  }

  // Event action button methods (placeholders for now)
  onShots(): void {
    if (this.isLoadingGameData) {
      return;
    }
    const dialogRef = this.dialog.open(ShotFormModalComponent, {
      width: '800px',
      panelClass: 'shot-form-modal-dialog',
      disableClose: false,
      autoFocus: true,
      data: {
        gameId: this.gameId,
        periodOptions: this.periodOptions,
        teamOptions: this.teamOptions,
        playerOptions: this.playerOptions,
        goalieOptions: this.goalieOptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Shot data:', result);
        // Here you can handle the shot data
        // For example, add it to game events or update stats
      }
    });
  }

  onTurnover(): void {
    if (this.isLoadingGameData) {
      return;
    }
    const dialogRef = this.dialog.open(TurnoverFormModalComponent, {
      width: '800px',
      panelClass: 'turnover-form-modal-dialog',
      disableClose: false,
      autoFocus: true,
      data: {
        gameId: this.gameId,
        turnoverEventId: this.turnoverEventId,
        periodOptions: this.periodOptions,
        teamOptions: this.teamOptions,
        playerOptions: this.playerOptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Turnover data:', result);
        // Here you can handle the turnover data
        // For example, add it to game events or update stats
      }
    });
  }

  onFaceoff(): void {
    if (this.isLoadingGameData) {
      return;
    }
    const dialogRef = this.dialog.open(FaceoffFormModalComponent, {
      width: '800px',
      panelClass: 'faceoff-form-modal-dialog',
      disableClose: false,
      autoFocus: true,
      data: {
        gameId: this.gameId,
        faceoffEventId: this.faceoffEventId,
        periodOptions: this.periodOptions,
        teamOptions: this.teamOptions,
        playerOptions: this.playerOptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Faceoff data:', result);
        // Here you can handle the faceoff data
        // For example, add it to game events or update stats
      }
    });
  }

  onGoalieChange(): void {
    if (this.isLoadingGameData) {
      return;
    }
    const dialogRef = this.dialog.open(GoalieChangeFormModalComponent, {
      width: '800px',
      panelClass: 'goalie-change-form-modal-dialog',
      disableClose: false,
      autoFocus: true,
      data: {
        gameId: this.gameId,
        goalieChangeEventId: this.goalieChangeEventId,
        periodOptions: this.periodOptions,
        teamOptions: this.teamOptions,
        goalieOptions: this.goalieOptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Goalie change data:', result);
        // Here you can handle the goalie change data
        // For example, add it to game events
      }
    });
  }

  onPenalty(): void {
    if (this.isLoadingGameData) {
      return;
    }
    const dialogRef = this.dialog.open(PenaltyFormModalComponent, {
      width: '800px',
      panelClass: 'penalty-form-modal-dialog',
      disableClose: false,
      autoFocus: true,
      data: {
        gameId: this.gameId,
        penaltyEventId: this.penaltyEventId,
        periodOptions: this.periodOptions,
        teamOptions: this.teamOptions,
        playerOptions: this.playerOptions
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Penalty data:', result);
        // For example, add it to game events
      }
    });
  }
}
