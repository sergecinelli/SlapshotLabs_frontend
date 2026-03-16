import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { getFieldError } from '../../validators/form-error.util';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../../services/api.service';
import { ScheduleService, DashboardGame } from '../../../services/schedule.service';
import { TeamService } from '../../../services/team.service';
import { Team } from '../../interfaces/team.interface';
import { Player, PlayerApiOutData } from '../../interfaces/player.interface';
import { Goalie, GoalieApiOutData } from '../../interfaces/goalie.interface';
import { PlayerService } from '../../../services/player.service';
import { GoalieService } from '../../../services/goalie.service';
import { LiveGameService, GameEvent as LiveGameEvent } from '../../../services/live-game.service';
import { GameEventNameService, GameEventName } from '../../../services/game-event-name.service';
import { GameMetadataService, GamePeriodResponse } from '../../../services/game-metadata.service';
import { HighlightsService } from '../../../services/highlights.service';
import { HighlightReelUpsertPayload } from '../../interfaces/highlight-reel.interface';
import { CustomHighlightModal, CustomHighlightFormResult } from './custom-highlight.modal';
import { environment } from '../../../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { convertLocalToGMT, convertGMTToLocal } from '../../utils/time-converter.util';
import { CachedSrcDirective } from '../../directives/cached-src.directive';
import { CustomMultiSelectComponent } from '../custom-multi-select/custom-multi-select.component';
import { SelectOptionGroup } from '../custom-select/custom-select.component';

