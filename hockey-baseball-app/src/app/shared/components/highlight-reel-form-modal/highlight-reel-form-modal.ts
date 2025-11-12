import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScheduleService } from '../../../services/schedule.service';
import { TeamService } from '../../../services/team.service';
import { PlayerService } from '../../../services/player.service';
import { GoalieService } from '../../../services/goalie.service';
import { LiveGameService, GameEvent as LiveGameEvent } from '../../../services/live-game.service';
import { GameEventNameService } from '../../../services/game-event-name.service';
import { HighlightReelUpsertPayload } from '../../interfaces/highlight-reel.interface';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';

export interface HighlightReelFormModalData {
  isEditMode: boolean;
  reel?: { id: number; name: string; description: string };
}

interface GameListItem {
  id: number;
  label: string; // "Team A vs. Team B"
  homeTeamId: number;
  awayTeamId: number;
  loaded: boolean;
  loading: boolean;
  events: LiveGameEvent[];
  playerNameMap?: Map<number, string>;
  goalieNameMap?: Map<number, string>;
}

@Component({
  selector: 'app-highlight-reel-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './highlight-reel-form-modal.html',
  styleUrl: './highlight-reel-form-modal.scss'
})
export class HighlightReelFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<HighlightReelFormModalComponent>>(MatDialogRef);
  private scheduleService = inject(ScheduleService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private liveGameService = inject(LiveGameService);
  private gameEventNameService = inject(GameEventNameService);
  data = inject<HighlightReelFormModalData>(MAT_DIALOG_DATA);

  form: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  games = signal<GameListItem[]>([]);
  selectedEvents = signal<Array<{
    id: number;
    gameEventId: number;
    eventName: string;
    description: string;
    date: string;
    periodTime: string;
    gameLabel: string;
  }>>([]);
  private eventNameMap = new Map<number, string>();
  private teamNameMap = new Map<number, string>();
  private nextSelectedEventId = 1;

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.form = this.fb.group({
      name: [this.data.reel?.name || '', [Validators.required, Validators.maxLength(200)]],
      description: [this.data.reel?.description || '', [Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    this.loadStaticData();
  }

  private loadStaticData(): void {
    // Load teams (for labels) and event names once, then list games
    this.isLoading = true;
    this.teamService.getTeams().subscribe({
      next: (teamsResp) => {
        (teamsResp.teams || []).forEach((t: any) => this.teamNameMap.set(parseInt(t.id), t.name));
        this.gameEventNameService.getGameEventNames().subscribe({
          next: (names) => {
            names.forEach(n => this.eventNameMap.set(n.id, n.name));
            this.loadGames();
          },
          error: () => {
            this.loadGames();
          }
        });
      },
      error: () => {
        this.loadGames();
      }
    });
  }

  private loadGames(): void {
    this.scheduleService.getGameList().subscribe({
      next: (games) => {
        const items: GameListItem[] = games.map(g => ({
          id: g.id,
          label: `${this.teamNameMap.get(g.away_team_id) || 'Away'} vs. ${this.teamNameMap.get(g.home_team_id) || 'Home'}`,
          homeTeamId: g.home_team_id,
          awayTeamId: g.away_team_id,
          loaded: false,
          loading: false,
          events: []
        }));
        this.games.set(items);
        this.isLoading = false;
      },
      error: () => {
        this.games.set([]);
        this.isLoading = false;
      }
    });
  }

  onPanelOpened(game: GameListItem): void {
    if (game.loaded || game.loading) return;
    game.loading = true;

    // Load events + player/goalie names for the game's teams
    forkJoin({
      liveData: this.liveGameService.getLiveGameData(game.id),
          homePlayers: this.playerService.getPlayersByTeam(game.homeTeamId),
          awayPlayers: this.playerService.getPlayersByTeam(game.awayTeamId),
          homeGoalies: this.goalieService.getGoaliesByTeam(game.homeTeamId),
          awayGoalies: this.goalieService.getGoaliesByTeam(game.awayTeamId)
        }).subscribe({
          next: ({ liveData, homePlayers, awayPlayers, homeGoalies, awayGoalies }) => {
            const playerMap = new Map<number, string>();
            [...homePlayers, ...awayPlayers].forEach(p => playerMap.set(parseInt(p.id), `${p.firstName} ${p.lastName}`));
            const goalieMap = new Map<number, string>();
            [...homeGoalies, ...awayGoalies].forEach(g => goalieMap.set(parseInt(g.id), `${g.firstName} ${g.lastName}`));

            game.events = (liveData.events || []).map(event => ({ ...event, date: (liveData as any).date }));
            game.playerNameMap = playerMap;
            game.goalieNameMap = goalieMap;
            game.loaded = true;
            game.loading = false;
          },
          error: () => {
            game.events = [];
            game.loaded = true;
            game.loading = false;
          }
        });
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }

  private parseTimeToMinutesSeconds(timeStr: string): string {
    // Handles HH:mm:ss(.SSS)Z? format; converts to M:SS with hours rolled into minutes
    const m = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return timeStr;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ss = parseInt(m[3], 10);
    const totalMin = hh * 60 + mm;
    const ssStr = ss < 10 ? `0${ss}` : `${ss}`;
    return `${totalMin}:${ssStr}`;
  }

  timeOf(game: GameListItem, ev: LiveGameEvent): string {
    return this.parseTimeToMinutesSeconds(ev.time?.toString() || '00:00:00');
  }

  teamNameOf(game: GameListItem, ev: LiveGameEvent): string {
    return this.teamNameMap.get(ev.team_id) || 'Unknown Team';
  }

  eventTextOf(ev: LiveGameEvent): string {
    const name = this.eventNameMap.get(ev.event_name_id) || `Event ${ev.event_name_id}`;
    return name.toUpperCase();
  }

  playerNameOf(game: GameListItem, ev: LiveGameEvent): string {
    const pid = ev.player_id;
    if (!pid) return '';
    return game.playerNameMap?.get(pid) || game.goalieNameMap?.get(pid) || '';
  }

  descriptionOf(ev: LiveGameEvent): string {
    return ev.note || ev.goal_type || '';
  }

  private timeToSeconds(timeStr: string): number {
    // Expect HH:mm:ss(.SSS)?Z?; fallback to 0 if invalid
    const m = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return 0;
    const hh = parseInt(m[1], 10) || 0;
    const mm = parseInt(m[2], 10) || 0;
    const ss = parseInt(m[3], 10) || 0;
    return hh * 3600 + mm * 60 + ss;
  }

  isEventSelected(gameEventId: number): boolean {
    return this.selectedEvents().some(e => e.gameEventId === gameEventId);
  }

  onEventClick(game: GameListItem, ev: LiveGameEvent): void {
    if (this.isEventSelected(ev.id)) {
      // Remove from selected
      const updated = this.selectedEvents().filter(e => e.gameEventId !== ev.id);
      this.selectedEvents.set(updated);
    } else {
      // Add to selected
      const periodLabel = ev.period_id ? `P${ev.period_id}` : 'P?';
      const timeLabel = this.timeOf(game, ev);
      const newSelection = {
        id: this.nextSelectedEventId++,
        gameEventId: ev.id,
        eventName: this.eventTextOf(ev),
        description: this.descriptionOf(ev) || this.playerNameOf(game, ev),
        date: (ev as any).date?.toString() || new Date().toISOString().split('T')[0],
        periodTime: `${periodLabel} / ${timeLabel}`,
        gameLabel: game.label
      };
      this.selectedEvents.set([...this.selectedEvents(), newSelection]);
    }
  }

  removeSelectedEvent(id: number): void {
    const updated = this.selectedEvents().filter(e => e.id !== id);
    this.selectedEvents.set(updated);
  }

  groupedEvents(game: GameListItem): Array<{ header?: string; ev?: LiveGameEvent }> {
    if (!game.events || game.events.length === 0) return [];
    const byPeriod = new Map<number, LiveGameEvent[]>();
    for (const ev of game.events) {
      const p = ev.period_id || 0;
      if (!byPeriod.has(p)) byPeriod.set(p, []);
      byPeriod.get(p)!.push(ev);
    }
    const sortedPeriodIds = Array.from(byPeriod.keys()).sort((a, b) => a - b);
    const out: Array<{ header?: string; ev?: LiveGameEvent }> = [];
    for (const pid of sortedPeriodIds) {
      const label = pid ? `Period ${pid}` : 'Period';
      out.push({ header: label });
      const arr = byPeriod.get(pid)!;
      arr.sort((a, b) => this.timeToSeconds((a.time || '').toString()) - this.timeToSeconds((b.time || '').toString()));
      for (const ev of arr) out.push({ ev });
    }
    return out;
  }
  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const payload: HighlightReelUpsertPayload = {
      name: this.form.value.name || '',
      description: this.form.value.description || ''
    };
    this.dialogRef.close(payload);
  }
}
