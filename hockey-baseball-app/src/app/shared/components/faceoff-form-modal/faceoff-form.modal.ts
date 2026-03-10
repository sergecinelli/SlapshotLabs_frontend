import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { youtubeUrlValidator } from '../../validators/url.validator';
import { getFieldError, GAME_TIME_PATTERN_ERROR } from '../../validators/form-error.util';
import { CardGridItemComponent } from '../card-grid/card-grid-item.component';
import {
  LocationSelectorComponent,
  PuckLocation,
  Team,
} from '../location-selector/location-selector.component';
import { FaceoffEventRequest } from '../../../services/game-event.service';
import { environment } from '../../../../environments/environment';
import { CachedSrcDirective } from '../../directives/cached-src.directive';

export interface FaceoffFormData {
  winnerTeamLogo: string;
  winnerTeamName: string;
  winnerPlayerName: string;
  loserTeamLogo: string;
  loserTeamName: string;
  loserPlayerName: string;
  period: string;
  time: string;
  location?: PuckLocation;
  youtubeLink?: string;
}

@Component({
  selector: 'app-faceoff-form-modal',
  imports: [
    CachedSrcDirective,
    ReactiveFormsModule,
    ButtonComponent,
    ButtonLoadingComponent,
    SectionHeaderComponent,
    FormFieldComponent,
    CardGridComponent,
    CardGridItemComponent,
    LocationSelectorComponent,
  ],
  templateUrl: './faceoff-form.modal.html',
  styleUrl: './faceoff-form.modal.scss',
})
export class FaceoffFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private dialogData = inject(ModalService).getModalData<{
    gameId: number;
    faceoffEventId: number;
    periodOptions?: { value: number; label: string }[];
    teamOptions?: { value: number; label: string; logo?: string }[];
    playerOptions?: { value: number; label: string; teamId: number; number?: number }[];
    // Edit mode fields
    isEditMode?: boolean;
    eventId?: number;
    existingData?: {
      periodId?: number;
      time?: string;
      winnerTeamId?: number;
      winnerPlayerId?: number;
      loserPlayerId?: number;
      zone?: string;
      youtubeLink?: string;
      iceTopOffset?: number;
      iceLeftOffset?: number;
      isFaceoffWon?: boolean;
    };
  }>();

  gameId: number;
  faceoffEventId: number;
  isEditMode = false;
  eventId?: number;

  faceoffForm: FormGroup;
  puckLocation: PuckLocation | null = null;

  teamOptions: { value: number; label: string; logo?: string }[] = [];
  winnerPlayerOptions: { value: number; label: string; number?: number }[] = [];
  loserPlayerOptions: { value: number; label: string; number?: number }[] = [];
  periodOptions: { value: number; label: string }[] = [];

  isSubmitting = signal(false);

  constructor() {
    this.faceoffForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.faceoffEventId = this.dialogData.faceoffEventId;
    this.isEditMode = this.dialogData.isEditMode || false;
    this.eventId = this.dialogData.eventId;
    this.setupTeamChangeListeners();

    this.modalService.registerDirtyCheck(() => this.faceoffForm.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.teamOptions = this.dialogData.teamOptions ?? [];
    this.periodOptions = this.dialogData.periodOptions ?? [];

    if (this.isEditMode && this.dialogData.existingData) {
      const existing = this.dialogData.existingData;

      if (
        existing.iceTopOffset !== undefined &&
        existing.iceLeftOffset !== undefined &&
        existing.zone
      ) {
        this.puckLocation = {
          x: existing.iceLeftOffset,
          y: existing.iceTopOffset,
          zone: (existing.zone as 'defending' | 'neutral' | 'attacking') ?? 'defending',
        };
      }

      const loserTeam = this.teamOptions.find((t) => t.value !== existing.winnerTeamId);

      this.faceoffForm.patchValue({
        winnerTeam: existing.winnerTeamId,
        loserTeam: loserTeam?.value,
        winnerPlayer: existing.winnerPlayerId,
        loserPlayer: existing.loserPlayerId,
        period: existing.periodId,
        time: existing.time,
        location: existing.zone,
        youtubeLink: existing.youtubeLink || '',
      });

      if (existing.winnerTeamId) {
        this.filterPlayersForTeam(existing.winnerTeamId, 'winner');
      }
      if (loserTeam) {
        this.filterPlayersForTeam(loserTeam.value, 'loser');
      }
    } else {
      if (this.teamOptions.length > 1) {
        this.faceoffForm.patchValue({
          winnerTeam: this.teamOptions[0].value,
          loserTeam: this.teamOptions[1].value,
        });
        this.filterPlayersForTeam(this.teamOptions[0].value, 'winner');
        this.filterPlayersForTeam(this.teamOptions[1].value, 'loser');
      }
      if (this.periodOptions.length > 0) {
        this.faceoffForm.patchValue({ period: this.periodOptions[0].value });
      }
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      winnerTeam: ['', Validators.required],
      winnerPlayer: ['', Validators.required],
      loserTeam: ['', Validators.required],
      loserPlayer: ['', Validators.required],
      period: ['', Validators.required],
      time: [
        '',
        [Validators.required, Validators.pattern(/^([0-9]{1,2}|1[0-9][0-9]|200):([0-5][0-9])$/)],
      ],
      location: [''],
      youtubeLink: ['', [youtubeUrlValidator]],
    });
  }

  private filterPlayersForTeam(teamId: number, teamType: 'winner' | 'loser'): void {
    const filteredPlayers = (this.dialogData.playerOptions ?? [])
      .filter((player) => player.teamId === teamId)
      .map((player) => ({
        value: player.value,
        label: player.label,
        number: player.number,
      }));

    if (teamType === 'winner') {
      this.winnerPlayerOptions = filteredPlayers;
      if (this.winnerPlayerOptions.length > 0) {
        this.faceoffForm.patchValue({ winnerPlayer: this.winnerPlayerOptions[0].value });
      } else {
        this.faceoffForm.patchValue({ winnerPlayer: '' });
      }
    } else {
      this.loserPlayerOptions = filteredPlayers;
      if (this.loserPlayerOptions.length > 0) {
        this.faceoffForm.patchValue({ loserPlayer: this.loserPlayerOptions[0].value });
      } else {
        this.faceoffForm.patchValue({ loserPlayer: '' });
      }
    }
  }

  private setupTeamChangeListeners(): void {
    this.faceoffForm.get('winnerTeam')?.valueChanges.subscribe((winnerTeam) => {
      const loserTeam = this.teamOptions.find((t) => t.value !== winnerTeam);
      if (loserTeam) {
        this.faceoffForm.patchValue({ loserTeam: loserTeam.value }, { emitEvent: false });
        this.filterPlayersForTeam(loserTeam.value, 'loser');
      }
      this.filterPlayersForTeam(winnerTeam, 'winner');
    });

    this.faceoffForm.get('loserTeam')?.valueChanges.subscribe((loserTeam) => {
      const winnerTeam = this.teamOptions.find((t) => t.value !== loserTeam);
      if (winnerTeam) {
        this.faceoffForm.patchValue({ winnerTeam: winnerTeam.value }, { emitEvent: false });
        this.filterPlayersForTeam(winnerTeam.value, 'winner');
      }
      this.filterPlayersForTeam(loserTeam, 'loser');
    });
  }

  selectWinnerTeam(teamValue: number): void {
    this.faceoffForm.patchValue({ winnerTeam: teamValue });
    this.faceoffForm.get('winnerTeam')?.markAsTouched();
  }

  selectWinnerPlayer(playerValue: number): void {
    this.faceoffForm.patchValue({ winnerPlayer: playerValue });
    this.faceoffForm.get('winnerPlayer')?.markAsTouched();
  }

  selectLoserTeam(teamValue: number): void {
    this.faceoffForm.patchValue({ loserTeam: teamValue });
    this.faceoffForm.get('loserTeam')?.markAsTouched();
  }

  selectLoserPlayer(playerValue: number): void {
    this.faceoffForm.patchValue({ loserPlayer: playerValue });
    this.faceoffForm.get('loserPlayer')?.markAsTouched();
  }

  selectPeriod(periodValue: number): void {
    this.faceoffForm.patchValue({ period: periodValue });
    this.faceoffForm.get('period')?.markAsTouched();
  }

  onLocationChange(location: PuckLocation | null): void {
    this.puckLocation = location;
    if (location) {
      this.faceoffForm.patchValue({ location: location.zone });
    }
  }

  onSubmit(): void {
    if (this.faceoffForm.valid) {
      this.isSubmitting.set(true);
      const formValue = this.faceoffForm.value;

      // Convert mm:ss to time-of-day like shots (HH:mm:ss.SSSZ with 00 hours)
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const tmp = new Date(Date.UTC(1970, 0, 1, 0, minutes, seconds, 0));
      const iso = tmp.toISOString();
      const timeOfDay = iso.substring(iso.indexOf('T') + 1);

      const requestData: FaceoffEventRequest = {
        game_id: this.gameId,
        event_name_id: this.faceoffEventId,
        team_id: formValue.winnerTeam,
        player_id: formValue.winnerPlayer,
        player_2_id: formValue.loserPlayer,
        period_id: formValue.period,
        time: timeOfDay,
        youtube_link: formValue.youtubeLink || undefined,
        ice_top_offset: this.puckLocation?.y as number | undefined,
        ice_left_offset: this.puckLocation?.x as number | undefined,
        zone: this.puckLocation?.zone,
      };

      this.modalService.closeWithDataProcessing({
        isEditMode: this.isEditMode,
        eventId: this.eventId,
        requestData,
      });
    } else if (!this.faceoffForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.faceoffForm.controls).forEach((key) => {
        this.faceoffForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
    winnerTeam: 'Faceoff Winner Team',
    winnerPlayer: 'Faceoff Winner Player',
    loserTeam: 'Faceoff Loser Team',
    loserPlayer: 'Faceoff Loser Player',
    period: 'Period',
    time: 'Time',
    location: 'Location',
    youtubeLink: 'YouTube Link',
  };

  getErrorMessage(fieldName: string): string {
    return getFieldError(
      this.faceoffForm.get(fieldName),
      this.fieldLabels[fieldName] || fieldName,
      GAME_TIME_PATTERN_ERROR
    );
  }

  get winnerTeamData(): Team | undefined {
    const winnerTeamId = this.faceoffForm.get('winnerTeam')?.value;
    if (!winnerTeamId) return undefined;

    const team = this.teamOptions.find((t) => t.value === winnerTeamId);
    if (!team) return undefined;

    return {
      name: team.label,
      logo: `${environment.apiUrl}/hockey/team/${winnerTeamId}/logo`,
    };
  }

  get loserTeamData(): Team | undefined {
    const loserTeamId = this.faceoffForm.get('loserTeam')?.value;
    if (!loserTeamId) return undefined;

    const team = this.teamOptions.find((t) => t.value === loserTeamId);
    if (!team) return undefined;

    return {
      name: team.label,
      logo: `${environment.apiUrl}/hockey/team/${loserTeamId}/logo`,
    };
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }
}
