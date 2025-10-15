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
import { Goalie } from '../../interfaces/goalie.interface';

export interface GoalieFormModalData {
  goalie?: Goalie;
  isEditMode: boolean;
}

@Component({
  selector: 'app-goalie-form-modal',
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
  templateUrl: './goalie-form-modal.html',
  styleUrl: './goalie-form-modal.scss'
})
export class GoalieFormModalComponent implements OnInit {
  goalieForm: FormGroup;
  isEditMode: boolean;

  shootsOptions = [
    { value: 'Right Shot', label: 'Right Shot' },
    { value: 'Left Shot', label: 'Left Shot' }
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
    private dialogRef: MatDialogRef<GoalieFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GoalieFormModalData
  ) {
    this.isEditMode = data.isEditMode;
    this.goalieForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.goalie) {
      this.populateForm(this.data.goalie);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      team: [this.teamOptions[0]?.value || ''],
      jerseyNumber: ['', [Validators.min(1), Validators.max(99)]],
      height: [''],
      weight: ['', [Validators.min(1)]],
      shoots: [this.shootsOptions[0]?.value || ''],
      birthYear: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      shotsOnGoal: ['', [Validators.min(0)]],
      saves: ['', [Validators.min(0)]],
      goalsAgainst: ['', [Validators.min(0)]],
      gamesPlayed: ['', [Validators.min(0)]],
      wins: ['', [Validators.min(0)]],
      losses: ['', [Validators.min(0)]],
      goals: ['', [Validators.min(0)]],
      assists: ['', [Validators.min(0)]],
      ppga: ['', [Validators.min(0)]],
      shga: ['', [Validators.min(0)]],
      savesAboveAvg: ['', [Validators.min(-100)]]
    });
  }

  private populateForm(goalie: Goalie): void {
    this.goalieForm.patchValue({
      firstName: goalie.firstName,
      lastName: goalie.lastName,
      team: goalie.team,
      jerseyNumber: goalie.jerseyNumber,
      height: goalie.height,
      weight: goalie.weight,
      shoots: goalie.shoots,
      birthYear: goalie.birthYear,
      shotsOnGoal: goalie.shotsOnGoal,
      saves: goalie.saves,
      goalsAgainst: goalie.goalsAgainst,
      gamesPlayed: goalie.gamesPlayed,
      wins: goalie.wins,
      losses: goalie.losses,
      goals: goalie.goals,
      assists: goalie.assists,
      ppga: goalie.ppga,
      shga: goalie.shga,
      savesAboveAvg: goalie.savesAboveAvg
    });
  }

  onSubmit(): void {
    if (this.goalieForm.valid) {
      const formValue = this.goalieForm.value;
      
      const goalieData: Partial<Goalie> = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        team: formValue.team,
        jerseyNumber: formValue.jerseyNumber,
        height: formValue.height,
        weight: formValue.weight,
        shoots: formValue.shoots,
        birthYear: formValue.birthYear,
        shotsOnGoal: formValue.shotsOnGoal,
        saves: formValue.saves,
        goalsAgainst: formValue.goalsAgainst,
        gamesPlayed: formValue.gamesPlayed,
        wins: formValue.wins,
        losses: formValue.losses,
        goals: formValue.goals || 0,
        assists: formValue.assists || 0,
        ppga: formValue.ppga || 0,
        shga: formValue.shga || 0,
        savesAboveAvg: formValue.savesAboveAvg || 0,
        // Calculate derived values
        points: (formValue.goals || 0) + (formValue.assists || 0),
        shotsOnGoalPerGame: formValue.gamesPlayed > 0 ? (formValue.shotsOnGoal || 0) / formValue.gamesPlayed : 0,
        // Set position as Goalie (not editable)
        position: 'Goalie',
        // Use default rink data for now (since it's not in the form anymore)
        rink: {
          facilityName: 'Default Facility',
          rinkName: 'Main Rink',
          city: 'City',
          address: 'Address'
        }
      };

      if (this.isEditMode && this.data.goalie) {
        goalieData.id = this.data.goalie.id;
      }

      this.dialogRef.close(goalieData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.goalieForm.controls).forEach(key => {
        this.goalieForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.goalieForm.get(fieldName);
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
      jerseyNumber: 'Jersey Number',
      height: 'Height',
      weight: 'Weight',
      shoots: 'Shoots',
      birthYear: 'Birth Year',
      shotsOnGoal: 'Shots on Goal',
      saves: 'Saves',
      goalsAgainst: 'Goals Against',
      gamesPlayed: 'Games Played',
      wins: 'Wins',
      losses: 'Losses',
      goals: 'Goals',
      assists: 'Assists',
      ppga: 'PPGA',
      shga: 'SHGA',
      savesAboveAvg: 'Saves Above Average'
    };
    return labels[fieldName] || fieldName;
  }
}
