import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ScheduleService, DashboardGame } from '../../services/schedule.service';
import { TeamService } from '../../services/team.service';
import { BreadcrumbDataService } from '../../services/breadcrumb-data.service';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { visibilityByRoleMap } from './schedules.role-map';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { LocalStorageService, StorageKey } from '../../services/local-storage.service';
import { Schedule, GameStatus } from '../../shared/interfaces/schedule.interface';
import { ArenaService } from '../../services/arena.service';
import { environment } from '../../../environments/environment';
import { convertGMTToLocal, formatDateForDisplay } from '../../shared/utils/time-converter.util';
import { Team } from '../../shared/interfaces/team.interface';
import { forkJoin } from 'rxjs';

interface GameDisplay {
  id: number;
  date: string;
  time: string;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamLogo: string;
  homeGoals: number;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamLogo: string;
  awayGoals: number;
  arenaName: string;
  status: number;
  statusLabel: string;
  gameType: string;
  dateFormatted: string;
  timeFormatted: string;
  score: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-schedules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
    DataTableComponent,
    GameCardComponent,
  ],
  template: `
    <div class="page-content" [appVisibilityMap]="visibilityByRoleMap">

      <!-- Header -->
      <div class="schedules-header">
        <div class="schedules-header-left">
          <h2>{{ pageTitle() }}</h2>
        </div>
        <div class="schedules-header-actions" style="display: flex; gap: 10px; align-items: center;">
          <app-button
            [materialIcon]="layoutMode() === 'card' ? 'table_rows' : 'grid_view'"
            [bg]="'white'"
            [bghover]="'gray_tone3'"
            [color]="'text_primary'"
            [colorhover]="'primary'"
            [width]="'auto'"
            [rounded]="false"
            [haveContent]="true"
            (clicked)="toggleLayout()"
          >
            {{ layoutMode() === 'card' ? 'Table View' : 'Card View' }}
          </app-button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="schedules-loading">
          <div class="loading-text">Loading schedules...</div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && games().length === 0) {
        <div class="schedules-empty">
          <div class="empty-text">No schedules found.</div>
        </div>
      }

      <!-- Content -->
      @if (!loading() && games().length > 0) {
        @if (layoutMode() === 'card') {
          <!-- Card View -->
          <div class="schedules-cards-container">
            @for (schedule of schedules(); track schedule.id) {
              <app-game-card
                [game]="schedule"
                [showActions]="false"
                [showScore]="true"
              />
            }
          </div>
        } @else {
          <!-- Table View -->
          <div class="schedules-table-container">
            <app-data-table
              [columns]="tableColumns"
              [data]="games()"
              [actions]="tableActions"
              [loading]="loading()"
              (actionClick)="onActionClick($event)"
              (sort)="onSort($event)"
              emptyMessage="No schedules found."
            ></app-data-table>
          </div>
        }
      }
    </div>
  `,
  styleUrl: './schedules.scss',
})
export class SchedulesComponent implements OnInit {
  protected visibilityByRoleMap = visibilityByRoleMap;

