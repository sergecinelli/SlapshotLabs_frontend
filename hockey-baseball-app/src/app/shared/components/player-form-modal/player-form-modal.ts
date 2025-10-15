import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Player } from '../../interfaces/player.interface';

export interface PlayerFormModalData {
  player?: Player;
  isEditMode: boolean;
}

@Component({
  selector: 'app-player-form-modal',
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
    MatDividerModule
  ],
  templateUrl: './player-form-modal.html',
  styleUrl: './player-form-modal.scss'
})
export class PlayerFormModalComponent implements OnInit {
  playerForm: FormGroup;
  isEditMode: boolean;

  shootsOptions = [
    { value: 'Right Shot', label: 'Right Shot' },
    { value: 'Left Shot', label: 'Left Shot' }
  ];

  positionOptions = [
    { value: 'Left Wing', label: 'Left Wing' },
    { value: 'Center', label: 'Center' },
    { value: 'Right Wing', label: 'Right Wing' },
    { value: 'Left Defense', label: 'Left Defense' },
    { value: 'Right Defense', label: 'Right Defense' }
  ];

  teamOptions = [
    { value: 'Red Wings', label: 'Red Wings' },
    { value: 'Blue Sharks', label: 'Blue Sharks' },
    { value: 'Lightning Bolts', label: 'Lightning Bolts' },
    { value: 'Golden Eagles', label: 'Golden Eagles' },
    { value: 'Ice Wolves', label: 'Ice Wolves' },
    { value: 'Storm Riders', label: 'Storm Riders' },
    { value: 'Fire Hawks', label: 'Fire Hawks' },
    { value: 'Arctic Foxes', label: 'Arctic Foxes' },
    { value: 'Thunder Cats', label: 'Thunder Cats' },
    { value: 'Blizzard Kings', label: 'Blizzard Kings' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PlayerFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PlayerFormModalData
  ) {
    this.isEditMode = data.isEditMode;
    this.playerForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.player) {
      this.populateForm(this.data.player);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      team: [this.teamOptions[0]?.value || ''],
      position: [this.positionOptions[1]?.value || 'Center'],
      jerseyNumber: ['', [Validators.min(1), Validators.max(99)]],
      height: [''],
      weight: ['', [Validators.min(1)]],
      shoots: [this.shootsOptions[0]?.value || ''],
      birthYear: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      shotsOnGoal: ['', [Validators.min(0)]],
      gamesPlayed: ['', [Validators.min(0)]],
      goals: ['', [Validators.min(0)]],
      assists: ['', [Validators.min(0)]],
      scoringChances: ['', [Validators.min(0)]],
      blockedShots: ['', [Validators.min(0)]],
      penaltiesDrawn: ['', [Validators.min(0)]]
    });
  }

  private populateForm(player: Player): void {
    this.playerForm.patchValue({
      firstName: player.firstName,
      lastName: player.lastName,
      team: player.team,
      position: player.position,
      jerseyNumber: player.jerseyNumber,
      height: player.height,
      weight: player.weight,
      shoots: player.shoots,
      birthYear: player.birthYear,
      shotsOnGoal: player.shotsOnGoal,
      gamesPlayed: player.gamesPlayed,
      goals: player.goals,
      assists: player.assists,
      scoringChances: player.scoringChances,
      blockedShots: player.blockedShots,
      penaltiesDrawn: player.penaltiesDrawn
    });
  }

  onSubmit(): void {
    if (this.playerForm.valid) {
      const formValue = this.playerForm.value;
      
      const playerData: Partial<Player> = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        team: formValue.team,
        position: formValue.position,
        jerseyNumber: formValue.jerseyNumber,
        height: formValue.height,
        weight: formValue.weight,
        shoots: formValue.shoots,
        birthYear: formValue.birthYear,
        shotsOnGoal: formValue.shotsOnGoal,
        gamesPlayed: formValue.gamesPlayed,
        goals: formValue.goals || 0,
        assists: formValue.assists || 0,
        scoringChances: formValue.scoringChances || 0,
        blockedShots: formValue.blockedShots || 0,
        penaltiesDrawn: formValue.penaltiesDrawn || 0,
        // Calculate derived values
        points: (formValue.goals || 0) + (formValue.assists || 0),
        shotSprayChart: '',
        // Use default rink data for now
        rink: {
          facilityName: 'Default Facility',
          rinkName: 'Main Rink',
          city: 'City',
          address: 'Address'
        },
        level: 'Professional'
      };

      if (this.isEditMode && this.data.player) {
        playerData.id = this.data.player.id;
      }

      this.dialogRef.close(playerData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.playerForm.controls).forEach(key => {
        this.playerForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.playerForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must be no more than ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      team: 'Team',
      position: 'Position',
      jerseyNumber: 'Jersey Number',
      height: 'Height',
      weight: 'Weight',
      shoots: 'Shoots',
      birthYear: 'Birth Year',
      shotsOnGoal: 'Shots on Goal',
      gamesPlayed: 'Games Played',
      goals: 'Goals',
      assists: 'Assists',
      scoringChances: 'Scoring Chances',
      blockedShots: 'Blocked Shots',
      penaltiesDrawn: 'Penalties Drawn'
    };
    return labels[fieldName] || fieldName;
  }
}
