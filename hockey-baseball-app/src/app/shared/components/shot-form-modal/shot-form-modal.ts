import { Component, inject } from '@angular/core';
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
export class ShotFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<ShotFormModalComponent>>(MatDialogRef);
  private dialogData = inject<{ 
    gameId?: number; 
    periodOptions?: { value: number; label: string }[];
    teamOptions?: { value: number; label: string; logo?: string }[];
    playerOptions?: { value: number; label: string; teamId: number }[];
    goalieOptions?: { value: number; label: string; teamId: number }[];
  }>(MAT_DIALOG_DATA, { optional: true });

  shotForm: FormGroup;

  // Mock data - to be replaced with real data
  teamOptions = [
    { value: 'team1', label: 'BURLINGTON JR RAIDERS BLACK', logo: 'BRB' },
    { value: 'team2', label: 'WATERLOO WOLVES', logo: 'WW' }
  ];

  playerOptions = [
    { value: 'player1', label: 'Player 1' },
    { value: 'player2', label: 'Player 2' },
    { value: 'player3', label: 'Player 3' },
    { value: 'player4', label: 'Player 4' }
  ];

  goalieOptions = [
    { value: 'goalie1', label: 'Goalie 1' },
    { value: 'goalie2', label: 'Goalie 2' }
  ];

  periodOptions: { value: number | string; label: string }[] = [
    { value: '1', label: '1st Period' },
    { value: '2', label: '2nd Period' },
    { value: '3', label: '3rd Period' }
  ];

  shotTypeOptions = [
    { value: 'save', label: 'Save' },
    { value: 'goal', label: 'Goal' },
    { value: 'missed', label: 'Missed the net' },
    { value: 'blocked', label: 'Blocked' }
  ];

  constructor() {
    // Use periods from dialog data if available
    if (this.dialogData?.periodOptions && this.dialogData.periodOptions.length > 0) {
      this.periodOptions = this.dialogData.periodOptions;
    }
    
    // Use teams from dialog data if available
    if (this.dialogData?.teamOptions && this.dialogData.teamOptions.length > 0) {
      this.teamOptions = this.dialogData.teamOptions.map(team => ({
        value: team.value.toString(),
        label: team.label,
        logo: team.logo || ''
      }));
    }
    
    // Use players from dialog data if available
    if (this.dialogData?.playerOptions && this.dialogData.playerOptions.length > 0) {
      this.playerOptions = this.dialogData.playerOptions.map(player => ({
        value: player.value.toString(),
        label: player.label
      }));
    }
    
    // Use goalies from dialog data if available
    if (this.dialogData?.goalieOptions && this.dialogData.goalieOptions.length > 0) {
      this.goalieOptions = this.dialogData.goalieOptions.map(goalie => ({
        value: goalie.value.toString(),
        label: goalie.label
      }));
    }
    
    this.shotForm = this.createForm();
    this.setDefaultValues();
    this.setupConditionalValidation();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      shotType: ['', Validators.required],
      isScoringChance: [false],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      youtubeLink: [''],
      // Goal fields
      scoringTeam: [''],
      scoringPlayer: [''],
      assistPlayer: [''],
      goalieScored: [''],
      // Save/Missed/Blocked fields
      shootingTeam: [''],
      shootingPlayer: [''],
      goalieInNet: [''],
      // Scoring chance note
      scoringChanceNote: ['']
    });
  }

  private setDefaultValues(): void {
    if (this.shotTypeOptions.length > 0) {
      this.shotForm.patchValue({
        shotType: this.shotTypeOptions[0].value
      });
    }
    if (this.periodOptions.length > 0) {
      this.shotForm.patchValue({
        period: this.periodOptions[0].value
      });
    }
  }

  private setupConditionalValidation(): void {
    this.shotForm.get('shotType')?.valueChanges.subscribe(shotType => {
      this.updateValidators(shotType);
    });

    this.shotForm.get('isScoringChance')?.valueChanges.subscribe(isScoring => {
      this.updateScoringChanceValidator(isScoring);
    });
  }

  private updateValidators(shotType: string): void {
    // Clear all conditional validators first
    this.shotForm.get('scoringTeam')?.clearValidators();
    this.shotForm.get('scoringPlayer')?.clearValidators();
    this.shotForm.get('assistPlayer')?.clearValidators();
    this.shotForm.get('goalieScored')?.clearValidators();
    this.shotForm.get('shootingTeam')?.clearValidators();
    this.shotForm.get('shootingPlayer')?.clearValidators();
    this.shotForm.get('goalieInNet')?.clearValidators();

    if (shotType === 'goal') {
      // Goal fields are required
      this.shotForm.get('scoringTeam')?.setValidators([Validators.required]);
      this.shotForm.get('scoringPlayer')?.setValidators([Validators.required]);
      this.shotForm.get('goalieScored')?.setValidators([Validators.required]);
      // Assist is optional
    } else if (shotType === 'save' || shotType === 'missed' || shotType === 'blocked') {
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
    return this.shotForm.get('shotType')?.value === 'goal';
  }

  get isNonGoal(): boolean {
    const shotType = this.shotForm.get('shotType')?.value;
    return shotType === 'save' || shotType === 'missed' || shotType === 'blocked';
  }

  get showScoringChance(): boolean {
    return !this.isGoal;
  }

  get isScoringChance(): boolean {
    return this.shotForm.get('isScoringChance')?.value === true;
  }

  selectShotType(shotType: string): void {
    this.shotForm.patchValue({ shotType });
    this.shotForm.get('shotType')?.markAsTouched();
    // Reset scoring chance when switching to goal
    if (shotType === 'goal') {
      this.shotForm.patchValue({ isScoringChance: false });
    }
  }

  selectTeam(teamValue: string, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: teamValue });
    this.shotForm.get(fieldName)?.markAsTouched();
  }

  selectPlayer(playerValue: string, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: playerValue });
    this.shotForm.get(fieldName)?.markAsTouched();
  }

  selectGoalie(goalieValue: string, fieldName: string): void {
    this.shotForm.patchValue({ [fieldName]: goalieValue });
    this.shotForm.get(fieldName)?.markAsTouched();
  }

  onSubmit(): void {
    if (this.shotForm.valid) {
      const formValue = this.shotForm.value;
      
      const shotData: ShotFormData = {
        shotType: formValue.shotType,
        isScoringChance: formValue.isScoringChance,
        period: formValue.period,
        time: formValue.time,
        youtubeLink: formValue.youtubeLink
      };

      if (this.isGoal) {
        shotData.scoringTeam = formValue.scoringTeam;
        shotData.scoringPlayer = formValue.scoringPlayer;
        shotData.assistPlayer = formValue.assistPlayer;
        shotData.goalieScored = formValue.goalieScored;
      } else {
        shotData.shootingTeam = formValue.shootingTeam;
        shotData.shootingPlayer = formValue.shootingPlayer;
        shotData.goalieInNet = formValue.goalieInNet;
      }

      if (this.isScoringChance) {
        shotData.scoringChanceNote = formValue.scoringChanceNote;
      }

      this.dialogRef.close(shotData);
    } else {
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
