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
  templateUrl: './goalie-change-form-modal.html',
  styleUrl: './goalie-change-form-modal.scss'
})
export class GoalieChangeFormModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<GoalieChangeFormModalComponent>>(MatDialogRef);

  goalieChangeForm: FormGroup;

  // Mock data for now - to be replaced with real data
  teamOptions = [
    { value: 'team1', label: 'BURLINGTON JR RAIDERS BLACK', logo: 'BRB' },
    { value: 'team2', label: 'WATERLOO WOLVES', logo: 'WW' }
  ];

  // Mock goalies by team - will be populated based on selected team
  goaliesByTeam: Record<string, Array<{ value: string; label: string }>> = {
    team1: [
      { value: 'goalie1', label: 'Goalie 1' },
      { value: 'goalie2', label: 'Goalie 2' }
    ],
    team2: [
      { value: 'goalie3', label: 'Goalie 3' },
      { value: 'goalie4', label: 'Goalie 4' }
    ]
  };

  goalieOptions: Array<{ value: string; label: string }> = [];

  periodOptions = [
    { value: '1', label: '1st Period' },
    { value: '2', label: '2nd Period' },
    { value: '3', label: '3rd Period' }
  ];

  constructor() {
    this.goalieChangeForm = this.createForm();
    this.setDefaultValues();
    this.setupTeamChangeListener();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', Validators.required],
      goalie: ['', Validators.required],
      period: ['', Validators.required],
      time: ['', [Validators.required, Validators.pattern(/^([0-5]?[0-9]):([0-5][0-9])$/)]],
      note: ['']
    });
  }

  private setDefaultValues(): void {
    // Set first available options as defaults
    if (this.teamOptions.length > 0) {
      this.goalieChangeForm.patchValue({
        team: this.teamOptions[0].value
      });
      // Initialize goalie list based on default team
      this.updateGoalies(this.teamOptions[0].value);
    }
    if (this.periodOptions.length > 0) {
      this.goalieChangeForm.patchValue({
        period: this.periodOptions[0].value
      });
    }
  }

  private setupTeamChangeListener(): void {
    // When team changes, update available goalies
    this.goalieChangeForm.get('team')?.valueChanges.subscribe(team => {
      this.updateGoalies(team);
    });
  }

  private updateGoalies(teamValue: string): void {
    this.goalieOptions = this.goaliesByTeam[teamValue] || [];
    // Reset goalie selection when team changes
    if (this.goalieOptions.length > 0) {
      this.goalieChangeForm.patchValue({ goalie: this.goalieOptions[0].value });
    } else {
      this.goalieChangeForm.patchValue({ goalie: '' });
    }
  }

  selectTeam(teamValue: string): void {
    this.goalieChangeForm.patchValue({ team: teamValue });
    this.goalieChangeForm.get('team')?.markAsTouched();
  }

  selectGoalie(goalieValue: string): void {
    this.goalieChangeForm.patchValue({ goalie: goalieValue });
    this.goalieChangeForm.get('goalie')?.markAsTouched();
  }

  onSubmit(): void {
    if (this.goalieChangeForm.valid) {
      const formValue = this.goalieChangeForm.value;
      
      // Find selected team and goalie
      const selectedTeam = this.teamOptions.find(t => t.value === formValue.team);
      const selectedGoalie = this.goalieOptions.find(g => g.value === formValue.goalie);
      
      const goalieChangeData: GoalieChangeFormData = {
        teamLogo: selectedTeam?.logo || '',
        teamName: selectedTeam?.label || '',
        goalieName: selectedGoalie?.label || '',
        period: formValue.period,
        time: formValue.time,
        note: formValue.note
      };

      this.dialogRef.close(goalieChangeData);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.goalieChangeForm.controls).forEach(key => {
        this.goalieChangeForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.goalieChangeForm.get(fieldName);
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
      goalie: 'Goalie',
      period: 'Period',
      time: 'Time',
      note: 'Note'
    };
    return labels[fieldName] || fieldName;
  }
}