  private scheduleService = inject(ScheduleService);
  private teamService = inject(TeamService);
  private arenaService = inject(ArenaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storage = inject(LocalStorageService);
  private breadcrumbData = inject(BreadcrumbDataService);

  games = signal<GameDisplay[]>([]);
  schedules = signal<Schedule[]>([]);
  loading = signal(true);
  teamId = signal<string | null>(null);
  teamName = signal<string>('');
  pageTitle = signal<string>('Schedule');
  layoutMode = signal<'card' | 'table'>('card');

  tableColumns: TableColumn[] = [
    { key: 'dateFormatted', label: 'Date', sortable: true, width: '110px' },
    { key: 'timeFormatted', label: 'Time', sortable: true, width: '80px' },
    { key: 'homeTeamName', label: 'Home', sortable: true, width: '150px' },
    { key: 'score', label: 'Score', sortable: false, width: '80px' },
    { key: 'awayTeamName', label: 'Away', sortable: true, width: '150px' },
    { key: 'arenaName', label: 'Location', sortable: true, width: '150px' },
    { key: 'statusLabel', label: 'Status', sortable: true, width: '100px' },
    { key: 'gameType', label: 'Type', sortable: true, width: '120px' },
  ];

  tableActions: TableAction[] = [
    { label: 'Dashboard', action: 'dashboard', variant: 'primary', icon: 'visibility' },
  ];

  ngOnInit(): void {
    const savedMode = this.storage.get(StorageKey.LayoutMode);
    if (savedMode === 'card' || savedMode === 'table') {
      this.layoutMode.set(savedMode);
    }

    this.route.params.subscribe((params) => {
      const teamId = params['id'];
      if (teamId) {
        const numericId = parseInt(teamId, 10);
        this.teamId.set(teamId);
        this.loadGames(numericId);
      }
    });
  }

  toggleLayout(): void {
    const newMode = this.layoutMode() === 'card' ? 'table' : 'card';
    this.layoutMode.set(newMode);
    this.storage.set(StorageKey.LayoutMode, newMode);
  }

  onLogoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onActionClick(event: { action: string; item: Record<string, unknown> }): void {
    const { action, item } = event;
    if (action === 'dashboard') {
      this.router.navigate(['/schedule/live', item['id']]);
    }
  }

  onSort(event: { column: string; direction: 'asc' | 'desc' }): void {
    const col = event.column as keyof GameDisplay;
    const sorted = [...this.games()].sort((a, b) => {
      const aVal = a[col];
      const bVal = b[col];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal));
      return event.direction === 'asc' ? cmp : -cmp;
    });
    this.games.set(sorted);
  }

  private loadGames(teamId?: number): void {
    this.loading.set(true);
    forkJoin({
      gamesData: this.scheduleService.getDashboardGames(teamId, 100),
      teamsData: this.teamService.getTeams(),
      arenas: this.arenaService.getArenas(),
    }).subscribe({
      next: ({ gamesData, teamsData, arenas }) => {
        // Set team name from already-loaded teams data
        if (this.teamId()) {
          const team = teamsData.teams.find((t) => t.id === this.teamId());
          if (team) {
            this.teamName.set(team.name);
            this.pageTitle.set(`Schedule | ${team.name}`);
            this.breadcrumbData.entityName.set(team.name);
          }
        }

        const allGames = [...gamesData.upcoming_games, ...gamesData.previous_games];

        // Build team lookup map for age group / level
        const teamDataMap = new Map(
          teamsData.teams.map((t: Team) => [
            parseInt(t.id),
            { ageGroup: t.group, levelName: t.level },
          ])
        );

        // Build arena address lookup map
        const arenaAddressMap = new Map(
          arenas.map((a) => [a.id, a.address || a.arena_address || ''])
        );

        const mapped = allGames.map((g) => this.mapGame(g));
        mapped.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
        this.games.set(mapped);

        // Build Schedule[] for card view with team + arena data
        const schedules = allGames.map((g) => {
          const schedule = this.mapToSchedule(g);
          const homeData = teamDataMap.get(g.home_team_id);
          const awayData = teamDataMap.get(g.away_team_id);
          if (homeData) {
            schedule.homeTeamAgeGroup = homeData.ageGroup;
            schedule.homeTeamLevelName = homeData.levelName;
          }
          if (awayData) {
            schedule.awayTeamAgeGroup = awayData.ageGroup;
            schedule.awayTeamLevelName = awayData.levelName;
          }
          if (g.arena_id) {
            schedule.arenaAddress = arenaAddressMap.get(g.arena_id) || '';
          }
          return schedule;
        });
        schedules.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''));
        this.schedules.set(schedules);

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.loading.set(false);
      },
    });
  }

  private mapToSchedule(g: DashboardGame): Schedule {
    const localDateTime = convertGMTToLocal(g.date, g.time);
    const statusValue =
      g.status === 1 ? GameStatus.NotStarted
        : g.status === 2 ? GameStatus.GameInProgress
          : GameStatus.GameOver;

    return {
      id: g.id.toString(),
      homeTeam: g.home_team_name || `Team ${g.home_team_id}`,
      homeTeamId: g.home_team_id,
      homeTeamLogo: `${environment.apiUrl}/hockey/team/${g.home_team_id}/logo`,
      homeGoals: g.home_goals,
      homeTeamGoalie: g.home_start_goalie_name || undefined,
      homeTeamGoalieId: g.home_start_goalie_id || undefined,
      awayTeam: g.away_team_name || `Team ${g.away_team_id}`,
      awayTeamId: g.away_team_id,
      awayTeamLogo: `${environment.apiUrl}/hockey/team/${g.away_team_id}/logo`,
      awayGoals: g.away_goals,
      awayTeamGoalie: g.away_start_goalie_name || undefined,
      awayTeamGoalieId: g.away_start_goalie_id || undefined,
      gameType: g.game_type || '',
      gameTypeName: g.game_type_name || '',
      tournamentName: g.tournament_name || undefined,
      date: formatDateForDisplay(localDateTime.date),
      time: localDateTime.time,
      rink: g.arena_name || '',
      arenaName: g.arena_name || '',
      status: statusValue,
      statusName: this.getStatusLabel(g.status),
      periodName: g.game_period_name || undefined,
      events: [],
    };
  }

  private mapGame(g: DashboardGame): GameDisplay {
    return {
      id: g.id,
      date: g.date,
      time: g.time,
      homeTeamId: g.home_team_id,
      homeTeamName: g.home_team_name || `Team ${g.home_team_id}`,
      homeTeamLogo: `${environment.apiUrl}/hockey/team/${g.home_team_id}/logo`,
      homeGoals: g.home_goals,
      awayTeamId: g.away_team_id,
      awayTeamName: g.away_team_name || `Team ${g.away_team_id}`,
      awayTeamLogo: `${environment.apiUrl}/hockey/team/${g.away_team_id}/logo`,
      awayGoals: g.away_goals,
      arenaName: g.arena_name || '',
      status: g.status,
      statusLabel: this.getStatusLabel(g.status),
      gameType: [g.game_type, g.game_type_name].filter(Boolean).join(' — '),
      dateFormatted: this.formatDate(g.date),
      timeFormatted: this.formatTime(g.time),
      score: g.status === 3 || g.status === 2 ? `${g.home_goals} : ${g.away_goals}` : 'VS',
    };
  }

  private getStatusLabel(status: number): string {
    switch (status) {
      case 1: return 'Upcoming';
      case 2: return 'Live';
      case 3: return 'Completed';
      default: return 'Unknown';
    }
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  private formatTime(timeStr: string): string {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeStr;
    }
  }
}
