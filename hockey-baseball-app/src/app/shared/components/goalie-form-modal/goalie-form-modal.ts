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
import { forkJoin, of } from 'rxjs';
import { Goalie } from '../../interfaces/goalie.interface';
import { Team } from '../../interfaces/team.interface';
import { TeamService } from '../../../services/team.service';
import { PositionService, PositionOption } from '../../../services/position.service';

export interface GoalieFormModalData {
  goalie?: Goalie;
  isEditMode: boolean;
  teams?: Team[];  // Optional: pass teams to avoid redundant API calls
}

export interface TeamOption {
  value: string;
  label: string;
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
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<GoalieFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private positionService = inject(PositionService);
  data = inject<GoalieFormModalData>(MAT_DIALOG_DATA);

  goalieForm: FormGroup;
  isEditMode: boolean;
  isLoading = true;

  shootsOptions = [
    { value: 'Right Shot', label: 'Right Shot' },
    { value: 'Left Shot', label: 'Left Shot' }
  ];

  positionOptions: PositionOption[] = [];
  teamOptions: TeamOption[] = [];

  constructor() {
    const data = this.data;

    this.isEditMode = data.isEditMode;
    this.goalieForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  private loadFormData(): void {
    this.isLoading = true;
    
    // Use provided teams or fetch from API
    const teamsObservable = this.data.teams 
      ? of({ teams: this.data.teams, total: this.data.teams.length })
      : this.teamService.getTeams();
    
    // Fetch teams and positions concurrently
    forkJoin({
      teams: teamsObservable,
      positions: this.positionService.getPositions()
    }).subscribe({
      next: ({ teams, positions }) => {
        // Transform teams to options format
        this.teamOptions = teams.teams.map(team => ({
          value: team.id,
          label: team.name
        }));
        
        this.positionOptions = positions;
        
        // Set default values to first available options
        this.setDefaultFormValues();
        
        this.isLoading = false;
        
        // Populate form if in edit mode (this will override defaults)
        if (this.isEditMode && this.data.goalie) {
          this.populateForm(this.data.goalie);
        }
      },
      error: (error) => {
        console.error('Failed to load form data:', error);
        
        // Set default values to first available options
        this.setDefaultFormValues();
        
        this.isLoading = false;
        
        // Populate form if in edit mode (this will override defaults)
        if (this.isEditMode && this.data.goalie) {
          this.populateForm(this.data.goalie);
        }
      }
    });
  }

  private setDefaultFormValues(): void {
    const defaultValues: Record<string, string> = {};
    
    // Set first team as default
    if (this.teamOptions.length > 0) {
      defaultValues['team'] = this.teamOptions[0].value;
    }
    
    // Set first position as default
    if (this.positionOptions.length > 0) {
      defaultValues['position'] = this.positionOptions[0].value;
    }
    
    // Set first shoots option as default (already handled in createForm)
    if (this.shootsOptions.length > 0) {
      defaultValues['shoots'] = this.shootsOptions[0].value;
    }
    
    // Apply defaults to form
    if (Object.keys(defaultValues).length > 0) {
      this.goalieForm.patchValue(defaultValues);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: ['', [Validators.required]],
      birthYear: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      jerseyNumber: ['', [Validators.min(1), Validators.max(99)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      position: [''],
      height: [''],
      weight: ['', [Validators.min(1)]],
      shoots: [this.shootsOptions[0]?.value || ''],
      birthplace: [''],
      addressCountry: [''],
      addressRegion: [''],
      addressCity: [''],
      addressStreet: [''],
      addressPostalCode: [''],
      playerBiography: ['']
    });
  }

  private populateForm(goalie: Goalie): void {
    // Find the team ID by matching team name
    let teamId = '';
    const matchingTeam = this.teamOptions.find(opt => opt.label === goalie.team);
    if (matchingTeam) {
      teamId = matchingTeam.value;
    } else {
      // Fallback: try to extract team ID from team string like "Team 1"
      const teamIdMatch = goalie.team.match(/Team (\d+)/);
      if (teamIdMatch && teamIdMatch[1]) {
        teamId = teamIdMatch[1];
      }
    }
    
    this.goalieForm.patchValue({
      team: teamId,
      birthYear: goalie.birthYear,
      jerseyNumber: goalie.jerseyNumber,
      firstName: goalie.firstName,
      lastName: goalie.lastName,
      position: goalie.position,
      height: goalie.height,
      weight: goalie.weight,
      shoots: goalie.shoots,
      birthplace: goalie.birthplace,
      addressCountry: (goalie as Record<string, unknown>)['addressCountry'],
      addressRegion: (goalie as Record<string, unknown>)['addressRegion'],
      addressCity: (goalie as Record<string, unknown>)['addressCity'],
      addressStreet: (goalie as Record<string, unknown>)['addressStreet'],
      addressPostalCode: (goalie as Record<string, unknown>)['addressPostalCode'],
      playerBiography: goalie.playerBiography
    });
  }

  onSubmit(): void {
    if (this.goalieForm.valid) {
      const formValue = this.goalieForm.value;
      
      // Convert team ID back to team name
      const selectedTeam = this.teamOptions.find(opt => opt.value === formValue.team);
      const teamName = selectedTeam ? selectedTeam.label : formValue.team;
      const teamId = formValue.team; // Keep the team ID
      
      const goalieData: Partial<Goalie> = {
        team: teamName,
        teamId: teamId,  // Always include teamId
        birthYear: formValue.birthYear,
        jerseyNumber: formValue.jerseyNumber,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        position: formValue.position,
        height: formValue.height,
        weight: formValue.weight,
        shoots: formValue.shoots,
        birthplace: formValue.birthplace,
        addressCountry: formValue.addressCountry,
        addressRegion: formValue.addressRegion,
        addressCity: formValue.addressCity,
        addressStreet: formValue.addressStreet,
        addressPostalCode: formValue.addressPostalCode,
        playerBiography: formValue.playerBiography,
        // Set default values for fields not in form
        level: '',
        shotsOnGoal: 0,
        saves: 0,
        goalsAgainst: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        goals: 0,
        assists: 0,
        ppga: 0,
        shga: 0,
        savesAboveAvg: 0,
        points: 0,
        shotsOnGoalPerGame: 0,
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
      team: 'Team',
      birthYear: 'Birth Year',
      jerseyNumber: 'Number',
      firstName: 'First Name',
      lastName: 'Last Name',
      position: 'Position',
      height: 'Height',
      weight: 'Weight',
      shoots: 'Shoots',
      birthplace: 'Birthplace',
      addressCountry: 'Country',
      addressRegion: 'State/Province',
      addressCity: 'City',
      addressStreet: 'Street Address',
      addressPostalCode: 'Postal Code',
      playerBiography: 'Player Biography'
    };
    return labels[fieldName] || fieldName;
  }
}
