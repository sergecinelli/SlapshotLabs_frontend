import { Component, OnInit, OnDestroy, inject , ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { TeamService } from '../../services/team.service';
import { PlayerService } from '../../services/player.service';
import { GoalieService } from '../../services/goalie.service';
import { ScheduleService } from '../../services/schedule.service';
import { GameMetadataService } from '../../services/game-metadata.service';
import { ArenaService } from '../../services/arena.service';
import { Team, TeamSeasonStat } from '../../shared/interfaces/team.interface';
import { Rink } from '../../shared/interfaces/arena.interface';
import { Player } from '../../shared/interfaces/player.interface';
import { Goalie } from '../../shared/interfaces/goalie.interface';
import { TeamFormModal } from '../../shared/components/team-form-modal/team-form.modal';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { visibilityByRoleMap } from './team-profile.role-map';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { convertGMTToLocalWithDateShift, formatDateShort } from '../../shared/utils/time-converter.util';

// Additional interfaces for team profile specific data
export interface TeamGame {
  id: string;
  date: string;
  time: string;
  opponent: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
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


@Component({
  selector: 'app-team-profile',
  imports: [
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
  ],
  templateUrl: './team-profile.page.html',
  styleUrl: './team-profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamProfilePage implements OnInit, OnDestroy {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private scheduleService = inject(ScheduleService);
  private gameMetadataService = inject(GameMetadataService);
  private arenaService = inject(ArenaService);
  private dialog = inject(MatDialog);
  private breadcrumbData = inject(BreadcrumbDataService);

  private destroy$ = new Subject<void>();

  team: Team | null = null;
  roster: (Player | Goalie)[] = [];
  loading = true;
  loadingRoster = false;
  currentSeasonIndex = 0;
  recentGames: TeamGame[] = [];
  upcomingGames: TeamGame[] = [];
  seasonStats: TeamSeasonStat[] = [];
  teamsMap = new Map<number, Team>();
  gameTypesMap = new Map<number, string>();
  rinksMap = new Map<number, Rink>();

  // Table column definitions
  seasonStatsColumns: string[] = ['season', 'gamesPlayed', 'wins', 'losses', 'ties', 'points'];
  recentGamesColumns: string[] = ['date', 'opponent', 'result', 'gameType', 'rink'];
  upcomingGamesColumns: string[] = ['date', 'time', 'opponent', 'gameType', 'rink'];
  rosterColumns: string[] = [
    'jerseyNumber',
    'firstName',
    'lastName',
    'position',
    'height',
    'weight',
    'shoots',
  ];

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const teamId = params['id'];
        if (teamId) {
          this.loadTeam(teamId);
        } else {
          this.router.navigate(['/teams-and-rosters/teams']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTeam(id: string): void {
    this.loading = true;
    const numericTeamId = parseInt(id, 10);

    forkJoin({
      team: this.teamService.getTeamById(id),
      teams: this.teamService.getTeams(),
      games: this.scheduleService.getDashboardGames(numericTeamId, 5),
      gameTypes: this.gameMetadataService.getGameTypes(),
      teamSeasons: this.teamService.getTeamSeasons(numericTeamId, 2),
    }).subscribe({
      next: ({ team, teams, games, gameTypes, teamSeasons }) => {
        if (team) {
          this.team = team;
          this.breadcrumbData.entityName.set(team.name);
          // Create teams map for lookup
          this.teamsMap = new Map(teams.teams.map((t) => [parseInt(t.id), t]));
          // Create game types map for lookup
          this.gameTypesMap = new Map(gameTypes.map((gt) => [gt.id, gt.name]));

          // Collect unique rink IDs from games
          const uniqueRinkIds = new Set<number>();
          games.previous_games.forEach((game) => {
            if (game.rink_id) {
              uniqueRinkIds.add(game.rink_id);
            }
          });
          games.upcoming_games.forEach((game) => {
            if (game.rink_id) {
              uniqueRinkIds.add(game.rink_id);
            }
          });

          // Load rinks for unique IDs using /hockey/arena-rink/{rink_id}
          const rinkIdsArray = Array.from(uniqueRinkIds);

          if (rinkIdsArray.length > 0) {
            const rinkRequests = rinkIdsArray.map((rinkId) =>
              this.arenaService.getRinkById(rinkId)
            );

            forkJoin(rinkRequests).subscribe({
              next: (rinksData) => {
                // Create rinks map from fetched data
                this.rinksMap = new Map(
                  rinksData.map((rink) => [rink.id, rink])
                );
                // Load season stats
                this.seasonStats = teamSeasons.map((s) => ({
                  season: s.season,
                  seasonId: s.seasonId,
                  gamesPlayed: s.gamesPlayed,
                  wins: s.wins,
                  losses: s.losses,
                  ties: s.ties,
                  points: s.points,
                }));
                // Load games
                this.recentGames = this.mapGamesToTeamGames(games.previous_games, numericTeamId);
                this.upcomingGames = this.mapGamesToTeamGames(games.upcoming_games, numericTeamId);
                // Load roster data (players + goalies) for this team
                this.loadRoster(numericTeamId);
              },
              error: (error) => {
                console.error('Error loading rinks:', error);
                // Continue with empty rinks map
                this.rinksMap = new Map();
                // Load season stats
                this.seasonStats = teamSeasons.map((s) => ({
                  season: s.season,
                  seasonId: s.seasonId,
                  gamesPlayed: s.gamesPlayed,
                  wins: s.wins,
                  losses: s.losses,
                  ties: s.ties,
                  points: s.points,
                }));
                // Load games
                this.recentGames = this.mapGamesToTeamGames(games.previous_games, numericTeamId);
                this.upcomingGames = this.mapGamesToTeamGames(games.upcoming_games, numericTeamId);
                // Load roster data (players + goalies) for this team
                this.loadRoster(numericTeamId);
              },
            });
          } else {
            // No rinks to load, proceed directly
            this.rinksMap = new Map();
            // Load season stats
            this.seasonStats = teamSeasons.map((s) => ({
              season: s.season,
              seasonId: s.seasonId,
              gamesPlayed: s.gamesPlayed,
              wins: s.wins,
              losses: s.losses,
              ties: s.ties,
              points: s.points,
            }));
            // Load games
            this.recentGames = this.mapGamesToTeamGames(games.previous_games, numericTeamId);
            this.upcomingGames = this.mapGamesToTeamGames(games.upcoming_games, numericTeamId);
            // Load roster data (players + goalies) for this team
            this.loadRoster(numericTeamId);
          }
        } else {
          console.error(`Team not found with ID: ${id}`);
          this.router.navigate(['/teams-and-rosters/teams']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading team:', error);
        this.loading = false;
        this.recentGames = [];
        this.upcomingGames = [];
        this.seasonStats = [];
        this.router.navigate(['/teams-and-rosters/teams']);
      },
    });
  }

  private mapGamesToTeamGames(
    games: {
      id: number;
      home_team_id: number;
      home_goals: number | null;
      away_team_id: number;
      away_goals: number | null;
      game_type_id: number;
      game_type_name: string | null;
      date: string;
      time: string;
      rink_id: number | null;
      status: number;
      season_id?: number | null;
      arena_id?: number | null;
    }[],
    currentTeamId: number
  ): TeamGame[] {
    return games.map((game) => {
      const homeTeam = this.teamsMap.get(game.home_team_id);
      const awayTeam = this.teamsMap.get(game.away_team_id);
      const homeTeamName = homeTeam?.name || `Team ${game.home_team_id}`;
      const awayTeamName = awayTeam?.name || `Team ${game.away_team_id}`;

      // Determine opponent
      const opponent =
        game.home_team_id === currentTeamId ? awayTeamName : homeTeamName;

      // Format date - convert from GMT to local timezone
      // The date and time from API are in UTC
      const { date: localDate, time: localTime } = convertGMTToLocalWithDateShift(game.date, game.time);
      const formattedDate = formatDateShort(localDate);

      // Format time from "HH:MM:SS" (local) to "H:MM AM/PM"
      const formattedTime = this.formatTime(localTime);

      // Determine result for completed games
      let result: string | undefined;
      if (game.status === 3) {
        // Game Over
        const isHome = game.home_team_id === currentTeamId;
        const teamGoals = isHome ? game.home_goals : game.away_goals;
        const opponentGoals = isHome ? game.away_goals : game.home_goals;
        if (teamGoals !== null && opponentGoals !== null) {
          const winLoss = teamGoals > opponentGoals ? 'W' : teamGoals < opponentGoals ? 'L' : 'T';
          result = `${winLoss} ${teamGoals}-${opponentGoals}`;
        }
      }

      // Format rink - get rink name from map, include arena name if available
      let rinkDisplay = '—';
      if (game.rink_id) {
        const rink = this.rinksMap.get(game.rink_id);
        if (rink) {
          if (rink.arena_name) {
            rinkDisplay = `${rink.arena_name} - ${rink.name}`;
          } else {
            rinkDisplay = rink.name;
          }
        } else {
          rinkDisplay = `Rink ${game.rink_id}`;
        }
      }

      // Get game type name from map
      const gameTypeName = game.game_type_name
        ? game.game_type_name
        : this.gameTypesMap.get(game.game_type_id) || `Type ${game.game_type_id}`;

      return {
        id: game.id.toString(),
        date: formattedDate,
        time: formattedTime,
        opponent: opponent,
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        homeGoals: game.home_goals,
        awayGoals: game.away_goals,
        gameType: gameTypeName,
        rink: rinkDisplay,
        status: game.status === 1 ? 'Not Started' : game.status === 2 ? 'In Progress' : 'Game Over',
        result: result,
      };
    });
  }

  private loadRoster(teamId: number): void {
    this.loadingRoster = true;

    // Fetch both players and goalies in parallel
    forkJoin({
      players: this.playerService.getPlayersByTeam(teamId),
      goalies: this.goalieService.getGoaliesByTeam(teamId, { excludeDefault: false }),
    }).subscribe({
      next: ({ players, goalies }) => {
        // Combine players and goalies into one roster
        this.roster = [...players, ...goalies];
        this.loadingRoster = false;
      },
      error: (error) => {
        console.error('Error loading roster:', error);
        this.loadingRoster = false;
        // Keep roster empty on error
        this.roster = [];
      },
    });
  }

  onEditTeamProfile(): void {
    if (!this.team) return;

    const dialogRef = this.dialog.open(TeamFormModal, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        team: this.team,
        isEditMode: true,
      },
      panelClass: 'team-form-modal-dialog',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
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
        this.team = updatedTeam;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating team:', error);
        this.loading = false;
      },
    });
  }

  onRequestTeamAnalysis(): void {
    console.log('Request team analysis clicked');
    // TODO: Implement analysis request
  }

  getCurrentSeason(): string {
    const stats = this.getSeasonStats();
    if (stats.length > 0) {
      return stats[this.currentSeasonIndex]?.season || '—';
    }
    return '—';
  }

  getPreviousSeason(): string {
    const stats = this.getSeasonStats();
    if (stats.length > 1) {
      const previousIndex = (this.currentSeasonIndex + 1) % stats.length;
      return stats[previousIndex]?.season || '—';
    }
    return '—';
  }

  getTeamRecord(): string {
    const stats = this.getSeasonStats();
    if (stats.length > 0 && stats[this.currentSeasonIndex]) {
      const stat = stats[this.currentSeasonIndex];
      return `${stat.wins}-${stat.losses}-${stat.ties}`;
    }
    return '—';
  }

  showPreviousSeason(): void {
    const seasonStats = this.getSeasonStats();
    if (seasonStats.length > 1) {
      this.currentSeasonIndex = (this.currentSeasonIndex + 1) % seasonStats.length;
    }
  }

  getSeasonStats(): TeamSeasonStat[] {
    return this.seasonStats;
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
    return this.recentGames;
  }

  getUpcomingGames(): TeamGame[] {
    return this.upcomingGames;
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

  /**
   * Format time from "HH:MM:SS" to "H:MM AM/PM" (e.g., "11:45:00" -> "11:45 AM", "19:30:00" -> "7:30 PM")
   */
  private formatTime(timeString: string): string {
    if (!timeString) return '—';

    // Parse time string (format: "HH:MM:SS" or "HH:MM")
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return timeString;

    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    let displayHours: number;
    if (hours === 0) {
      displayHours = 12; // 00:XX -> 12:XX AM
    } else if (hours === 12) {
      displayHours = 12; // 12:XX -> 12:XX PM
    } else if (hours > 12) {
      displayHours = hours - 12; // 13:XX -> 1:XX PM, 19:XX -> 7:XX PM
    } else {
      displayHours = hours; // 1-11 -> 1-11 AM
    }

    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${period}`;
  }
}
