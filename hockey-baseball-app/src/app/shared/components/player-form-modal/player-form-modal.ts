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
import { forkJoin } from 'rxjs';
import { Player } from '../../interfaces/player.interface';
import { TeamService } from '../../../services/team.service';
import { PositionService, PositionOption } from '../../../services/position.service';

export interface PlayerFormModalData {
  player?: Player;
  isEditMode: boolean;
}

export interface TeamOption {
  value: string;
  label: string;
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
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<PlayerFormModalComponent>>(MatDialogRef);
  private teamService = inject(TeamService);
  private positionService = inject(PositionService);
  data = inject<PlayerFormModalData>(MAT_DIALOG_DATA);

  playerForm: FormGroup;
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
    this.playerForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  private loadFormData(): void {
    this.isLoading = true;
    
    // Fetch teams and positions concurrently
    forkJoin({
      teams: this.teamService.getTeams(),
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
        if (this.isEditMode && this.data.player) {
          this.populateForm(this.data.player);
        }
      },
      error: (error) => {
        console.error('Failed to load form data:', error);
        // Use fallback data
        this.teamOptions = this.getDefaultTeams();
        this.positionOptions = this.positionService.getDefaultPositions();
        
        // Set default values to first available options
        this.setDefaultFormValues();
        
        this.isLoading = false;
        
        // Populate form if in edit mode (this will override defaults)
        if (this.isEditMode && this.data.player) {
          this.populateForm(this.data.player);
        }
      }
    });
  }

  private getDefaultTeams(): TeamOption[] {
    return [
      { value: 'Red Wings', label: 'Red Wings' },
      { value: 'Blue Sharks', label: 'Blue Sharks' },
      { value: 'Lightning Bolts', label: 'Lightning Bolts' },
      { value: 'Golden Eagles', label: 'Golden Eagles' },
      { value: 'Ice Wolves', label: 'Ice Wolves' }
    ];
  }

  private setDefaultFormValues(): void {
    const defaultValues: { [key: string]: string } = {};
    
    // Set first team as default
    if (this.teamOptions.length > 0) {
      defaultValues['team'] = this.teamOptions[0].value;
    }
    
    // Set first position as default
    if (this.positionOptions.length > 0) {
      defaultValues['position'] = this.positionOptions[0].value;
    }
    
    // Set first shoots option as default
    if (this.shootsOptions.length > 0) {
      defaultValues['shoots'] = this.shootsOptions[0].value;
    }
    
    // Apply defaults to form
    if (Object.keys(defaultValues).length > 0) {
      this.playerForm.patchValue(defaultValues);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      team: [''],
      birthYear: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      jerseyNumber: ['', [Validators.min(1), Validators.max(99)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      position: [''],
      height: [''],
      weight: ['', [Validators.min(1)]],
      shoots: [this.shootsOptions[0]?.value || ''],
      birthplace: [''],
      address: [''],
      playerBiography: ['']
    });
  }

  private populateForm(player: Player): void {
    this.playerForm.patchValue({
      team: player.team,
      birthYear: player.birthYear,
      jerseyNumber: player.jerseyNumber,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      height: player.height,
      weight: player.weight,
      shoots: player.shoots,
      birthplace: (player as any).birthplace,
      address: (player as any).address,
      playerBiography: (player as any).playerBiography
    });
  }

  onSubmit(): void {
    if (this.playerForm.valid) {
      const formValue = this.playerForm.value;
      
      const playerData: Partial<Player> = {
        team: formValue.team,
        birthYear: formValue.birthYear,
        jerseyNumber: formValue.jerseyNumber,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        position: formValue.position,
        height: formValue.height,
        weight: formValue.weight,
        shoots: formValue.shoots,
        // Add new fields
        ...{
          birthplace: formValue.birthplace,
          address: formValue.address,
          playerBiography: formValue.playerBiography
        },
        // Set default values for fields not in form
        level: '',
        shotsOnGoal: 0,
        gamesPlayed: 0,
        goals: 0,
        assists: 0,
        scoringChances: 0,
        blockedShots: 0,
        penaltiesDrawn: 0,
        points: 0,
        shotSprayChart: '',
        rink: {
          facilityName: 'Default Facility',
          rinkName: 'Main Rink',
          city: 'City',
          address: 'Address'
        }
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
      address: 'Address',
      playerBiography: 'Player Biography'
    };
    return labels[fieldName] || fieldName;
  }
}
