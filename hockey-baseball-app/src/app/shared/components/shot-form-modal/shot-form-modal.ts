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
    MatCheckboxModule
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
  }>(MAT_DIALOG_DATA);

  gameId: number;
  shotEventId: number;

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

  constructor() {
    this.shotForm = this.createForm();
    this.gameId = this.dialogData.gameId;
    this.shotEventId = this.dialogData.shotEventId;
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
    
    // Set defaults
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

  private filterPlayersAndGoaliesForTeam(teamId: number): void {
    if (this.dialogData.playerOptions) {
      this.playerOptions = this.dialogData.playerOptions
        .filter(p => p.teamId === teamId)
        .map(p => ({ value: p.value, label: p.label }));
    }
    
    if (this.dialogData.goalieOptions) {
      this.goalieOptions = this.dialogData.goalieOptions
        .filter(g => g.teamId === teamId)
        .map(g => ({ value: g.value, label: g.label }));
    }
    
    // Set defaults
    if (this.playerOptions.length > 0) {
      this.shotForm.patchValue({
        scoringPlayer: this.playerOptions[0].value,
        shootingPlayer: this.playerOptions[0].value
      });
    }
    
    if (this.goalieOptions.length > 0) {
      // Find opposite team's goalie
      const oppositeTeam = this.teamOptions.find(t => t.value !== teamId);
      if (oppositeTeam && this.dialogData.goalieOptions) {
        const oppositeGoalies = this.dialogData.goalieOptions
          .filter(g => g.teamId === oppositeTeam.value)
          .map(g => ({ value: g.value, label: g.label }));
        
        if (oppositeGoalies.length > 0) {
          this.shotForm.patchValue({
            goalieScored: oppositeGoalies[0].value,
            goalieInNet: oppositeGoalies[0].value
          });
        }
      }
    }
  }

  private updateValidators(shotType: number | null): void {
    // Clear all conditional validators first
    this.shotForm.get('scoringTeam')?.clearValidators();
    this.shotForm.get('scoringPlayer')?.clearValidators();
    this.shotForm.get('assistPlayer')?.clearValidators();
    this.shotForm.get('goalieScored')?.clearValidators();
    this.shotForm.get('shootingTeam')?.clearValidators();
    this.shotForm.get('shootingPlayer')?.clearValidators();
    this.shotForm.get('goalieInNet')?.clearValidators();

    // Check if shot type is Goal (id: 3 according to API)
    const goalShotType = this.shotTypeOptions.find(st => st.label.toLowerCase() === 'goal');
    
    if (shotType === goalShotType?.value) {
      // Goal fields are required
      this.shotForm.get('scoringTeam')?.setValidators([Validators.required]);
      this.shotForm.get('scoringPlayer')?.setValidators([Validators.required]);
      this.shotForm.get('goalieScored')?.setValidators([Validators.required]);
      // Assist is optional
    } else if (shotType !== null) {
      // Save/Missed/Blocked fields are required
      this.shotForm.get('shootingTeam')?.setValidators([Validators.required]);
      this.shotForm.get('shootingPlayer')?.setValidators([Validators.required]);
      this.shotForm.get('goalieInNet')?.setValidators([Validators.required]);
    }

    // Update validity
    Object.keys(this.shotForm.controls).forEach(key => {
      this.shotForm.get(key)?.updateValueAndValidity();
    });
  }

  private updateScoringChanceValidator(isScoring: boolean): void {
    const noteControl = this.shotForm.get('scoringChanceNote');
    if (isScoring) {
      noteControl?.setValidators([Validators.required]);
    } else {
      noteControl?.clearValidators();
    }
    noteControl?.updateValueAndValidity();
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
    }
  }

  selectTeam(teamValue: number, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: teamValue });
    this.shotForm.get(fieldName)?.markAsTouched();
    // Filter players/goalies when team changes
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

  selectGoalie(goalieValue: number, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: goalieValue });
    this.shotForm.get(fieldName)?.markAsTouched();
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }

  onSubmit(): void {
    if (this.shotForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.shotForm.value;
      
      // Convert time from mm:ss to ISO duration format
      const [minutes, seconds] = formValue.time.split(':').map((v: string) => parseInt(v, 10));
      const isoTime = new Date();
      isoTime.setHours(0, minutes, seconds, 0);
      
      const shotRequest: ShotEventRequest = {
        game_id: this.gameId,
        event_name_id: this.shotEventId,
        team_id: this.isGoal ? formValue.scoringTeam : formValue.shootingTeam,
        player_id: this.isGoal ? formValue.scoringPlayer : formValue.shootingPlayer,
        player_2_id: this.isGoal ? formValue.assistPlayer : undefined,
        shot_type_id: formValue.shotType,
        goalie_id: this.isGoal ? formValue.goalieScored : formValue.goalieInNet,
        period_id: formValue.period,
        time: isoTime.toISOString(),
        youtube_link: formValue.youtubeLink || undefined,
        is_scoring_chance: formValue.isScoringChance,
        note: formValue.isScoringChance ? formValue.scoringChanceNote : undefined
      };

      this.gameEventService.createShotEvent(shotRequest).subscribe({
        next: (response) => {
          console.log('Shot event created:', response);
          this.isSubmitting = false;
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Failed to create shot event:', error);
          this.isSubmitting = false;
        }
      });
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
