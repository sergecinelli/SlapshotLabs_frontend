import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { LocationSelectorComponent, PuckLocation } from '../location-selector/location-selector';

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
    LocationSelectorComponent
  ],
  templateUrl: './faceoff-form-modal.html',
  styleUrl: './faceoff-form-modal.scss'
})
export class FaceoffFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<FaceoffFormModalComponent>>(MatDialogRef);

  faceoffForm: FormGroup;
  puckLocation: PuckLocation | null = null;

  // Mock data for now - to be replaced with real data
  teamOptions = [
    { value: 'team1', label: 'BURLINGTON JR RAIDERS BLACK', logo: 'BRB' },
    { value: 'team2', label: 'WATERLOO WOLVES', logo: 'WW' }
  ];

  // Mock players by team - will be populated based on selected team
  playersByTeam: Record<string, Array<{ value: string; label: string }>> = {
    team1: [
      { value: 'player1', label: 'Player 1' },
      { value: 'player2', label: 'Player 2' },
      { value: 'player3', label: 'Player 3' },
      { value: 'player4', label: 'Player 4' }
    ],
    team2: [
      { value: 'player5', label: 'Player 5' },
      { value: 'player6', label: 'Player 6' },
      { value: 'player7', label: 'Player 7' },
      { value: 'player8', label: 'Player 8' }
    ]
  };

  winnerPlayerOptions: Array<{ value: string; label: string }> = [];
  loserPlayerOptions: Array<{ value: string; label: string }> = [];

  periodOptions = [
    { value: '1', label: '1st Period' },
    { value: '2', label: '2nd Period' },
    { value: '3', label: '3rd Period' }
  ];

  constructor() {
    this.faceoffForm = this.createForm();
    this.setDefaultValues();
    this.setupTeamChangeListeners();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      winnerTeam: ['', Validators.required],
      winnerPlayer: ['', Validators.required],
      loserTeam: ['', Validators.required],
      loserPlayer: ['', Validators.required],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      location: [''],
      youtubeLink: ['']
    });
  }

  private setDefaultValues(): void {
    // Set first available options as defaults
    if (this.teamOptions.length > 1) {
      this.faceoffForm.patchValue({
        winnerTeam: this.teamOptions[0].value,
        loserTeam: this.teamOptions[1].value
      });
      
      // Initialize player lists based on default teams
      this.updateWinnerPlayers(this.teamOptions[0].value);
      this.updateLoserPlayers(this.teamOptions[1].value);
    }
    if (this.periodOptions.length > 0) {
      this.faceoffForm.patchValue({
        period: this.periodOptions[0].value
      });
    }
  }

  private setupTeamChangeListeners(): void {
    // When winner team changes, automatically set loser team to the opposite and update players
    this.faceoffForm.get('winnerTeam')?.valueChanges.subscribe(winnerTeam => {
      const loserTeam = this.teamOptions.find(t => t.value !== winnerTeam);
      if (loserTeam) {
        this.faceoffForm.patchValue({ loserTeam: loserTeam.value }, { emitEvent: false });
        // Manually update loser players since we disabled event emission
        this.updateLoserPlayers(loserTeam.value);
      }
      this.updateWinnerPlayers(winnerTeam);
    });

    // When loser team changes, automatically set winner team to the opposite and update players
    this.faceoffForm.get('loserTeam')?.valueChanges.subscribe(loserTeam => {
      const winnerTeam = this.teamOptions.find(t => t.value !== loserTeam);
      if (winnerTeam) {
        this.faceoffForm.patchValue({ winnerTeam: winnerTeam.value }, { emitEvent: false });
        // Manually update winner players since we disabled event emission
        this.updateWinnerPlayers(winnerTeam.value);
      }
      this.updateLoserPlayers(loserTeam);
    });
  }

  private updateWinnerPlayers(teamValue: string): void {
    this.winnerPlayerOptions = this.playersByTeam[teamValue] || [];
    // Reset winner player selection when team changes
    if (this.winnerPlayerOptions.length > 0) {
      this.faceoffForm.patchValue({ winnerPlayer: this.winnerPlayerOptions[0].value });
    } else {
      this.faceoffForm.patchValue({ winnerPlayer: '' });
    }
  }

  private updateLoserPlayers(teamValue: string): void {
    this.loserPlayerOptions = this.playersByTeam[teamValue] || [];
    // Reset loser player selection when team changes
    if (this.loserPlayerOptions.length > 0) {
      this.faceoffForm.patchValue({ loserPlayer: this.loserPlayerOptions[0].value });
    } else {
      this.faceoffForm.patchValue({ loserPlayer: '' });
    }
  }

  selectWinnerTeam(teamValue: string): void {
    this.faceoffForm.patchValue({ winnerTeam: teamValue });
    this.faceoffForm.get('winnerTeam')?.markAsTouched();
  }

  selectWinnerPlayer(playerValue: string): void {
    this.faceoffForm.patchValue({ winnerPlayer: playerValue });
    this.faceoffForm.get('winnerPlayer')?.markAsTouched();
  }

  selectLoserTeam(teamValue: string): void {
    this.faceoffForm.patchValue({ loserTeam: teamValue });
    this.faceoffForm.get('loserTeam')?.markAsTouched();
  }

  selectLoserPlayer(playerValue: string): void {
    this.faceoffForm.patchValue({ loserPlayer: playerValue });
    this.faceoffForm.get('loserPlayer')?.markAsTouched();
  }

  onLocationChange(location: PuckLocation | null): void {
    this.puckLocation = location;
    if (location) {
      this.faceoffForm.patchValue({ location: location.zone });
    }
  }

  onSubmit(): void {
    if (this.faceoffForm.valid) {
      const formValue = this.faceoffForm.value;
      
      // Find selected teams and players
      const winnerTeam = this.teamOptions.find(t => t.value === formValue.winnerTeam);
      const loserTeam = this.teamOptions.find(t => t.value === formValue.loserTeam);
      const winnerPlayer = this.winnerPlayerOptions.find(p => p.value === formValue.winnerPlayer);
      const loserPlayer = this.loserPlayerOptions.find(p => p.value === formValue.loserPlayer);
      
      const faceoffData: FaceoffFormData = {
        winnerTeamLogo: winnerTeam?.logo || '',
        winnerTeamName: winnerTeam?.label || '',
        winnerPlayerName: winnerPlayer?.label || '',
        loserTeamLogo: loserTeam?.logo || '',
        loserTeamName: loserTeam?.label || '',
        loserPlayerName: loserPlayer?.label || '',
        period: formValue.period,
        time: formValue.time,
        location: this.puckLocation || undefined,
        youtubeLink: formValue.youtubeLink
      };

      this.dialogRef.close(faceoffData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.faceoffForm.controls).forEach(key => {
        this.faceoffForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.faceoffForm.get(fieldName);
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
      winnerTeam: 'Faceoff Winner Team',
      winnerPlayer: 'Faceoff Winner Player',
      loserTeam: 'Faceoff Loser Team',
      loserPlayer: 'Faceoff Loser Player',
      period: 'Period',
      time: 'Time',
      location: 'Location',
      youtubeLink: 'YouTube Link'
    };
    return labels[fieldName] || fieldName;
  }
}
