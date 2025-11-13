import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ScheduleService } from '../../../services/schedule.service';
import { TeamService } from '../../../services/team.service';
import { PlayerService } from '../../../services/player.service';
import { GoalieService } from '../../../services/goalie.service';
import { LiveGameService, GameEvent as LiveGameEvent } from '../../../services/live-game.service';
import { GameEventNameService } from '../../../services/game-event-name.service';
import { GameMetadataService, GamePeriodResponse } from '../../../services/game-metadata.service';
import { HighlightsService } from '../../../services/highlights.service';
import { HighlightReelUpsertPayload, HighlightApi } from '../../interfaces/highlight-reel.interface';
import { CustomHighlightModalComponent, CustomHighlightFormResult } from './custom-highlight-modal';
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
    DragDropModule,
  ],
  templateUrl: './highlight-reel-form-modal.html',
  styleUrl: './highlight-reel-form-modal.scss'
})
export class HighlightReelFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<HighlightReelFormModalComponent>>(MatDialogRef);
  private dialog = inject(MatDialog);
  private scheduleService = inject(ScheduleService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private liveGameService = inject(LiveGameService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private highlightsService = inject(HighlightsService);
  data = inject<HighlightReelFormModalData>(MAT_DIALOG_DATA);

  form: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  games = signal<GameListItem[]>([]);
  selectedEvents = signal<Array<{
    id: number;
    gameEventId?: number;
    highlightId?: number; // existing highlight id when editing
    is_custom?: boolean;
    eventName?: string;
    description?: string;
    date?: string | undefined;
    periodTime?: string;
    gameLabel?: string;
    youtubeLink?: string;
    customTime?: string; // raw time from custom form (e.g., HH:mm or HH:mm:ss)
    // Full event data for payload
    fullEvent: LiveGameEvent;
  }>>([]);
  private eventNameMap = new Map<number, string>();
  private teamNameMap = new Map<number, string>();
  private periodNameMap = new Map<number, string>();
  private periodOrderMap = new Map<number, number>();
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
    
    // Load existing highlights in edit mode
    if (this.isEditMode && this.data.reel?.id) {
      this.loadExistingHighlights();
    }
  }

  private loadExistingHighlights(): void {
    if (!this.data.reel?.id) return;
    
    this.highlightsService.getHighlights(this.data.reel.id).subscribe({
      next: (highlights) => {
        // Convert existing highlights to selected events format
        const selectedItems = highlights
          .sort((a, b) => a.order - b.order)
          .map((highlight) => ({
            id: this.nextSelectedEventId++,
            gameEventId: highlight.game_event_id,
            highlightId: highlight.id,
            is_custom: highlight.is_custom,
            eventName: highlight.event_name || '',
            description: highlight.note || '-',
            date: highlight.date,
            periodTime: highlight.time, // display raw
            gameLabel: '', // Not available from highlight data
            youtubeLink: highlight.youtube_link,
            customTime: highlight.time,
            fullEvent: {
              id: highlight.game_event_id,
              event_name_id: 0,
              note: highlight.note,
              youtube_link: highlight.youtube_link,
              time: highlight.time,
              date: highlight.date,
            } as LiveGameEvent
          }));
        
        this.selectedEvents.set(selectedItems);
      },
      error: (error) => {
        console.error('Error loading existing highlights:', error);
      }
    });
  }

  private loadStaticData(): void {
    // Load teams, event names, and game periods
    this.isLoading = true;
    this.teamService.getTeams().subscribe({
      next: (teamsResp) => {
        (teamsResp.teams || []).forEach((t: any) => this.teamNameMap.set(parseInt(t.id), t.name));
        this.gameEventNameService.getGameEventNames().subscribe({
          next: (names) => {
            names.forEach(n => this.eventNameMap.set(n.id, n.name));
            this.loadGamePeriods();
          },
          error: () => {
            this.loadGamePeriods();
          }
        });
      },
      error: () => {
        this.loadGamePeriods();
      }
    });
  }

  private loadGamePeriods(): void {
    this.gameMetadataService.getGamePeriods().subscribe({
      next: (periods) => {
        periods.forEach(p => {
          this.periodNameMap.set(p.id, p.name);
          this.periodOrderMap.set(p.id, p.order ?? p.id);
        });
        this.loadGames();
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
      awayGoalies: this.goalieService.getGoaliesByTeam(game.awayTeamId),
      gameData: this.scheduleService.getGameList()
    }).subscribe({
      next: ({ liveData, homePlayers, awayPlayers, homeGoalies, awayGoalies, gameData }) => {
        const playerMap = new Map<number, string>();
        [...homePlayers, ...awayPlayers].forEach(p => playerMap.set(parseInt(p.id), `${p.firstName} ${p.lastName}`));
        const goalieMap = new Map<number, string>();
        [...homeGoalies, ...awayGoalies].forEach(g => goalieMap.set(parseInt(g.id), `${g.firstName} ${g.lastName}`));

        // Get the game date from the schedule
        const currentGame = gameData.find(g => g.id === game.id);
        const gameDate = currentGame?.date || new Date().toISOString().split('T')[0];

        // Add date to each event
        game.events = (liveData.events || []).map(event => ({ 
          ...event, 
          date: gameDate 
        }));
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

  private formatTimeForApi(timeStr: string): string {
    // Convert time to HH:MM:SS.sssZ format
    // Handle inputs like "10:06" -> "00:10:06.000Z"
    // Handle inputs like "20:45:56.127" -> "20:45:56.127Z"
    
    if (!timeStr) {
      return '00:00:00.000Z';
    }

    // If already in correct format (ends with Z), return as-is
    if (timeStr.match(/^\d{2}:\d{2}:\d{2}\.\d{3}Z$/)) {
      return timeStr;
    }

    // Parse the time string
    const parts = timeStr.split(':');
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let milliseconds = 0;

    if (parts.length === 2) {
      // Format: MM:SS
      minutes = parseInt(parts[0], 10) || 0;
      const secParts = parts[1].split('.');
      seconds = parseInt(secParts[0], 10) || 0;
      milliseconds = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').substring(0, 3), 10) : 0;
    } else if (parts.length === 3) {
      // Format: HH:MM:SS or HH:MM:SS.sss
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
      const secParts = parts[2].replace('Z', '').split('.');
      seconds = parseInt(secParts[0], 10) || 0;
      milliseconds = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').substring(0, 3), 10) : 0;
    }

    // Format as HH:MM:SS.sssZ
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    const sss = milliseconds.toString().padStart(3, '0');

    return `${hh}:${mm}:${ss}.${sss}Z`;
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
      const periodName = this.periodNameMap.get(ev.period_id) || `Period ${ev.period_id}`;
      const timeLabel = this.timeOf(game, ev);
      const newSelection = {
        id: this.nextSelectedEventId++,
        gameEventId: ev.id,
        eventName: this.eventTextOf(ev),
        description: this.descriptionOf(ev) || this.playerNameOf(game, ev),
        date: (ev as any).date?.toString() || new Date().toISOString().split('T')[0],
        periodTime: `${periodName} / ${timeLabel}`,
        gameLabel: game.label,
        fullEvent: ev
      };
      this.selectedEvents.set([...this.selectedEvents(), newSelection]);
    }
  }

  removeSelectedEvent(id: number): void {
    const updated = this.selectedEvents().filter(e => e.id !== id);
    this.selectedEvents.set(updated);
  }

  onSelectedEventDrop(event: CdkDragDrop<any[]>): void {
    const items = [...this.selectedEvents()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.selectedEvents.set(items);
  }

  groupedEvents(game: GameListItem): Array<{ header?: string; ev?: LiveGameEvent }> {
    if (!game.events || game.events.length === 0) return [];
    const byPeriod = new Map<number, LiveGameEvent[]>();
    for (const ev of game.events) {
      const p = ev.period_id || 0;
      if (!byPeriod.has(p)) byPeriod.set(p, []);
      byPeriod.get(p)!.push(ev);
    }
    
    // Sort periods by their order from the API
    const sortedPeriodIds = Array.from(byPeriod.keys()).sort((a, b) => {
      const orderA = this.periodOrderMap.get(a) ?? a;
      const orderB = this.periodOrderMap.get(b) ?? b;
      return orderA - orderB;
    });
    
    const out: Array<{ header?: string; ev?: LiveGameEvent }> = [];
    for (const pid of sortedPeriodIds) {
      const label = this.periodNameMap.get(pid) || (pid ? `Period ${pid}` : 'Period');
      out.push({ header: label });
      const arr = byPeriod.get(pid)!;
      for (const ev of arr) out.push({ ev });
    }
    return out;
  }
  onCancel(): void {
    this.dialogRef.close();
  }

  openAddCustomHighlightModal(): void {
    const dialogRef = this.dialog.open<CustomHighlightModalComponent, undefined, CustomHighlightFormResult>(CustomHighlightModalComponent, {
      width: '460px',
      maxWidth: '95vw',
      autoFocus: true,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const newSelection = {
        id: this.nextSelectedEventId++,
        gameEventId: 0,
        is_custom: true,
        eventName: result.name,
        description: result.description,
        date: result.date,
        periodTime: result.time,
        gameLabel: 'Custom',
        youtubeLink: result.youtube_link,
        customTime: result.time,
        fullEvent: {
          id: 0,
          event_name_id: 0,
          note: result.description,
          youtube_link: result.youtube_link,
          time: result.time,
          date: result.date,
        } as LiveGameEvent,
      };
      this.selectedEvents.set([...this.selectedEvents(), newSelection]);
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    
    // Build highlights array from selected events with proper order
    const highlights = this.selectedEvents().map((selectedEvent, index) => {
      // Custom highlights: send all fields except game_event_id
      if (selectedEvent.is_custom) {
        return {
          ...(this.isEditMode && selectedEvent.highlightId ? { id: selectedEvent.highlightId } : {}),
          is_custom: true,
          event_name: selectedEvent.eventName || '',
          note: selectedEvent.description || '',
          youtube_link: selectedEvent.youtubeLink || '',
          date: selectedEvent.date || '',
          time: this.formatTimeForApi((selectedEvent.customTime || '').toString()),
          order: index
        };
      }

      // Non-custom highlights: only send minimal fields
      const ev = selectedEvent.fullEvent;
      return {
        ...(this.isEditMode && selectedEvent.highlightId ? { id: selectedEvent.highlightId } : {}),
        game_event_id: ev.id,
        order: index
      } as any;
    });

    const payload: HighlightReelUpsertPayload = {
      name: this.form.value.name || '',
      description: this.form.value.description || '',
      highlights: highlights as any
    };
    this.dialogRef.close(payload);
  }
}
