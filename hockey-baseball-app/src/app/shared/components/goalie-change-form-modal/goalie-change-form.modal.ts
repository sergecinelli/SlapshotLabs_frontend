import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { CardGridItemComponent } from '../card-grid/card-grid-item.component';
import { TeamService } from '../../../services/team.service';
import { GoalieService } from '../../../services/goalie.service';
import { GameMetadataService } from '../../../services/game-metadata.service';
import { GoalieChangeEventRequest } from '../../../services/game-event.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { environment } from '../../../../environments/environment';
import { CachedSrcDirective } from '../../directives/cached-src.directive';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
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
    LoadingSpinnerComponent,
  ],
  templateUrl: './goalie-change-form.modal.html',
  styleUrl: './goalie-change-form.modal.scss',
})
export class GoalieChangeFormModal implements OnInit {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private teamService = inject(TeamService);
  private goalieService = inject(GoalieService);
  private gameMetadataService = inject(GameMetadataService);
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

  // Data to be loaded from API
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  goaliesByTeam: Record<number, { value: number; label: string; number?: number }[]> = {};
  goalieOptions: { value: number; label: string; number?: number }[] = [];
  periodOptions: { value: number; label: string }[] = [];

  isLoadingTeams = false;
  isLoadingGoalies = false;
  isLoadingPeriods = false;
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
    // Load options
    if (this.dialogData.teamOptions && this.dialogData.teamOptions.length > 0) {
      this.teamOptions = this.dialogData.teamOptions;
    } else {
      this.loadTeams();
    }

    if (this.dialogData.periodOptions && this.dialogData.periodOptions.length > 0) {
      this.periodOptions = this.dialogData.periodOptions;
    } else {
      this.loadPeriods();
    }

    // Edit mode: populate with existing data
    if (this.isEditMode && this.dialogData.existingData) {
      const existing = this.dialogData.existingData;

      // Populate form
      this.goalieChangeForm.patchValue({
        team: existing.teamId,
        goalie: existing.goalieId,
        period: existing.periodId,
        time: existing.time,
        note: existing.note || '',
      });

      // Load goalies for the existing team (do not override selected goalie in edit mode)
      if (existing.teamId) {
        if (this.dialogData.goalieOptions && this.dialogData.goalieOptions.length > 0) {
          this.filterGoaliesForTeam(existing.teamId);
        } else {
          this.loadGoaliesForTeam(existing.teamId);
        }
      }
    } else {
      // Create mode: Set defaults
      if (this.teamOptions.length > 0) {
        this.goalieChangeForm.patchValue({ team: this.teamOptions[0].value });

        if (this.dialogData.goalieOptions && this.dialogData.goalieOptions.length > 0) {
          this.filterGoaliesForTeam(this.teamOptions[0].value);
        } else {
          this.loadGoaliesForTeam(this.teamOptions[0].value);
        }
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

  private loadTeams(): void {
    this.isLoadingTeams = true;
    this.teamService.getTeams().subscribe({
      next: (response) => {
        this.teamOptions = response.teams.map((team) => ({
          value: parseInt(team.id),
          label: team.name,
          logo: team.logo,
        }));
        this.isLoadingTeams = false;

        // Set default team after teams are loaded
        if (this.teamOptions.length > 0) {
          this.goalieChangeForm.patchValue({
            team: this.teamOptions[0].value,
          });
          // Load goalies for default team
          this.loadGoaliesForTeam(this.teamOptions[0].value);
        }
      },
      error: (error) => {
        console.error('Failed to load teams:', error);
        this.isLoadingTeams = false;
      },
    });
  }

  private loadPeriods(): void {
    this.isLoadingPeriods = true;
    this.gameMetadataService.getGamePeriods().subscribe({
      next: (periods) => {
        this.periodOptions = this.gameMetadataService.transformGamePeriodsToOptions(periods);
        this.isLoadingPeriods = false;
        if (this.periodOptions.length > 0) {
          this.goalieChangeForm.patchValue({ period: this.periodOptions[0].value });
        }
      },
      error: (error) => {
        console.error('Failed to load periods:', error);
        this.isLoadingPeriods = false;
      },
    });
  }

  private loadGoaliesForTeam(teamId: number): void {
    this.isLoadingGoalies = true;

    // Check if we already have goalies cached for this team
    if (this.goaliesByTeam[teamId]) {
      this.goalieOptions = this.goaliesByTeam[teamId];
      this.isLoadingGoalies = false;
      if (this.goalieOptions.length > 0) {
        const current = this.goalieChangeForm.get('goalie')?.value;
        const hasCurrent = this.goalieOptions.some((g) => g.value === current);
        if (!(this.isEditMode && (current === null || hasCurrent))) {
          const defaultId = this.pickStartGoalieId(teamId);
          const found = this.goalieOptions.find((g) => g.value === defaultId);
          this.goalieChangeForm.patchValue({
            goalie: found ? found.value : this.goalieOptions[0].value,
          });
        }
      }
      return;
    }

    this.goalieService.getGoaliesByTeam(teamId).subscribe({
      next: (goalies) => {
        const goalieOptions = goalies.map((goalie) => ({
          value: parseInt(goalie.id),
          label: `${goalie.firstName} ${goalie.lastName}`,
        }));

        // Cache the goalies
        this.goaliesByTeam[teamId] = goalieOptions;
        this.goalieOptions = goalieOptions;
        this.isLoadingGoalies = false;

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
      },
      error: (error) => {
        console.error(`Failed to load goalies for team ${teamId}:`, error);
        this.isLoadingGoalies = false;
      },
    });
  }

  /**
   * Filter goalies from pre-loaded goalie options based on team
   */
  private filterGoaliesForTeam(teamId: number): void {
    if (this.dialogData.goalieOptions) {
      const filteredGoalies = this.dialogData.goalieOptions
        .filter((goalie) => goalie.teamId === teamId)
        .map((goalie) => ({
          value: goalie.value,
          label: goalie.label,
          number: goalie.number,
        }));

      // Cache the filtered goalies
      this.goaliesByTeam[teamId] = filteredGoalies;
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
    const usePreloadedGoalies =
      this.dialogData.goalieOptions && this.dialogData.goalieOptions.length > 0;

    // When team changes, update available goalies
    this.goalieChangeForm.get('team')?.valueChanges.subscribe((team) => {
      if (usePreloadedGoalies) {
        this.filterGoaliesForTeam(team);
      } else {
        this.loadGoaliesForTeam(team);
      }
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
