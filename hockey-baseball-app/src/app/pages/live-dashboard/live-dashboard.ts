import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
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
import { LiveGameService, LiveGameData, GameDetails, GameEvent as ServiceGameEvent } from '../../services/live-game.service';
import { ArenaService } from '../../services/arena.service';
import { Rink } from '../../shared/interfaces/arena.interface';
import { TeamOptionsService } from '../../services/team-options.service';
import { GameEventService } from '../../services/game-event.service';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';
interface Team {
  name: string;
  logo: string;
  score: number;
  record: string;
  sog: number;
  teamLevel?: string;
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
  id: number | string;
  period: string;
  time: string;
  team: string;
  teamId?: number;
  event: string;
  player: string;
  description: string;
}

@Component({
  selector: 'app-live-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ActionButtonComponent, MatIconModule, MatButtonModule, MatTooltipModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './live-dashboard.html',
  styleUrl: './live-dashboard.scss'
})
export class LiveDashboardComponent implements OnInit {
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private gameMetadataService = inject(GameMetadataService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private liveGameService = inject(LiveGameService);
  private arenaService = inject(ArenaService);
  private teamOptionsService = inject(TeamOptionsService);
  private gameEventService = inject(GameEventService);
  
  // Game ID from route parameter
  gameId = 1;
  turnoverEventId = 1; // This should be the ID for "Turnover" event type from game-event-name API
  faceoffEventId = 2; // This should be the ID for "Faceoff" event type from game-event-name API
  goalieChangeEventId = 3; // This should be the ID for "Goalie Change" event type from game-event-name API
  penaltyEventId = 4; // This should be the ID for "Penalty" event type from game-event-name API
  shotEventId = 5; // This should be the ID for "Shot" event type from game-event-name API
  
  // TODO: Replace with actual team IDs from game data
  homeTeamId = 1; // This should come from the game API
  awayTeamId = 2; // This should come from the game API
  
  // Game periods and shot types fetched from API
  gamePeriods: GamePeriodResponse[] = [];
  periodOptions: { value: number; label: string }[] = [];
  shotTypeOptions: { value: number; label: string }[] = [];
  
  // Teams fetched from API (only home and away)
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  
  // Players and goalies for both teams
  playerOptions: { value: number; label: string; teamId: number }[] = [];
  goalieOptions: { value: number; label: string; teamId: number }[] = [];
  
  // Loading state
  isLoadingGameData = true;
  
  // Current period ID for dropdown
  currentPeriodId = 1;
  
  // Game start time (used to compute elapsed times for events)
  private gameStartTime: Date | null = null;
  
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
    sog: 0,
    teamLevel: ''
  });

  awayTeam = signal<Team>({
    name: 'WATERLOO WOLVES',
    logo: 'WW',
    score: 1,
    record: '(0 - 0 - 0)',
    sog: 0,
    teamLevel: ''
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
    // Get game ID from route parameter
    this.route.params.subscribe(params => {
      const gameIdParam = params['gameId'];
      if (gameIdParam) {
        this.gameId = parseInt(gameIdParam, 10);
      }
      this.loadFullGameData();
    });
  }

  /**
   * Load full game data including details, live data, teams, rinks, etc.
   */
  private loadFullGameData(): void {
    forkJoin({
      gameDetails: this.liveGameService.getGameDetails(this.gameId),
      liveData: this.liveGameService.getLiveGameData(this.gameId),
      periods: this.gameMetadataService.getGamePeriods(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      gameTypes: this.gameMetadataService.getGameTypes(),
      teams: this.teamService.getTeams(),
      rinks: this.arenaService.getAllRinks(),
      teamLevels: this.teamOptionsService.getTeamLevels()
    }).subscribe({
      next: ({ gameDetails, liveData, periods, shotTypes, gameTypes, teams, rinks, teamLevels }) => {
        // Set team IDs from game details
        this.homeTeamId = gameDetails.home_team_id;
        this.awayTeamId = gameDetails.away_team_id;

        // Set periods and shot types
        this.gamePeriods = periods;
        this.periodOptions = this.gameMetadataService.transformGamePeriodsToOptions(periods);
        this.shotTypeOptions = this.gameMetadataService.transformShotTypesToOptions(shotTypes);

        // Update game header information
        this.updateGameHeaderInfo(gameDetails, gameTypes, rinks);

        // Get team information
        const allTeams = teams.teams;
        const homeTeamData = allTeams.find(t => parseInt(t.id) === this.homeTeamId);
        const awayTeamData = allTeams.find(t => parseInt(t.id) === this.awayTeamId);

        if (homeTeamData && awayTeamData) {
          // Get team level names from API data
          const homeTeamLevel = this.teamOptionsService.getLevelName(parseInt(homeTeamData.level));
          const awayTeamLevel = this.teamOptionsService.getLevelName(parseInt(awayTeamData.level));
          
          // Update team signals with real data
          this.homeTeam.set({
            name: homeTeamData.name,
            logo: `${environment.apiUrl}/hockey/team/${homeTeamData.id}/logo`,
            score: liveData.home_goals,
            record: '(0 - 0 - 0)', // TODO: Get from API when available
            sog: liveData.home_shots.shots_on_goal,
            teamLevel: homeTeamLevel
          });

          this.awayTeam.set({
            name: awayTeamData.name,
            logo: `${environment.apiUrl}/hockey/team/${awayTeamData.id}/logo`,
            score: liveData.away_goals,
            record: '(0 - 0 - 0)', // TODO: Get from API when available
            sog: liveData.away_shots.shots_on_goal,
            teamLevel: awayTeamLevel
          });

          // Set team options for dropdowns
          this.teamOptions = [
            {
              value: parseInt(homeTeamData.id),
              label: homeTeamData.name,
              logo: homeTeamData.logo
            },
            {
              value: parseInt(awayTeamData.id),
              label: awayTeamData.name,
              logo: awayTeamData.logo
            }
          ];
        }

        // Update stats from live data
        this.updateStatsFromLiveData(liveData);

        // Load players and goalies for both teams, then update events
        this.loadPlayersAndGoalies(liveData, periods, allTeams);
      },
      error: (error) => {
        console.error('Failed to load full game data:', error);
        this.isLoadingGameData = false;
      }
    });
  }

  /**
   * Update game header information (period, game type, date/time, arena)
   */
  private updateGameHeaderInfo(gameDetails: GameDetails, gameTypes: { id: number; name: string }[], rinks: Rink[]): void {
    // Update period
    const currentPeriod = this.gamePeriods.find(p => p.id === gameDetails.game_period_id);
    this.period.set(currentPeriod ? currentPeriod.name : 'Unknown Period');
    this.currentPeriodId = gameDetails.game_period_id;

    // Update game type
    const gameType = gameTypes.find(t => t.id === gameDetails.game_type_id);
    this.tournamentCategory.set(gameType ? gameType.name : 'Unknown');

    // Update date and time
    const gameDate = new Date(gameDetails.date + 'T' + gameDetails.time);
    this.gameStartTime = gameDate;
    this.tournamentDate.set(gameDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }));

    // Update rink/arena info
    const rink = rinks.find(r => r.id === gameDetails.rink_id);
    if (rink) {
      this.arenaInfo.set(rink.name);
    }
  }

  /**
   * Update game events from live data, grouped by period
   */
  private updateGameEvents(liveData: LiveGameData, periods: { id: number; name: string }[], teams: { id: string; name: string }[]): void {
    // Group events by period
    const eventsByPeriod = new Map<number, ServiceGameEvent[]>();
    
    liveData.events.forEach(event => {
      if (!eventsByPeriod.has(event.period_id)) {
        eventsByPeriod.set(event.period_id, []);
      }
      eventsByPeriod.get(event.period_id)!.push(event);
    });

    // Create flat array with period headers and events
    const groupedEvents: GameEvent[] = [];
    
    // Sort periods
    const sortedPeriods = Array.from(eventsByPeriod.keys()).sort((a, b) => a - b);
    
    sortedPeriods.forEach(periodId => {
      const period = periods.find(p => p.id === periodId);
      const periodEvents = eventsByPeriod.get(periodId) || [];
      
      // Add period header
      groupedEvents.push({
        id: `period-${periodId}`,
        period: period ? period.name : `Period ${periodId}`,
        time: '',
        team: '',
        event: '',
        player: '',
        description: ''
      });
      
      // Add events for this period
      periodEvents.forEach(event => {
        const team = teams.find(t => parseInt(t.id) === event.team_id);
        const eventTime = new Date(event.time);
        
        // Find player name from playerOptions
        let playerName = 'Unknown Player';
        if (event.player_id) {
          const player = this.playerOptions.find(p => p.value === event.player_id);
          if (player) {
            playerName = player.label;
          } else {
            // Try goalies if not found in players
            const goalie = this.goalieOptions.find(g => g.value === event.player_id);
            if (goalie) {
              playerName = goalie.label;
            } else {
              playerName = `Player ${event.player_id}`;
            }
          }
        }
        
        groupedEvents.push({
          id: event.id,
          period: '', // Empty string for actual events (not headers)
          time: this.formatElapsedTime(eventTime),
          team: team ? team.name : 'Unknown Team',
          teamId: event.team_id,
          event: this.getEventName(event.event_name_id),
          player: playerName,
          description: event.note || event.goal_type || ''
        });
      });
    });

    this.gameEvents.set(groupedEvents);
  }

  /**
   * Format elapsed time since game start as M:SS
   */
  private formatElapsedTime(eventTime: Date): string {
    if (!this.gameStartTime) return '0:00';
    const diffMs = Math.max(0, eventTime.getTime() - this.gameStartTime.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${minutes}:${secondsStr}`;
  }

  /**
   * Get team logo URL
   */
  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }

  /**
   * Get event name from event_name_id
   */
  private getEventName(eventNameId: number): string {
    const eventNames: Record<number, string> = {
      1: 'GOAL',
      2: 'FACEOFF',
      3: 'GOALIE CHANGE',
      4: 'PENALTY',
      5: 'SHOT'
    };
    return eventNames[eventNameId] || 'UNKNOWN EVENT';
  }

  /**
   * Load players and goalies for both teams
   */
  private loadPlayersAndGoalies(liveData: LiveGameData, periods: { id: number; name: string }[], teams: { id: string; name: string }[]): void {
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

        // Now update game events with player names
        this.updateGameEvents(liveData, periods, teams);

        this.isLoadingGameData = false;
      },
      error: (error) => {
        console.error('Failed to load players/goalies:', error);
        this.isLoadingGameData = false;
      }
    });
  }

  /**
   * Update component stats from live game data
   */
  private updateStatsFromLiveData(liveData: LiveGameData): void {
    // Update goals
    this.homeTeam.update(team => ({ ...team, score: liveData.home_goals }));
    this.awayTeam.update(team => ({ ...team, score: liveData.away_goals }));

    // Calculate faceoff win percentages
    const totalFaceoffs = liveData.home_faceoff_win + liveData.away_faceoff_win;
    const homeFaceoffPct = totalFaceoffs > 0 ? Math.round((liveData.home_faceoff_win / totalFaceoffs) * 100) : 0;
    const awayFaceoffPct = totalFaceoffs > 0 ? Math.round((liveData.away_faceoff_win / totalFaceoffs) * 100) : 0;

    // Update home stats
    this.homeStats.set({
      faceoffWinPct: homeFaceoffPct,
      defensiveZoneExit: {
        long: liveData.home_defensive_zone_exit.icing,
        skate: liveData.home_defensive_zone_exit.skate_out,
        soWin: liveData.home_defensive_zone_exit.so_win,
        soLose: liveData.home_defensive_zone_exit.so_lose,
        pass: liveData.home_defensive_zone_exit.passes
      },
      offensiveZoneEntry: {
        pass: liveData.home_offensive_zone_entry.pass_in,
        dump: liveData.home_offensive_zone_entry.dump_win + liveData.home_offensive_zone_entry.dump_lose,
        carry: 0, // Not in API response, keeping existing logic
        skated: liveData.home_offensive_zone_entry.skate_in
      },
      shots: {
        shotsOnGoal: liveData.home_shots.shots_on_goal,
        missedNet: liveData.home_shots.missed_net,
        scoringChances: liveData.home_shots.scoring_chance,
        blocked: liveData.home_shots.blocked
      },
      turnovers: {
        offZone: liveData.home_turnovers.off_zone,
        neutralZone: liveData.home_turnovers.neutral_zone,
        defZone: liveData.home_turnovers.def_zone
      }
    });

    // Update away stats
    this.awayStats.set({
      faceoffWinPct: awayFaceoffPct,
      defensiveZoneExit: {
        long: liveData.away_defensive_zone_exit.icing,
        skate: liveData.away_defensive_zone_exit.skate_out,
        soWin: liveData.away_defensive_zone_exit.so_win,
        soLose: liveData.away_defensive_zone_exit.so_lose,
        pass: liveData.away_defensive_zone_exit.passes
      },
      offensiveZoneEntry: {
        pass: liveData.away_offensive_zone_entry.pass_in,
        dump: liveData.away_offensive_zone_entry.dump_win + liveData.away_offensive_zone_entry.dump_lose,
        carry: 0, // Not in API response, keeping existing logic
        skated: liveData.away_offensive_zone_entry.skate_in
      },
      shots: {
        shotsOnGoal: liveData.away_shots.shots_on_goal,
        missedNet: liveData.away_shots.missed_net,
        scoringChances: liveData.away_shots.scoring_chance,
        blocked: liveData.away_shots.blocked
      },
      turnovers: {
        offZone: liveData.away_turnovers.off_zone,
        neutralZone: liveData.away_turnovers.neutral_zone,
        defZone: liveData.away_turnovers.def_zone
      }
    });

    // Update shots on goal for teams
    this.homeTeam.update(team => ({ ...team, sog: liveData.home_shots.shots_on_goal }));
    this.awayTeam.update(team => ({ ...team, sog: liveData.away_shots.shots_on_goal }));
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
        shotEventId: this.shotEventId,
        periodOptions: this.periodOptions,
        shotTypeOptions: this.shotTypeOptions,
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

  /**
   * Handle period change from dropdown
   */
  onPeriodChange(periodId: number): void {
    const selectedPeriod = this.gamePeriods.find(p => p.id === periodId);
    if (selectedPeriod) {
      this.period.set(selectedPeriod.name);
      // TODO: Update game period on backend if needed
      console.log('Period changed to:', selectedPeriod.name);
    }
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

  /**
   * Delete a game event
   */
  onDeleteEvent(eventId: number | string): void {
    // Skip if it's a period header (string ID)
    if (typeof eventId === 'string') {
      return;
    }

    if (confirm('Are you sure you want to delete this event?')) {
      this.gameEventService.deleteGameEvent(eventId).subscribe({
        next: () => {
          console.log(`Event ${eventId} deleted successfully`);
          // Reload game data to refresh the events list
          this.loadFullGameData();
        },
        error: (error) => {
          console.error('Failed to delete event:', error);
          alert('Failed to delete event. Please try again.');
        }
      });
    }
  }
}
