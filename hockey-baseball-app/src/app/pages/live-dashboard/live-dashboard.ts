import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { VideoViewModalComponent } from '../../shared/components/video-view-modal/video-view-modal';
import { Video } from '../../shared/interfaces/video.interface';
import { ActivatedRoute, Router } from '@angular/router';
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
import { GamePlayerService } from '../../services/game-player.service';
import { LiveGameService, LiveGameData, GameExtra, GameEvent as ServiceGameEvent, OffensiveZoneEntry, DefensiveZoneExit } from '../../services/live-game.service';
import { ArenaService } from '../../services/arena.service';
import { Arena, Rink } from '../../shared/interfaces/arena.interface';
import { Team } from '../../shared/interfaces/team.interface';
import { TeamOptionsService } from '../../services/team-options.service';
import { GameEventService } from '../../services/game-event.service';
import { GameEventNameService } from '../../services/game-event-name.service';
import { ScheduleService } from '../../services/schedule.service';
import { SprayChartUtilsService } from '../../services/spray-chart-utils.service';
import { ShotLocationDisplayComponent, ShotLocationData } from '../../shared/components/shot-location-display/shot-location-display';
import { environment } from '../../../environments/environment';
import { forkJoin, interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

interface TeamDisplay {
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
  // For shot events
  shotType?: 'save' | 'goal' | 'missed' | 'blocked';
  eventNameId?: number; // Added to track event type for editing
  rawEventData?: ServiceGameEvent; // Store full event data for editing
}

@Component({
  selector: 'app-live-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ActionButtonComponent, MatIconModule, MatButtonModule, MatTooltipModule, MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule, ShotLocationDisplayComponent],
  templateUrl: './live-dashboard.html',
  styleUrl: './live-dashboard.scss'
})
export class LiveDashboardComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameMetadataService = inject(GameMetadataService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private gamePlayerService = inject(GamePlayerService);
  private liveGameService = inject(LiveGameService);
  private arenaService = inject(ArenaService);
  private teamOptionsService = inject(TeamOptionsService);
  private gameEventService = inject(GameEventService);
  private gameEventNameService = inject(GameEventNameService);
  private scheduleService = inject(ScheduleService);
  private sprayChartUtils = inject(SprayChartUtilsService);
  
  // Polling subscription for live data
  private liveDataPollingSubscription?: Subscription;
  
  // Game ID from route parameter
  gameId = 1;
  
  // Event name IDs - loaded from API
  eventNameIds: Record<string, number> = {};
  shotOnGoalEventId = 0;
  turnoverEventId = 0;
  faceoffEventId = 0;
  goalieChangeEventId = 0; // Regular goalie change
  penaltyEventId = 0;
  
  homeTeamId = 1;
  awayTeamId = 2;
  
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
  
  // Game status flags
  isGameOver = false;
  pageTitle = signal('Live Dashboard');
  
  // Current period ID for dropdown
  currentPeriodId = 1;
  
  // Game start time (used to compute elapsed times for events)
  private gameStartTime: Date | null = null;
  
  // Tournament/game header data
  tournamentName = signal('');
  tournamentType = signal('');
  tournamentCategory = signal('');
  tournamentDate = signal('');
  arenaInfo = signal('');
  
  // Team data
  homeTeam = signal<TeamDisplay>({
    name: '',
    logo: '',
    score: 0,
    record: '',
    sog: 0,
    teamLevel: ''
  });

  awayTeam = signal<TeamDisplay>({
    name: '',
    logo: '',
    score: 0,
    record: '',
    sog: 0,
    teamLevel: ''
  });

  period = signal('');
  
  // Game statistics
  homeStats = signal<GameStats>({
    faceoffWinPct: 0,
    defensiveZoneExit: {
      long: 0,
      skate: 0,
      soWin: 0,
      soLose: 0,
      pass: 0
    },
    offensiveZoneEntry: {
      pass: 0,
      dump: 0, // Dump Win
      carry: 0, // Dump Lose
      skated: 0
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
    faceoffWinPct: 0,
    defensiveZoneExit: {
      long: 0,
      skate: 0,
      soWin: 0,
      soLose: 0,
      pass: 0
    },
    offensiveZoneEntry: {
      pass: 0,
      dump: 0, // Dump Win
      carry: 0, // Dump Lose
      skated: 0
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

  // IDs for patching zone exit/entry rows
  private homeDefensiveZoneExitId?: number;
  private awayDefensiveZoneExitId?: number;
  private homeOffensiveZoneEntryId?: number;
  private awayOffensiveZoneEntryId?: number;

  // Starting goalies for defaults in forms
  private homeStartGoalieId?: number;
  private awayStartGoalieId?: number;
  
  // Spray chart data
  homeSprayChartData = signal<ShotLocationData[]>([]);
  awaySprayChartData = signal<ShotLocationData[]>([]);
  isLoadingSprayCharts = signal(true);
 
  ngOnInit(): void {
    // Get game ID from route parameter
    this.route.params.subscribe(params => {
      const gameIdParam = params['gameId'];
      if (gameIdParam) {
        this.gameId = parseInt(gameIdParam, 10);
      }
      this.loadInitialGameData();
    });
  }

  ngOnDestroy(): void {
    // Clean up polling subscription
    if (this.liveDataPollingSubscription) {
      this.liveDataPollingSubscription.unsubscribe();
    }
  }

  /**
   * Load initial game data (static data from /extra endpoint)
   */
  loadInitialGameData(): void {
    forkJoin({
      gameExtra: this.liveGameService.getGameExtra(this.gameId),
      periods: this.gameMetadataService.getGamePeriods(),
      shotTypes: this.gameMetadataService.getShotTypes(),
      gameTypes: this.gameMetadataService.getGameTypes(),
      teams: this.teamService.getTeams(),
      arenas: this.arenaService.getArenas(),
      rinks: this.arenaService.getAllRinks(),
      teamLevels: this.teamOptionsService.getTeamLevels(),
      eventNames: this.gameEventNameService.getGameEventNames()
    }).subscribe({
      next: ({ gameExtra, periods, shotTypes, gameTypes, teams, arenas, rinks, teamLevels, eventNames }) => {
        // Check if game status is "Not Started" (1)
        if (gameExtra.status === 1) {
          this.router.navigate(['/dashboard']);
          return;
        }
        
        // Set game status flags
        this.isGameOver = gameExtra.status === 3;
        this.pageTitle.set(this.isGameOver ? 'Game Dashboard' : 'Live Dashboard');
        
        // Set team IDs from game extra
        this.homeTeamId = gameExtra.home_team_id;
        this.awayTeamId = gameExtra.away_team_id;

        // Map event names to IDs
        eventNames.forEach(event => {
          this.eventNameIds[event.name] = event.id;
        });
        
        // Set specific event IDs for forms
        this.shotOnGoalEventId = this.eventNameIds['Shot on Goal'] || 0;
        this.turnoverEventId = this.eventNameIds['Turnover'] || 0;
        this.faceoffEventId = this.eventNameIds['Faceoff'] || 0;
        this.goalieChangeEventId = this.eventNameIds['Goalie Change'] || 0;
        this.penaltyEventId = this.eventNameIds['Penalty'] || 0;

        // Set periods and shot types
        this.gamePeriods = periods;
        this.periodOptions = this.gameMetadataService.transformGamePeriodsToOptions(periods);
        this.shotTypeOptions = this.gameMetadataService.transformShotTypesToOptions(shotTypes);

        // Get team information
        const allTeams = teams.teams;

        // Update game header information from extra
        this.updateGameHeaderFromExtra(gameExtra, gameTypes, rinks, arenas, allTeams);
        // Store starting goalies for default selections
        this.homeStartGoalieId = gameExtra.home_start_goalie_id;
        this.awayStartGoalieId = gameExtra.away_start_goalie_id;
        const homeTeamData = allTeams.find(t => parseInt(t.id) === this.homeTeamId);
        const awayTeamData = allTeams.find(t => parseInt(t.id) === this.awayTeamId);

        if (homeTeamData && awayTeamData) {
          // Get team level names from API data
          const homeTeamLevel = teamLevels.find(level => level.id === homeTeamData.levelId)?.name || '';
          const awayTeamLevel = teamLevels.find(level => level.id === awayTeamData.levelId)?.name || '';
          
          // Format team records
          const homeRecord = `(${gameExtra.home_team_game_type_record.wins} - ${gameExtra.home_team_game_type_record.losses} - ${gameExtra.home_team_game_type_record.ties})`;
          const awayRecord = `(${gameExtra.away_team_game_type_record.wins} - ${gameExtra.away_team_game_type_record.losses} - ${gameExtra.away_team_game_type_record.ties})`;
          
          // Update team signals with real data
          this.homeTeam.set({
            name: homeTeamData.name,
            logo: `${environment.apiUrl}/hockey/team/${homeTeamData.id}/logo`,
            score: gameExtra.home_goals,
            record: homeRecord,
            sog: 0,
            teamLevel: `${homeTeamData.group} ${homeTeamLevel}`
          });

          this.awayTeam.set({
            name: awayTeamData.name,
            logo: `${environment.apiUrl}/hockey/team/${awayTeamData.id}/logo`,
            score: gameExtra.away_goals,
            record: awayRecord,
            sog: 0,
            teamLevel: `${awayTeamData.group} ${awayTeamLevel}`
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

        this.loadPlayersAndGoalies();
        this.loadGameSprayChart();
      },
      error: (error) => {
        console.error('Failed to load initial game data:', error);
        // If game not found or error loading, redirect to dashboard
        console.warn('Game not found or error loading game data, redirecting to dashboard');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  /**
   * Start polling live data every minute
   */
  private startLiveDataPolling(): void {
    // Poll every 60 seconds (1 minute), starting immediately
    this.liveDataPollingSubscription = interval(60000)
      .pipe(
        startWith(0), // Start immediately
        switchMap(() => this.liveGameService.getLiveGameData(this.gameId))
      )
      .subscribe({
        next: (liveData) => {
          this.updateStatsFromLiveData(liveData);
          this.updateGameEvents(liveData, this.gamePeriods, this.teamOptions.map(t => ({ id: t.value.toString(), name: t.label })));
          // Refresh spray charts on each poll
          this.refreshGameSprayChart();
          // First successful live-data load ends loading state
          if (this.isLoadingGameData) {
            this.isLoadingGameData = false;
          }
        },
        error: (error) => {
          console.error('Failed to poll live game data:', error);
        }
      });
  }

  /**
   * Update game header information from extra data
   */
  private updateGameHeaderFromExtra(gameExtra: GameExtra, gameTypes: { id: number; name: string }[], rinks: Rink[], arenas: Arena[], teams: Team[]): void {
    // Update period
    const currentPeriod = this.gamePeriods.find(p => p.id === gameExtra.game_period_id);
    this.currentPeriodId = gameExtra.game_period_id;
    if (this.isGameOver) {
      this.period.set('Final');
    } else {
      this.period.set(currentPeriod ? currentPeriod.name : 'Unknown Period');
    }

    // tournamentCategory - game type by game_type_id
    const gameType = gameTypes.find(t => t.id === gameExtra.game_type_id);
    this.tournamentCategory.set(gameType ? gameType.name : 'Unknown');

    // tournamentName - game_type_name from API
    this.tournamentName.set(gameExtra.game_type_name || '');

    // tournamentType - team's age_group
    const homeTeam = teams.find(t => parseInt(t.id) === gameExtra.home_team_id);
    const ageGroup = homeTeam?.group || '';
    this.tournamentType.set(ageGroup);

    // Update date and time
    const gameDate = new Date(gameExtra.date + 'T' + gameExtra.time);
    this.gameStartTime = gameDate;
    this.tournamentDate.set(gameDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }));

    // arenaInfo - format: "Arena - Rink"
    const rink = rinks.find(r => r.id === gameExtra.rink_id);
    if (rink) {
      const arena = arenas.find(a => a.id === rink.arena_id);
      const arenaName = arena?.name || 'Unknown Arena';
      this.arenaInfo.set(`${arenaName} - ${rink.name}`);
    }
  }

  /**
   * Update game events from live data, grouped by period
   */
  private updateGameEvents(liveData: LiveGameData, periods: GamePeriodResponse[], teams: { id: string; name: string }[]): void {
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
    
    // Sort periods using backend-provided order (fallback to id)
    const periodOrderMap = new Map<number, number>(periods.map(p => [p.id, (p.order ?? p.id)]));
    const sortedPeriods = Array.from(eventsByPeriod.keys()).sort((a, b) => {
      const oa = periodOrderMap.get(a) ?? a;
      const ob = periodOrderMap.get(b) ?? b;
      return oa - ob;
    });
    
    sortedPeriods.forEach(periodId => {
      const period = periods.find(p => p.id === periodId);
      const periodEvents = eventsByPeriod.get(periodId) || [];

      // Sort events within the period by time (then by id for stability)
      const sortedEvents = periodEvents.slice().sort((a, b) => {
        const ta = this.parseEventTime(a.time).getTime();
        const tb = this.parseEventTime(b.time).getTime();
        if (ta !== tb) return tb - ta;
        return (a.id || 0) - (b.id || 0);
      });
      
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
      sortedEvents.forEach(event => {
        const team = teams.find(t => parseInt(t.id) === event.team_id);
        const eventTime = this.parseEventTime(event.time);
        
        // Find player name from playerOptions
        let playerName = '';
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
              // Player not found - leave empty rather than showing ID
              playerName = '';
            }
          }
        }
        
        // Determine shot type category for shot events
        const isShotEvent = event.event_name_id === this.shotOnGoalEventId;
        const shotTypeCategory = isShotEvent ? this.mapShotType(event.shot_type_id) : undefined;

        groupedEvents.push({
          id: event.id,
          period: '', // Empty string for actual events (not headers)
          time: this.formatElapsedTime(eventTime),
          team: team ? team.name : 'Unknown Team',
          teamId: event.team_id,
          // Show shotType in Event column for shot events; otherwise show event name
          event: shotTypeCategory?.toUpperCase() ?? this.getEventName(event.event_name_id),
          player: playerName,
          description: event.note || event.goal_type || '',
          shotType: shotTypeCategory,
          eventNameId: event.event_name_id,
          rawEventData: event
        });
      });
    });

    this.gameEvents.set(groupedEvents);
  }

  /**
   * Parse event time which may be either a full ISO string or a time-of-day string like HH:mm:ss.SSSZ
   */
  private parseEventTime(timeStr: string): Date {
    if (timeStr.includes('T')) {
      return new Date(timeStr);
    }
    // Expect a time-of-day string like HH:mm:ss.SSSZ (hours may be 00)
    const m = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})(\.(\d{3}))?Z?$/);
    if (m && this.gameStartTime) {
      const hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ss = parseInt(m[3], 10);
      const ms = m[5] ? parseInt(m[5], 10) : 0;
      const offsetMs = ((hh * 3600 + mm * 60 + ss) * 1000) + ms;
      return new Date(this.gameStartTime.getTime() + offsetMs);
    }
    // Fallback: combine with game date
    const base = this.gameStartTime ? new Date(this.gameStartTime) : new Date();
    const datePart = base.toISOString().split('T')[0];
    return new Date(`${datePart}T${timeStr}`);
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
    // Find the event name by ID from our loaded event names
    const entry = Object.entries(this.eventNameIds).find(([, id]) => id === eventNameId);
    return entry ? entry[0].toUpperCase() : 'UNKNOWN EVENT';
  }

  /**
   * Map shot_type_id to one of: 'save' | 'goal' | 'missed' | 'blocked'
   */
  private mapShotType(shotTypeId?: number): 'save' | 'goal' | 'missed' | 'blocked' | undefined {
    if (!shotTypeId) return undefined;
    const st = this.shotTypeOptions.find(s => s.value === shotTypeId);
    if (!st) return undefined;
    const name = st.label.trim().toLowerCase();
    if (name === 'goal') return 'goal';
    if (name === 'save' || name === 'saved') return 'save';
    if (name === 'blocked' || name === 'block') return 'blocked';
    if (name === 'missed' || name === 'missed net' || name === 'miss') return 'missed';
    // Fallback heuristics
    if (name.includes('goal')) return 'goal';
    if (name.includes('save')) return 'save';
    if (name.includes('block')) return 'blocked';
    if (name.includes('miss')) return 'missed';
    return undefined;
  }

  /**
   * Load game spray chart data
   */
  private loadGameSprayChart(): void {
    this.isLoadingSprayCharts.set(true);
    
    // Fetch spray chart data with metadata in parallel
    forkJoin({
      sprayChartEvents: this.gameEventService.getGameSprayChart(this.gameId, {}),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes()
    }).subscribe({
      next: ({ sprayChartEvents, eventNames, shotTypes }) => {
        // Transform all events using the game transformation method
        const allTransformedData = this.sprayChartUtils.transformGameSprayChartData(
          sprayChartEvents,
          eventNames,
          shotTypes
        );
        
        // Split data by team
        const homeData: ShotLocationData[] = [];
        const awayData: ShotLocationData[] = [];
        
        sprayChartEvents.forEach((event, index) => {
          if (index < allTransformedData.length) {
            const transformedItem = allTransformedData[index];
            if (event.team_id === this.homeTeamId) {
              homeData.push(transformedItem);
            } else if (event.team_id === this.awayTeamId) {
              awayData.push(transformedItem);
            }
          }
        });
        
        this.homeSprayChartData.set(homeData);
        this.awaySprayChartData.set(awayData);
        this.isLoadingSprayCharts.set(false);
      },
      error: (error) => {
        console.error('Failed to load game spray chart:', error);
        // Set empty arrays on error so component still renders
        this.homeSprayChartData.set([]);
        this.awaySprayChartData.set([]);
        this.isLoadingSprayCharts.set(false);
      }
    });
  }

  /**
   * Refresh game spray chart data (without showing loading state)
   */
  private refreshGameSprayChart(): void {
    // Fetch spray chart data with metadata in parallel
    forkJoin({
      sprayChartEvents: this.gameEventService.getGameSprayChart(this.gameId, {}),
      eventNames: this.gameEventNameService.getGameEventNames(),
      shotTypes: this.gameMetadataService.getShotTypes()
    }).subscribe({
      next: ({ sprayChartEvents, eventNames, shotTypes }) => {
        // Transform all events using the game transformation method
        const allTransformedData = this.sprayChartUtils.transformGameSprayChartData(
          sprayChartEvents,
          eventNames,
          shotTypes
        );
        
        // Split data by team
        const homeData: ShotLocationData[] = [];
        const awayData: ShotLocationData[] = [];
        
        sprayChartEvents.forEach((event, index) => {
          if (index < allTransformedData.length) {
            const transformedItem = allTransformedData[index];
            if (event.team_id === this.homeTeamId) {
              homeData.push(transformedItem);
            } else if (event.team_id === this.awayTeamId) {
              awayData.push(transformedItem);
            }
          }
        });
        
        this.homeSprayChartData.set(homeData);
        this.awaySprayChartData.set(awayData);
      },
      error: (error) => {
        console.error('Failed to refresh game spray chart:', error);
      }
    });
  }

  /**
   * Load players and goalies from game roster
   */
  private loadPlayersAndGoalies(): void {
    this.gamePlayerService.getGameRoster(this.gameId).subscribe({
      next: (roster) => {
        // Set players from roster
        this.playerOptions = [
          ...roster.home_players.map(player => ({
            value: player.id,
            label: `${player.first_name} ${player.last_name}`,
            teamId: this.homeTeamId
          })),
          ...roster.away_players.map(player => ({
            value: player.id,
            label: `${player.first_name} ${player.last_name}`,
            teamId: this.awayTeamId
          }))
        ];

        // Set goalies from roster
        this.goalieOptions = [
          ...roster.home_goalies.map(goalie => ({
            value: goalie.id,
            label: `${goalie.first_name} ${goalie.last_name}`,
            teamId: this.homeTeamId
          })),
          ...roster.away_goalies.map(goalie => ({
            value: goalie.id,
            label: `${goalie.first_name} ${goalie.last_name}`,
            teamId: this.awayTeamId
          }))
        ];
        
        // Start polling for live data after roster is loaded
        this.startLiveDataPolling();
      },
      error: (error) => {
        console.error('Failed to load game roster:', error);
        // Start polling even if roster failed to load
        this.startLiveDataPolling();
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

    // Capture row IDs for patching
    this.homeDefensiveZoneExitId = liveData.home_defensive_zone_exit?.id;
    this.awayDefensiveZoneExitId = liveData.away_defensive_zone_exit?.id;
    this.homeOffensiveZoneEntryId = liveData.home_offensive_zone_entry?.id;
    this.awayOffensiveZoneEntryId = liveData.away_offensive_zone_entry?.id;

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
        dump: liveData.home_offensive_zone_entry.dump_win,
        carry: liveData.home_offensive_zone_entry.dump_lose,
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
        dump: liveData.away_offensive_zone_entry.dump_win,
        carry: liveData.away_offensive_zone_entry.dump_lose,
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


  // Game events (loaded from API)
  gameEvents = signal<GameEvent[]>([]);

  // Helpers to map UI keys to API fields
  private mapDefensiveField(type: 'long' | 'skate' | 'soWin' | 'soLose' | 'pass') {
    const mapping: Record<typeof type, 'icing' | 'skate_out' | 'so_win' | 'so_lose' | 'passes'> = {
      long: 'icing',
      skate: 'skate_out',
      soWin: 'so_win',
      soLose: 'so_lose',
      pass: 'passes'
    } as const;
    return mapping[type];
  }

  private mapOffensiveField(type: 'pass' | 'dump' | 'carry' | 'skated') {
    const mapping: Record<typeof type, 'pass_in' | 'dump_win' | 'dump_lose' | 'skate_in'> = {
      pass: 'pass_in',
      dump: 'dump_win',
      carry: 'dump_lose',
      skated: 'skate_in'
    } as const;
    return mapping[type];
  }

  private refreshLiveDataOnce(): void {
    this.liveGameService.getLiveGameData(this.gameId).subscribe({
      next: (liveData) => this.updateStatsFromLiveData(liveData),
      error: (e) => console.error('Failed to refresh live data:', e)
    });
  }

  /**
   * Refresh live data including stats and events
   */
  private refreshLiveData(): void {
    this.liveGameService.getLiveGameData(this.gameId).subscribe({
      next: (liveData) => {
        this.updateStatsFromLiveData(liveData);
        this.updateGameEvents(liveData, this.gamePeriods, this.teamOptions.map(t => ({ id: t.value.toString(), name: t.label })));
        // Also refresh spray charts when data is refreshed
        this.refreshGameSprayChart();
      },
      error: (e) => console.error('Failed to refresh live data:', e)
    });
  }

  // Defensive Zone Exit increment/decrement methods (with backend PATCH)
  incrementDefensiveZoneExit(team: 'away' | 'home', type: 'long' | 'skate' | 'soWin' | 'soLose' | 'pass'): void {
    this.updateDefensiveZoneExit(team, type, +1);
  }

  decrementDefensiveZoneExit(team: 'away' | 'home', type: 'long' | 'skate' | 'soWin' | 'soLose' | 'pass'): void {
    this.updateDefensiveZoneExit(team, type, -1);
  }

  private updateDefensiveZoneExit(team: 'away' | 'home', type: 'long' | 'skate' | 'soWin' | 'soLose' | 'pass', delta: 1 | -1): void {
    const field = this.mapDefensiveField(type);
    const isAway = team === 'away';
    const stats = isAway ? this.awayStats() : this.homeStats();
    const current = stats.defensiveZoneExit[type];
    const next = Math.max(0, current + delta);

    // Optimistic UI update
    if (isAway) {
      this.awayStats.set({
        ...stats,
        defensiveZoneExit: { ...stats.defensiveZoneExit, [type]: next }
      });
    } else {
      this.homeStats.set({
        ...stats,
        defensiveZoneExit: { ...stats.defensiveZoneExit, [type]: next }
      });
    }

    const rowId = isAway ? this.awayDefensiveZoneExitId : this.homeDefensiveZoneExitId;
    if (!rowId && rowId !== 0) {
      console.warn('Defensive zone exit row id is missing; skipping PATCH');
      return;
    }

    this.liveGameService.updateDefensiveZoneExit(rowId!, { [field]: next } as Partial<Pick<DefensiveZoneExit, 'icing' | 'skate_out' | 'so_win' | 'so_lose' | 'passes'>>).subscribe({
      next: () => this.refreshLiveDataOnce(),
      error: (e) => {
        console.error('Failed to update defensive zone exit:', e);
        // Revert UI on error
        if (isAway) {
          this.awayStats.update(s => ({
            ...s,
            defensiveZoneExit: { ...s.defensiveZoneExit, [type]: current }
          }));
        } else {
          this.homeStats.update(s => ({
            ...s,
            defensiveZoneExit: { ...s.defensiveZoneExit, [type]: current }
          }));
        }
      }
    });
  }

  // Offensive Zone Entry increment/decrement methods (with backend PATCH)
  incrementOffensiveZoneEntry(team: 'away' | 'home', type: 'pass' | 'dump' | 'carry' | 'skated'): void {
    this.updateOffensiveZoneEntry(team, type, +1);
  }

  decrementOffensiveZoneEntry(team: 'away' | 'home', type: 'pass' | 'dump' | 'carry' | 'skated'): void {
    this.updateOffensiveZoneEntry(team, type, -1);
  }

  private updateOffensiveZoneEntry(team: 'away' | 'home', type: 'pass' | 'dump' | 'carry' | 'skated', delta: 1 | -1): void {
    const field = this.mapOffensiveField(type);
    const isAway = team === 'away';
    const stats = isAway ? this.awayStats() : this.homeStats();
    const current = stats.offensiveZoneEntry[type];
    const next = Math.max(0, current + delta);

    // Optimistic UI update
    if (isAway) {
      this.awayStats.set({
        ...stats,
        offensiveZoneEntry: { ...stats.offensiveZoneEntry, [type]: next }
      });
    } else {
      this.homeStats.set({
        ...stats,
        offensiveZoneEntry: { ...stats.offensiveZoneEntry, [type]: next }
      });
    }

    const rowId = isAway ? this.awayOffensiveZoneEntryId : this.homeOffensiveZoneEntryId;
    if (!rowId && rowId !== 0) {
      console.warn('Offensive zone entry row id is missing; skipping PATCH');
      return;
    }

    this.liveGameService.updateOffensiveZoneEntry(rowId!, { [field]: next } as Partial<Pick<OffensiveZoneEntry, 'pass_in' | 'dump_win' | 'dump_lose' | 'skate_in'>>).subscribe({
      next: () => this.refreshLiveDataOnce(),
      error: (e) => {
        console.error('Failed to update offensive zone entry:', e);
        // Revert UI on error
        if (isAway) {
          this.awayStats.update(s => ({
            ...s,
            offensiveZoneEntry: { ...s.offensiveZoneEntry, [type]: current }
          }));
        } else {
          this.homeStats.update(s => ({
            ...s,
            offensiveZoneEntry: { ...s.offensiveZoneEntry, [type]: current }
          }));
        }
      }
    });
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
        shotEventId: this.shotOnGoalEventId,
        periodOptions: this.periodOptions,
        shotTypeOptions: this.shotTypeOptions,
        teamOptions: this.teamOptions,
        playerOptions: this.playerOptions,
        goalieOptions: this.goalieOptions,
        gameStartTimeIso: this.gameStartTime ? this.gameStartTime.toISOString() : undefined,
        homeTeamId: this.homeTeamId,
        awayTeamId: this.awayTeamId,
        homeStartGoalieId: this.homeStartGoalieId,
        awayStartGoalieId: this.awayStartGoalieId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshLiveData();
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
        this.refreshLiveData();
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
        this.refreshLiveData();
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
        goalieOptions: this.goalieOptions,
        homeTeamId: this.homeTeamId,
        awayTeamId: this.awayTeamId,
        homeStartGoalieId: this.homeStartGoalieId,
        awayStartGoalieId: this.awayStartGoalieId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshLiveData();
      }
    });
  }

  /**
   * Handle period change from dropdown
   */
  onPeriodChange(periodId: number): void {
    if (this.isGameOver) { return; }
    const selectedPeriod = this.gamePeriods.find(p => p.id === periodId);
    if (!selectedPeriod) { return; }

    const prevPeriodId = this.currentPeriodId;
    const prevPeriodName = this.period();

    // Optimistic UI update
    this.currentPeriodId = periodId;
    this.period.set(selectedPeriod.name);

    // Check if selected period is the last one (Final)
    const maxOrder = Math.max(...this.gamePeriods.map(p => p.order ?? p.id));
    const selectedOrder = selectedPeriod.order ?? selectedPeriod.id;
    const isFinalPeriod = selectedOrder === maxOrder;

    // Build update payload - include status if Final is selected
    const updatePayload: Record<string, unknown> = { game_period_id: periodId };
    if (isFinalPeriod) {
      updatePayload['status'] = 3; // Game Over
    }

    this.scheduleService.updateGame(this.gameId, updatePayload).subscribe({
      next: () => {
        // If Final was selected, update local game state
        if (isFinalPeriod) {
          this.isGameOver = true;
          this.pageTitle.set('Game Dashboard');
        }
        this.refreshLiveDataOnce();
      },
      error: (e) => {
        console.error('Failed to update game period:', e);
        // Revert UI on error
        this.currentPeriodId = prevPeriodId;
        this.period.set(prevPeriodName);
        alert('Failed to update period. Please try again.');
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
        this.refreshLiveData();
      }
    });
  }

  /**
   * Edit a game event based on its type
   */
  onEditEvent(event: GameEvent): void {
    // Skip if it's a period header (string ID)
    if (typeof event.id === 'string' || !event.eventNameId || !event.rawEventData) {
      return;
    }

    // Determine which modal to open based on event type
    if (event.eventNameId === this.shotOnGoalEventId) {
      this.openShotEditModal(event);
    } else if (event.eventNameId === this.turnoverEventId) {
      this.openTurnoverEditModal(event);
    } else if (event.eventNameId === this.faceoffEventId) {
      this.openFaceoffEditModal(event);
    } else if (event.eventNameId === this.goalieChangeEventId) {
      this.openGoalieChangeEditModal(event);
    } else if (event.eventNameId === this.penaltyEventId) {
      this.openPenaltyEditModal(event);
    } else {
      console.warn('Unknown event type for editing:', event.eventNameId);
      alert('This event type cannot be edited yet.');
    }
  }

  private openShotEditModal(event: GameEvent): void {
    const rawEvent = event.rawEventData!;
    
    // Convert time back to mm:ss format
    const eventTime = this.parseEventTime(rawEvent.time);
    const timeString = this.formatElapsedTime(eventTime);
    
    const dialogRef = this.dialog.open(ShotFormModalComponent, {
      width: '800px',
      panelClass: 'shot-form-modal-dialog',
      disableClose: false,
      autoFocus: true,
      data: {
        gameId: this.gameId,
        shotEventId: this.shotOnGoalEventId,
        periodOptions: this.periodOptions,
        shotTypeOptions: this.shotTypeOptions,
        teamOptions: this.teamOptions,
        playerOptions: this.playerOptions,
        goalieOptions: this.goalieOptions,
        gameStartTimeIso: this.gameStartTime ? this.gameStartTime.toISOString() : undefined,
        homeTeamId: this.homeTeamId,
        awayTeamId: this.awayTeamId,
        homeStartGoalieId: this.homeStartGoalieId,
        awayStartGoalieId: this.awayStartGoalieId,
        // Edit mode data
        isEditMode: true,
        eventId: rawEvent.id,
        existingData: {
          periodId: rawEvent.period_id,
          time: timeString,
          teamId: rawEvent.team_id,
          playerId: rawEvent.player_id,
          player2Id: rawEvent.player_2_id,
          goalieId: rawEvent.goalie_id,
          shotTypeId: rawEvent.shot_type_id,
          isScoringChance: rawEvent.is_scoring_chance,
          note: rawEvent.note,
          youtubeLink: rawEvent.youtube_link,
          iceTopOffset: rawEvent.ice_top_offset,
          iceLeftOffset: rawEvent.ice_left_offset,
          netTopOffset: rawEvent.net_top_offset,
          netLeftOffset: rawEvent.net_left_offset,
          goalType: rawEvent.goal_type
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshLiveData();
      }
    });
  }

  private openTurnoverEditModal(event: GameEvent): void {
    const rawEvent = event.rawEventData!;
    
    // Convert time back to mm:ss format
    const eventTime = this.parseEventTime(rawEvent.time);
    const timeString = this.formatElapsedTime(eventTime);
    
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
        playerOptions: this.playerOptions,
        // Edit mode data
        isEditMode: true,
        eventId: rawEvent.id,
        existingData: {
          periodId: rawEvent.period_id,
          time: timeString,
          teamId: rawEvent.team_id,
          playerId: rawEvent.player_id,
          zone: rawEvent.zone,
          youtubeLink: rawEvent.youtube_link,
          iceTopOffset: rawEvent.ice_top_offset,
          iceLeftOffset: rawEvent.ice_left_offset
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshLiveData();
      }
    });
  }

  private openFaceoffEditModal(event: GameEvent): void {
    const rawEvent = event.rawEventData!;
    
    // Convert time back to mm:ss format
    const eventTime = this.parseEventTime(rawEvent.time);
    const timeString = this.formatElapsedTime(eventTime);
    
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
        playerOptions: this.playerOptions,
        // Edit mode data
        isEditMode: true,
        eventId: rawEvent.id,
        existingData: {
          periodId: rawEvent.period_id,
          time: timeString,
          winnerTeamId: rawEvent.team_id,
          winnerPlayerId: rawEvent.player_id,
          loserPlayerId: rawEvent.player_2_id,
          zone: rawEvent.zone,
          youtubeLink: rawEvent.youtube_link,
          iceTopOffset: rawEvent.ice_top_offset,
          iceLeftOffset: rawEvent.ice_left_offset
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshLiveData();
      }
    });
  }

  private openGoalieChangeEditModal(event: GameEvent): void {
    const rawEvent = event.rawEventData!;
    
    // Convert time back to mm:ss format
    const eventTime = this.parseEventTime(rawEvent.time);
    const timeString = this.formatElapsedTime(eventTime);
    
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
        goalieOptions: this.goalieOptions,
        homeTeamId: this.homeTeamId,
        awayTeamId: this.awayTeamId,
        homeStartGoalieId: this.homeStartGoalieId,
        awayStartGoalieId: this.awayStartGoalieId,
        // Edit mode data
        isEditMode: true,
        eventId: rawEvent.id,
        existingData: {
          periodId: rawEvent.period_id,
          time: timeString,
          teamId: rawEvent.team_id,
          goalieId: rawEvent.goalie_id,
          note: rawEvent.note
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshLiveData();
      }
    });
  }

  private openPenaltyEditModal(event: GameEvent): void {
    const rawEvent = event.rawEventData!;
    
    // Convert time back to mm:ss format
    const eventTime = this.parseEventTime(rawEvent.time);
    const timeString = this.formatElapsedTime(eventTime);
    
    // Convert time_length to mm:ss for edit modal input. Supports ISO 8601 duration (PT..), mm:ss, HH:mm:ss[.SSS][Z], or full ISO.
    let penaltyTimeString = '2:00'; // default
    if (rawEvent.time_length) {
      const dur = rawEvent.time_length;
      // Try ISO 8601 duration PT#M#S
      const isoMatch = dur.match(/^P(T)?(?:(\d+)M)?(?:(\d+)S)?$/);
      if (isoMatch) {
        const minutes = isoMatch[2] ? parseInt(isoMatch[2], 10) : 0;
        const seconds = isoMatch[3] ? parseInt(isoMatch[3], 10) : 0;
        penaltyTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      } else {
        // Try mm:ss directly
        const msMatch = dur.match(/^([0-5]?\d):([0-5]\d)$/);
        if (msMatch) {
          const minutes = parseInt(msMatch[1], 10);
          const seconds = parseInt(msMatch[2], 10);
          penaltyTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
          // Try time-of-day HH:mm:ss...
          const tMatch = dur.match(/^(\d{2}):(\d{2}):(\d{2})/);
          if (tMatch) {
            const minutes = parseInt(tMatch[2], 10);
            const seconds = parseInt(tMatch[3], 10);
            penaltyTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          } else {
            // Fallback: try Date parse only if valid
            const lengthDate = new Date(dur);
            if (!isNaN(lengthDate.getTime())) {
              const minutes = lengthDate.getUTCMinutes();
              const seconds = lengthDate.getUTCSeconds();
              penaltyTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
              console.warn('Unrecognized penalty time_length format:', dur);
            }
          }
        }
      }
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
        playerOptions: this.playerOptions,
        // Edit mode data
        isEditMode: true,
        eventId: rawEvent.id,
        existingData: {
          periodId: rawEvent.period_id,
          time: timeString,
          teamId: rawEvent.team_id,
          playerId: rawEvent.player_id,
          penaltyLength: penaltyTimeString,
          zone: rawEvent.zone,
          youtubeLink: rawEvent.youtube_link,
          iceTopOffset: rawEvent.ice_top_offset,
          iceLeftOffset: rawEvent.ice_left_offset
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshLiveData();
      }
    });
  }

  /**
   * Open video modal for a game event
   */
  onViewEventVideo(event: GameEvent): void {
    const raw = event.rawEventData;
    const link = raw?.youtube_link || '';
    if (!this.isYouTubeLinkValid(link)) return;

    const modalVideo: Video = {
      id: 0,
      name: `${event.event} — ${event.player}`.trim(),
      description: event.description || '',
      youtube_link: link,
      added_by: event.team || '-',
      date: raw?.date || ''
    };

    this.dialog.open(VideoViewModalComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'video-view-modal-dialog',
      data: { video: modalVideo }
    });
  }

  /**
   * Validate a YouTube link (basic)
   */
  isYouTubeLinkValid(link?: string | null): boolean {
    if (!link) return false;
    try {
      const u = new URL(link);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '').split('/')[0];
        return !!id && id.length > 0;
      }
      if (u.hostname.includes('youtube.com')) {
        if (u.pathname.startsWith('/watch')) {
          return !!u.searchParams.get('v');
        }
        if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/')) {
          const id = u.pathname.split('/')[2];
          return !!id && id.length > 0;
        }
      }
      return false;
    } catch {
      // fallback: raw 11-char ID
      return /[a-zA-Z0-9_-]{11}/.test(link);
    }
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
          this.refreshLiveData();
        },
        error: (error) => {
          console.error('Failed to delete event:', error);
          alert('Failed to delete event. Please try again.');
        }
      });
    }
  }
}
