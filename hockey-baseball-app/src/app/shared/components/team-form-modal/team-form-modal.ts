import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Team } from '../../interfaces/team.interface';

export interface TeamFormModalData {
  team?: Team;
  isEditMode: boolean;
}

@Component({
  selector: 'app-team-form-modal',
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
  templateUrl: './team-form-modal.html',
  styleUrl: './team-form-modal.scss'
})
export class TeamFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<TeamFormModalComponent>>(MatDialogRef);
  data = inject<TeamFormModalData>(MAT_DIALOG_DATA);

  teamForm: FormGroup;
  isEditMode: boolean;

  levelOptions = [
    { value: 'NHL', label: 'NHL' },
    { value: 'AHL', label: 'AHL' },
    { value: 'Junior A', label: 'Junior A' },
    { value: 'Junior B', label: 'Junior B' },
    { value: 'Junior C', label: 'Junior C' }
  ];

  divisionOptions = [
    { value: 'Atlantic', label: 'Atlantic' },
    { value: 'Metropolitan', label: 'Metropolitan' },
    { value: 'Central', label: 'Central' },
    { value: 'Pacific', label: 'Pacific' }
  ];

  constructor() {
    const data = this.data;

    this.isEditMode = data.isEditMode;
    this.teamForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.team) {
      this.populateForm(this.data.team);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      logo: [''],
      level: [this.levelOptions[0]?.value || 'NHL'],
      division: [this.divisionOptions[0]?.value || 'Atlantic'],
      gamesPlayed: ['', [Validators.min(0)]],
      wins: ['', [Validators.min(0)]],
      losses: ['', [Validators.min(0)]],
      points: ['', [Validators.min(0)]],
      goalsFor: ['', [Validators.min(0)]],
      goalsAgainst: ['', [Validators.min(0)]]
    });
  }

  private populateForm(team: Team): void {
    this.teamForm.patchValue({
      name: team.name,
      logo: team.logo,
      level: team.level,
      division: team.division,
      gamesPlayed: team.gamesPlayed,
      wins: team.wins,
      losses: team.losses,
      points: team.points,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst
    });
  }

  onSubmit(): void {
    if (this.teamForm.valid) {
      const formValue = this.teamForm.value;
      
      const teamData: Partial<Team> = {
        name: formValue.name,
        logo: formValue.logo || '/assets/icons/teams.svg',
        level: formValue.level,
        division: formValue.division,
        gamesPlayed: formValue.gamesPlayed || 0,
        wins: formValue.wins || 0,
        losses: formValue.losses || 0,
        points: formValue.points || 0,
        goalsFor: formValue.goalsFor || 0,
        goalsAgainst: formValue.goalsAgainst || 0
      };

      if (this.isEditMode && this.data.team) {
        teamData.id = this.data.team.id;
      }

      this.dialogRef.close(teamData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.teamForm.controls).forEach(key => {
        this.teamForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.teamForm.get(fieldName);
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
      name: 'Team Name',
      logo: 'Logo',
      level: 'Level',
      division: 'Division',
      gamesPlayed: 'Games Played',
      wins: 'Wins',
      losses: 'Losses',
      points: 'Points',
      goalsFor: 'Goals For',
      goalsAgainst: 'Goals Against'
    };
    return labels[fieldName] || fieldName;
  }
}
