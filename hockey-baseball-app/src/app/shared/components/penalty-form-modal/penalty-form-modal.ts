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

export interface PenaltyFormData {
  teamLogo: string;
  teamName: string;
  playerName: string;
  penaltyLength: string;
  period: string;
  time: string;
  youtubeLink?: string;
  location?: PuckLocation;
}

@Component({
  selector: 'app-penalty-form-modal',
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
  templateUrl: './penalty-form-modal.html',
  styleUrl: './penalty-form-modal.scss'
})
export class PenaltyFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PenaltyFormModalComponent>>(MatDialogRef);

  penaltyForm: FormGroup;
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

  playerOptions: Array<{ value: string; label: string }> = [];

  periodOptions = [
    { value: '1', label: '1st Period' },
    { value: '2', label: '2nd Period' },
    { value: '3', label: '3rd Period' }
  ];

  constructor() {
    this.penaltyForm = this.createForm();
    this.setDefaultValues();
    this.setupTeamChangeListener();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      player: ['', Validators.required],
      penaltyLength: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      youtubeLink: [''],
      location: ['']
    });
  }

  private setDefaultValues(): void {
    // Set first available options as defaults
    if (this.teamOptions.length > 0) {
      this.penaltyForm.patchValue({
        team: this.teamOptions[0].value
      });
      // Initialize player list based on default team
      this.updatePlayers(this.teamOptions[0].value);
    }
    if (this.periodOptions.length > 0) {
      this.penaltyForm.patchValue({
        period: this.periodOptions[0].value
      });
    }
  }

  private setupTeamChangeListener(): void {
    // When team changes, update available players
    this.penaltyForm.get('team')?.valueChanges.subscribe(team => {
      this.updatePlayers(team);
    });
  }

  private updatePlayers(teamValue: string): void {
    this.playerOptions = this.playersByTeam[teamValue] || [];
    // Reset player selection when team changes
    if (this.playerOptions.length > 0) {
      this.penaltyForm.patchValue({ player: this.playerOptions[0].value });
    } else {
      this.penaltyForm.patchValue({ player: '' });
    }
  }

  selectTeam(teamValue: string): void {
    this.penaltyForm.patchValue({ team: teamValue });
    this.penaltyForm.get('team')?.markAsTouched();
  }

  selectPlayer(playerValue: string): void {
    this.penaltyForm.patchValue({ player: playerValue });
    this.penaltyForm.get('player')?.markAsTouched();
  }

  onLocationChange(location: PuckLocation | null): void {
    this.puckLocation = location;
    if (location) {
      this.penaltyForm.patchValue({ location: location.zone });
    }
  }

  onSubmit(): void {
    if (this.penaltyForm.valid) {
      const formValue = this.penaltyForm.value;
      
      // Find selected team and player
      const selectedTeam = this.teamOptions.find(t => t.value === formValue.team);
      const selectedPlayer = this.playerOptions.find(p => p.value === formValue.player);
      
      const penaltyData: PenaltyFormData = {
        teamLogo: selectedTeam?.logo || '',
        teamName: selectedTeam?.label || '',
        playerName: selectedPlayer?.label || '',
        penaltyLength: formValue.penaltyLength,
        period: formValue.period,
        time: formValue.time,
        youtubeLink: formValue.youtubeLink,
        location: this.puckLocation || undefined
      };

      this.dialogRef.close(penaltyData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.penaltyForm.controls).forEach(key => {
        this.penaltyForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.penaltyForm.get(fieldName);
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
      team: 'Team',
      player: 'Player',
      penaltyLength: 'Penalty Length',
      period: 'Period',
      time: 'Time',
      youtubeLink: 'YouTube Link',
      location: 'Location'
    };
    return labels[fieldName] || fieldName;
  }
}