export interface HighlightReelFormModalData {
  isEditMode: boolean;
  reel?: { id: number; name: string; description: string };
  teams?: Team[];
  players?: PlayerApiOutData[];
  goalies?: GoalieApiOutData[];
  eventNames?: GameEventName[];
  gamePeriods?: GamePeriodResponse[];
  games?: DashboardGame[];
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
  imports: [
    CachedSrcDirective,
    ReactiveFormsModule,
    ButtonComponent,
    ButtonLoadingComponent,
    FormFieldComponent,
    MatExpansionModule,
    LoadingSpinnerComponent,
    DragDropModule,
    CustomMultiSelectComponent,
  ],
  templateUrl: './highlight-reel-form.modal.html',
  styleUrl: './highlight-reel-form.modal.scss',
})
export class HighlightReelFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private apiService = inject(ApiService);
  private scheduleService = inject(ScheduleService);
  private teamService = inject(TeamService);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private liveGameService = inject(LiveGameService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private highlightsService = inject(HighlightsService);
  data = inject(ModalService).getModalData<HighlightReelFormModalData>();

  form: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  playerOptionGroups = signal<SelectOptionGroup[]>([]);
  selectedPlayerIds = signal<string[]>([]);

  games = signal<GameListItem[]>([]);
  selectedEvents = signal<
    {
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
    }[]
  >([]);
  private eventNameMap = new Map<number, string>();
  private teamNameMap = new Map<number, string>();
  private periodNameMap = new Map<number, string>();
  private periodOrderMap = new Map<number, number>();
  private nextSelectedEventId = 1;
  isSubmitting = signal(false);

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.form = this.fb.group({
      name: [this.data.reel?.name || '', [Validators.required, Validators.maxLength(200)]],
      description: [this.data.reel?.description || '', [Validators.maxLength(1000)]],
    });

    this.modalService.registerDirtyCheck(() => this.form.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
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
          .map((highlight) => {
            // Convert GMT time from API to local time for display
            let localDate = highlight.date;
            let localTime = highlight.time;

            if (highlight.is_custom && highlight.date && highlight.time) {
              // For custom highlights, convert GMT to local time
              const localDateTime = convertGMTToLocal(highlight.date, highlight.time);
              localDate = localDateTime.date;
              localTime = localDateTime.time;
            }

            return {
              id: this.nextSelectedEventId++,
              gameEventId: highlight.game_event_id,
              highlightId: highlight.id,
              is_custom: highlight.is_custom,
              eventName: highlight.event_name || '',
              description: highlight.note || '-',
              date: localDate, // Use local date for display
              periodTime: localTime, // Use local time for display
              gameLabel: '', // Not available from highlight data
              youtubeLink: highlight.youtube_link,
              customTime: localTime, // Store local time for editing
              fullEvent: {
                id: highlight.game_event_id,
                event_name_id: 0,
                note: highlight.note,
                youtube_link: highlight.youtube_link,
                time: highlight.time, // Keep original GMT time
                date: highlight.date, // Keep original GMT date
              } as LiveGameEvent,
            };
          });

        this.selectedEvents.set(selectedItems);
      },
      error: (error) => {
        console.error('Error loading existing highlights:', error);
      },
    });
  }

  private loadStaticData(): void {
    this.isLoading = true;

    if (this.data.teams && this.data.eventNames && this.data.gamePeriods && this.data.games) {
      this.applyStaticData(
        this.data.teams,
        this.data.eventNames,
        this.data.gamePeriods,
        this.data.games,
        this.data.players || [],
        this.data.goalies || []
      );
      return;
    }

    forkJoin({
      teams: this.teamService.getTeams(),
      players: this.apiService.get<PlayerApiOutData[]>('/hockey/player/list'),
      goalies: this.apiService.get<GoalieApiOutData[]>('/hockey/goalie/list'),
      eventNames: this.gameEventNameService.getGameEventNames(),
      gamePeriods: this.gameMetadataService.getGamePeriods(),
      games: this.scheduleService.getGameList(),
    }).subscribe({
      next: ({ teams, players, goalies, eventNames, gamePeriods, games }) => {
        this.applyStaticData(teams.teams, eventNames, gamePeriods, games, players, goalies);
      },
      error: () => {
        this.games.set([]);
        this.isLoading = false;
      },
    });
  }

  private applyStaticData(
    teams: Team[],
    eventNames: GameEventName[],
    gamePeriods: GamePeriodResponse[],
    games: DashboardGame[],
    players: PlayerApiOutData[],
    goalies: GoalieApiOutData[]
  ): void {
    teams.forEach((t) => this.teamNameMap.set(parseInt(t.id), t.name));
    eventNames.forEach((n) => this.eventNameMap.set(n.id, n.name));
    gamePeriods.forEach((p) => {
      this.periodNameMap.set(p.id, p.name);
      this.periodOrderMap.set(p.id, p.order ?? p.id);
    });

    this.buildPlayerOptionGroups(players, goalies);

    const items: GameListItem[] = games.map((g) => ({
      id: g.id,
      label: `${this.teamNameMap.get(g.away_team_id) || 'Away'} vs. ${this.teamNameMap.get(g.home_team_id) || 'Home'}`,
      homeTeamId: g.home_team_id,
      awayTeamId: g.away_team_id,
      loaded: false,
      loading: false,
      events: [],
    }));
    this.games.set(items);
    this.isLoading = false;
  }

  private buildPlayerOptionGroups(
    players: PlayerApiOutData[],
    goalies: GoalieApiOutData[]
  ): void {
    const playerOptions = players.map((p) => ({
      value: String(p.id),
      label: `${p.first_name} ${p.last_name}`,
      prefix: `#${p.number}`,
    }));
    const goalieOptions = goalies.map((g) => ({
      value: String(g.id),
      label: `${g.first_name} ${g.last_name}`,
      prefix: `#${g.number}`,
    }));

    const groups: SelectOptionGroup[] = [];
    if (playerOptions.length > 0) {
      groups.push({ label: 'Players', options: playerOptions });
    }
    if (goalieOptions.length > 0) {
      groups.push({ label: 'Goalies', options: goalieOptions });
    }
    this.playerOptionGroups.set(groups);
  }

  onPanelOpened(game: GameListItem): void {
    if (game.loading) return;
    if (game.loaded && this.selectedPlayerIds().length === 0) return;

    this.loadGameEvents(game);
  }

  onPlayerSelectionChange(playerIds: string[]): void {
    this.selectedPlayerIds.set(playerIds);

    const loadedGames = this.games().filter((g) => g.loaded);
    for (const game of loadedGames) {
      this.loadGameEvents(game);
    }
  }

  private getSelectedPlayerIdsAsNumbers(): number[] {
    return this.selectedPlayerIds().map((id) => parseInt(id, 10));
  }

  private loadGameEvents(game: GameListItem): void {
    this.updateGame(game.id, { loading: true });

    const playerIds = this.getSelectedPlayerIdsAsNumbers();

    forkJoin({
      events: this.liveGameService.getGameEvents(
        game.id,
        playerIds.length > 0 ? playerIds : undefined
      ),
      homePlayers: game.playerNameMap
        ? of([] as Player[])
        : this.playerService.getPlayersByTeam(game.homeTeamId),
      awayPlayers: game.playerNameMap
        ? of([] as Player[])
        : this.playerService.getPlayersByTeam(game.awayTeamId),
      homeGoalies: game.goalieNameMap
        ? of([] as Goalie[])
        : this.goalieService.getGoaliesByTeam(game.homeTeamId),
      awayGoalies: game.goalieNameMap
        ? of([] as Goalie[])
        : this.goalieService.getGoaliesByTeam(game.awayTeamId),
      gameData: this.scheduleService.getGameList(),
    }).subscribe({
      next: ({ events, homePlayers, awayPlayers, homeGoalies, awayGoalies, gameData }) => {
        const playerNameMap =
          game.playerNameMap ??
          new Map(
            [...(homePlayers as Player[]), ...(awayPlayers as Player[])].map((p) => [
              parseInt(p.id),
              `${p.firstName} ${p.lastName}`,
            ])
          );
        const goalieNameMap =
          game.goalieNameMap ??
          new Map(
            [...(homeGoalies as Goalie[]), ...(awayGoalies as Goalie[])].map((g) => [
              parseInt(g.id),
              `${g.firstName} ${g.lastName}`,
            ])
          );

        const currentGame = gameData.find((g) => g.id === game.id);
        const gameDate = currentGame?.date || new Date().toISOString().split('T')[0];

        this.updateGame(game.id, {
          events: events.map((event) => ({ ...event, date: gameDate })),
          playerNameMap,
          goalieNameMap,
          loaded: true,
          loading: false,
        });
      },
      error: () => {
        this.updateGame(game.id, { events: [], loaded: true, loading: false });
      },
    });
  }

  private updateGame(gameId: number, patch: Partial<GameListItem>): void {
    this.games.update((list) =>
      list.map((g) => (g.id === gameId ? { ...g, ...patch } : g))
    );
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
    return this.selectedEvents().some((e) => e.gameEventId === gameEventId);
  }

  onEventClick(game: GameListItem, ev: LiveGameEvent): void {
    if (this.isEventSelected(ev.id)) {
      // Remove from selected
      const updated = this.selectedEvents().filter((e) => e.gameEventId !== ev.id);
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
        date:
          (ev as LiveGameEvent & { date?: string }).date?.toString() ||
          new Date().toISOString().split('T')[0],
        periodTime: `${periodName} / ${timeLabel}`,
        gameLabel: game.label,
        fullEvent: ev,
      };
      this.selectedEvents.set([...this.selectedEvents(), newSelection]);
    }
  }

  removeSelectedEvent(id: number): void {
    const updated = this.selectedEvents().filter((e) => e.id !== id);
    this.selectedEvents.set(updated);
  }

  onSelectedEventDrop(
    event: CdkDragDrop<
      {
        id: number;
        gameEventId?: number;
        highlightId?: number;
        is_custom?: boolean;
        eventName?: string;
        description?: string;
        date?: string | undefined;
        periodTime?: string;
        gameLabel?: string;
        youtubeLink?: string;
        customTime?: string;
        fullEvent: LiveGameEvent;
      }[]
    >
  ): void {
    const items = [...this.selectedEvents()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.selectedEvents.set(items);
  }

  groupedEvents(game: GameListItem): { header?: string; ev?: LiveGameEvent }[] {
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

    const out: { header?: string; ev?: LiveGameEvent }[] = [];
    for (const pid of sortedPeriodIds) {
      const label = this.periodNameMap.get(pid) || (pid ? `Period ${pid}` : 'Period');
      out.push({ header: label });
      const arr = byPeriod.get(pid)!;
      for (const ev of arr) out.push({ ev });
    }
    return out;
  }
  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
    name: 'Name',
    description: 'Description',
  };

  getErrorMessage(fieldName: string): string {
    return getFieldError(this.form.get(fieldName), this.fieldLabels[fieldName] || fieldName);
  }

  openAddCustomHighlightModal(): void {
    this.modalService.openModal(CustomHighlightModal, {
      name: 'Custom Highlight',
      icon: 'movie',
      width: '460px',
      maxWidth: '95vw',
      onCloseWithData: (result: CustomHighlightFormResult) => {
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
            time: result.gmtTime,
            date: result.gmtDate,
          } as LiveGameEvent,
        };
        this.selectedEvents.set([...this.selectedEvents(), newSelection]);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    // Build highlights array from selected events with proper order
    const highlights = this.selectedEvents().map((selectedEvent, index) => {
      // Custom highlights: send all fields except game_event_id
      if (selectedEvent.is_custom) {
        // Use GMT values from fullEvent (stored when creating/editing)
        // If not available (old data), convert local time to GMT
        let gmtDate = selectedEvent.fullEvent.date;
        let gmtTime = selectedEvent.fullEvent.time;

        if (!gmtDate || !gmtTime || !gmtTime.includes(':')) {
          // Fallback: convert local date/time to GMT
          let time24Hour = selectedEvent.customTime || '';
          if (time24Hour && time24Hour.split(':').length === 2) {
            time24Hour = `${time24Hour}:00`;
          }
          const gmtDateTime = convertLocalToGMT(selectedEvent.date || '', time24Hour);
          gmtDate = gmtDateTime.date;
          gmtTime = `${gmtDateTime.time}.000Z`;
        } else if (!gmtTime.endsWith('Z') && !gmtTime.includes('.')) {
          // Ensure time is in HH:mm:ss.sssZ format
          gmtTime = this.formatTimeForApi(gmtTime);
        }

        return {
          ...(this.isEditMode && selectedEvent.highlightId
            ? { id: selectedEvent.highlightId }
            : {}),
          is_custom: true,
          event_name: selectedEvent.eventName || '',
          note: selectedEvent.description || '',
          youtube_link: selectedEvent.youtubeLink || '',
          date: gmtDate,
          time: gmtTime,
          order: index,
        };
      }

      // Non-custom highlights: only send minimal fields
      const ev = selectedEvent.fullEvent;
      return {
        ...(this.isEditMode && selectedEvent.highlightId ? { id: selectedEvent.highlightId } : {}),
        game_event_id: ev.id,
        order: index,
      };
    });

    const payload: HighlightReelUpsertPayload = {
      name: this.form.value.name || '',
      description: this.form.value.description || '',
      highlights: highlights,
    };
    this.isSubmitting.set(true);
    this.modalService.closeWithDataProcessing(payload);
  }
}
