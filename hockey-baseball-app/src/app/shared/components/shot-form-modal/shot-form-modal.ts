import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { GameEventService, ShotEventRequest } from '../../../services/game-event.service';
import { environment } from '../../../../environments/environment';
import { ShotLocationSelectorComponent, ShotLocation } from '../shot-location-selector/shot-location-selector';
import { Team } from '../location-selector/location-selector';

export interface ShotFormData {
  shotType: 'save' | 'goal' | 'missed' | 'blocked';
  isScoringChance: boolean;
  period: string;
  time: string;
  youtubeLink: string;
  // For goals
  scoringTeam?: string;
  scoringPlayer?: string;
  assistPlayer?: string;
  goalieScored?: string;
  // For saves/missed/blocked
  shootingTeam?: string;
  shootingPlayer?: string;
  goalieInNet?: string;
  // For scoring chance
  scoringChanceNote?: string;
}

@Component({
  selector: 'app-shot-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatCheckboxModule,
    ShotLocationSelectorComponent
  ],
  templateUrl: './shot-form-modal.html',
  styleUrl: './shot-form-modal.scss'
})
export class ShotFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<ShotFormModalComponent>>(MatDialogRef);
  private gameEventService = inject(GameEventService);
  private dialogData = inject<{ 
    gameId: number;
    shotEventId: number;
    periodOptions?: { value: number; label: string }[];
    shotTypeOptions?: { value: number; label: string }[];
    teamOptions?: { value: number; label: string; logo?: string }[];
    playerOptions?: { value: number; label: string; teamId: number }[];
    goalieOptions?: { value: number; label: string; teamId: number }[];
    gameStartTimeIso?: string;
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
      playerId?: number;
      player2Id?: number;
      goalieId?: number;
      shotTypeId?: number;
      isScoringChance?: boolean;
      note?: string;
      youtubeLink?: string;
      iceTopOffset?: number;
      iceLeftOffset?: number;
      netTopOffset?: number;
      netLeftOffset?: number;
      zone?: string;
    };
  }>(MAT_DIALOG_DATA);

  gameId: number;
  shotEventId: number;
  isEditMode = false;
  eventId?: number;

  shotForm: FormGroup;

  // Data arrays
  teamOptions: { value: number; label: string; logo?: string }[] = [];
  periodOptions: { value: number; label: string }[] = [];
  shotTypeOptions: { value: number; label: string }[] = [];
  
  // Filtered options based on selected team
  playerOptions: { value: number; label: string }[] = [];
  goalieOptions: { value: number; label: string }[] = [];
  
  // Loading states
  isSubmitting = false;
  
  // Shot location
  shotLocation: ShotLocation | null = null;

  constructor() {
    this.shotForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.shotEventId = this.dialogData.shotEventId;
    this.isEditMode = this.dialogData.isEditMode || false;
    this.eventId = this.dialogData.eventId;
    this.setupConditionalValidation();
  }

  ngOnInit(): void {
    // Load data from dialog
    if (this.dialogData.periodOptions) {
      this.periodOptions = this.dialogData.periodOptions;
    }
    
    if (this.dialogData.shotTypeOptions) {
      this.shotTypeOptions = this.dialogData.shotTypeOptions;
    }
    
    if (this.dialogData.teamOptions) {
      this.teamOptions = this.dialogData.teamOptions;
    }
    
    // Edit mode: populate with existing data
    if (this.isEditMode && this.dialogData.existingData) {
      const existing = this.dialogData.existingData;
      
      // Restore shot location if available and not (0,0)
      if (existing.iceTopOffset !== undefined && existing.iceLeftOffset !== undefined &&
          !(existing.iceTopOffset === 0 && existing.iceLeftOffset === 0)) {
        this.shotLocation = {
          rinkLocation: {
            x: existing.iceLeftOffset,
            y: existing.iceTopOffset,
            zone: existing.zone as 'defending' | 'neutral' | 'attacking' ?? 'defending'
          },
          netLocation: (existing.netTopOffset !== undefined && existing.netLeftOffset !== undefined &&
                       !(existing.netTopOffset === 0 && existing.netLeftOffset === 0)) ? {
            x: existing.netLeftOffset,
            y: existing.netTopOffset
          } : undefined
        };
      }
      
      // Populate form
      this.shotForm.patchValue({
        shotType: existing.shotTypeId,
        period: existing.periodId,
        time: existing.time,
        youtubeLink: existing.youtubeLink || '',
        isScoringChance: existing.isScoringChance || false,
        scoringChanceNote: existing.note || '',
        // Set team and player fields
        scoringTeam: existing.teamId,
        shootingTeam: existing.teamId,
        scoringPlayer: existing.playerId,
        shootingPlayer: existing.playerId,
        assistPlayer: existing.player2Id,
        goalieScored: existing.goalieId,
        goalieInNet: existing.goalieId
      });
      
      if (existing.teamId) {
        this.filterPlayersAndGoaliesForTeam(existing.teamId, true);
      }
    } else {
      // Create mode: Set defaults
      if (this.shotTypeOptions.length > 0) {
        this.shotForm.patchValue({ shotType: this.shotTypeOptions[0].value });
      }
      
      if (this.periodOptions.length > 0) {
        this.shotForm.patchValue({ period: this.periodOptions[0].value });
      }
      
      if (this.teamOptions.length > 0) {
        // Set first team for goal/non-goal scenarios
        this.shotForm.patchValue({ 
          scoringTeam: this.teamOptions[0].value,
          shootingTeam: this.teamOptions[0].value
        });
        this.filterPlayersAndGoaliesForTeam(this.teamOptions[0].value);
      }
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      shotType: [null as number | null, Validators.required],
      isScoringChance: [false],
      period: [null as number | null, Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      youtubeLink: [''],
      // Goal fields
      scoringTeam: [null as number | null],
      scoringPlayer: [null as number | null],
      assistPlayer: [null as number | null],
      goalieScored: [null as number | null],
      // Save/Missed/Blocked fields
      shootingTeam: [null as number | null],
      shootingPlayer: [null as number | null],
      goalieInNet: [null as number | null],
      // Scoring chance note
      scoringChanceNote: ['']
    });
  }

  private setupConditionalValidation(): void {
    this.shotForm.get('shotType')?.valueChanges.subscribe(shotType => {
      this.updateValidators(shotType);
    });

    this.shotForm.get('isScoringChance')?.valueChanges.subscribe(isScoring => {
      this.updateScoringChanceValidator(isScoring);
    });
  }

  private filterPlayersAndGoaliesForTeam(teamId: number, skipGoalieDefault = false): void {
    // Players should be from the selected team
    if (this.dialogData.playerOptions) {
      this.playerOptions = this.dialogData.playerOptions
        .filter(p => p.teamId === teamId)
        .map(p => ({ value: p.value, label: p.label }));
    }

    // Goalies should be from the OPPOSITE team
    const oppositeTeam = this.teamOptions.find(t => t.value !== teamId);
    if (oppositeTeam && this.dialogData.goalieOptions) {
      const oppositeGoalies = this.dialogData.goalieOptions
        .filter(g => g.teamId === oppositeTeam.value)
        .map(g => ({ value: g.value, label: g.label }));
      this.goalieOptions = oppositeGoalies;

      // Only set default goalie if not skipping (i.e., not in edit mode with existing data)
      if (!skipGoalieDefault) {
        // Prefer starting goalie of the opposite team if present
        const desiredStartId = teamId === this.dialogData.homeTeamId ? this.dialogData.awayStartGoalieId : this.dialogData.homeStartGoalieId;
        const defaultOpp = oppositeGoalies.find(g => g.value === desiredStartId);

        if (defaultOpp) {
          this.shotForm.patchValue({
            goalieScored: defaultOpp.value,
            goalieInNet: defaultOpp.value
          });
        } else if (oppositeGoalies.length > 0) {
          this.shotForm.patchValue({
            goalieScored: oppositeGoalies[0].value,
            goalieInNet: oppositeGoalies[0].value
          });
        }
      }
    } else {
      // No opposite team found; clear goalies list
      this.goalieOptions = [];
    }

    // Set default players for the selected team
    if (this.playerOptions.length > 0) {
      this.shotForm.patchValue({
        scoringPlayer: this.playerOptions[0].value,
        shootingPlayer: this.playerOptions[0].value
      });
    }
  }

  private updateValidators(shotType: number | null): void {
    // Only the conditional controls need validator changes
    const conditionalControls = [
      'scoringTeam',
      'scoringPlayer',
      'assistPlayer',
      'goalieScored',
      'shootingTeam',
      'shootingPlayer',
      'goalieInNet',
    ];

    // Clear conditional validators
    conditionalControls.forEach(name => {
      this.shotForm.get(name)?.clearValidators();
    });

    // Check if shot type is Goal
    const goalShotType = this.shotTypeOptions.find(st => st.label.toLowerCase() === 'goal');

    if (shotType === goalShotType?.value) {
      // Goal fields are required
      this.shotForm.get('scoringTeam')?.setValidators([Validators.required]);
      this.shotForm.get('scoringPlayer')?.setValidators([Validators.required]);
      // assistPlayer and goalieScored remain optional
    } else if (shotType !== null) {
      // Non-goal fields are required
      this.shotForm.get('shootingTeam')?.setValidators([Validators.required]);
      this.shotForm.get('shootingPlayer')?.setValidators([Validators.required]);
      // goalieInNet remains optional
    }

    // Recompute validity without emitting to avoid feedback loop
    conditionalControls.forEach(name => {
      this.shotForm.get(name)?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private updateScoringChanceValidator(isScoring: boolean): void {
    const noteControl = this.shotForm.get('scoringChanceNote');
    if (isScoring) {
      noteControl?.setValidators([Validators.required]);
    } else {
      noteControl?.clearValidators();
    }
    noteControl?.updateValueAndValidity({ emitEvent: false });
  }

  get isGoal(): boolean {
    const shotType = this.shotForm.get('shotType')?.value;
    const goalShotType = this.shotTypeOptions.find(st => st.label.toLowerCase() === 'goal');
    return shotType === goalShotType?.value;
  }

  get isNonGoal(): boolean {
    const shotType = this.shotForm.get('shotType')?.value;
    const goalShotType = this.shotTypeOptions.find(st => st.label.toLowerCase() === 'goal');
    return shotType !== null && shotType !== goalShotType?.value;
  }

  get showScoringChance(): boolean {
    return !this.isGoal;
  }

  get isScoringChance(): boolean {
    return this.shotForm.get('isScoringChance')?.value === true;
  }

  selectShotType(shotType: number): void {
    this.shotForm.patchValue({ shotType });
    this.shotForm.get('shotType')?.markAsTouched();
    // Reset scoring chance when switching to goal
    const goalShotType = this.shotTypeOptions.find(st => st.label.toLowerCase() === 'goal');
    if (shotType === goalShotType?.value) {
      this.shotForm.patchValue({ isScoringChance: false });
      // Ensure goalie list reflects opposite of scoring team
      const teamId = this.shotForm.get('scoringTeam')?.value;
      if (teamId) this.filterPlayersAndGoaliesForTeam(teamId);
    } else {
      // Ensure goalie list reflects opposite of shooting team
      const teamId = this.shotForm.get('shootingTeam')?.value;
      if (teamId) this.filterPlayersAndGoaliesForTeam(teamId);
    }
  }

  selectTeam(teamValue: number, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: teamValue });
    this.shotForm.get(fieldName)?.markAsTouched();
    // Filter players for the selected team and set goalie list to the opposite team
    this.filterPlayersAndGoaliesForTeam(teamValue);
  }

  selectPeriod(periodValue: number): void {
    this.shotForm.patchValue({ period: periodValue });
    this.shotForm.get('period')?.markAsTouched();
  }

  selectPlayer(playerValue: number, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: playerValue });
    this.shotForm.get(fieldName)?.markAsTouched();
  }

  selectGoalie(goalieValue: number | null, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: goalieValue });
    this.shotForm.get(fieldName)?.markAsTouched();
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }
  
  onShotLocationChange(location: ShotLocation | null): void {
    this.shotLocation = location;
  }
  
  get team1Data(): Team | undefined {
    if (this.teamOptions.length < 1) return undefined;
    const team = this.teamOptions[0];
    return {
      name: team.label,
      logo: this.getTeamLogoUrl(team.value)
    };
  }
  
  get team2Data(): Team | undefined {
    if (this.teamOptions.length < 2) return undefined;
    const team = this.teamOptions[1];
    return {
      name: team.label,
      logo: this.getTeamLogoUrl(team.value)
    };
  }

  onSubmit(): void {
    if (this.shotForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.shotForm.value;
      
      // Build absolute event time-of-day string in format HH:mm:ss.SSSZ
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));

      // Always send as 00:mm:ss.000Z regardless of game start time
      const tmp = new Date(Date.UTC(1970, 0, 1, 0, minutes, seconds, 0));
      const iso = tmp.toISOString();
      const timeOfDay = iso.substring(iso.indexOf('T') + 1); // HH:mm:ss.SSSZ
      
      const goalieId: number | undefined = (this.isGoal ? formValue.goalieScored : formValue.goalieInNet) ?? undefined;

      const shotRequest: ShotEventRequest = {
        game_id: this.gameId,
        event_name_id: this.shotEventId,
        team_id: this.isGoal ? formValue.scoringTeam : formValue.shootingTeam,
        player_id: this.isGoal ? formValue.scoringPlayer : formValue.shootingPlayer,
        player_2_id: this.isGoal ? formValue.assistPlayer : undefined,
        shot_type_id: formValue.shotType,
        goalie_id: goalieId,
        period_id: formValue.period,
        time: timeOfDay,
        youtube_link: formValue.youtubeLink || undefined,
        is_scoring_chance: formValue.isScoringChance,
        note: formValue.isScoringChance ? formValue.scoringChanceNote : undefined,
        ice_top_offset: this.shotLocation?.rinkLocation.y,
        ice_left_offset: this.shotLocation?.rinkLocation.x,
        net_top_offset: this.shotLocation?.netLocation?.y,
        net_left_offset: this.shotLocation?.netLocation?.x
      };

      // Edit or create based on mode
      if (this.isEditMode && this.eventId) {
        this.gameEventService.updateGameEvent(this.eventId, shotRequest).subscribe({
          next: () => {
            this.isSubmitting = false;
            // Ensure caller always receives a truthy value to trigger refresh
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Failed to update shot event:', error);
            this.isSubmitting = false;
            alert('Failed to update shot event. Please try again.');
          }
        });
      } else {
        this.gameEventService.createShotEvent(shotRequest).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.dialogRef.close(response);
          },
          error: (error) => {
            console.error('Failed to create shot event:', error);
            this.isSubmitting = false;
          }
        });
      }
    } else if (!this.shotForm.valid) {
      Object.keys(this.shotForm.controls).forEach(key => {
        this.shotForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.shotForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['pattern']) {
        return 'Time must be in mm:ss format (e.g., 12:45)';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      shotType: 'Shot Type',
      period: 'Period',
      time: 'Time',
      youtubeLink: 'YouTube Link',
      scoringTeam: 'Scoring Team',
      scoringPlayer: 'Scoring Player',
      assistPlayer: 'Assist Player',
      goalieScored: 'Goalie',
      shootingTeam: 'Shooting Team',
      shootingPlayer: 'Shooting Player',
      goalieInNet: 'Goalie',
      scoringChanceNote: 'Note'
    };
    return labels[fieldName] || fieldName;
  }
}
