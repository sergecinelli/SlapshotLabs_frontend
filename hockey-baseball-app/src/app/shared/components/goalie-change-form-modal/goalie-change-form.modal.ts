import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { CardGridItemComponent } from '../card-grid/card-grid-item.component';
import { GoalieChangeEventRequest } from '../../../services/game-event.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { environment } from '../../../../environments/environment';
import { CachedSrcDirective } from '../../directives/cached-src.directive';
import { getFieldError, GAME_TIME_PATTERN_ERROR } from '../../validators/form-error.util';

export interface GoalieChangeFormData {
  teamLogo: string;
  teamName: string;
  goalieName: string;
  period: string;
  time: string;
  note?: string;
}

@Component({
  selector: 'app-goalie-change-form-modal',
  imports: [
    CachedSrcDirective,
    ReactiveFormsModule,
    SectionHeaderComponent,
    FormFieldComponent,
    CardGridComponent,
    CardGridItemComponent,
    ButtonComponent,
    ButtonLoadingComponent,
  ],
  templateUrl: './goalie-change-form.modal.html',
  styleUrl: './goalie-change-form.modal.scss',
})
export class GoalieChangeFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private dialogData = inject(ModalService).getModalData<{
    gameId: number;
    goalieChangeEventId: number;
    periodOptions?: { value: number; label: string }[];
    teamOptions?: { value: number; label: string; logo?: string }[];
    goalieOptions?: { value: number; label: string; teamId: number; number?: number }[];
    homeTeamId?: number;
    awayTeamId?: number;
    homeStartGoalieId?: number;
    awayStartGoalieId?: number;
    // Edit mode fields
    isEditMode?: boolean;
    eventId?: number;
    existingData?: {
      periodId?: number;
      time?: string;
      teamId?: number;
      goalieId?: number;
      note?: string;
    };
  }>();

  gameId: number;
  goalieChangeEventId: number;
  isEditMode = false;
  eventId?: number;

  goalieChangeForm: FormGroup;

  teamOptions: { value: number; label: string; logo?: string }[] = [];
  goalieOptions: { value: number; label: string; number?: number }[] = [];
  periodOptions: { value: number; label: string }[] = [];

  isSubmitting = signal(false);

  constructor() {
    this.goalieChangeForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.goalieChangeEventId = this.dialogData.goalieChangeEventId;
    this.isEditMode = this.dialogData.isEditMode || false;
    this.eventId = this.dialogData.eventId;
    this.setupTeamChangeListener();

    this.modalService.registerDirtyCheck(() => this.goalieChangeForm.dirty);
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
      this.goalieChangeForm.patchValue({
        team: existing.teamId,
        goalie: existing.goalieId,
        period: existing.periodId,
        time: existing.time,
        note: existing.note || '',
      });
      if (existing.teamId) {
        this.filterGoaliesForTeam(existing.teamId);
      }
    } else {
      if (this.teamOptions.length > 0) {
        this.goalieChangeForm.patchValue({ team: this.teamOptions[0].value });
        this.filterGoaliesForTeam(this.teamOptions[0].value);
      }
      if (this.periodOptions.length > 0) {
        this.goalieChangeForm.patchValue({ period: this.periodOptions[0].value });
      }
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      goalie: ['', Validators.required],
      period: ['', Validators.required],
      time: [
        '',
        [Validators.required, Validators.pattern(/^([0-9]{1,2}|1[0-9][0-9]|200):([0-5][0-9])$/)],
      ],
      note: [''],
    });
  }

  private filterGoaliesForTeam(teamId: number): void {
    const filteredGoalies = (this.dialogData.goalieOptions ?? [])
      .filter((goalie) => goalie.teamId === teamId)
      .map((goalie) => ({
        value: goalie.value,
        label: goalie.label,
        number: goalie.number,
      }));

    this.goalieOptions = filteredGoalies;

    if (this.goalieOptions.length > 0) {
      if (!this.isEditMode) {
        const defaultId = this.pickStartGoalieId(teamId);
        const found = this.goalieOptions.find((g) => g.value === defaultId);
        this.goalieChangeForm.patchValue({
          goalie: found ? found.value : this.goalieOptions[0].value,
        });
      }
    } else {
      this.goalieChangeForm.patchValue({ goalie: '' });
    }
  }

  private pickStartGoalieId(teamId: number | string | null | undefined): number | undefined {
    if (teamId == null) return undefined;
    const idNum = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;
    if (this.dialogData.homeTeamId != null && idNum === this.dialogData.homeTeamId)
      return this.dialogData.homeStartGoalieId;
    if (this.dialogData.awayTeamId != null && idNum === this.dialogData.awayTeamId)
      return this.dialogData.awayStartGoalieId;
    return undefined;
  }

  private setupTeamChangeListener(): void {
    this.goalieChangeForm.get('team')?.valueChanges.subscribe((team) => {
      this.filterGoaliesForTeam(team);
    });
  }

  selectTeam(teamValue: number): void {
    this.goalieChangeForm.patchValue({ team: teamValue });
    this.goalieChangeForm.get('team')?.markAsTouched();
  }

  selectGoalie(goalieValue: number): void {
    this.goalieChangeForm.patchValue({ goalie: goalieValue });
    this.goalieChangeForm.get('goalie')?.markAsTouched();
  }

  selectPeriod(periodValue: number): void {
    this.goalieChangeForm.patchValue({ period: periodValue });
    this.goalieChangeForm.get('period')?.markAsTouched();
  }

  onSubmit(): void {
    if (this.goalieChangeForm.valid) {
      this.isSubmitting.set(true);
      const formValue = this.goalieChangeForm.value;

      // Convert mm:ss to time-of-day like shots (HH:mm:ss.SSSZ with 00 hours)
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const tmp = new Date(Date.UTC(1970, 0, 1, 0, minutes, seconds, 0));
      const iso = tmp.toISOString();
      const timeOfDay = iso.substring(iso.indexOf('T') + 1);

      const goalieId =
        typeof formValue.goalie === 'number' && !isNaN(formValue.goalie)
          ? formValue.goalie
          : undefined;

      const requestData: GoalieChangeEventRequest = {
        game_id: this.gameId,
        event_name_id: this.goalieChangeEventId,
        team_id: formValue.team,
        ...(goalieId !== undefined && { goalie_id: goalieId }),
        period_id: formValue.period,
        time: timeOfDay,
        note: formValue.note || undefined,
      };

      this.modalService.closeWithDataProcessing({
        isEditMode: this.isEditMode,
        eventId: this.eventId,
        requestData,
      });
    } else if (!this.goalieChangeForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.goalieChangeForm.controls).forEach((key) => {
        this.goalieChangeForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
    team: 'Team',
    goalie: 'Goalie',
    period: 'Period',
    time: 'Time',
    note: 'Note',
  };

  getErrorMessage(fieldName: string): string {
    return getFieldError(
      this.goalieChangeForm.get(fieldName),
      this.fieldLabels[fieldName] || fieldName,
      GAME_TIME_PATTERN_ERROR
    );
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }
}
