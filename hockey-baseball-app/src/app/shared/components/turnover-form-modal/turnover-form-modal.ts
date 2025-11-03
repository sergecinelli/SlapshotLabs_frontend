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

export interface TurnoverFormData {
  teamLogo: string;
  teamName: string;
  playerNames: string[];
  period: string;
  time: string;
  location?: PuckLocation;
  youtubeLink?: string;
}

@Component({
  selector: 'app-turnover-form-modal',
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
  templateUrl: './turnover-form-modal.html',
  styleUrl: './turnover-form-modal.scss'
})
export class TurnoverFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<TurnoverFormModalComponent>>(MatDialogRef);

  turnoverForm: FormGroup;
  puckLocation: PuckLocation | null = null;

  // Mock data for now - to be replaced with real data
  teamOptions = [
    { value: 'team1', label: 'BURLINGTON JR RAIDERS BLACK', logo: 'BRB' },
    { value: 'team2', label: 'WATERLOO WOLVES', logo: 'WW' }
  ];

  // Mock players - will be populated based on selected team
  playerOptions = [
    { value: 'player1', label: 'Player 1' },
    { value: 'player2', label: 'Player 2' },
    { value: 'player3', label: 'Player 3' },
    { value: 'player4', label: 'Player 4' }
  ];

  periodOptions = [
    { value: '1', label: '1st Period' },
    { value: '2', label: '2nd Period' },
    { value: '3', label: '3rd Period' }
  ];

  constructor() {
    this.turnoverForm = this.createForm();
    this.setDefaultValues();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      player: ['', Validators.required],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      location: ['', Validators.required],
      youtubeLink: ['']
    });
  }

  private setDefaultValues(): void {
    // Set first available options as defaults
    if (this.teamOptions.length > 0) {
      this.turnoverForm.patchValue({
        team: this.teamOptions[0].value
      });
    }
    if (this.playerOptions.length > 0) {
      this.turnoverForm.patchValue({
        player: this.playerOptions[0].value
      });
    }
    if (this.periodOptions.length > 0) {
      this.turnoverForm.patchValue({
        period: this.periodOptions[0].value
      });
    }
  }

  selectTeam(teamValue: string): void {
    this.turnoverForm.patchValue({ team: teamValue });
    this.turnoverForm.get('team')?.markAsTouched();
    // When team changes, update available players
    // This will be implemented with real data later
    console.log('Team changed:', teamValue);
  }

  selectPlayer(playerValue: string): void {
    this.turnoverForm.patchValue({ player: playerValue });
    this.turnoverForm.get('player')?.markAsTouched();
  }

  onLocationChange(location: PuckLocation | null): void {
    this.puckLocation = location;
    if (location) {
      this.turnoverForm.patchValue({ location: location.zone });
    }
  }

  onSubmit(): void {
    if (this.turnoverForm.valid) {
      const formValue = this.turnoverForm.value;
      
      // Find selected team
      const selectedTeam = this.teamOptions.find(t => t.value === formValue.team);
      
      // Find selected player
      const selectedPlayer = this.playerOptions.find(p => p.value === formValue.player);
      
      const turnoverData: TurnoverFormData = {
        teamLogo: selectedTeam?.logo || '',
        teamName: selectedTeam?.label || '',
        playerNames: [selectedPlayer?.label || ''],
        period: formValue.period,
        time: formValue.time,
        location: this.puckLocation || undefined,
        youtubeLink: formValue.youtubeLink
      };

      this.dialogRef.close(turnoverData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.turnoverForm.controls).forEach(key => {
        this.turnoverForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.turnoverForm.get(fieldName);
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
      period: 'Period',
      time: 'Time',
      location: 'Location',
      youtubeLink: 'YouTube Link'
    };
    return labels[fieldName] || fieldName;
  }
}
